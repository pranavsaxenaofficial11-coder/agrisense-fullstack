from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
import app.models as models
from app.schemas.transport import FinanceRecordOut, FinanceRecordCreate, FinanceSummary

router = APIRouter(prefix="/api/finance", tags=["Farm Finance"])

@router.get("", response_model=List[FinanceRecordOut])
def get_finance_records(db: Session = Depends(get_db)):
    return db.query(models.FinanceRecord).order_by(models.FinanceRecord.entry_date.desc()).all()

@router.post("", response_model=FinanceRecordOut)
def add_finance_record(record: FinanceRecordCreate, db: Session = Depends(get_db)):
    db_item = models.FinanceRecord(**record.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/summary", response_model=FinanceSummary)
def get_finance_summary(db: Session = Depends(get_db)):
    records = db.query(models.FinanceRecord).all()
    income = sum(r.amount for r in records if r.entry_type == "income")
    expenses = sum(r.amount for r in records if r.entry_type == "expense")
    net = income - expenses

    # Top expense category
    expense_cats = {}
    for r in records:
        if r.entry_type == "expense":
            expense_cats[r.category] = expense_cats.get(r.category, 0) + r.amount
    top_cat = max(expense_cats, key=expense_cats.get) if expense_cats else "None"

    return FinanceSummary(
        total_income=income,
        total_expenses=expenses,
        net_profit=net,
        top_expense_category=top_cat
    )
