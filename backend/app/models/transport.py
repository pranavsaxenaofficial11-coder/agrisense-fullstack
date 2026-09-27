from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.database import Base

class TransportListing(Base):
    __tablename__ = "transport_listings"

    id = Column(Integer, primary_key=True, index=True)
    owner_name = Column(String(100))
    vehicle_type = Column(String(80)) # Tractor with Rotavator, 407 Mini-Truck, Combine Harvester, Tractor Trolley
    capacity = Column(String(60)) # 5 Ton, 55 HP, 10 Ton
    rate = Column(String(60)) # ₹750/hour, ₹30/km
    location = Column(String(100))
    phone = Column(String(30))
    is_available = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
