from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.services.seed_data import seed_database
import app.models # Register all models

from app.routes import (
    sensors,
    controls,
    ai,
    market,
    community,
    transport,
    finance,
    calendar,
    schemes,
    user,
    weather,
    logs
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Precision Agriculture IoT & Agronomy AI Backend for AgriSense",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all domain routers
app.include_router(sensors.router)
app.include_router(controls.router)
app.include_router(ai.router)
app.include_router(market.router)
app.include_router(community.router)
app.include_router(transport.router)
app.include_router(finance.router)
app.include_router(calendar.router)
app.include_router(schemes.router)
app.include_router(user.router)
app.include_router(weather.router)
app.include_router(logs.router)

@app.on_event("startup")
def on_startup():
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seeder warning: {e}")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "AgriSense API",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/api/health")
def health():
    return {"status": "healthy", "database": "connected"}
