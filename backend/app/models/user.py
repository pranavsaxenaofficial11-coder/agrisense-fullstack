from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(100), unique=True, index=True, default="user_default")
    name = Column(String(120), default="Pranav Saxena")
    role = Column(String(50), default="farmer") # farmer, wholesaler, vendor, factory, customer, expert
    business_name = Column(String(150), default="Saxena Family Farm")
    email = Column(String(120), default="pranav@agrisense.io")
    phone = Column(String(30), default="+91 98765 43210")
    state = Column(String(60), default="Punjab")
    district = Column(String(60), default="Ludhiana")
    village = Column(String(60), default="Samrala")
    farm_size_acres = Column(Float, default=12.5)
    primary_crop = Column(String(60), default="Tomato & Wheat")
    soil_type = Column(String(60), default="Loamy")
    irrigation_system = Column(String(60), default="Drip Irrigation")
    points = Column(Integer, default=0)
    login_count = Column(Integer, default=0)
    last_login = Column(String(60), default="Not done till now")
    last_ip = Column(String(50), default="Not recorded")
    user_agent = Column(Text, default=None)
    device_type = Column(String(100), default="Not detected (Not done till now)")
    active_page = Column(String(100), default="Not visited yet")
    features_used = Column(Text, default="[]")
    recent_logins = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
