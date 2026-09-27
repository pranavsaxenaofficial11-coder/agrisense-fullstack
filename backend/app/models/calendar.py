from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    crop_name = Column(String(80))
    stage = Column(String(60)) # Sowing, Vegetative, Flowering, Fruiting, Harvesting
    title = Column(String(150))
    action_type = Column(String(60)) # Irrigation, Fertilization, Spraying, Weeding, Harvest
    target_date = Column(String(30)) # YYYY-MM-DD
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
