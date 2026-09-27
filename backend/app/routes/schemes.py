from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
import app.models as models

router = APIRouter(prefix="/api/schemes", tags=["Govt Schemes"])

class GovtSchemeOut(BaseModel):
    id: int
    name: str
    short_code: str
    category: str
    benefit: str
    eligibility: str
    documents: str
    apply_url: str

    class Config:
        from_attributes = True

@router.get("", response_model=List[GovtSchemeOut])
def get_schemes(db: Session = Depends(get_db)):
    return db.query(models.GovtScheme).all()
