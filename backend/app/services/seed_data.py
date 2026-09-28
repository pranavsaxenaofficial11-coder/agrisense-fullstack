from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
import app.models # Ensures all models are registered

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed Users (All Ecosystem Personas)
        existing_users = {u.uid for u in db.query(app.models.User).all()}
        all_users = [
            app.models.User(
                uid="user_pranav_01",
                name="Pranav Saxena",
                role="farmer",
                business_name="Saxena Family Farm",
                email="pranav@agrisense.io",
                phone="+91 98765 43210",
                state="Punjab",
                district="Ludhiana",
                village="Samrala",
                farm_size_acres=14.5,
                primary_crop="Tomato, Wheat & Mustard",
                soil_type="Sandy Loam",
                irrigation_system="Solar Smart Drip",
                points=1420
            ),
            app.models.User(
                uid="user_wholesaler_01",
                name="Rajesh Aggarwal",
                role="wholesaler",
                business_name="Aggarwal Mandi Traders",
                email="rajesh.mandi@agrisense.io",
                phone="+91 98140 33221",
                state="Punjab",
                district="Ludhiana",
                village="Khanna Mandi",
                farm_size_acres=0.0,
                primary_crop="Wheat & Tomato Wholesale",
                soil_type="N/A",
                irrigation_system="N/A",
                points=2850
            ),
            app.models.User(
                uid="user_vendor_01",
                name="Sukhdev Singh",
                role="vendor",
                business_name="Kisan Seva Kendra & AgriTech Inputs",
                email="sukhdev.inputs@agrisense.io",
                phone="+91 98722 55443",
                state="Punjab",
                district="Ludhiana",
                village="Samrala Market",
                farm_size_acres=0.0,
                primary_crop="Bio-Fertilizers & Drip Spares",
                soil_type="N/A",
                irrigation_system="N/A",
                points=1940
            ),
            app.models.User(
                uid="user_factory_01",
                name="Vikramaditya Mehta",
                role="factory",
                business_name="Punjab Agro Processing Foods Ltd.",
                email="procurement@punjabagrofoods.com",
                phone="+91 99880 77665",
                state="Punjab",
                district="SAS Nagar",
                village="Mohali Phase 8",
                farm_size_acres=0.0,
                primary_crop="Industrial Tomato & Grain Processing",
                soil_type="N/A",
                irrigation_system="N/A",
                points=5400
            ),
            app.models.User(
                uid="user_customer_01",
                name="Sunita Sharma",
                role="customer",
                business_name="Green Living Organic Consumer Co-op",
                email="sunita.consumer@agrisense.io",
                phone="+91 98550 11223",
                state="Chandigarh",
                district="Chandigarh",
                village="Sector 35-C",
                farm_size_acres=0.0,
                primary_crop="Fresh Organic Produce",
                soil_type="N/A",
                irrigation_system="N/A",
                points=890
            ),
            app.models.User(
                uid="user_expert_01",
                name="Dr. Anita Kulkarni",
                role="expert",
                business_name="PAU Agronomy & Extension Division",
                email="anita.kulkarni@pau.edu",
                phone="+91 94170 88990",
                state="Punjab",
                district="Ludhiana",
                village="PAU Campus",
                farm_size_acres=0.0,
                primary_crop="Agronomy & Crop Pathology",
                soil_type="N/A",
                irrigation_system="N/A",
                points=3600
            ),
            app.models.User(
                uid="user_transport_01",
                name="Jarnail Singh",
                role="transport",
                business_name="Singh Logistics & Tractor Sharing",
                email="jarnail.transport@agrisense.io",
                phone="+91 98150 99881",
                state="Punjab",
                district="Ludhiana",
                village="Samrala & Khanna",
                farm_size_acres=0.0,
                primary_crop="Logistics & Farm Haulage",
                soil_type="N/A",
                irrigation_system="N/A",
                points=1100
            ),
            app.models.User(
                uid="user_farmer_02",
                name="Gurpreet Singh",
                role="farmer",
                business_name="Gurpreet Green Farms",
                email="gurpreet.singh@kisanmail.com",
                phone="+91 98144 66778",
                state="Punjab",
                district="Ludhiana",
                village="Samrala",
                farm_size_acres=5.0,
                primary_crop="Tomato & Vegetables",
                soil_type="Loamy",
                irrigation_system="Drip",
                points=950
            )
        ]
        for u in all_users:
            if u.uid not in existing_users:
                db.add(u)
        db.commit()

        # 2. Seed Zones
        if db.query(app.models.ZoneInfo).count() == 0:
            zones = [
                app.models.ZoneInfo(zone_code="A", name="North Polyhouse (Tomato)", crop="Tomato (Hybrid Pusa)", moisture_min=45.0, moisture_max=70.0, current_moisture=38.4, status="Moderate"),
                app.models.ZoneInfo(zone_code="B", name="East Open Acre (Wheat)", crop="Wheat (HD-2967)", moisture_min=35.0, moisture_max=60.0, current_moisture=48.2, status="Optimal"),
                app.models.ZoneInfo(zone_code="C", name="South Ridge (Mustard)", crop="Mustard (Pusa Bold)", moisture_min=30.0, moisture_max=55.0, current_moisture=29.1, status="Low Moisture"),
                app.models.ZoneInfo(zone_code="D", name="West Nursery (Seedlings)", crop="Chilli & Bell Pepper", moisture_min=50.0, moisture_max=75.0, current_moisture=56.8, status="Optimal"),
            ]
            db.add_all(zones)

        # 3. Seed Control System
        if db.query(app.models.ControlSystem).count() == 0:
            ctrl = app.models.ControlSystem(
                pump_state=False,
                auto_mode=True,
                manual_override=False,
                pump_runtime_minutes=45,
                water_tank_level=84.5,
                valve_a=True,
                valve_b=False,
                valve_c=True,
                valve_d=False,
                flow_rate_lpm=18.5
            )
            db.add(ctrl)

        # 4. Seed Sensor History (Last 24 hours of readings)
        if db.query(app.models.SensorReading).count() == 0:
            readings = []
            now = datetime.utcnow()
            for hour_offset in range(24, 0, -1):
                t = now - timedelta(hours=hour_offset)
                # Base diurnal curve
                temp = 24.0 + 8.0 * random.random()
                humidity = 60.0 + 15.0 * random.random()
                readings.append(app.models.SensorReading(
                    zone="Zone A",
                    moisture_pct=round(36.0 + 4.0 * random.random(), 1),
                    temp_c=round(temp, 1),
                    humidity_pct=round(humidity, 1),
                    sunlight_lux=round(35000 + 20000 * random.random(), 0),
                    npk_n=142.0,
                    npk_p=46.0,
                    npk_k=198.0,
                    timestamp=t
                ))
            db.add_all(readings)

        # 5. Seed Market Listings
        if db.query(app.models.MarketListing).count() == 0:
            items = [
                app.models.MarketListing(
                    title="Grade-A Organic Vine Tomatoes",
                    category="Vegetables",
                    crop_name="Tomato",
                    quantity=85.0,
                    unit="Quintal",
                    price_per_unit=2450.0,
                    mandi_benchmark=2300.0,
                    quality_grade="Grade A",
                    location="Samrala Mandi, Punjab",
                    seller_name="Pranav Saxena",
                    seller_phone="+91 98765 43210",
                    description="Firm, greenhouse-grown organic hybrid tomatoes with high shelf life.",
                    is_available=True
                ),
                app.models.MarketListing(
                    title="Certified Sharbati Wheat Harvest",
                    category="Grains",
                    crop_name="Wheat",
                    quantity=220.0,
                    unit="Quintal",
                    price_per_unit=2850.0,
                    mandi_benchmark=2700.0,
                    quality_grade="Premium",
                    location="Khanna Mandi, Punjab",
                    seller_name="Gurpreet Singh",
                    seller_phone="+91 98141 55230",
                    description="Sun-dried golden grains, moisture below 10%, clean sample.",
                    is_available=True
                ),
                app.models.MarketListing(
                    title="High-Oil Yellow Mustard Seeds",
                    category="Oilseeds",
                    crop_name="Mustard",
                    quantity=60.0,
                    unit="Quintal",
                    price_per_unit=5400.0,
                    mandi_benchmark=5250.0,
                    quality_grade="Standard",
                    location="Sirhind, Punjab",
                    seller_name="Harmanpreet Dhillon",
                    seller_phone="+91 98450 11982",
                    description="Machine-cleaned, high oil content (42%+). Ready for immediate loading.",
                    is_available=True
                ),
            ]
            db.add_all(items)

        # 6. Seed Buyer Requirements
        if db.query(app.models.BuyerRequirement).count() == 0:
            reqs = [
                app.models.BuyerRequirement(
                    buyer_name="Ramesh Aggarwal",
                    company="Kisan Agro Processing Ltd",
                    crop_name="Tomato",
                    quantity_needed=500.0,
                    unit="Quintal",
                    max_budget_per_unit=2500.0,
                    delivery_location="Ludhiana Industrial Hub",
                    contact_phone="+91 94170 33219",
                    urgency="Immediate",
                    notes="Required for tomato paste manufacturing. Consistency and firm skin required."
                ),
                app.models.BuyerRequirement(
                    buyer_name="Sanjay Verma",
                    company="Punjab Organic Exporters",
                    crop_name="Basmati Rice 1121",
                    quantity_needed=1200.0,
                    unit="Quintal",
                    max_budget_per_unit=4200.0,
                    delivery_location="Kandla Port Depot",
                    contact_phone="+91 98721 88722",
                    urgency="Within 7 Days",
                    notes="Export-grade testing certificate required. Zero chemical residue."
                )
            ]
            db.add_all(reqs)

        # 7. Seed Community Posts
        if db.query(app.models.CommunityPost).count() == 0:
            posts = [
                app.models.CommunityPost(
                    author_name="Harjeet Singh (Bathinda)",
                    author_location="Punjab",
                    channel="irrigation",
                    title="Drip irrigation with solar pump: 40% water saved this season",
                    content="Switched our 8 acres of tomato and capsicum to solar drip with automated soil sensors. Our diesel costs dropped to almost zero and yield is up by 18%. Highly recommend sensor-driven scheduling!",
                    upvotes=42,
                    replies_count=9
                ),
                app.models.CommunityPost(
                    author_name="Dr. Anita Kulkarni",
                    author_location="PAU Extension",
                    channel="pest-control",
                    title="Managing early blight in humid weather",
                    content="Due to high humidity (75%+), keep leaves dry in late afternoon. If spots appear on lower tomato leaves, apply neem oil (5ml/L) or copper oxychloride early morning.",
                    upvotes=58,
                    replies_count=14
                ),
                app.models.CommunityPost(
                    author_name="Balwinder Brar",
                    author_location="Moga",
                    channel="market-trends",
                    title="Wheat MSP updates & procurement centers",
                    content="Government has announced standard moisture limits at 12%. Check grain moisture before taking trolley to Khanna Mandi to avoid deduction.",
                    upvotes=31,
                    replies_count=4
                )
            ]
            db.add_all(posts)

        # 7b. Seed Direct Messages
        if db.query(app.models.DirectMessage).count() == 0:
            dms = [
                app.models.DirectMessage(
                    sender_email="gurpreet.singh@kisanmail.com",
                    recipient_email="pranav@agrisense.io",
                    sender_name="Gurpreet Singh",
                    message="Sat Sri Akal Pranav ji, is your solar drip pump system working well with 3-phase power? Want to install on 5 acres.",
                    is_read=True
                ),
                app.models.DirectMessage(
                    sender_email="pranav@agrisense.io",
                    recipient_email="gurpreet.singh@kisanmail.com",
                    sender_name="Pranav Saxena",
                    message="Yes Gurpreet ji, it runs on DC solar power and automatically handles pressure regulation across all 4 zones.",
                    is_read=True
                ),
                app.models.DirectMessage(
                    sender_email="anita.kulkarni@pau.edu",
                    recipient_email="pranav@agrisense.io",
                    sender_name="Dr. Anita Kulkarni",
                    message="Hello Pranav, I reviewed your Zone A soil test report. Micronutrient levels look great for your tomato crop.",
                    is_read=False
                )
            ]
            db.add_all(dms)

        # 8. Seed Transport
        if db.query(app.models.TransportListing).count() == 0:
            t_list = [
                app.models.TransportListing(
                    owner_name="Jarnail Singh",
                    vehicle_type="John Deere 5050D + Hydraulic Trolley",
                    capacity="8 Ton Capacity",
                    rate="₹650/hour or ₹28/km",
                    location="Samrala & Khanna radius (25km)",
                    phone="+91 98150 99881",
                    is_available=True,
                    notes="Equipped with heavy-duty tarpaulin sheet for grain protection."
                ),
                app.models.TransportListing(
                    owner_name="Malkeet Transport",
                    vehicle_type="Tata 407 LCV",
                    capacity="4.5 Ton",
                    rate="₹32/km",
                    location="Ludhiana to Delhi NCR route",
                    phone="+91 98762 11090",
                    is_available=True,
                    notes="Specialized for perishable fruit and vegetable transit."
                )
            ]
            db.add_all(t_list)

        # 9. Seed Finance
        if db.query(app.models.FinanceRecord).count() == 0:
            fin = [
                app.models.FinanceRecord(entry_type="income", category="Harvest Sale", amount=124000.0, description="Tomato batch sale (50 Quintals to Mandi)", entry_date="2026-09-15"),
                app.models.FinanceRecord(entry_type="expense", category="Seeds", amount=14500.0, description="Pusa Hybrid Tomato F1 certified seeds", entry_date="2026-08-20"),
                app.models.FinanceRecord(entry_type="expense", category="Fertilizer", amount=18200.0, description="Bio-NPK, Zinc & Vermicompost 2 tons", entry_date="2026-08-28"),
                app.models.FinanceRecord(entry_type="expense", category="Labor", amount=24000.0, description="Transplanting and weeding labor (8 workers)", entry_date="2026-09-02"),
                app.models.FinanceRecord(entry_type="income", category="Subsidy", amount=35000.0, description="PMKSY Micro-irrigation subsidy credit", entry_date="2026-09-10"),
            ]
            db.add_all(fin)

        # 10. Seed Calendar
        if db.query(app.models.CalendarEvent).count() == 0:
            cal = [
                app.models.CalendarEvent(crop_name="Tomato", stage="Fruiting", title="Deep Drip Fertigation Cycle", action_type="Irrigation", target_date="2026-09-28", is_completed=False),
                app.models.CalendarEvent(crop_name="Tomato", stage="Fruiting", title="Micronutrient Foliar Spray (Boron + Calcium)", action_type="Spraying", target_date="2026-09-30", is_completed=False),
                app.models.CalendarEvent(crop_name="Wheat", stage="Pre-Sowing", title="Field preparation & Rauni irrigation", action_type="Field Prep", target_date="2026-10-15", is_completed=False),
                app.models.CalendarEvent(crop_name="Tomato", stage="Harvesting", title="First Bulk Picking for Mandi", action_type="Harvest", target_date="2026-10-05", is_completed=False),
            ]
            db.add_all(cal)

        # 11. Seed Logs
        if db.query(app.models.ActivityLog).count() == 0:
            logs = [
                app.models.ActivityLog(level="SUCCESS", category="SYSTEM", message="AgriSense IoT Gateway synchronized with SQLite backend."),
                app.models.ActivityLog(level="INFO", category="SENSOR", message="Zone A moisture reached 38.4% (Threshold: 45%). Irrigation advisory queued."),
                app.models.ActivityLog(level="INFO", category="PUMP", message="Solar pump scheduled run completed: 45 minutes, 830 Liters delivered."),
                app.models.ActivityLog(level="WARN", category="WEATHER", message="High humidity detected (78%). Foliar disease risk elevated.")
            ]
            db.add_all(logs)

        # 12. Seed Schemes
        if db.query(app.models.GovtScheme).count() == 0:
            schemes = [
                app.models.GovtScheme(
                    name="PM Kisan Samman Nidhi",
                    short_code="PM-KISAN",
                    category="Income Support",
                    benefit="₹6,000 per year in 3 direct bank transfer installments",
                    eligibility="All landholding farmer families with cultivable landholding",
                    documents="Aadhaar Card, Land Ownership Papers, Active Bank Account",
                    apply_url="https://pmkisan.gov.in"
                ),
                app.models.GovtScheme(
                    name="Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
                    short_code="Per Drop More Crop",
                    category="Micro-Irrigation Subsidy",
                    benefit="Up to 55% subsidy for small/marginal farmers for Drip & Sprinkler systems",
                    eligibility="Farmers having water source and electricity/solar connection",
                    documents="Land Record (Jamabandi), Soil & Water Test Report, Aadhaar, Bank Passbook",
                    apply_url="https://pmksy.gov.in"
                ),
                app.models.GovtScheme(
                    name="PM-KUSUM Solar Agricultural Pumps",
                    short_code="PM-KUSUM",
                    category="Solar Energy",
                    benefit="Up to 60% capital subsidy on standalone solar irrigation pumps",
                    eligibility="Individual farmers, Water User Associations, Farmer Producer Organizations",
                    documents="Aadhaar, Land Registry, Farmer Declaration, Bank IFSC Details",
                    apply_url="https://pmkusum.mnre.gov.in"
                )
            ]
            db.add_all(schemes)

        db.commit()
        print("Database seeded successfully with all AgriSense domain data!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
