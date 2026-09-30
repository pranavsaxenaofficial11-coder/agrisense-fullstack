from datetime import datetime, timezone
import logging
from app.mongodb import get_mongodb, get_collection

logger = logging.getLogger(__name__)

async def seed_mongodb_if_empty():
    """No-op: All demo data has been removed. Only authentic real-time data is retained."""
    pass

async def log_iot_sensor_reading(zone: str, moisture: float, temp: float, humidity: float, npk: dict = None):
    """Store raw real-time IoT telemetry from ESP32 into MongoDB time-series collection."""
    db = get_mongodb()
    if db is not None:
        try:
            await db.sensor_telemetry.insert_one({
                "zone": zone,
                "soil_moisture": moisture,
                "temperature": temp,
                "humidity": humidity,
                "npk": npk or {"n": 0, "p": 0, "k": 0},
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as e:
            logger.warning(f"Failed to record IoT reading in MongoDB: {e}")
