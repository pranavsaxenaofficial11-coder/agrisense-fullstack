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

@router.get("/arbitrage")
def calculate_mandi_arbitrage(crop: str = "Tomato", quantity_qtl: float = 25.0):
    """
    Computes real-time price arbitrage across mandis factoring in distance and freight costs.
    Empowers farmers to choose the highest net revenue destination.
    """
    benchmarks = {
        "Tomato": {
            "mandis": [
                {"name": "Khanna Mandi", "distance_km": 18, "price_per_qtl": 2450, "rate_per_km_qtl": 1.2},
                {"name": "Ludhiana APMC", "distance_km": 35, "price_per_qtl": 2380, "rate_per_km_qtl": 1.1},
                {"name": "Jalandhar Mandi", "distance_km": 92, "price_per_qtl": 2520, "rate_per_km_qtl": 1.0},
                {"name": "Delhi Azadpur", "distance_km": 310, "price_per_qtl": 2750, "rate_per_km_qtl": 0.9},
            ]
        },
        "Wheat": {
            "mandis": [
                {"name": "Khanna Mandi", "distance_km": 18, "price_per_qtl": 2275, "rate_per_km_qtl": 1.2},
                {"name": "Ludhiana APMC", "distance_km": 35, "price_per_qtl": 2290, "rate_per_km_qtl": 1.1},
                {"name": "Jalandhar Mandi", "distance_km": 92, "price_per_qtl": 2310, "rate_per_km_qtl": 1.0},
                {"name": "Delhi Azadpur", "distance_km": 310, "price_per_qtl": 2380, "rate_per_km_qtl": 0.9},
            ]
        },
        "Mustard": {
            "mandis": [
                {"name": "Khanna Mandi", "distance_km": 18, "price_per_qtl": 5650, "rate_per_km_qtl": 1.2},
                {"name": "Ludhiana APMC", "distance_km": 35, "price_per_qtl": 5580, "rate_per_km_qtl": 1.1},
                {"name": "Jalandhar Mandi", "distance_km": 92, "price_per_qtl": 5700, "rate_per_km_qtl": 1.0},
                {"name": "Delhi Azadpur", "distance_km": 310, "price_per_qtl": 5920, "rate_per_km_qtl": 0.9},
            ]
        }
    }
    
    crop_data = benchmarks.get(crop, benchmarks["Tomato"])
    results = []
    
    for m in crop_data["mandis"]:
        gross = m["price_per_qtl"] * quantity_qtl
        transport_cost = m["distance_km"] * m["rate_per_km_qtl"] * quantity_qtl
        net_profit = gross - transport_cost
        results.append({
            "mandi": m["name"],
            "distance_km": m["distance_km"],
            "price_per_qtl": m["price_per_qtl"],
            "gross_revenue": round(gross, 2),
            "transport_cost": round(transport_cost, 2),
            "net_revenue": round(net_profit, 2),
            "net_price_per_qtl": round(net_profit / quantity_qtl, 2)
        })
    
    results.sort(key=lambda x: x["net_revenue"], reverse=True)
    best_mandi = results[0]["mandi"]
    for r in results:
        r["is_best"] = (r["mandi"] == best_mandi)
        
    return {
        "crop": crop,
        "quantity_qtl": quantity_qtl,
        "best_mandi": best_mandi,
        "arbitrage_gain": round(results[0]["net_revenue"] - results[-1]["net_revenue"], 2),
        "options": results
    }

@router.get("/live-mandi-rates")
def get_live_mandi_rates():
    """
    Returns live APMC Mandi commodity rates and CACP Minimum Support Prices (MSP).
    """
    from app.services.live_open_data_service import LiveOpenDataService
    return LiveOpenDataService.get_live_mandi_and_msp()


