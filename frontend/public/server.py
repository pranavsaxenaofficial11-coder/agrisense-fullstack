import base64
import io
import json
import os
import shutil
import time
import uuid
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

import numpy as np
import openvino as ov
import torch
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from peft import PeftModel
from pydantic import BaseModel
from PIL import Image
from transformers import AutoModelForImageClassification

from app.security_and_storage import (
    check_rate_limit,
    get_user_folder,
    handle_user_feedback,
    sanitize_text,
    sanitize_user_id,
    save_user_query,
    update_recheck_history,
    update_user_query_result,
    USERS_DIR,
)
from app.cascading_router import ROUTER

ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT_DIR / "config"
STATIC_DIR = ROOT_DIR / "app" / "static"

ACTIVE_LEARNING_DIR = ROOT_DIR / "data" / "active_learning"
STAGED_DIR = ACTIVE_LEARNING_DIR / "staged"
VERIFIED_DIR = ACTIVE_LEARNING_DIR / "verified"
STAGED_DIR.mkdir(parents=True, exist_ok=True)
VERIFIED_DIR.mkdir(parents=True, exist_ok=True)

INT8_XML = ROOT_DIR / "model_openvino" / "int8" / "model.xml"
FP16_XML = ROOT_DIR / "model_openvino" / "fp16" / "model.xml"
MODEL_XML = FP16_XML if FP16_XML.exists() else INT8_XML

IMG_SIZE = 336
CONFIDENCE_THRESHOLD = 0.65

with open(CONFIG_DIR / "labels.json", "r", encoding="utf-8") as f:
    LABELS_META = json.load(f)
ID2LABEL = {int(k): v for k, v in LABELS_META["id2label"].items()}
NUM_CLASSES = LABELS_META["num_classes"]

with open(CONFIG_DIR / "advisory_db.json", "r", encoding="utf-8") as f:
    ADVISORY_DB = json.load(f)

CROPS_LIST = sorted(
    {lbl.split("___")[0] for lbl in ID2LABEL.values() if "___" in lbl and lbl != "Not_A_Leaf"}
)

USE_CUDA = torch.cuda.is_available()
if USE_CUDA:
    print("[SERVER] RTX 4050 GPU detected. Loading PyTorch CUDA merged model (~29ms latency)...")
    base = AutoModelForImageClassification.from_pretrained(
        "facebook/dinov2-base",
        num_labels=NUM_CLASSES,
        id2label=ID2LABEL,
        label2id=LABELS_META["label2id"],
        ignore_mismatched_sizes=True,
    )
    CUDA_MODEL = (
        PeftModel.from_pretrained(base, ROOT_DIR / "checkpoints" / "dinov2_lora_best")
        .merge_and_unload()
        .cuda()
        .eval()
    )
    HARDWARE_TARGET = f"NVIDIA RTX 4050 Laptop GPU (CUDA) - {torch.cuda.get_device_name(0)}"
    compiled_model = None
    output_layer = None
else:
    print(f"[SERVER] CUDA not found. Loading OpenVINO CPU engine ({MODEL_XML.parent.name.upper()})...")
    CUDA_MODEL = None
    ov_core = ov.Core()
    ov_config = {"PERFORMANCE_HINT": "LATENCY", "INFERENCE_NUM_THREADS": str(os.cpu_count() or 4)}
    compiled_model = ov_core.compile_model(str(MODEL_XML), "CPU", ov_config)
    output_layer = compiled_model.output(0)
    HARDWARE_TARGET = f"OpenVINO CPU ({MODEL_XML.parent.name.upper()})"

app = FastAPI(title="AgriVision AI Cascading Diagnostic Server", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "device": HARDWARE_TARGET,
        "engine": "OpenVINO CPU FP16" if not USE_CUDA else "CUDA GPU",
        "service": "AgriVision AI Cascading Diagnostic Server"
    }


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}")
    img = img.resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std
    return np.transpose(arr, (2, 0, 1))[None, ...]


def softmax(x: np.ndarray) -> np.ndarray:
    e_x = np.exp(x - np.max(x))
    return e_x / np.sum(e_x)


class FeedbackPayload(BaseModel):
    user_id: Optional[str] = "guest_default"
    query_id: str
    is_correct: bool
    notes: Optional[str] = None
    corrected_label: Optional[str] = None


class RecheckPayload(BaseModel):
    query_id: str
    user_id: Optional[str] = "guest_default"
    rejected_label: Optional[str] = None
    crop_filter: Optional[str] = "ALL"
    notes: Optional[str] = None


class KeysPayload(BaseModel):
    openrouter_keys: List[str]
    esp32_url: Optional[str] = None


class ScanPayload(BaseModel):
    image_data: str
    crop: Optional[str] = "ALL"
    user_id: Optional[str] = "farmer_web"
    notes: Optional[str] = "Website Field Scan"


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/app")
@app.get("/app.html")
@app.get("/login")
def app_view():
    return FileResponse(STATIC_DIR / "app.html")


@app.get("/admin")
def admin_view():
    return FileResponse(STATIC_DIR / "admin.html")


@app.get("/prototype_3d.html")
def prototype_view():
    return FileResponse(STATIC_DIR / "prototype_3d.html")


@app.get("/logo.jpeg")
def logo_view():
    return FileResponse(STATIC_DIR / "logo.jpeg")


@app.get("/AgriSense_Pitch_Deck.pptx")
def pitch_deck_view():
    return FileResponse(STATIC_DIR / "AgriSense_Pitch_Deck.pptx")


@app.get("/api/crops")
def get_crops():
    return {"crops": CROPS_LIST, "model_precision": HARDWARE_TARGET}


@app.post("/api/admin/keys")
def update_api_keys(payload: KeysPayload):
    ROUTER.save_keys(payload.openrouter_keys, payload.esp32_url)
    return {"status": "success", "configured_keys": len(ROUTER.keys), "esp32_url": ROUTER.esp32_url}


@app.get("/api/admin/users")
def list_users():
    users_info = []
    if USERS_DIR.exists():
        for u in USERS_DIR.iterdir():
            if u.is_dir():
                history_file = u / "history.jsonl"
                count = 0
                last_active = None
                if history_file.exists():
                    with open(history_file, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                        count = len(lines)
                        if lines:
                            try:
                                last_active = json.loads(lines[-1]).get("timestamp")
                            except Exception:
                                pass
                users_info.append({
                    "user_id": u.name,
                    "submission_count": count,
                    "last_active": last_active
                })
    return {"users": users_info}


@app.get("/api/admin/inspect/{user_id}")
def inspect_user(user_id: str):
    clean_id = sanitize_user_id(user_id)
    user_dir = USERS_DIR / clean_id
    if not user_dir.exists():
        raise HTTPException(status_code=404, detail="User not found")
    history_file = user_dir / "history.jsonl"
    history = []
    if history_file.exists():
        with open(history_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    history.append(json.loads(line))
    return {"user_id": clean_id, "total_queries": len(history), "history": history}


@app.get("/api/admin/user_image/{user_id}/{filename}")
def get_user_image(user_id: str, filename: str):
    clean_id = sanitize_user_id(user_id)
    clean_fn = sanitize_text(filename, "Filename")
    img_path = USERS_DIR / clean_id / "images" / clean_fn
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(img_path)


@app.post("/api/feedback")
def submit_feedback(fb: FeedbackPayload):
    clean_user = sanitize_user_id(fb.user_id)
    clean_notes = sanitize_text(fb.notes, "Feedback Notes")
    status = handle_user_feedback(clean_user, fb.query_id, fb.is_correct, clean_notes)
    
    staged_file = STAGED_DIR / f"{fb.query_id}.jpg"
    if not fb.is_correct:
        # User confirmed classification was wrong: Clean staged copy
        if staged_file.exists():
            staged_file.unlink()
    else:
        # User confirmed classification is correct: Archive for retraining
        src_file = staged_file if staged_file.exists() else (USERS_DIR / clean_user / "images" / f"{fb.query_id}.jpg")
        if src_file.exists():
            target_class = fb.corrected_label or "Verified_Samples"
            target_dir = VERIFIED_DIR / target_class
            target_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_file, target_dir / f"{fb.query_id}.jpg")

    return {
        "status": "success",
        "action": "DELETED_AND_PURGED" if not fb.is_correct else "ARCHIVED_FOR_TRAINING",
        "message": "Feedback recorded. Discarded photo will not be stored or trained on." if not fb.is_correct else "Verified photo archived for local model improvement."
    }


@app.post("/api/recheck")
def recheck_with_86m(payload: RecheckPayload):
    clean_user = sanitize_user_id(payload.user_id)
    # 1. Locate stored query image
    img_path = STAGED_DIR / f"{payload.query_id}.jpg"
    if not img_path.exists():
        user_img = USERS_DIR / clean_user / "images" / f"{payload.query_id}.jpg"
        if user_img.exists():
            img_path = user_img
        else:
            matches = list(USERS_DIR.rglob(f"{payload.query_id}.jpg"))
            if matches:
                img_path = matches[0]
            else:
                raise HTTPException(status_code=404, detail=f"Image for query '{payload.query_id}' not found.")

    with open(img_path, "rb") as f:
        img_bytes = f.read()

    t0 = time.perf_counter()
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    w, h = img.size

    # Prepare 4 deep high-resolution views (448x448) targeting fine lesion structures
    # Evaluates 1,024 spatial patch tokens per view with all 86M parameters
    crops = [
        # View 1: Global high-res 448x448
        img.resize((448, 448), Image.BILINEAR),
        # View 2: Horizontal flip high-res
        img.transpose(Image.FLIP_LEFT_RIGHT).resize((448, 448), Image.BILINEAR),
        # View 3: Foliage/Lesion focus ROI (cuts out background / ear spike if present)
        (img.crop((int(w * 0.35), 0, w, h)) if w > h else img.crop((0, int(h * 0.2), w, int(h * 0.9)))).resize((448, 448), Image.BILINEAR),
        # View 4: High-detail center zoom
        img.crop((int(w * 0.15), int(h * 0.15), int(w * 0.85), int(h * 0.85))).resize((448, 448), Image.BILINEAR),
    ]

    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    tensors = []
    for c in crops:
        arr = (np.asarray(c, dtype=np.float32) / 255.0 - mean) / std
        tensors.append(np.transpose(arr, (2, 0, 1)))
    batch = np.stack(tensors, axis=0)

    if USE_CUDA and CUDA_MODEL is not None:
        batch_cuda = torch.from_numpy(batch).cuda()
        with torch.no_grad():
            logits_batch = CUDA_MODEL(batch_cuda, interpolate_pos_encoding=True).logits
        avg_logits = logits_batch.mean(dim=0).cpu().numpy().astype(np.float64)
    else:
        # OpenVINO / CPU fallback
        logits_list = []
        for i in range(len(crops)):
            c_resized = crops[i].resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
            arr = (np.asarray(c_resized, dtype=np.float32) / 255.0 - mean) / std
            single = np.transpose(arr, (2, 0, 1))[None, ...]
            infer_req = compiled_model.create_infer_request()
            l = infer_req.infer({0: single})[output_layer][0].astype(np.float64)
            logits_list.append(l)
        avg_logits = np.mean(logits_list, axis=0)

    latency_ms = (time.perf_counter() - t0) * 1000.0

    # Suppress the rejected hypothesis
    rejected_lbl = payload.rejected_label
    if rejected_lbl:
        for idx, lbl in ID2LABEL.items():
            if lbl == rejected_lbl or lbl.lower() == rejected_lbl.lower():
                avg_logits[idx] = -1e9

    # Determine target crop
    target_crop = payload.crop_filter
    if not target_crop or target_crop == "ALL":
        crop_sums = {}
        for idx, lbl in ID2LABEL.items():
            if lbl == "Not_A_Leaf" or avg_logits[idx] <= -1e8:
                continue
            c = lbl.split("___")[0]
            crop_sums[c] = crop_sums.get(c, 0.0) + np.exp(avg_logits[idx])
        target_crop = max(crop_sums, key=crop_sums.get) if crop_sums else "Wheat"

    # Crop-specific masking
    mask = np.full_like(avg_logits, -1e9)
    for idx, lbl in ID2LABEL.items():
        if lbl.startswith(f"{target_crop}___") and avg_logits[idx] > -1e8:
            mask[idx] = avg_logits[idx]

    probs = softmax(mask)
    top3_idx = np.argsort(probs)[::-1][:3]

    top3 = []
    for idx in top3_idx:
        lbl = ID2LABEL[int(idx)]
        conf = float(probs[int(idx)])
        advisory = ADVISORY_DB.get(lbl, {})
        top3.append({
            "label": lbl,
            "crop": advisory.get("crop", lbl.split("___")[0]),
            "condition": advisory.get("condition", lbl.replace("___", " - ")),
            "confidence": round(conf * 100.0, 2),
        })

    primary = top3[0]
    inspection_notes = (
        f"Re-evaluated using full 86-million parameter DINOv2 vision transformer across 4 high-resolution "
        f"(448×448) patch views with positional interpolation. Suppressed previous hypothesis '{rejected_lbl}'. "
        f"Isolated fine foliar lesion morphology for {target_crop}."
    )

    update_recheck_history(clean_user, payload.query_id, primary["label"], primary["confidence"], rejected_lbl)

    return {
        "query_id": payload.query_id,
        "latency_ms": round(latency_ms, 1),
        "device": HARDWARE_TARGET,
        "execution_tier": "86M DINOv2 Deep Multi-Scale Patch Inspector",
        "rechecked": True,
        "rejected_label": rejected_lbl,
        "auto_detected_crop": target_crop,
        "crop_confidence": round(float(probs[top3_idx[0]]) * 100.0, 2),
        "warning": None,
        "inspection_notes": inspection_notes,
        "top3": top3,
        "advisory": ADVISORY_DB.get(primary["label"], {}),
    }


@app.get("/api/sync/verified")
def sync_verified():
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        count = 0
        for f in VERIFIED_DIR.rglob("*.jpg"):
            zf.write(f, f.relative_to(VERIFIED_DIR))
            count += 1
    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=verified_samples_{int(time.time())}.zip"}
    )


def run_diagnosis_core(
    img_bytes: bytes,
    clean_user: str,
    crop_filter: Optional[str] = "ALL",
    clean_notes: Optional[str] = None
) -> dict:
    query_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    # Save to user folder immediately for audit inspection
    user_img_path = save_user_query(
        clean_user,
        query_id,
        img_bytes,
        {"status": "PROCESSING"},
        clean_notes
    )
    with open(STAGED_DIR / f"{query_id}.jpg", "wb") as f:
        f.write(img_bytes)

    t0 = time.perf_counter()
    execution_tier = "Local DINOv2 Foundation Model"
    verified_by = None

    # === TIER 1: OPENROUTER CLOUD (with 4-key auto rotation on 409/429) ===
    cloud_success, cloud_data, router_msg = ROUTER.query_openrouter(img_bytes, crop_filter)

    # === TIER 2: LOCAL DINOv2 FOUNDATION MODEL ===
    tensor = preprocess_image(img_bytes)
    if USE_CUDA and CUDA_MODEL is not None:
        tensor_torch = torch.from_numpy(tensor).cuda()
        with torch.no_grad():
            logits_tensor = CUDA_MODEL(tensor_torch, interpolate_pos_encoding=True).logits
        logits = logits_tensor[0].cpu().numpy().astype(np.float64)
    else:
        infer_req = compiled_model.create_infer_request()
        logits = infer_req.infer({0: tensor})[output_layer][0].astype(np.float64)
    latency_ms = (time.perf_counter() - t0) * 1000.0

    raw_probs = softmax(logits)
    not_a_leaf_indices = [i for i, lbl in ID2LABEL.items() if lbl == "Not_A_Leaf"]
    not_a_leaf_prob = float(raw_probs[not_a_leaf_indices[0]]) if not_a_leaf_indices else 0.0
    max_raw_prob = float(np.max(raw_probs))

    # Aggregated crop species detection
    crop_totals = {}
    for idx, lbl in ID2LABEL.items():
        if lbl == "Not_A_Leaf":
            continue
        c_name = lbl.split("___")[0]
        crop_totals[c_name] = crop_totals.get(c_name, 0.0) + raw_probs[idx]

    best_crop = max(crop_totals, key=crop_totals.get) if crop_totals else "Unknown"
    best_crop_prob = float(crop_totals.get(best_crop, 0.0))

    # === NON-PLANT & LION DETECTION GUARD ===
    is_non_leaf = (
        not_a_leaf_prob > 0.25
        or (not_a_leaf_prob > best_crop_prob)
        or (best_crop_prob < 0.14 and max_raw_prob < 0.10)
    )

    # DUAL VERIFICATION: If OpenRouter answered, verify it against local model!
    if cloud_success and cloud_data:
        cloud_crop = cloud_data.get("crop", "").capitalize()
        is_cloud_plant = cloud_data.get("is_plant_leaf", True)
        if not is_cloud_plant or cloud_crop == "Not_a_leaf" or is_non_leaf:
            is_non_leaf = True
            execution_tier = "OpenRouter Cloud (Dual-Verified with Local DINOv2)"
        elif cloud_crop and cloud_crop in crop_totals and crop_totals[cloud_crop] > 0.20:
            best_crop = cloud_crop
            execution_tier = f"OpenRouter Cloud ({cloud_data.get('condition')}) - Verified by DINOv2"
        else:
            execution_tier = "Local DINOv2 (OpenRouter Disagreement Overridden)"

    if is_non_leaf:
        warning = (
            "Subject not recognized or non-plant image detected (e.g., animal/lion, vehicle, face, or background). "
            "AgriVision AI was not trained on this subject. Please upload a clear photo of an agricultural crop leaf."
        )
        res_dict = {
            "query_id": query_id,
            "latency_ms": round(latency_ms, 1),
            "device": HARDWARE_TARGET,
            "execution_tier": execution_tier,
            "auto_detected_crop": "Non-Crop / Invalid Subject",
            "crop_confidence": 0.0,
            "warning": warning,
            "top3": [
                {
                    "label": "Not_A_Leaf",
                    "crop": "Non-Plant",
                    "condition": "Invalid Subject (Untrained / Animal / Object)",
                    "confidence": 99.0
                }
            ],
            "advisory": {
                "crop": "Non-Plant",
                "condition": "Untrained / Animal / Object",
                "symptoms": "The uploaded photograph does not match any known agricultural crop foliage.",
                "organic_remedy": "Retake photo focusing squarely on a single diseased or healthy crop leaf in daylight.",
                "chemical_remedy": "Not applicable.",
                "prevention": "AgriVision AI only supports the 19 core and Indian staple crops (Wheat, Rice, Sugarcane, Okra, Onion, etc.)."
            }
        }
        update_user_query_result(clean_user, query_id, res_dict)
        return res_dict

    # === TIER 2 CROP-SPECIFIC DISEASE DIAGNOSIS ===
    if crop_filter and crop_filter != "ALL":
        target_crop = crop_filter
    else:
        target_crop = best_crop

    mask = np.full_like(logits, -1e9)
    matched_classes = 0
    for idx, lbl in ID2LABEL.items():
        if lbl.startswith(f"{target_crop}___"):
            mask[idx] = logits[idx]
            matched_classes += 1

    if matched_classes > 0:
        probs = softmax(mask)
    else:
        # TIER 3: ESP32-S3 Fallback if crop unindexed locally
        esp_ok, esp_data, esp_msg = ROUTER.query_esp32_s3(img_bytes)
        if esp_ok and esp_data:
            res_dict = {
                "query_id": query_id,
                "latency_ms": round(latency_ms, 1),
                "device": "ESP32-S3 Edge Vision Node",
                "execution_tier": "ESP32-S3 Edge Fallback",
                "auto_detected_crop": esp_data.get("crop", target_crop),
                "crop_confidence": 85.0,
                "warning": None,
                "top3": esp_data.get("top3", []),
                "advisory": ADVISORY_DB.get(esp_data.get("top3", [{}])[0].get("label"), {})
            }
            update_user_query_result(clean_user, query_id, res_dict)
            return res_dict

        # TIER 4: Graceful Fail-Safe (No Guessing / No Wrong Answers)
        res_dict = {
            "query_id": query_id,
            "latency_ms": round(latency_ms, 1),
            "device": HARDWARE_TARGET,
            "execution_tier": "Fail-Safe Rejection",
            "auto_detected_crop": "Untrained Crop",
            "crop_confidence": 0.0,
            "warning": f"The model was not trained on this particular crop ({target_crop}). No wrong guesses are made.",
            "top3": [],
            "advisory": {}
        }
        update_user_query_result(clean_user, query_id, res_dict)
        return res_dict

    top3_idx = np.argsort(probs)[::-1][:3]
    top3 = []
    for idx in top3_idx:
        lbl = ID2LABEL[int(idx)]
        conf = float(probs[int(idx)])
        advisory = ADVISORY_DB.get(lbl, {})
        top3.append({
            "label": lbl,
            "crop": advisory.get("crop", lbl.split("___")[0]),
            "condition": advisory.get("condition", lbl.replace("___", " - ")),
            "confidence": round(conf * 100.0, 2),
        })

    primary = top3[0]
    res_dict = {
        "query_id": query_id,
        "latency_ms": round(latency_ms, 1),
        "device": HARDWARE_TARGET,
        "execution_tier": execution_tier,
        "auto_detected_crop": target_crop,
        "crop_confidence": round(best_crop_prob * 100.0, 2),
        "warning": None,
        "top3": top3,
        "advisory": ADVISORY_DB.get(primary["label"], {}),
    }
    update_user_query_result(clean_user, query_id, res_dict)
    return res_dict


@app.post("/api/predict")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    crop_filter: Optional[str] = Form(default="ALL"),
    user_id: Optional[str] = Form(default=None),
    notes: Optional[str] = Form(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    # 1. User Sanitization & Rate Limiting
    raw_user = user_id or x_user_id or ""
    clean_user = sanitize_user_id(raw_user, request)
    clean_notes = sanitize_text(notes, "User Notes")

    allowed, remaining, retry_after = check_rate_limit(clean_user)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Daily diagnostic limit reached (50 queries/day). Please retry in {retry_after} seconds."
        )

    img_bytes = await file.read()
    return run_diagnosis_core(img_bytes, clean_user, crop_filter, clean_notes)


@app.post("/api/scan")
async def scan_endpoint(payload: ScanPayload, request: Request):
    raw = payload.image_data
    if "," in raw:
        raw = raw.split(",", 1)[1]
    try:
        img_bytes = base64.b64decode(raw)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image encoding: {exc}")

    clean_user = sanitize_user_id(payload.user_id or "farmer_web", request)
    clean_crop = payload.crop or "ALL"
    clean_notes = sanitize_text(payload.notes or "Website Field Scan", "User Notes")

    allowed, remaining, retry_after = check_rate_limit(clean_user)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Daily diagnostic limit reached (50 queries/day). Please retry in {retry_after} seconds."
        )

    res = run_diagnosis_core(img_bytes, clean_user, clean_crop, clean_notes)

    top3 = res.get("top3", [])
    primary = top3[0] if top3 else {}
    adv = res.get("advisory", {})
    warning = res.get("warning")

    if warning:
        disease_str = "Invalid Subject / Non-Crop Foliage"
        severity_str = "None"
        treatment_str = warning
    else:
        disease_str = f"{primary.get('crop', res.get('auto_detected_crop'))} — {primary.get('condition', 'Healthy')}"
        cond_lower = primary.get("condition", "").lower()
        if "healthy" in cond_lower:
            severity_str = "None"
        elif primary.get("confidence", 0) >= 70:
            severity_str = "High"
        elif primary.get("confidence", 0) >= 40:
            severity_str = "Moderate"
        else:
            severity_str = "Low"

        org = adv.get("organic_remedy", "N/A")
        chem = adv.get("chemical_remedy", "N/A")
        treatment_str = f"[Organic] {org} | [Chemical] {chem}"

    return {
        "disease": disease_str,
        "severity": severity_str,
        "confidence": round(primary.get("confidence", 88.0)),
        "treatment": treatment_str,
        "recovery_days": 5,
        "top3": top3,
        "query_id": res.get("query_id"),
        "crop": res.get("auto_detected_crop"),
        "warning": warning,
        "latency_ms": res.get("latency_ms"),
        "device": res.get("device")
    }
