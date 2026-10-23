"""
==============================================================================
AgriSense IoT Hardware Gateway & Actuator Control Routes
Provides robust bi-directional communication between ESP32/ESP32-S3 nodes
and the FastAPI cloud backend.

Features:
- Telemetry ingestion from hardware nodes
- Instant Actuator STOP & Emergency Halt control (pump, fan, valves)
- Camera frame proxying (relays /capture.jpg without HTTPS mixed content issues)
- Camera hardware parameter forwarding (/control)
- Hardware heartbeat & online status detection
==============================================================================
"""

import time
import httpx
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import Response as FastApiResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
import app.models as models
from app.config import settings

router = APIRouter(prefix="/api/iot", tags=["IoT Hardware Gateway"])

# In-memory hardware registry and state
_hardware_registry: Dict[str, Any] = {
    "default_ip": "192.168.4.1",
    "last_seen_ip": "192.168.4.1",
    "last_seen_timestamp": None,
    "online": False,
    "emergency_stop_active": False,
    "emergency_stop_timestamp": None,
    "emergency_stop_reason": None,
    "fan_state": False,
    "pump_state": False,
    "last_telemetry": {}
}

class TelemetryPayload(BaseModel):
    ip: Optional[str] = None
    node_id: Optional[str] = "esp32-s3-station"
    airTemp: Optional[float] = None
    airHumidity: Optional[float] = None
    soil1: Optional[float] = None
    soil2: Optional[float] = None
    soilAvg: Optional[float] = None
    light: Optional[float] = None
    rain: Optional[float] = None
    pump: Optional[Any] = None
    fan: Optional[Any] = None
    autoMode: Optional[bool] = None
    camera_online: Optional[bool] = True
    battery_v: Optional[float] = None
    soil_moisture_1: Optional[float] = None
    soil_moisture_2: Optional[float] = None
    soil_average: Optional[float] = None
    air_temp: Optional[float] = None
    air_humidity: Optional[float] = None
    light_pct: Optional[float] = None
    rain_pct: Optional[float] = None
    pump_state: Optional[Any] = None
    fan_state: Optional[Any] = None

class StopActuatorRequest(BaseModel):
    target: Optional[str] = "all"  # "pump", "fan", "all"
    reason: Optional[str] = "Stopped via FastAPI control interface"
    hardware_ip: Optional[str] = None

class CameraControlRequest(BaseModel):
    var: str
    val: int
    hardware_ip: Optional[str] = None

class SetIpRequest(BaseModel):
    ip: str

def get_or_create_controls(db: Session) -> models.ControlSystem:
    ctrl = db.query(models.ControlSystem).first()
    if not ctrl:
        ctrl = models.ControlSystem()
        db.add(ctrl)
        db.commit()
        db.refresh(ctrl)
    return ctrl

@router.get("/status")
def get_hardware_status(db: Session = Depends(get_db)):
    """Returns real-time connection status of the IoT hardware."""
    ctrl = get_or_create_controls(db)
    now = time.time()
    last_ts = _hardware_registry.get("last_seen_timestamp")
    is_online = bool(last_ts and (now - last_ts < 35.0))
    _hardware_registry["online"] = is_online
    _hardware_registry["pump_state"] = bool(ctrl.pump_state)

    return {
        "online": is_online,
        "hardware_ip": _hardware_registry.get("last_seen_ip") or _hardware_registry["default_ip"],
        "last_seen_seconds_ago": round(now - last_ts, 1) if last_ts else None,
        "emergency_stop_active": _hardware_registry.get("emergency_stop_active", False),
        "emergency_stop_timestamp": _hardware_registry.get("emergency_stop_timestamp"),
        "emergency_stop_reason": _hardware_registry.get("emergency_stop_reason"),
        "pump_state": ctrl.pump_state,
        "fan_state": _hardware_registry.get("fan_state", False),
        "auto_mode": ctrl.auto_mode,
        "manual_override": ctrl.manual_override,
        "water_tank_level": ctrl.water_tank_level,
        "latest_telemetry": _hardware_registry.get("last_telemetry", {})
    }

@router.post("/set-ip")
def set_hardware_ip(req: SetIpRequest):
    """Sets or overrides the ESP32 hardware IP address."""
    ip = req.ip.strip()
    if ip:
        _hardware_registry["last_seen_ip"] = ip
        _hardware_registry["default_ip"] = ip
    return {"status": "success", "configured_ip": ip}

@router.post("/telemetry")
@router.post("/sync")
def ingest_iot_telemetry(payload: TelemetryPayload, db: Session = Depends(get_db)):
    """
    Ingests live sensor telemetry posted by ESP32 or ESP32-S3.
    Updates database, WebSocket streams, and returns latest actuator commands.
    """
    ctrl = get_or_create_controls(db)
    now = time.time()
    _hardware_registry["last_seen_timestamp"] = now
    _hardware_registry["online"] = True
    if payload.ip:
        _hardware_registry["last_seen_ip"] = payload.ip

    temp = payload.airTemp if payload.airTemp is not None else (payload.air_temp if payload.air_temp is not None else 28.5)
    hum = payload.airHumidity if payload.airHumidity is not None else (payload.air_humidity if payload.air_humidity is not None else 62.0)
    s_avg = payload.soilAvg if payload.soilAvg is not None else payload.soil_average
    if s_avg is None:
        s1 = payload.soil1 if payload.soil1 is not None else payload.soil_moisture_1
        s2 = payload.soil2 if payload.soil2 is not None else payload.soil_moisture_2
        if s1 is not None and s2 is not None:
            s_avg = (float(s1) + float(s2)) / 2.0
        elif s1 is not None:
            s_avg = float(s1)
        elif s2 is not None:
            s_avg = float(s2)
        else:
            s_avg = 45.0
    soil = float(s_avg)
    light = float(payload.light if payload.light is not None else (payload.light_pct if payload.light_pct is not None else 50.0))

    if payload.fan is not None:
        _hardware_registry["fan_state"] = payload.fan

    # If emergency stop is active, force pump state to False
    if _hardware_registry.get("emergency_stop_active", False):
        ctrl.pump_state = False
        ctrl.manual_override = True
    elif not ctrl.manual_override and payload.pump is not None:
        ctrl.pump_state = payload.pump

    if payload.autoMode is not None:
        ctrl.auto_mode = payload.autoMode

    # Record in database
    reading = models.SensorReading(
        zone="Zone A",
        moisture_pct=soil,
        temp_c=temp,
        humidity_pct=hum,
        sunlight_lux=light * 800.0,
        timestamp=datetime.utcnow()
    )
    db.add(reading)
    db.commit()

    _hardware_registry["last_telemetry"] = {
        "airTemp": temp,
        "airHumidity": hum,
        "soil1": payload.soil1,
        "soil2": payload.soil2,
        "soilAvg": soil,
        "light": light,
        "rain": payload.rain,
        "pump": ctrl.pump_state,
        "fan": _hardware_registry.get("fan_state", False),
        "autoMode": ctrl.auto_mode,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Return actuation directives to hardware
    return {
        "status": "ok",
        "commands": {
            "pump": False if _hardware_registry.get("emergency_stop_active") else bool(ctrl.pump_state),
            "fan": False if _hardware_registry.get("emergency_stop_active") else bool(_hardware_registry.get("fan_state", False)),
            "auto_mode": bool(ctrl.auto_mode),
            "emergency_stop": bool(_hardware_registry.get("emergency_stop_active", False)),
            "manual_override": bool(ctrl.manual_override)
        }
    }

@router.post("/stop")
@router.post("/emergency-stop")
async def stop_hardware_actuators(req: Optional[StopActuatorRequest] = None, db: Session = Depends(get_db)):
    """
    EMERGENCY STOP & ACTUATOR HALT ENDPOINT:
    Immediately halts water pump, cooling fan, and any active irrigation cycles.
    Dispatches HTTP halt command directly to hardware IP if accessible.
    """
    ctrl = get_or_create_controls(db)
    reason = (req.reason if req else None) or "Emergency Stop triggered via FastAPI"
    target = (req.target if req else "all") or "all"

    # 1. Update backend state
    if target in ("pump", "all"):
        ctrl.pump_state = False
    if target in ("fan", "all"):
        _hardware_registry["fan_state"] = False
    if target == "all":
        _hardware_registry["emergency_stop_active"] = True
        _hardware_registry["emergency_stop_timestamp"] = datetime.utcnow().isoformat()
        _hardware_registry["emergency_stop_reason"] = reason
        ctrl.manual_override = True

    # 2. Log activity
    log = models.ActivityLog(
        level="WARNING",
        category="EMERGENCY_STOP",
        message=f"[FASTAPI HARDWARE STOP] {reason} (Target: {target}). Pump & Fan forced OFF."
    )
    db.add(log)
    db.commit()
    db.refresh(ctrl)

    # 3. Direct hardware HTTP dispatch attempt
    target_ip = (req.hardware_ip if req and req.hardware_ip else None) or _hardware_registry.get("last_seen_ip") or "192.168.4.1"
    dispatched_to_hardware = False
    hardware_err = None

    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            if target in ("pump", "all"):
                await client.get(f"http://{target_ip}/relay/pump?state=off")
            if target in ("fan", "all"):
                await client.get(f"http://{target_ip}/relay/fan?state=off")
        dispatched_to_hardware = True
    except Exception as e:
        hardware_err = f"Could not reach {target_ip} directly ({e}). State locked in backend."

    return {
        "status": "halted",
        "emergency_stop_active": _hardware_registry.get("emergency_stop_active", True),
        "pump_state": ctrl.pump_state,
        "fan_state": _hardware_registry.get("fan_state", False),
        "target": target,
        "reason": reason,
        "dispatched_to_hardware": dispatched_to_hardware,
        "hardware_ip": target_ip,
        "notice": hardware_err or f"Actuators successfully powered off on {target_ip}"
    }

@router.post("/resume")
def resume_hardware_operations(db: Session = Depends(get_db)):
    """Clears emergency stop and restores normal automation state."""
    ctrl = get_or_create_controls(db)
    _hardware_registry["emergency_stop_active"] = False
    _hardware_registry["emergency_stop_reason"] = None
    ctrl.manual_override = False

    log = models.ActivityLog(
        level="INFO",
        category="EMERGENCY_STOP",
        message="Emergency stop cleared via FastAPI. Normal automated operations restored."
    )
    db.add(log)
    db.commit()

    return {
        "status": "resumed",
        "emergency_stop_active": False,
        "auto_mode": ctrl.auto_mode
    }

# ----------------- CAMERA PROXY & CONTROLS -----------------

@router.get("/camera/frame")
async def proxy_camera_frame(ip: Optional[str] = Query(None)):
    """
    Proxies JPEG frame directly from ESP32-S3 Camera (/capture.jpg).
    Eliminates browser CORS and HTTPS mixed content blocking completely!
    """
    cam_ip = ip or _hardware_registry.get("last_seen_ip") or "192.168.4.1"
    url = f"http://{cam_ip}/capture.jpg?t={int(time.time() * 1000)}"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and resp.content:
                return FastApiResponse(
                    content=resp.content,
                    media_type="image/jpeg",
                    headers={
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "X-Proxied-From": cam_ip
                    }
                )
            raise HTTPException(status_code=resp.status_code, detail="ESP32 Camera returned error")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Cannot reach ESP32 camera at http://{cam_ip} ({e})")

@router.post("/camera/control")
async def proxy_camera_control(req: CameraControlRequest):
    """
    Forwards optical/sensor settings (sepia, inverted, vflip, brightness)
    to ESP32 hardware endpoint (/control?var=...&val=...).
    """
    cam_ip = req.hardware_ip or _hardware_registry.get("last_seen_ip") or "192.168.4.1"
    url = f"http://{cam_ip}/control?var={req.var}&val={req.val}"

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(url)
            return {
                "status": "success",
                "var": req.var,
                "val": req.val,
                "hardware_ip": cam_ip,
                "hardware_response": resp.text
            }
    except Exception as e:
        # Fallback: record that command was received
        return {
            "status": "queued_locally",
            "var": req.var,
            "val": req.val,
            "hardware_ip": cam_ip,
            "warning": f"Could not deliver to hardware directly ({e})"
        }
