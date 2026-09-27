from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
import app.models as models
from app.schemas.sensor import SensorReadingOut, ZoneInfoOut, FieldOverview

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])

@router.get("/overview", response_model=FieldOverview)
def get_field_overview(db: Session = Depends(get_db)):
    ctrl = db.query(models.ControlSystem).first()
    zones = db.query(models.ZoneInfo).all()
    recent = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).limit(15).all()

    # Generate sparkline list from recent Zone A moisture readings
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
    return db.query(models.ZoneInfo).all()

@router.get("/history", response_model=List[SensorReadingOut])
def get_sensor_history(zone: str = "Zone A", limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.SensorReading).filter(models.SensorReading.zone == zone).order_by(models.SensorReading.timestamp.desc()).limit(limit).all()
