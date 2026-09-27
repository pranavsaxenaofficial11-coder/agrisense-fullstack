from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
import app.models as models
from app.schemas.market import (
    MarketListingOut, MarketListingCreate,
    BuyerRequirementOut, BuyerRequirementCreate
)

router = APIRouter(prefix="/api/market", tags=["Marketplace"])

@router.get("", response_model=List[MarketListingOut])
def get_listings(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.MarketListing).filter(models.MarketListing.is_available == True)
    if category and category.lower() != "all":
        query = query.filter(models.MarketListing.category.ilike(f"%{category}%"))
    return query.order_by(models.MarketListing.created_at.desc()).all()

@router.post("", response_model=MarketListingOut)
def create_listing(listing: MarketListingCreate, db: Session = Depends(get_db)):
    db_item = models.MarketListing(**listing.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/requirements", response_model=List[BuyerRequirementOut])
def get_requirements(db: Session = Depends(get_db)):
    return db.query(models.BuyerRequirement).order_by(models.BuyerRequirement.created_at.desc()).all()

@router.post("/requirements", response_model=BuyerRequirementOut)
def create_requirement(req: BuyerRequirementCreate, db: Session = Depends(get_db)):
    db_item = models.BuyerRequirement(**req.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
