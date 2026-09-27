from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
import app.models as models

router = APIRouter(prefix="/api/logs", tags=["Activity Logs"])

class LogOut(BaseModel):
    id: int
    level: str
    category: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=List[LogOut])
def get_logs(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc()).limit(limit).all()
