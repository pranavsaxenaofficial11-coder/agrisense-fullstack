from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
import app.models as models
from app.schemas.control import ControlStatusOut, ControlUpdateRequest

router = APIRouter(prefix="/api/controls", tags=["Controls"])

def get_or_create_controls(db: Session) -> models.ControlSystem:
    ctrl = db.query(models.ControlSystem).first()
    if not ctrl:
        ctrl = models.ControlSystem()
        db.add(ctrl)
        db.commit()
        db.refresh(ctrl)
    return ctrl

@router.get("", response_model=ControlStatusOut)
def get_control_status(db: Session = Depends(get_db)):
    return get_or_create_controls(db)

@router.post("/pump/toggle", response_model=ControlStatusOut)
def toggle_pump(db: Session = Depends(get_db)):
    ctrl = get_or_create_controls(db)
    ctrl.pump_state = not ctrl.pump_state

    # Log the action
    status_str = "STARTED" if ctrl.pump_state else "STOPPED"
    log = models.ActivityLog(
        level="INFO",
        category="PUMP",
        message=f"Irrigation pump {status_str} via user control panel."
    )
    db.add(log)
    db.commit()
    db.refresh(ctrl)
    return ctrl

@router.put("", response_model=ControlStatusOut)
def update_controls(update: ControlUpdateRequest, db: Session = Depends(get_db)):
    ctrl = get_or_create_controls(db)
    update_data = update.dict(exclude_unset=True)

    for field, val in update_data.items():
        setattr(ctrl, field, val)

    db.commit()
    db.refresh(ctrl)
    return ctrl
