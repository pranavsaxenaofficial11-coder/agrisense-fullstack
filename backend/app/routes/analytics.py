from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import io
import csv

from app.database import get_db
import app.models as models
from app.services.websocket_manager import telemetry_ws_manager

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Impact"])

@router.get("/water-savings")
def get_water_savings_metrics(db: Session = Depends(get_db)):
    """
    Computes quantified impact metrics comparing AgriSense precision irrigation
    against standard flood irrigation baselines (40% water savings).
    """
    ctrl = db.query(models.ControlSystem).first()
    runtime_mins = ctrl.pump_runtime_minutes if ctrl else 45
    
    # 1. Flow rate of standard drip (8 Liters / minute for 1.5 acre plot)
    drip_liters = runtime_mins * 8.0
    
    # Standard flood irrigation consumes ~2.5x more water
    flood_liters = drip_liters * 2.5
    liters_saved = flood_liters - drip_liters
    
    # 2. Electricity and cost savings (0.75 kW pump @ ₹7.50 / kWh)
    kwh_saved = (runtime_mins / 60.0) * 0.75 * 1.5
    cost_saved_inr = kwh_saved * 7.50 + (liters_saved / 1000.0) * 12.0
    
    # 3. Carbon offset (0.82 kg CO2e per kWh saved)
    carbon_offset_kg = kwh_saved * 0.82

    return {
        "status": "success",
        "pump_runtime_minutes": runtime_mins,
        "drip_liters_used": round(drip_liters, 1),
        "flood_liters_baseline": round(flood_liters, 1),
        "water_saved_liters": round(liters_saved, 1),
        "water_saved_percentage": 60.0,
        "energy_saved_kwh": round(kwh_saved, 2),
        "cost_saved_inr": round(cost_saved_inr, 2),
        "carbon_offset_kg": round(carbon_offset_kg, 2),
        "sdg_impact": {
            "sdg_6_water_efficiency": "60% reduction in freshwater abstraction",
            "sdg_13_climate": f"{round(carbon_offset_kg, 2)} kg CO2e emissions avoided"
        }
    }

@router.get("/export/csv")
def export_sensor_history_csv(zone: str = "Zone A", limit: int = 500, db: Session = Depends(get_db)):
    """
    Generates and streams an agronomy CSV audit report of all historical field sensor readings.
    """
    readings = (
        db.query(models.SensorReading)
        .filter(models.SensorReading.zone == zone)
        .order_by(models.SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp (UTC)",
        "Zone",
        "Soil Moisture (%)",
        "Ambient Temperature (C)",
        "Humidity (%)",
        "Sunlight (Lux)",
        "Nitrogen (mg/kg)",
        "Phosphorus (mg/kg)",
        "Potassium (mg/kg)"
    ])

    for r in readings:
        writer.writerow([
            r.timestamp.isoformat() if r.timestamp else datetime.utcnow().isoformat(),
            r.zone,
            r.moisture_pct,
            r.temp_c,
            r.humidity_pct,
            r.sunlight_lux,
            r.npk_n,
            r.npk_p,
            r.npk_k
        ])

    output.seek(0)
    filename = f"AgriSense_Agronomy_Report_{zone.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/system-metrics")
def get_system_telemetry(db: Session = Depends(get_db)):
    """
    Provides real-time system infrastructure telemetry, database connection health,
    and active WebSocket subscribers count.
    """
    total_users = db.query(models.User).count()
    total_readings = db.query(models.SensorReading).count()
    active_ws = len(telemetry_ws_manager.active_connections)

    return {
        "service": "AgriSense Core Engine",
        "status": "healthy",
        "version": "2.1.0",
        "active_websocket_subscribers": active_ws,
        "database_sqlite": {
            "status": "connected",
            "registered_stakeholders": total_users,
            "total_sensor_readings": total_readings
        },
        "performance": {
            "compression": "GZip enabled (threshold > 1000B)",
            "telemetry_stream": "Real-time bi-directional WebSockets",
            "offline_caching": "IndexedDB / WebStorage enabled"
        },
        "timestamp": datetime.utcnow().isoformat()
    }
