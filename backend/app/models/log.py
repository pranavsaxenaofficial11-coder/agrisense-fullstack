from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String(20), default="INFO") # INFO, WARN, ALERT, SUCCESS
    category = Column(String(50), default="SYSTEM") # PUMP, SENSOR, AI, SECURITY, USER
    message = Column(String(255))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class GovtScheme(Base):
    __tablename__ = "govt_schemes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150))
    short_code = Column(String(50))
    category = Column(String(80)) # Direct Benefit, Irrigation Subsidy, Solar, Insurance
    benefit = Column(String(255))
    eligibility = Column(String(255))
    documents = Column(String(255))
    apply_url = Column(String(255))
