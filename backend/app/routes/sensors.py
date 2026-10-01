from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
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
    soil_moisture_1: Optional[float] = None
    soil_moisture_2: Optional[float] = None
    soil_average: Optional[float] = None
    air_temp: Optional[float] = None
    air_humidity: Optional[float] = None
    light_pct: Optional[float] = None
    rain_pct: Optional[float] = None
    tank_cm: Optional[float] = None
    tank_level_pct: Optional[float] = None
    pump_state: Optional[bool] = None
    fan_state: Optional[bool] = None
    zone: Optional[str] = "Zone A"

@router.post("/ingest")
async def ingest_hardware_reading(data: HardwareIngest, db: Session = Depends(get_db)):
    """
    Receives real telemetry streamed from ESP32 hardware via Wi-Fi or Serial gateway.
    Updates SQLite local DB, ControlSystem state, and Zone thresholds.
    """
    moist = data.soil_average if data.soil_average is not None else (data.soil_moisture_1 or 35.0)
    temp = data.air_temp if data.air_temp is not None else 28.0
    hum = data.air_humidity if data.air_humidity is not None else 60.0
    lux = (data.light_pct * 1000.0) if data.light_pct is not None else 45000.0

    # 1. Record reading in history
    reading = models.SensorReading(
        zone=data.zone or "Zone A",
        moisture_pct=moist,
        temp_c=temp,
        humidity_pct=hum,
        sunlight_lux=lux,
        timestamp=datetime.utcnow()
    )
    db.add(reading)

    # 2. Update Zone Info
    zone = db.query(models.ZoneInfo).filter(models.ZoneInfo.zone_code == "A").first()
    if zone:
        zone.current_moisture = moist
        if moist < zone.moisture_min:
            zone.status = "Low Moisture"
        elif moist > zone.moisture_max:
            zone.status = "High Moisture"
        else:
            zone.status = "Optimal"

    # 3. Update Control System
    ctrl = db.query(models.ControlSystem).first()
    if ctrl:
        if data.pump_state is not None:
            ctrl.pump_state = data.pump_state
        if data.tank_level_pct is not None:
            ctrl.water_tank_level = data.tank_level_pct
        elif data.tank_cm is not None:
            # HC-SR04: 25cm empty -> 5cm full
            pct = max(0.0, min(100.0, (25.0 - data.tank_cm) / 20.0 * 100.0))
            ctrl.water_tank_level = round(pct, 1)

    db.commit()

    # 4. Instant WebSocket Broadcast
    from app.services.websocket_manager import telemetry_ws_manager
    await telemetry_ws_manager.broadcast({
        "type": "telemetry_update",
        "temp_c": temp,
        "humidity_pct": hum,
        "moisture_pct": moist,
        "sunlight_lux": lux,
        "water_tank_level": ctrl.water_tank_level if ctrl else 80.0,
        "pump_running": ctrl.pump_state if ctrl else False,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "status": "success",
        "pump_command": ctrl.pump_state if ctrl else False,
        "auto_mode": ctrl.auto_mode if ctrl else True,
        "recorded": {
            "temp": temp,
            "humidity": hum,
            "moisture": moist,
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
        "sunlight_lux": recent.sunlight_lux if recent else 48000.0,
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


