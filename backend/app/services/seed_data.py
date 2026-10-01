import json
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal, engine, Base
import app.models as models

logger = logging.getLogger(__name__)

def seed_database():
    """
    Initializes database schema and restores all user accounts, sensor telemetry,
    zones, operational controls, community posts, and direct messages from the
    authoritative database snapshot on fresh cloud deployments.
    """
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check for snapshot JSON file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        snapshot_path = os.path.join(current_dir, "initial_db_snapshot.json")

        if os.path.exists(snapshot_path):
            try:
                with open(snapshot_path, "r", encoding="utf-8") as f:
                    snapshot = json.load(f)

                # Order of table restoration
                tables_order = [
                    "users",
                    "control_system",
                    "zone_info",
                    "sensor_readings",
                    "community_posts",
                    "direct_messages",
                    "market_listings",
                    "buyer_requirements",
                    "transport_listings",
                    "finance_records",
                    "calendar_events",
                    "activity_logs",
                    "govt_schemes"
                ]

                for table_name in tables_order:
                    if table_name not in snapshot:
                        continue
                    
                    tdata = snapshot[table_name]
                    cols = tdata.get("columns", [])
                    rows = tdata.get("rows", [])

                    if not rows or not cols:
                        continue

                    # Check if table already has rows
                    count_check = db.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
                    if count_check == 0:
                        logger.info(f"Restoring {len(rows)} records into table '{table_name}' from snapshot...")
                        col_str = ", ".join([f'"{c}"' for c in cols])
                        param_str = ", ".join([f":{c}" for c in cols])
                        insert_query = text(f"INSERT INTO {table_name} ({col_str}) VALUES ({param_str})")

                        entries = []
                        for r in rows:
                            # Map row values to dict
                            row_dict = {cols[i]: r[i] for i in range(len(cols))}
                            entries.append(row_dict)

                        db.execute(insert_query, entries)
                        db.commit()
                        logger.info(f"[OK] Successfully restored table '{table_name}'.")

            except Exception as e:
                db.rollback()
                logger.error(f"Error restoring from snapshot JSON: {e}")

        # Fallback / sanity checks for required singleton or minimum state
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

        if db.query(models.ZoneInfo).count() == 0:
            zones = [
                models.ZoneInfo(zone_code="A", name="Polyhouse - Tomato", crop="Tomato (Hybrid)", current_moisture=42.0, moisture_min=35.0, moisture_max=65.0, status="Optimal"),
                models.ZoneInfo(zone_code="B", name="East Field - Wheat", crop="Wheat (HD-2967)", current_moisture=38.5, moisture_min=30.0, moisture_max=60.0, status="Optimal"),
                models.ZoneInfo(zone_code="C", name="North Plot - Mustard", crop="Mustard (Pusa Bold)", current_moisture=34.0, moisture_min=30.0, moisture_max=55.0, status="Optimal"),
                models.ZoneInfo(zone_code="D", name="South Ridge - Potato", crop="Potato (Kufri Jyoti)", current_moisture=41.5, moisture_min=35.0, moisture_max=65.0, status="Optimal"),
            ]
            db.add_all(zones)
            db.commit()

        logger.info("[OK] Database initialization and verification complete.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()
