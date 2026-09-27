from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(100), unique=True, index=True, default="user_default")
    name = Column(String(120), default="Pranav Saxena")
    email = Column(String(120), default="pranav@agrisense.io")
    phone = Column(String(30), default="+91 98765 43210")
    state = Column(String(60), default="Punjab")
    district = Column(String(60), default="Ludhiana")
    village = Column(String(60), default="Samrala")
    farm_size_acres = Column(Float, default=12.5)
    primary_crop = Column(String(60), default="Tomato & Wheat")
    soil_type = Column(String(60), default="Loamy")
    irrigation_system = Column(String(60), default="Drip Irrigation")
    points = Column(Integer, default=1420)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
