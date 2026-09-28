from pydantic import BaseModel
from typing import Optional

class UserProfileOut(BaseModel):
    id: int
    uid: str
    name: str
    role: str = "farmer"
    business_name: Optional[str] = "Saxena Family Farm"
    email: str
    phone: str
    state: str
    district: str
    village: str
    farm_size_acres: float
    primary_crop: str
    soil_type: str
    irrigation_system: str
    points: int

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    business_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    farm_size_acres: Optional[float] = None
    primary_crop: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_system: Optional[str] = None
