from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(100), unique=True, index=True, default=None)
    name = Column(String(120), nullable=True, default=None)
    role = Column(String(50), default="farmer") # farmer, wholesaler, vendor, factory, customer, expert
    business_name = Column(String(150), nullable=True, default=None)
    email = Column(String(120), nullable=True, default=None)
    phone = Column(String(30), nullable=True, default=None)
    state = Column(String(60), nullable=True, default=None)
    district = Column(String(60), nullable=True, default=None)
    village = Column(String(60), nullable=True, default=None)
    farm_size_acres = Column(Float, nullable=True, default=None)
    primary_crop = Column(String(60), nullable=True, default=None)
    soil_type = Column(String(60), nullable=True, default=None)
    irrigation_system = Column(String(60), nullable=True, default=None)
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
