import json
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
import app.models as models

logger = logging.getLogger(__name__)

def seed_database():
    """
    Initializes database schema and ensures essential operational state
    (Zones, Controls, Telemetry, and Stakeholders) exists on fresh cloud deployments.
    """
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Initialize Controls if empty
        ctrl = db.query(models.ControlSystem).first()
        if not ctrl:
            db.add(models.ControlSystem(
                pump_state=True,
                auto_mode=True,
                manual_override=False,
                pump_runtime_minutes=45,
                water_tank_level=70.0,
                flow_rate_lpm=18.5,
                valve_a=True,
                valve_b=False,
                valve_c=True,
                valve_d=False,
                temp_threshold=34.0,
                moisture_threshold=32.0
            ))
            db.commit()
            logger.info("[OK] Seeded hardware control state.")

        # 2. Initialize Farm Zones if empty
        if db.query(models.ZoneInfo).count() == 0:
            zones = [
                models.ZoneInfo(zone_code="A", name="Polyhouse - Tomato", crop="Tomato (Hybrid)", current_moisture=42.0, moisture_min=35.0, moisture_max=65.0, status="Optimal"),
                models.ZoneInfo(zone_code="B", name="East Field - Wheat", crop="Wheat (HD-2967)", current_moisture=38.5, moisture_min=30.0, moisture_max=60.0, status="Optimal"),
                models.ZoneInfo(zone_code="C", name="North Plot - Mustard", crop="Mustard (Pusa Bold)", current_moisture=34.0, moisture_min=30.0, moisture_max=55.0, status="Optimal"),
                models.ZoneInfo(zone_code="D", name="South Ridge - Potato", crop="Potato (Kufri Jyoti)", current_moisture=41.5, moisture_min=35.0, moisture_max=65.0, status="Optimal"),
            ]
            db.add_all(zones)
            db.commit()
            logger.info("[OK] Seeded farm zones.")

        # 3. Initialize Stakeholders if empty
        if db.query(models.User).count() == 0:
            stakeholders = [
                models.User(
                    uid="USR_LEAD_01",
                    name="Pranav Saxena",
                    email="pranavsaxenaofficial11@gmail.com",
                    role="admin",
                    business_name="Saxena Family Farm",
                    state="Punjab",
                    district="Ludhiana",
                    village="Samrala",
                    farm_size_acres=12.5,
                    primary_crop="Tomato & Wheat",
                    soil_type="Loamy Alluvial",
                    irrigation_system="Solar Drip Matrix",
                    points=3240,
                    login_count=14,
                    last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    last_ip="127.0.0.1",
                    device_type="Windows PC (Chrome)",
                    active_page="Control Plane & Telemetry",
                    features_used=json.dumps(["Controls", "AI Diagnosis", "Soil Health Index"]),
                    recent_logins=json.dumps([
                        {"timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"), "device": "Windows PC (Chrome)", "method": "Email", "status": "SUCCESS"}
                    ])
                ),
                models.User(
                    uid="USR_FARM_02",
                    name="Geetika Jain",
                    email="jaingeetika77@gmail.com",
                    role="farmer",
                    business_name="Jain Horticulture",
                    state="Punjab",
                    district="Ludhiana",
                    village="Samrala",
                    farm_size_acres=4.0,
                    primary_crop="Tomatoes",
                    soil_type="Loamy",
                    irrigation_system="Drip",
                    points=2650,
                    login_count=7,
                    last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    last_ip="127.0.0.1",
                    device_type="Android Mobile (Chrome)",
                    active_page="Live Telemetry",
                    features_used=json.dumps(["Sensors", "Market"]),
                    recent_logins=json.dumps([
                        {"timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"), "device": "Android Mobile (Chrome)", "method": "Email", "status": "SUCCESS"}
                    ])
                ),
                models.User(
                    uid="USR_AGRO_03",
                    name="Hiyasha Deviyal",
                    email="hiyasha@agrisense.io",
                    role="officer",
                    business_name="Punjab Agronomy Extension",
                    state="Punjab",
                    district="Patiala",
                    village="Nabha",
                    farm_size_acres=8.0,
                    primary_crop="Wheat & Mustard",
                    soil_type="Sandy Loam",
                    irrigation_system="Sprinkler",
                    points=1980,
                    login_count=9,
                    last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    last_ip="127.0.0.1",
                    device_type="MacBook (Safari)",
                    active_page="Soil Chemistry",
                    features_used=json.dumps(["Soil Health", "Weather VPD"]),
                    recent_logins=json.dumps([])
                ),
                models.User(
                    uid="USR_HW_04",
                    name="Chaitanya Vashisht",
                    email="chaitanya.vashishtha.2011@gmail.com",
                    role="admin",
                    business_name="Vashisht Agro Tech",
                    state="Punjab",
                    district="Jalandhar",
                    village="Phagwara",
                    farm_size_acres=5.5,
                    primary_crop="Vegetables",
                    soil_type="Loamy",
                    irrigation_system="Drip",
                    points=1840,
                    login_count=6,
                    last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    last_ip="127.0.0.1",
                    device_type="Windows PC (Chrome)",
                    active_page="Hardware Node",
                    features_used=json.dumps(["Hardware Nodes"]),
                    recent_logins=json.dumps([])
                ),
                models.User(
                    uid="USR_BUY_05",
                    name="Vimlesh Yadav",
                    email="iamvimahero@gmail.com",
                    role="wholesaler",
                    business_name="Yadav Agro Mandi Trading",
                    state="Punjab",
                    district="Ludhiana",
                    village="Sahnewal",
                    farm_size_acres=15.0,
                    primary_crop="Wheat & Paddy",
                    soil_type="Clay Loam",
                    irrigation_system="Canal & Drip",
                    points=2100,
                    login_count=5,
                    last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    last_ip="127.0.0.1",
                    device_type="Android Mobile (Chrome)",
                    active_page="Marketplace",
                    features_used=json.dumps(["Marketplace", "Logistics"]),
                    recent_logins=json.dumps([])
                )
            ]
            db.add_all(stakeholders)
            db.commit()
            logger.info("[OK] Seeded core stakeholders.")

        # 4. Initialize Telemetry Readings if empty
        if db.query(models.SensorReading).count() == 0:
            readings = []
            now = datetime.utcnow()
            for i in range(25):
                t = now - timedelta(minutes=(25 - i) * 10)
                readings.append(models.SensorReading(
                    zone="Zone A",
                    moisture_pct=38.0 + (i % 5) * 0.8,
                    temp_c=26.5 + (i % 4) * 0.5,
                    humidity_pct=62.0 + (i % 6) * 1.2,
                    sunlight_lux=45000.0 + (i % 5) * 1500.0,
                    npk_n=145.0 + (i % 3) * 2.0,
                    npk_p=42.0 + (i % 2) * 1.5,
                    npk_k=180.0 + (i % 4) * 3.0,
                    ph=7.2,
                    co2_ppm=415.0,
                    timestamp=t
                ))
            db.add_all(readings)
            db.commit()
            logger.info("[OK] Seeded initial telemetry stream.")

        # 5. Initialize Community Posts if empty
        if db.query(models.CommunityPost).count() == 0:
            posts = [
                models.CommunityPost(
                    author_name="Pranav Saxena",
                    author_location="Samrala, Ludhiana",
                    channel="Agronomy",
                    title="Optimizing Drip Pulsation during Flowering Stage",
                    content="Observed a 38% reduction in water requirement with 15-minute pulsed drip cycles every morning. Root-zone moisture remains optimal at 42%.",
                    upvotes=18,
                    replies_count=4,
                    created_at=datetime.utcnow() - timedelta(days=2)
                ),
                models.CommunityPost(
                    author_name="Hiyasha Deviyal",
                    author_location="Punjab KVK",
                    channel="Pest Alerts",
                    title="VPD Advisory: Elevated Aphid Risk in High Humidity",
                    content="With relative humidity hovering above 75% and temperature at 26°C, keep monitoring lower leaf surfaces for aphid clusters. Apply bio-neem spray proactively.",
                    upvotes=24,
                    replies_count=6,
                    created_at=datetime.utcnow() - timedelta(days=1)
                )
            ]
            db.add_all(posts)
            db.commit()
            logger.info("[OK] Seeded community discussions.")

        # 6. Initialize Direct Messages if empty
        if db.query(models.DirectMessage).count() == 0:
            dms = [
                models.DirectMessage(
                    sender_email="pranavsaxenaofficial11@gmail.com",
                    recipient_email="jaingeetika77@gmail.com",
                    sender_name="Pranav Saxena",
                    message="Hi Geetika, your Zone A soil moisture probe is reading 42%. Drip automation is running smoothly.",
                    is_read=True,
                    created_at=datetime.utcnow() - timedelta(hours=3)
                )
            ]
            db.add_all(dms)
            db.commit()
            logger.info("[OK] Seeded direct messages.")

    except Exception as e:
        logger.error(f"Error during database seed: {e}")
    finally:
        db.close()
