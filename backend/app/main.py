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
    logs,
    mongodb
)
from app.mongodb import connect_to_mongodb, close_mongodb_connection
from app.services.mongodb_service import seed_mongodb_if_empty

# Initialize database schema (SQLite)
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
app.include_router(mongodb.router)

@app.on_event("startup")
async def on_startup():
    # 1. Seed SQLite (Local DB)
    try:
        seed_database()
    except Exception as e:
        print(f"SQLite startup seeder warning: {e}")

    # 2. Connect and seed MongoDB (Cloud / IoT DB)
    try:
        connected = await connect_to_mongodb()
        if connected:
            await seed_mongodb_if_empty()
    except Exception as e:
        print(f"MongoDB startup warning: {e}")

@app.on_event("shutdown")
async def on_shutdown():
    await close_mongodb_connection()

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
