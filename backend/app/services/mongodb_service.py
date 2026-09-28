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
            
            # 1. Users (All Platform Personas)
            users_data = [
                {
                    "uid": "user_pranav_01",
                    "name": "Pranav Saxena",
                    "role": "farmer",
                    "business_name": "Saxena Family Farm",
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
                },
                {
                    "uid": "user_wholesaler_01",
                    "name": "Rajesh Aggarwal",
                    "role": "wholesaler",
                    "business_name": "Aggarwal Mandi Traders",
                    "email": "rajesh.mandi@agrisense.io",
                    "phone": "+91 98140 33221",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "village": "Khanna Mandi",
                    "farm_size_acres": 0.0,
                    "primary_crop": "Wheat & Tomato Wholesale",
                    "soil_type": "N/A",
                    "irrigation_system": "N/A",
                    "points": 2850,
                    "created_at": datetime.now(timezone.utc)
                },
                {
                    "uid": "user_vendor_01",
                    "name": "Sukhdev Singh",
                    "role": "vendor",
                    "business_name": "Kisan Seva Kendra & AgriTech Inputs",
                    "email": "sukhdev.inputs@agrisense.io",
                    "phone": "+91 98722 55443",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "village": "Samrala Market",
                    "farm_size_acres": 0.0,
                    "primary_crop": "Bio-Fertilizers & Drip Spares",
                    "soil_type": "N/A",
                    "irrigation_system": "N/A",
                    "points": 1940,
                    "created_at": datetime.now(timezone.utc)
                },
                {
                    "uid": "user_factory_01",
                    "name": "Vikramaditya Mehta",
                    "role": "factory",
                    "business_name": "Punjab Agro Processing Foods Ltd.",
                    "email": "procurement@punjabagrofoods.com",
                    "phone": "+91 99880 77665",
                    "state": "Punjab",
                    "district": "SAS Nagar",
                    "village": "Mohali Phase 8",
                    "farm_size_acres": 0.0,
                    "primary_crop": "Industrial Tomato & Grain Processing",
                    "soil_type": "N/A",
                    "irrigation_system": "N/A",
                    "points": 5400,
                    "created_at": datetime.now(timezone.utc)
                },
                {
                    "uid": "user_customer_01",
                    "name": "Sunita Sharma",
                    "role": "customer",
                    "business_name": "Green Living Organic Consumer Co-op",
                    "email": "sunita.consumer@agrisense.io",
                    "phone": "+91 98550 11223",
                    "state": "Chandigarh",
                    "district": "Chandigarh",
                    "village": "Sector 35-C",
                    "farm_size_acres": 0.0,
                    "primary_crop": "Fresh Organic Produce",
                    "soil_type": "N/A",
                    "irrigation_system": "N/A",
                    "points": 890,
                    "created_at": datetime.now(timezone.utc)
                },
                {
                    "uid": "user_expert_01",
                    "name": "Dr. Anita Kulkarni",
                    "role": "expert",
                    "business_name": "PAU Agronomy & Extension Division",
                    "email": "anita.kulkarni@pau.edu",
                    "phone": "+91 94170 88990",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "village": "PAU Campus",
                    "farm_size_acres": 0.0,
                    "primary_crop": "Agronomy & Crop Pathology",
                    "soil_type": "N/A",
                    "irrigation_system": "N/A",
                    "points": 3600,
                    "created_at": datetime.now(timezone.utc)
                },
                {
                    "uid": "user_transport_01",
                    "name": "Jarnail Singh",
                    "role": "transport",
                    "business_name": "Singh Logistics & Tractor Sharing",
                    "email": "jarnail.transport@agrisense.io",
                    "phone": "+91 98150 99881",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "village": "Samrala & Khanna",
                    "farm_size_acres": 0.0,
                    "primary_crop": "Logistics & Farm Haulage",
                    "soil_type": "N/A",
                    "irrigation_system": "N/A",
                    "points": 1100,
                    "created_at": datetime.now(timezone.utc)
                },
                {
                    "uid": "user_farmer_02",
                    "name": "Gurpreet Singh",
                    "role": "farmer",
                    "business_name": "Gurpreet Green Farms",
                    "email": "gurpreet.singh@kisanmail.com",
                    "phone": "+91 98144 66778",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "village": "Samrala",
                    "farm_size_acres": 5.0,
                    "primary_crop": "Tomato & Vegetables",
                    "soil_type": "Loamy",
                    "irrigation_system": "Drip",
                    "points": 950,
                    "created_at": datetime.now(timezone.utc)
                }
            ]
            await db.users.insert_many(users_data)

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
