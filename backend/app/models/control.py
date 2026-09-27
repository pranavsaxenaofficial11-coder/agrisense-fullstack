from datetime import datetime
from sqlalchemy import Column, Integer, Boolean, Float, DateTime
from app.database import Base

class ControlSystem(Base):
    __tablename__ = "control_system"

    id = Column(Integer, primary_key=True, index=True)
    pump_state = Column(Boolean, default=False)
    auto_mode = Column(Boolean, default=True)
    manual_override = Column(Boolean, default=False)
    pump_runtime_minutes = Column(Integer, default=45)
    water_tank_level = Column(Float, default=82.5) # Percentage
    valve_a = Column(Boolean, default=True)
    valve_b = Column(Boolean, default=False)
    valve_c = Column(Boolean, default=False)
    valve_d = Column(Boolean, default=False)
    flow_rate_lpm = Column(Float, default=14.2)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
