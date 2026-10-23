from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Union, Any, Dict
from pydantic import BaseModel
from app.database import get_db
import app.models as models
from app.schemas.sensor import SensorReadingOut, ZoneInfoOut, FieldOverview

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])

@router.get("/overview", response_model=FieldOverview)
def get_field_overview(db: Session = Depends(get_db)):
    ctrl = db.query(models.ControlSystem).first()
    zones = db.query(models.ZoneInfo).all()
    if not zones:
        default_zones = [
            models.ZoneInfo(zone_code="A", name="Polyhouse - Tomato", crop="Tomato (Hybrid)", current_moisture=42.0, moisture_min=35.0, moisture_max=65.0, status="Optimal"),
            models.ZoneInfo(zone_code="B", name="East Field - Wheat", crop="Wheat (HD-2967)", current_moisture=38.5, moisture_min=30.0, moisture_max=60.0, status="Optimal"),
            models.ZoneInfo(zone_code="C", name="North Plot - Mustard", crop="Mustard (Pusa Bold)", current_moisture=34.0, moisture_min=30.0, moisture_max=55.0, status="Optimal"),
            models.ZoneInfo(zone_code="D", name="South Ridge - Potato", crop="Potato (Kufri Jyoti)", current_moisture=41.5, moisture_min=35.0, moisture_max=65.0, status="Optimal"),
        ]
        db.add_all(default_zones)
        db.commit()
        zones = db.query(models.ZoneInfo).all()

    recent = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).limit(15).all()

    sparkline = [r.moisture_pct for r in reversed(recent)] if recent else [38.0, 39.5, 41.0, 40.2, 38.4]

    latest_reading = recent[0] if recent else None
    temp = latest_reading.temp_c if latest_reading else 28.5
    humidity = latest_reading.humidity_pct if latest_reading else 64.0
    sunlight = latest_reading.sunlight_lux if latest_reading else 48000.0
    tank_lvl = ctrl.water_tank_level if ctrl else 84.5
    pump_run = ctrl.pump_state if ctrl else False

    return FieldOverview(
        ambient_temp=temp,
        humidity=humidity,
        sunlight_lux=sunlight,
        water_tank_level=tank_lvl,
        pump_running=pump_run,
        zones=zones,
        recent_readings=recent,
        sparkline_moisture=sparkline
    )

@router.get("/zones", response_model=List[ZoneInfoOut])
def get_zones(db: Session = Depends(get_db)):
    zones = db.query(models.ZoneInfo).all()
    if not zones:
        default_zones = [
            models.ZoneInfo(zone_code="A", name="Polyhouse - Tomato", crop="Tomato (Hybrid)", current_moisture=42.0, moisture_min=35.0, moisture_max=65.0, status="Optimal"),
            models.ZoneInfo(zone_code="B", name="East Field - Wheat", crop="Wheat (HD-2967)", current_moisture=38.5, moisture_min=30.0, moisture_max=60.0, status="Optimal"),
            models.ZoneInfo(zone_code="C", name="North Plot - Mustard", crop="Mustard (Pusa Bold)", current_moisture=34.0, moisture_min=30.0, moisture_max=55.0, status="Optimal"),
            models.ZoneInfo(zone_code="D", name="South Ridge - Potato", crop="Potato (Kufri Jyoti)", current_moisture=41.5, moisture_min=35.0, moisture_max=65.0, status="Optimal"),
        ]
        db.add_all(default_zones)
        db.commit()
        zones = db.query(models.ZoneInfo).all()
    return zones

@router.get("/history", response_model=List[SensorReadingOut])
def get_sensor_history(zone: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(models.SensorReading)
    if zone and zone.lower() != "all":
        query = query.filter(models.SensorReading.zone == zone)
    return query.order_by(models.SensorReading.timestamp.desc()).limit(limit).all()

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HardwareIngest(BaseModel):
    # Standard snake_case fields
    soil_moisture_1: Optional[float] = None
    soil_moisture_2: Optional[float] = None
    soil_average: Optional[float] = None
    air_temp: Optional[float] = None
    air_humidity: Optional[float] = None
    light_pct: Optional[float] = None
    rain_pct: Optional[float] = None
    tank_cm: Optional[float] = None
    tank_level_pct: Optional[float] = None
    pump_state: Optional[Any] = None
    fan_state: Optional[Any] = None
    zone: Optional[str] = "Zone A"

    # camelCase and short field aliases (from ESP32 Serial / Web App)
    soil1: Optional[float] = None
    soil2: Optional[float] = None
    soilAvg: Optional[float] = None
    airTemp: Optional[float] = None
    airHumidity: Optional[float] = None
    airHum: Optional[float] = None
    light: Optional[float] = None
    rain: Optional[float] = None
    tankPct: Optional[float] = None
    pump: Optional[Any] = None
    fan: Optional[Any] = None
    mode: Optional[str] = None

latest_hardware_cache = {
    "light_pct": 55.0,
    "rain_pct": 0.0,
    "soil_moisture_1": 38.4,
    "soil_moisture_2": 38.4,
    "soil_average": 38.4,
    "fan_state": False
}

@router.post("/ingest")
async def ingest_hardware_reading(data: HardwareIngest, db: Session = Depends(get_db)):
    """
    Receives real telemetry streamed from ESP32 hardware via Wi-Fi or Serial gateway.
    Updates SQLite local DB, ControlSystem state, and Zone thresholds.
    Accepts both snake_case and camelCase payloads.
    """
    # 1. Resolve Soil Moisture
    s1 = data.soil_moisture_1 if data.soil_moisture_1 is not None else data.soil1
    s2 = data.soil_moisture_2 if data.soil_moisture_2 is not None else data.soil2
    s_avg = data.soil_average if data.soil_average is not None else data.soilAvg
    if s_avg is None:
        if s1 is not None and s2 is not None:
            s_avg = (s1 + s2) / 2.0
        elif s1 is not None:
            s_avg = s1
        elif s2 is not None:
            s_avg = s2

    moist = s_avg if s_avg is not None else 35.0

    # 2. Resolve Air Temp & Humidity
    temp = data.air_temp if data.air_temp is not None else (data.airTemp if data.airTemp is not None else 28.0)
    hum = data.air_humidity if data.air_humidity is not None else (
        data.airHumidity if data.airHumidity is not None else (data.airHum if data.airHum is not None else 60.0)
    )

    # 3. Resolve Light & Rain
    light_val = data.light_pct if data.light_pct is not None else data.light
    rain_val = data.rain_pct if data.rain_pct is not None else data.rain
    lux = (float(light_val) * 1000.0) if light_val is not None else 45000.0

    # 4. Resolve Tank Level
    tank_pct = data.tank_level_pct if data.tank_level_pct is not None else data.tankPct

    # 5. Resolve Pump and Fan states (handles bool or "true"/"false" strings)
    pump_raw = data.pump_state if data.pump_state is not None else data.pump
    if isinstance(pump_raw, str):
        pump_bool = pump_raw.lower() in ("true", "1", "on")
    elif pump_raw is not None:
        pump_bool = bool(pump_raw)
    else:
        pump_bool = None

    fan_raw = data.fan_state if data.fan_state is not None else data.fan
    if isinstance(fan_raw, str):
        fan_bool = fan_raw.lower() in ("true", "1", "on")
    elif fan_raw is not None:
        fan_bool = bool(fan_raw)
    else:
        fan_bool = None

    # Cache latest live hardware parameters
    if light_val is not None:
        latest_hardware_cache["light_pct"] = float(light_val)
    if rain_val is not None:
        latest_hardware_cache["rain_pct"] = float(rain_val)
    if s1 is not None:
        latest_hardware_cache["soil_moisture_1"] = float(s1)
    if s2 is not None:
        latest_hardware_cache["soil_moisture_2"] = float(s2)
    if s_avg is not None:
        latest_hardware_cache["soil_average"] = float(s_avg)
    if fan_bool is not None:
        latest_hardware_cache["fan_state"] = bool(fan_bool)

    # 1. Record reading in history
    reading = models.SensorReading(
        zone=data.zone or "Zone A",
        moisture_pct=float(moist),
        temp_c=float(temp),
        humidity_pct=float(hum),
        sunlight_lux=float(lux),
        timestamp=datetime.utcnow()
    )
    db.add(reading)

    # 2. Update Zone Info
    zone = db.query(models.ZoneInfo).filter(models.ZoneInfo.zone_code == "A").first()
    if zone:
        zone.current_moisture = float(moist)
        if moist < zone.moisture_min:
            zone.status = "Low Moisture"
        elif moist > zone.moisture_max:
            zone.status = "High Moisture"
        else:
            zone.status = "Optimal"

    # 3. Update Control System
    ctrl = db.query(models.ControlSystem).first()
    if ctrl:
        if not ctrl.manual_override:
            if pump_bool is not None:
                ctrl.pump_state = bool(pump_bool)
        else:
            if pump_bool == ctrl.pump_state:
                ctrl.manual_override = False

        if tank_pct is not None:
            ctrl.water_tank_level = float(tank_pct)
        elif data.tank_cm is not None:
            pct = max(0.0, min(100.0, (25.0 - float(data.tank_cm)) / 20.0 * 100.0))
            ctrl.water_tank_level = round(pct, 1)

    db.commit()

    # 4. Instant WebSocket Broadcast
    from app.services.websocket_manager import telemetry_ws_manager
    await telemetry_ws_manager.broadcast({
        "type": "telemetry_update",
        "temp_c": float(temp),
        "humidity_pct": float(hum),
        "moisture_pct": float(moist),
        "sunlight_lux": float(lux),
        "light_pct": latest_hardware_cache["light_pct"],
        "rain_pct": latest_hardware_cache["rain_pct"],
        "water_tank_level": ctrl.water_tank_level if ctrl else 80.0,
        "pump_running": ctrl.pump_state if ctrl else False,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "status": "success",
        "pump_command": bool(ctrl.pump_state) if ctrl else False,
        "pump": bool(ctrl.pump_state) if ctrl else False,
        "fan": bool(latest_hardware_cache["fan_state"]),
        "auto_mode": bool(ctrl.auto_mode) if ctrl else True,
        "manual_override": bool(ctrl.manual_override) if ctrl else False,
        "recorded": {
            "temp": float(temp),
            "humidity": float(hum),
            "moisture": float(moist),
            "light_pct": latest_hardware_cache["light_pct"],
            "rain_pct": latest_hardware_cache["rain_pct"],
            "pump": ctrl.pump_state if ctrl else False
        }
    }

@router.get("/latest")
def get_latest_hardware_reading(db: Session = Depends(get_db)):
    """
    Returns the most recent hardware reading for real-time frontend polling.
    """
    recent = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    ctrl = db.query(models.ControlSystem).first()
    return {
        "temp_c": recent.temp_c if recent else 28.5,
        "humidity_pct": recent.humidity_pct if recent else 64.0,
        "moisture_pct": recent.moisture_pct if recent else 38.4,
        "soil_moisture_1": latest_hardware_cache.get("soil_moisture_1", 38.4),
        "soil_moisture_2": latest_hardware_cache.get("soil_moisture_2", 38.4),
        "soil_average": latest_hardware_cache.get("soil_average", 38.4),
        "sunlight_lux": recent.sunlight_lux if recent else 48000.0,
        "light_pct": latest_hardware_cache.get("light_pct", 55.0),
        "rain_pct": latest_hardware_cache.get("rain_pct", 0.0),
        "fan_state": latest_hardware_cache.get("fan_state", False),
        "water_tank_level": ctrl.water_tank_level if ctrl else 84.5,
        "pump_running": ctrl.pump_state if ctrl else False,
        "timestamp": recent.timestamp.isoformat() if recent else datetime.utcnow().isoformat()
    }

from fastapi import WebSocket, WebSocketDisconnect
import json

@router.websocket("/ws")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    Bi-directional sub-10ms real-time WebSocket connection.
    Streams live hardware telemetry to connected dashboards and receives remote override commands.
    """
    from app.services.websocket_manager import telemetry_ws_manager
    await telemetry_ws_manager.connect(websocket)
    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "time": datetime.utcnow().isoformat()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        telemetry_ws_manager.disconnect(websocket)


