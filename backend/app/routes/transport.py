from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
import app.models as models
from app.schemas.transport import TransportListingOut, TransportListingCreate

router = APIRouter(prefix="/api/transport", tags=["Transport & Logistics"])

@router.get("", response_model=List[TransportListingOut])
def get_transport_listings(db: Session = Depends(get_db)):
    return db.query(models.TransportListing).filter(models.TransportListing.is_available == True).order_by(models.TransportListing.created_at.desc()).all()

@router.post("", response_model=TransportListingOut)
def create_transport_listing(listing: TransportListingCreate, db: Session = Depends(get_db)):
    db_item = models.TransportListing(**listing.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
