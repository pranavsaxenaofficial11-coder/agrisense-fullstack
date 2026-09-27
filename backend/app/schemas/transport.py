from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class TransportListingOut(BaseModel):
    id: int
    owner_name: str
    vehicle_type: str
    capacity: str
    rate: str
    location: str
    phone: str
    is_available: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TransportListingCreate(BaseModel):
    owner_name: str
    vehicle_type: str
    capacity: str
    rate: str
    location: str
    phone: str
    notes: Optional[str] = None

class FinanceRecordOut(BaseModel):
    id: int
    entry_type: str
    category: str
    amount: float
    description: str
    entry_date: str
    created_at: datetime

    class Config:
        from_attributes = True

class FinanceRecordCreate(BaseModel):
    entry_type: str
    category: str
    amount: float
    description: str
    entry_date: str

class FinanceSummary(BaseModel):
    total_income: float
    total_expenses: float
    net_profit: float
    top_expense_category: str
