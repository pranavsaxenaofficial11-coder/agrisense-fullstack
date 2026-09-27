from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    zone = Column(String(50), index=True) # Zone A, Zone B, Zone C, Zone D
    moisture_pct = Column(Float)
    temp_c = Column(Float)
    humidity_pct = Column(Float)
    sunlight_lux = Column(Float, default=45000.0)
    npk_n = Column(Float, default=140.0)
    npk_p = Column(Float, default=48.0)
    npk_k = Column(Float, default=195.0)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class ZoneInfo(Base):
    __tablename__ = "zone_info"

    id = Column(Integer, primary_key=True, index=True)
    zone_code = Column(String(20), unique=True, index=True) # A, B, C, D
    name = Column(String(100)) # North Greenhouse, South Open Field, etc.
    crop = Column(String(100))
    moisture_min = Column(Float, default=30.0)
    moisture_max = Column(Float, default=65.0)
    current_moisture = Column(Float, default=42.0)
    status = Column(String(50), default="Optimal")
