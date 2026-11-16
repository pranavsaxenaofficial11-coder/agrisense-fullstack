import time
import json
import httpx
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

# Prioritizes high-capability 14B/9B models suited for Dell Latitude 20GB RAM, falling back to 2B
CANDIDATE_MODELS = ["qwen2.5:14b", "gemma2:9b", "gemma2:2b", "qwen2.5:1.5b", "gemma:2b"]

router = APIRouter(prefix="/api/v1/local-ai", tags=["Local Edge AI Engine"])

class AgriDataPayload(BaseModel):
    soil_moisture: float = Field(..., ge=0.0, le=100.0, description="Soil moisture percentage (0-100%)")
    temperature: float = Field(..., ge=-10.0, le=60.0, description="Ambient temperature in Celsius")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Ambient humidity percentage")
    crop_stage: str = Field(default="Vegetative", description="Crop growth stage (e.g., Germination, Vegetative, Flowering, Fruiting, Harvest)")
    leaf_scan_result: Optional[str] = Field(default="Healthy", description="Visual anomaly detected by foliar vision model")

class AdvisoryResponse(BaseModel):
    status: str
    irrigation_action: str
    pest_prevention_step: str
    urgency_level: str
    advisory: str
    execution_mode: str
    latency_ms: float

def deterministic_agronomy_rule_fallback(payload: AgriDataPayload) -> dict:
    """
    Deterministic agronomic fallback engine conforming to ICAR / Agricultural Extension standards.
    Executes instantly if the local Ollama daemon is offline or cold-starting.
    """
    moisture = payload.soil_moisture
    temp = payload.temperature
    anomaly = (payload.leaf_scan_result or "Healthy").lower()
    
    # Irrigation determination with dual hysteresis logic (<28% Dry, >38% Optimal)
    if moisture < 28.0:
        urgency = "High"
        irrigation_action = (
            f"Soil moisture is critically low at {moisture:.1f}%. Run drip irrigation for 35-45 minutes "
            "during early morning or evening hours to reduce evaporative loss and replenish the root zone."
        )
    elif moisture > 80.0:
        urgency = "Medium"
        irrigation_action = (
            f"Soil moisture is saturated at {moisture:.1f}%. Halt all irrigation immediately and ensure "
            "furrow drainage channels are open to prevent root asphyxiation and collar rot."
        )
    elif moisture < 35.0:
        urgency = "Medium"
        irrigation_action = (
            f"Soil moisture ({moisture:.1f}%) is approaching the replenishment threshold. Prepare scheduled "
            "irrigation cycle within the next 6-12 hours."
        )
    else:
        urgency = "Low"
        irrigation_action = (
            f"Soil moisture ({moisture:.1f}%) is in the optimal agronomic range. No irrigation needed."
        )

    # Pest / Disease determination
    if "blight" in anomaly:
        pest_step = (
            "Remove and safely burn severely infected lower leaves. Spray organic copper oxychloride (2.5 g/L) "
            "or 5% Neem Seed Kernel Extract (NSKE). Avoid overhead splashing."
        )
    elif "chlorosis" in anomaly or "yellow" in anomaly:
        pest_step = (
            "Foliar yellowing indicates potential nitrogen or micronutrient deficit. Apply a balanced 19:19:19 "
            "foliar feed (5 g/L) in early morning."
        )
    elif "powdery" in anomaly or "mildew" in anomaly:
        pest_step = (
            "White fungal powder detected. Apply wettable sulfur (2 g/L) or diluted bio-fungicide (Trichoderma viride). "
            "Thin out dense foliage to improve canopy aeration."
        )
    else:
        if temp > 35.0 and payload.humidity > 70.0:
            pest_step = "High heat and humidity elevate aphid risk. Spray 2% neem oil as a preventive safeguard."
        else:
            pest_step = "Canopy appears healthy. Maintain regular bi-weekly monitoring of leaf undersides."

    advisory_summary = f"{irrigation_action} {pest_step}"
    return {
        "irrigation_action": irrigation_action,
        "pest_prevention_step": pest_step,
        "urgency_level": urgency,
        "advisory": advisory_summary
    }

@router.post("/advisory", response_model=AdvisoryResponse)
@router.post("/local-advisory", response_model=AdvisoryResponse)
async def generate_local_advisory(payload: AgriDataPayload):
    start_time = time.time()
    
    # 1. Structure the prompt following the AgriSense Schema
    system_prompt = (
        "You are an expert smallholder agronomist specializing in precision irrigation and pest management. "
        "Return your advice strictly as a single JSON object with exactly these four keys: "
        "'irrigation_action', 'pest_prevention_step', 'urgency_level' ('Low', 'Medium', or 'High'), and 'advisory'. "
        "Keep advice concise, direct, and completely free of jargon."
    )
    user_prompt = (
        f"[CONTEXT]: Smallholder agricultural IoT node data.\n"
        f"[SOIL MOISTURE]: {payload.soil_moisture:.1f}% (Threshold: <28% ON, >38% OFF)\n"
        f"[ENVIRONMENT]: Temp: {payload.temperature:.1f}°C, Humidity: {payload.humidity:.1f}%\n"
        f"[CROP STAGE]: {payload.crop_stage}\n"
        f"[VISUAL ANOMALY]: {payload.leaf_scan_result or 'Healthy'}\n"
        f"[TASK]: Provide actionable irrigation action and preventive organic pest-management step."
    )

    # 2. Attempt Async REST call to local Ollama daemon
    ollama_url = "http://localhost:11434/api/chat"

    async with httpx.AsyncClient(timeout=10.0) as client:
        for model in CANDIDATE_MODELS:
            try:
                resp = await client.post(
                    ollama_url,
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.2,
                            "num_predict": 250
                        }
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content_str = data.get("message", {}).get("content", "{}")
                    parsed = json.loads(content_str)
                    
                    elapsed = (time.time() - start_time) * 1000
                    return AdvisoryResponse(
                        status="success",
                        irrigation_action=parsed.get("irrigation_action", "Proceed with calibrated drip cycle."),
                        pest_prevention_step=parsed.get("pest_prevention_step", "Inspect leaves for early signs of stress."),
                        urgency_level=parsed.get("urgency_level", "Medium"),
                        advisory=parsed.get("advisory", "Soil and foliar health monitored locally."),
                        execution_mode=f"local_ollama_{model}",
                        latency_ms=round(elapsed, 2)
                    )
            except Exception:
                # Daemon unreachable or model not pulled; continue to fallback
                pass

    # 3. Autonomous Local Rule Fallback (Zero Network / Zero Heavy VRAM Required)
    fallback_data = deterministic_agronomy_rule_fallback(payload)
    elapsed = (time.time() - start_time) * 1000
    return AdvisoryResponse(
        status="success",
        irrigation_action=fallback_data["irrigation_action"],
        pest_prevention_step=fallback_data["pest_prevention_step"],
        urgency_level=fallback_data["urgency_level"],
        advisory=fallback_data["advisory"],
        execution_mode="edge_rule_engine_autonomous",
        latency_ms=round(elapsed, 2)
    )

@router.get("/health")
async def local_ai_health():
    """
    Check if local Ollama daemon is reachable on http://localhost:11434
    """
    async with httpx.AsyncClient(timeout=2.0) as client:
        try:
            resp = await client.get("http://localhost:11434/api/tags")
            if resp.status_code == 200:
                models = [m.get("name") for m in resp.json().get("models", [])]
                return {
                    "status": "online",
                    "runner": "Ollama Local REST Daemon",
                    "installed_models": models,
                    "recommended_edge_model": "qwen2.5:14b (Dell Latitude 20GB RAM) or gemma2:2b (fast)"
                }
        except Exception as e:
            return {
                "status": "offline",
                "runner": "Deterministic Agronomy Rule Engine Active",
                "detail": f"Local Ollama daemon not detected at localhost:11434: {str(e)}",
                "recommended_edge_model": "qwen2.5:14b (run 'ollama run qwen2.5:14b') or gemma2:2b"
            }

class LocalScanPayload(BaseModel):
    image_data: str
    crop: Optional[str] = "Tomato"

@router.post("/scan")
async def local_crop_scan(payload: LocalScanPayload):
    """
    Local Edge Plant Pathology Scan using local Ollama vision model (llava/moondream).
    Returns accurate diagnosis or explicit offline status.
    """
    start_time = time.time()
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            tags_resp = await client.get("http://localhost:11434/api/tags")
            if tags_resp.status_code == 200:
                models = [m.get("name", "") for m in tags_resp.json().get("models", [])]
                v_model = next((m for m in models if "llava" in m or "vision" in m or "moondream" in m), None)
                if v_model:
                    gen_resp = await client.post(
                        "http://localhost:11434/api/generate",
                        json={
                            "model": v_model,
                            "prompt": (
                                f"You are a plant pathologist. Analyze this leaf image of a {payload.crop} plant. "
                                "Return strictly: Diagnosis: <name> | Severity: <Low/Moderate/High> | Treatment: <spray/dosage>"
                            ),
                            "images": [payload.image_data],
                            "stream": False
                        }
                    )
                    if gen_resp.status_code == 200:
                        content = gen_resp.json().get("response", "")
                        return {
                            "status": "success",
                            "model": f"Local Edge AI ({v_model})",
                            "raw": content,
                            "latency_ms": round((time.time() - start_time) * 1000, 2)
                        }
        except Exception:
            pass

    return {
        "status": "offline",
        "model": "Local Edge AI (Dell Latitude)",
        "detail": "No local vision model (llava/moondream) running on localhost:11434.",
        "latency_ms": round((time.time() - start_time) * 1000, 2)
    }
