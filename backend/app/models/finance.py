from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base

class FinanceRecord(Base):
    __tablename__ = "finance_records"

    id = Column(Integer, primary_key=True, index=True)
    entry_type = Column(String(20)) # income or expense
    category = Column(String(60)) # Seeds, Fertilizer, Labor, Power, Harvest Sale, Subsidy
    amount = Column(Float)
    description = Column(String(200))
    entry_date = Column(String(30)) # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.utcnow)
