from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

class SensorReadingOut(BaseModel):
    id: int
    zone: str
    moisture_pct: float
    temp_c: float
    humidity_pct: float
    sunlight_lux: float
    npk_n: float
    npk_p: float
    npk_k: float
    timestamp: datetime

    class Config:
        from_attributes = True

class ZoneInfoOut(BaseModel):
    id: int
    zone_code: str
    name: str
    crop: str
    moisture_min: float
    moisture_max: float
    current_moisture: float
    status: str

    class Config:
        from_attributes = True

class FieldOverview(BaseModel):
    ambient_temp: float
    humidity: float
    sunlight_lux: float
    water_tank_level: float
    pump_running: bool
    zones: List[ZoneInfoOut]
    recent_readings: List[SensorReadingOut]
    sparkline_moisture: List[float]
