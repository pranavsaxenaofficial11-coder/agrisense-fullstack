import httpx
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
    ctrl.manual_override = True

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

@router.post("/pump/stop", response_model=ControlStatusOut)
async def stop_pump(db: Session = Depends(get_db)):
    """Explicitly stops the irrigation pump immediately."""
    ctrl = get_or_create_controls(db)
    ctrl.pump_state = False
    ctrl.manual_override = True

    log = models.ActivityLog(
        level="WARNING",
        category="PUMP",
        message="Irrigation pump STOPPED via FastAPI control endpoint."
    )
    db.add(log)
    db.commit()
    db.refresh(ctrl)

    # Dispatch to hardware gateway
    from app.routes.iot import _hardware_registry
    cam_ip = _hardware_registry.get("last_seen_ip") or "192.168.4.1"
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            await client.get(f"http://{cam_ip}/relay/pump?state=off")
    except Exception:
        pass

    return ctrl

@router.post("/pump/start", response_model=ControlStatusOut)
async def start_pump(db: Session = Depends(get_db)):
    """Explicitly starts the irrigation pump."""
    ctrl = get_or_create_controls(db)
    ctrl.pump_state = True
    ctrl.manual_override = True

    log = models.ActivityLog(
        level="INFO",
        category="PUMP",
        message="Irrigation pump STARTED via FastAPI control endpoint."
    )
    db.add(log)
    db.commit()
    db.refresh(ctrl)

    from app.routes.iot import _hardware_registry
    cam_ip = _hardware_registry.get("last_seen_ip") or "192.168.4.1"
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            await client.get(f"http://{cam_ip}/relay/pump?state=on")
    except Exception:
        pass

    return ctrl

@router.post("/emergency-stop")
async def emergency_stop(db: Session = Depends(get_db)):
    """Halts all farm actuators immediately (Pump, Fan, Auto-irrigation)."""
    from app.routes.iot import stop_hardware_actuators, StopActuatorRequest
    return await stop_hardware_actuators(StopActuatorRequest(target="all", reason="Emergency Stop via Controls API"), db)

@router.post("/resume")
def resume_automation(db: Session = Depends(get_db)):
    """Resumes standard automatic sensor-driven irrigation cycles."""
    from app.routes.iot import resume_hardware_operations
    return resume_hardware_operations(db)

@router.put("", response_model=ControlStatusOut)
def update_controls(update: ControlUpdateRequest, db: Session = Depends(get_db)):
    ctrl = get_or_create_controls(db)
    update_data = update.dict(exclude_unset=True)

    for field, val in update_data.items():
        setattr(ctrl, field, val)

    db.commit()
    db.refresh(ctrl)
    return ctrl
