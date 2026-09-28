from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
import app.models as models
from app.schemas.user import UserProfileOut, UserProfileUpdate

from typing import List, Optional

router = APIRouter(prefix="/api/user", tags=["User Profile"])

@router.get("/all", response_model=List[UserProfileOut])
def get_all_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve all users or filter by role (farmer, wholesaler, vendor, factory, customer, expert)."""
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    return query.all()

@router.get("/profile", response_model=UserProfileOut)
def get_user_profile(uid: Optional[str] = None, db: Session = Depends(get_db)):
    """Get active user profile (defaults to primary farmer or specified uid)."""
    if uid:
        user = db.query(models.User).filter(models.User.uid == uid).first()
    else:
        user = db.query(models.User).filter(models.User.role == "farmer").first() or db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/profile", response_model=UserProfileOut)
def update_user_profile(update: UserProfileUpdate, uid: Optional[str] = None, db: Session = Depends(get_db)):
    if uid:
        user = db.query(models.User).filter(models.User.uid == uid).first()
    else:
        user = db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, val in update.dict(exclude_unset=True).items():
        setattr(user, field, val)

    db.commit()
    db.refresh(user)
    return user
