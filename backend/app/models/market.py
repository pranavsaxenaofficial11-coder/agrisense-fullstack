from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from app.database import Base

class MarketListing(Base):
    __tablename__ = "market_listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150))
    category = Column(String(50)) # Vegetables, Grains, Fruits, Pulses, Spices
    crop_name = Column(String(100))
    quantity = Column(Float)
    unit = Column(String(20), default="Quintal") # Quintal, Kg, Ton
    price_per_unit = Column(Float)
    mandi_benchmark = Column(Float, default=0.0)
    quality_grade = Column(String(20), default="Grade A")
    location = Column(String(100))
    seller_name = Column(String(100))
    seller_phone = Column(String(30))
    seller_uid = Column(String(100), default="user_default")
    description = Column(Text, nullable=True)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BuyerRequirement(Base):
    __tablename__ = "buyer_requirements"

    id = Column(Integer, primary_key=True, index=True)
    buyer_name = Column(String(120))
    company = Column(String(150), nullable=True)
    crop_name = Column(String(100))
    quantity_needed = Column(Float)
    unit = Column(String(20), default="Quintal")
    max_budget_per_unit = Column(Float)
    delivery_location = Column(String(120))
    contact_phone = Column(String(30))
    urgency = Column(String(30), default="Standard") # Immediate, Within 7 Days, Standard
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
