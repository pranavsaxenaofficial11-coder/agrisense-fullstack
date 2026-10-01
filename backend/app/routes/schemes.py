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

REAL_GOVT_SCHEMES = [
    GovtSchemeOut(
        id=1,
        name="PM-KUSUM (Solar Agricultural Pumps Scheme)",
        short_code="PM-KUSUM",
        category="Solar & Renewable Energy",
        benefit="Up to 60% government subsidy (30% Central + 30% State) for installing standalone solar irrigation pumps (3HP to 10HP) + 30% bank loan.",
        eligibility="Farmers, Panchayats, FPOs, and Water User Associations with cultivable agricultural land.",
        documents="Aadhaar Card, Land Ownership Revenue Record (7/12 or Jamabandi), Bank Account Passbook, Water Source Certificate.",
        apply_url="https://pmkusum.mnre.gov.in/"
    ),
    GovtSchemeOut(
        id=2,
        name="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        short_code="PM-KISAN",
        category="Income Support & DBT",
        benefit="₹6,000 per year in three equal 4-monthly installments of ₹2,000 directly transferred into Aadhaar-seeded bank accounts.",
        eligibility="All landholding farmer families across India having cultivable agricultural land in their names.",
        documents="Aadhaar Card, Landholding Records (Khasra/Khatauni), Bank Account Details, e-KYC Verification.",
        apply_url="https://pmkisan.gov.in/"
    ),
    GovtSchemeOut(
        id=3,
        name="PMFBY (Pradhan Mantri Fasal Bima Yojana)",
        short_code="PMFBY",
        category="Crop Insurance & Risk Shield",
        benefit="Comprehensive non-preventable crop loss insurance from pre-sowing to post-harvest with 1.5% premium for Rabi crops and 2% for Kharif crops.",
        eligibility="All farmers including sharecroppers and tenant farmers growing notified crops in notified areas.",
        documents="Aadhaar Card, Sowing Certificate / Girdawari, Land Possession Document / Lease Agreement, Bank Passbook.",
        apply_url="https://pmfby.gov.in/"
    ),
    GovtSchemeOut(
        id=4,
        name="SMAM (Sub-Mission on Agricultural Mechanization)",
        short_code="SMAM",
        category="Farm Machinery & Custom Hiring",
        benefit="40% to 80% financial subsidy on modern farm implements (laser levellers, rotavators, multi-crop threshers, happy seeders).",
        eligibility="Individual farmers, Custom Hiring Centres (CHCs), Hi-tech hubs, small & marginal farmers.",
        documents="Aadhaar, Land Possession Document, Caste Certificate (if applicable), Bank Account details.",
        apply_url="https://agrimachinery.nic.in/"
    ),
    GovtSchemeOut(
        id=5,
        name="PKVY (Paramparagat Krishi Vikas Yojana)",
        short_code="PKVY",
        category="Organic Farming & PGS India",
        benefit="₹50,000 per hectare for 3 years (₹31,000 direct benefit for organic inputs, seeds, bio-fertilizers + PGS certification).",
        eligibility="Farmers forming clusters of 50 or more farmers taking up organic farming on 50 acres land.",
        documents="Cluster Registration Certificate, Aadhaar Card, Land Revenue Records, Soil Health Test Report.",
        apply_url="https://pgsindia-ncof.gov.in/"
    ),
    GovtSchemeOut(
        id=6,
        name="Agriculture Infrastructure Fund (AIF)",
        short_code="AIF",
        category="Post-Harvest & Cold Storage Debt",
        benefit="3% per annum interest subvention on bank loans up to ₹2 Crores for setting up cold storage, packhouses, assaying units, and smart silos.",
        eligibility="Agri-entrepreneurs, Startups, Primary Agricultural Credit Societies (PACS), FPOs, SHGs.",
        documents="Detailed Project Report (DPR), Land/Lease Documents, PAN Card, KYC Documents, Financial Statements.",
        apply_url="https://agriinfra.dac.gov.in/"
    )
]

@router.get("", response_model=List[GovtSchemeOut])
def get_schemes(db: Session = Depends(get_db)):
    schemes = db.query(models.GovtScheme).all()
    if not schemes:
        return REAL_GOVT_SCHEMES
    return schemes
