import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
import app.models

logger = logging.getLogger(__name__)

def seed_database():
    """Initializes SQLite schema without injecting any mock/demo data."""
    Base.metadata.create_all(bind=engine)
    logger.info("[OK] SQLite schema verified. Zero mock data injected.")
