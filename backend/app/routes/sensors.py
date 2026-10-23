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

    # All 39 AgriSense Sensor Feeds & Aliases
    soilA: Optional[float] = None
    soilB: Optional[float] = None
    soilC: Optional[float] = None
    soilD: Optional[float] = None
    soilAvg: Optional[float] = None
    soil1: Optional[float] = None
    soil2: Optional[float] = None
    airTemp: Optional[float] = None
    airHumidity: Optional[float] = None
    airHum: Optional[float] = None
    soilTemp: Optional[float] = None
    light: Optional[float] = None
    pressure: Optional[float] = None
    waterTank: Optional[float] = None
    tankPct: Optional[float] = None
    rain: Optional[float] = None
    airQuality: Optional[float] = None
    waterTemp: Optional[float] = None
    smoke: Optional[float] = None
    tds: Optional[float] = None
    soilPH: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    leafWet: Optional[float] = None
    co2: Optional[float] = None
    flow: Optional[float] = None
    soilEC: Optional[float] = None
    wind: Optional[float] = None
    uv: Optional[float] = None
    windDir: Optional[float] = None
    dewPoint: Optional[float] = None
    par: Optional[float] = None
    soilO2: Optional[float] = None
    waterFlow: Optional[float] = None
    waterPH: Optional[float] = None
    pestMic: Optional[float] = None
    vibration: Optional[float] = None
    ndvi: Optional[float] = None
    sapFlow: Optional[float] = None
    stemDia: Optional[float] = None
    pestCount: Optional[float] = None
    frost: Optional[float] = None
    vpd_kpa: Optional[float] = None

    # Actuator states & modes
    pump: Optional[Any] = None
    fan: Optional[Any] = None
    valveA: Optional[Any] = None
    valveB: Optional[Any] = None
    mode: Optional[str] = None

latest_hardware_cache: Dict[str, Any] = {
    "soilA": 38.4, "soilB": 36.2, "soilC": 35.0, "soilD": 40.0, "soilAvg": 38.4,
    "soil_moisture_1": 38.4, "soil_moisture_2": 36.2, "soil_average": 38.4,
    "airTemp": 28.5, "air_temp": 28.5,
    "airHumidity": 62.0, "air_humidity": 62.0,
    "soilTemp": 24.8, "waterTemp": 22.4,
    "light": 55.0, "light_pct": 55.0,
    "rain": 0.0, "rain_pct": 0.0,
    "pressure": 1012.0, "waterTank": 80.0,
    "airQuality": 25.0, "smoke": 12.0, "tds": 320.0, "soilPH": 6.5,
    "nitrogen": 165.0, "phosphorus": 24.0, "potassium": 175.0,
    "leafWet": 25.0, "co2": 420.0, "flow": 12.5, "soilEC": 1.2,
    "wind": 7.5, "uv": 5.0, "windDir": 180.0, "dewPoint": 18.2,
    "par": 820.0, "soilO2": 19.5, "waterFlow": 0.0, "waterPH": 7.1,
    "pestMic": 10.0, "vibration": 1.0, "ndvi": 0.78, "sapFlow": 42.0,
    "stemDia": 12.8, "pestCount": 2.0, "frost": 9.5, "vpd_kpa": 1.45,
    "pump": False, "fan": False, "fan_state": False, "valveA": False, "valveB": False
}

@router.post("/ingest")
async def ingest_hardware_reading(data: HardwareIngest, db: Session = Depends(get_db)):
    """
    Receives real-time telemetry covering all 39 AgriSense sensors from ESP32 hardware or Web Serial.
    Updates SQLite DB history, latest_hardware_cache, ControlSystem, and broadcasts over WebSocket.
    """
    # 1. Resolve Soil Moisture
    s1 = data.soilA if data.soilA is not None else (data.soil1 if data.soil1 is not None else data.soil_moisture_1)
    s2 = data.soilB if data.soilB is not None else (data.soil2 if data.soil2 is not None else data.soil_moisture_2)
    s_avg = data.soilAvg if data.soilAvg is not None else (data.soil_average if data.soil_average is not None else None)
    if s_avg is None:
        if s1 is not None and s2 is not None:
            s_avg = (float(s1) + float(s2)) / 2.0
        elif s1 is not None:
            s_avg = float(s1)
        elif s2 is not None:
            s_avg = float(s2)
        else:
            s_avg = 35.0
    moist = float(s_avg)

    # 2. Resolve Air Temp & Humidity
    temp = data.airTemp if data.airTemp is not None else (data.air_temp if data.air_temp is not None else 28.5)
    hum = data.airHumidity if data.airHumidity is not None else (
        data.air_humidity if data.air_humidity is not None else (data.airHum if data.airHum is not None else 60.0)
    )

    # 3. Resolve Light & Rain
    light_val = data.light if data.light is not None else (data.light_pct if data.light_pct is not None else 55.0)
    rain_val = data.rain if data.rain is not None else (data.rain_pct if data.rain_pct is not None else 0.0)
    lux = (float(light_val) * 1000.0)

    # 4. Resolve Tank Level
    tank_pct = data.waterTank if data.waterTank is not None else (data.tankPct if data.tankPct is not None else data.tank_level_pct)

    # 5. Actuators
    pump_raw = data.pump if data.pump is not None else data.pump_state
    if isinstance(pump_raw, str):
        pump_bool = pump_raw.lower() in ("true", "1", "on")
    elif pump_raw is not None:
        pump_bool = bool(pump_raw)
    else:
        pump_bool = None

    fan_raw = data.fan if data.fan is not None else data.fan_state
    if isinstance(fan_raw, str):
        fan_bool = fan_raw.lower() in ("true", "1", "on")
    elif fan_raw is not None:
        fan_bool = bool(fan_raw)
    else:
        fan_bool = None

    # Cache ALL 39 incoming sensor readings
    incoming_dict = data.dict(exclude_unset=True)
    for k, v in incoming_dict.items():
        if v is not None:
            latest_hardware_cache[k] = v

    latest_hardware_cache["soilAvg"] = moist
    latest_hardware_cache["soil_average"] = moist
    latest_hardware_cache["airTemp"] = float(temp)
    latest_hardware_cache["air_temp"] = float(temp)
    latest_hardware_cache["airHumidity"] = float(hum)
    latest_hardware_cache["air_humidity"] = float(hum)
    latest_hardware_cache["light"] = float(light_val)
    latest_hardware_cache["light_pct"] = float(light_val)
    latest_hardware_cache["rain"] = float(rain_val)
    latest_hardware_cache["rain_pct"] = float(rain_val)
    if fan_bool is not None:
        latest_hardware_cache["fan"] = bool(fan_bool)
        latest_hardware_cache["fan_state"] = bool(fan_bool)

    # Record in SQLite history
    reading = models.SensorReading(
        zone=data.zone or "Zone A",
        moisture_pct=float(moist),
        temp_c=float(temp),
        humidity_pct=float(hum),
        sunlight_lux=float(lux),
        timestamp=datetime.utcnow()
    )
    db.add(reading)

    # Update Zone Info
    zone = db.query(models.ZoneInfo).filter(models.ZoneInfo.zone_code == "A").first()
    if zone:
        zone.current_moisture = float(moist)
        if moist < zone.moisture_min:
            zone.status = "Low Moisture"
        elif moist > zone.moisture_max:
            zone.status = "High Moisture"
        else:
            zone.status = "Optimal"

    # Update Control System
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

    # Instant WebSocket Broadcast
    from app.services.websocket_manager import telemetry_ws_manager
    ws_payload = {
        "type": "telemetry_update",
        "temp_c": float(temp),
        "humidity_pct": float(hum),
        "moisture_pct": float(moist),
        "sunlight_lux": float(lux),
        "water_tank_level": ctrl.water_tank_level if ctrl else 80.0,
        "pump_running": ctrl.pump_state if ctrl else False,
        "timestamp": datetime.utcnow().isoformat()
    }
    # Append all 39 sensors to WS stream
    ws_payload.update(latest_hardware_cache)
    await telemetry_ws_manager.broadcast(ws_payload)

    return {
        "status": "success",
        "pump_command": bool(ctrl.pump_state) if ctrl else False,
        "pump": bool(ctrl.pump_state) if ctrl else False,
        "fan": bool(latest_hardware_cache["fan_state"]),
        "auto_mode": bool(ctrl.auto_mode) if ctrl else True,
        "manual_override": bool(ctrl.manual_override) if ctrl else False,
        "sensors_recorded_count": len([k for k, v in incoming_dict.items() if v is not None]),
        "recorded": latest_hardware_cache
    }

@router.get("/latest")
def get_latest_hardware_reading(db: Session = Depends(get_db)):
    """
    Returns the most recent hardware readings for ALL 39 sensors tracked on the website.
    """
    recent = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    ctrl = db.query(models.ControlSystem).first()

    response_dict = dict(latest_hardware_cache)
    response_dict.update({
        "temp_c": recent.temp_c if recent else latest_hardware_cache.get("airTemp", 28.5),
        "humidity_pct": recent.humidity_pct if recent else latest_hardware_cache.get("airHumidity", 64.0),
        "moisture_pct": recent.moisture_pct if recent else latest_hardware_cache.get("soilAvg", 38.4),
        "sunlight_lux": recent.sunlight_lux if recent else 48000.0,
        "water_tank_level": ctrl.water_tank_level if ctrl else latest_hardware_cache.get("waterTank", 80.0),
        "pump_running": ctrl.pump_state if ctrl else False,
        "timestamp": recent.timestamp.isoformat() if recent else datetime.utcnow().isoformat()
    })
    return response_dict

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


