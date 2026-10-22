import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

DEFAULT_SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agrisense.db")

class Settings(BaseModel):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "AgriSense API")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    DB_TYPE: str = os.getenv("DB_TYPE", "sqlite")  # "sqlite" for primary storage
    ENABLE_MONGODB: bool = os.getenv("ENABLE_MONGODB", "false").lower() in ("true", "1", "yes")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")
    MONGODB_URL: str = os.getenv("MONGODB_URL", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "agrisense")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "agrisense_secret_key_2026")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GMAPS_KEY: str = os.getenv("GMAPS_KEY", "")
    DATA_GOV_IN_API_KEY: str = os.getenv("DATA_GOV_IN_API_KEY", "")
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
