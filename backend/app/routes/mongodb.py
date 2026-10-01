from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.config import settings
from app.mongodb import get_mongodb, connect_to_mongodb
from app.services.mongodb_service import log_iot_sensor_reading, seed_mongodb_if_empty

router = APIRouter(prefix="/api/mongodb", tags=["MongoDB Integration"])

class TelemetryPayload(BaseModel):
    zone: str = "A"
    soil_moisture: float
    temperature: float
    humidity: float
    npk: Optional[Dict[str, float]] = None

@router.get("")
@router.get("/")
@router.get("/status")
async def get_mongodb_status():
    """Check MongoDB connection status, database name, and collection counts."""
    if not settings.ENABLE_MONGODB:
        return {
            "enabled": False,
            "configured": bool(settings.MONGODB_URL),
            "connected": False,
            "active_db_type": settings.DB_TYPE,
            "message": "MongoDB is currently disabled. Enable anytime by setting ENABLE_MONGODB=true in .env",
            "database_name": settings.MONGODB_DB_NAME
        }

    db = get_mongodb()
    
    if db is None:
        # Attempt reconnection
        is_connected = await connect_to_mongodb()
        db = get_mongodb()
        if not is_connected or db is None:
            return {
                "enabled": True,
                "configured": bool(settings.MONGODB_URL),
                "connected": False,
                "active_db_type": settings.DB_TYPE,
                "message": "MongoDB is enabled but unreachable. Falling back to primary SQLite database.",
                "database_name": settings.MONGODB_DB_NAME
            }

    try:
        collections = await db.list_collection_names()
        counts = {}
        for coll in collections:
            counts[coll] = await db[coll].count_documents({})

        return {
            "configured": True,
            "connected": True,
            "active_db_type": settings.DB_TYPE,
            "database_name": settings.MONGODB_DB_NAME,
            "collections": collections,
            "document_counts": counts,
            "message": "MongoDB connected successfully."
        }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "active_db_type": settings.DB_TYPE,
            "error": str(e),
            "database_name": settings.MONGODB_DB_NAME
        }

@router.post("/seed")
async def trigger_mongodb_seed():
    """Trigger seeding of initial collections into MongoDB."""
    db = get_mongodb()
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="MongoDB is not connected")
    
    await seed_mongodb_if_empty()
    return {"message": "MongoDB seeded successfully."}

@router.post("/telemetry")
async def record_iot_telemetry(payload: TelemetryPayload):
    """Endpoint for ESP32 / IoT hardware to stream sensor readings directly into MongoDB."""
    db = get_mongodb()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is not connected. Configure MONGODB_URL in .env"
        )

    await log_iot_sensor_reading(
        zone=payload.zone,
        moisture=payload.soil_moisture,
        temp=payload.temperature,
        humidity=payload.humidity,
        npk=payload.npk
    )
    return {"status": "success", "message": "Telemetry logged to MongoDB"}
