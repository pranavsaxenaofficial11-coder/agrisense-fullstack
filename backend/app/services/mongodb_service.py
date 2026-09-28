from datetime import datetime, timezone
import logging
from app.mongodb import get_mongodb, get_collection

logger = logging.getLogger(__name__)

async def seed_mongodb_if_empty():
    """Seeds initial mock data into MongoDB if connected and collections are empty."""
    db = get_mongodb()
    if db is None:
        return

    try:
        # Check if users collection is empty
        user_count = await db.users.count_documents({})
        if user_count == 0:
            logger.info("Seeding initial MongoDB documents...")
            
            # 1. User
            await db.users.insert_one({
                "uid": "user_pranav_01",
                "name": "Pranav Saxena",
                "email": "pranav@agrisense.io",
                "phone": "+91 98765 43210",
                "state": "Punjab",
                "district": "Ludhiana",
                "village": "Samrala",
                "farm_size_acres": 14.5,
                "primary_crop": "Tomato, Wheat & Mustard",
                "soil_type": "Sandy Loam",
                "irrigation_system": "Solar Smart Drip",
                "points": 1420,
                "created_at": datetime.now(timezone.utc)
            })

            # 2. Controls
            await db.controls.insert_one({
                "system_id": "primary_field",
                "pump_state": False,
                "auto_mode": True,
                "manual_override": False,
                "water_tank_level": 84.5,
                "flow_rate_lpm": 18.5,
                "valves": {"A": True, "B": False, "C": True, "D": False},
                "updated_at": datetime.now(timezone.utc)
            })

            # 3. Zones
            zones = [
                {"zone_code": "A", "name": "North Polyhouse (Tomato)", "crop": "Tomato (Hybrid Pusa)", "moisture_min": 45.0, "moisture_max": 70.0, "current_moisture": 38.4, "status": "Moderate"},
                {"zone_code": "B", "name": "East Open Acre (Wheat)", "crop": "Wheat (HD-2967)", "moisture_min": 35.0, "moisture_max": 60.0, "current_moisture": 48.2, "status": "Optimal"},
                {"zone_code": "C", "name": "South Ridge (Mustard)", "crop": "Mustard (Pusa Bold)", "moisture_min": 30.0, "moisture_max": 55.0, "current_moisture": 29.1, "status": "Low Moisture"},
                {"zone_code": "D", "name": "West Nursery (Seedlings)", "crop": "Chilli & Bell Pepper", "moisture_min": 50.0, "moisture_max": 75.0, "current_moisture": 56.8, "status": "Optimal"}
            ]
            await db.zones.insert_many(zones)

            logger.info("MongoDB initial seeding complete.")
    except Exception as e:
        logger.warning(f"Error seeding MongoDB: {e}")

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
                "npk": npk or {"n": 45, "p": 22, "k": 38},
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as e:
            logger.warning(f"Failed to record IoT reading in MongoDB: {e}")
