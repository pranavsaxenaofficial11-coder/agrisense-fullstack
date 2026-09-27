from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
import app.models as models

router = APIRouter(prefix="/api/calendar", tags=["Crop Calendar"])

class CalendarEventOut(BaseModel):
    id: int
    crop_name: str
    stage: str
    title: str
    action_type: str
    target_date: str
    is_completed: bool

    class Config:
        from_attributes = True

class CalendarEventCreate(BaseModel):
    crop_name: str
    stage: str
    title: str
    action_type: str
    target_date: str

@router.get("", response_model=List[CalendarEventOut])
def get_calendar_events(db: Session = Depends(get_db)):
    return db.query(models.CalendarEvent).order_by(models.CalendarEvent.target_date.asc()).all()

@router.post("", response_model=CalendarEventOut)
def add_calendar_event(event: CalendarEventCreate, db: Session = Depends(get_db)):
    db_item = models.CalendarEvent(**event.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.post("/{event_id}/toggle", response_model=CalendarEventOut)
def toggle_event_status(event_id: int, db: Session = Depends(get_db)):
    evt = db.query(models.CalendarEvent).filter(models.CalendarEvent.id == event_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    evt.is_completed = not evt.is_completed
    db.commit()
    db.refresh(evt)
    return evt
