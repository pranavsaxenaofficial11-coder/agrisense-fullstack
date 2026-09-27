from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class MarketListingOut(BaseModel):
    id: int
    title: str
    category: str
    crop_name: str
    quantity: float
    unit: str
    price_per_unit: float
    mandi_benchmark: float
    quality_grade: str
    location: str
    seller_name: str
    seller_phone: str
    description: Optional[str] = None
    is_available: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MarketListingCreate(BaseModel):
    title: str
    category: str
    crop_name: str
    quantity: float
    unit: str = "Quintal"
    price_per_unit: float
    mandi_benchmark: Optional[float] = 0.0
    quality_grade: Optional[str] = "Grade A"
    location: str
    seller_name: str
    seller_phone: str
    description: Optional[str] = None

class BuyerRequirementOut(BaseModel):
    id: int
    buyer_name: str
    company: Optional[str] = None
    crop_name: str
    quantity_needed: float
    unit: str
    max_budget_per_unit: float
    delivery_location: str
    contact_phone: str
    urgency: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BuyerRequirementCreate(BaseModel):
    buyer_name: str
    company: Optional[str] = None
    crop_name: str
    quantity_needed: float
    unit: str = "Quintal"
    max_budget_per_unit: float
    delivery_location: str
    contact_phone: str
    urgency: Optional[str] = "Standard"
    notes: Optional[str] = None
