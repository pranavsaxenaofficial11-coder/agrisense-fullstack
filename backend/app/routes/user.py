from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
import app.models as models
from app.schemas.user import UserProfileOut, UserProfileUpdate

router = APIRouter(prefix="/api/user", tags=["User Profile"])

@router.get("/profile", response_model=UserProfileOut)
def get_user_profile(db: Session = Depends(get_db)):
    user = db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/profile", response_model=UserProfileOut)
def update_user_profile(update: UserProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, val in update.dict(exclude_unset=True).items():
        setattr(user, field, val)

    db.commit()
    db.refresh(user)
    return user
