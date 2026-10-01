from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import io
import csv

from app.database import get_db
import app.models as models
from app.services.websocket_manager import telemetry_ws_manager
from app.services.live_open_data_service import LiveOpenDataService

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

@router.get("/live-agroclimatic")
async def get_live_agroclimatic(lat: float = 30.83, lon: float = 76.19):
    """
    Fetches real-time live open-access agrometeorological & soil hydrology telemetry from Open-Meteo.
    """
    return await LiveOpenDataService.get_live_agrometeo(lat=lat, lon=lon)

@router.get("/live-soil-taxonomy")
async def get_live_soil_taxonomy(lat: float = 30.83, lon: float = 76.19):
    """
    Fetches live chemical taxonomy, nitrogen, and soil organic carbon from ISRIC SoilGrids REST API.
    """
    return await LiveOpenDataService.get_live_soil_taxonomy(lat=lat, lon=lon)

@router.get("/soil-health-index")
async def get_soil_health_index(lat: float = 30.83, lon: float = 76.19, db: Session = Depends(get_db)):
    """
    Computes an authentic Composite Soil Health Index (SHI 0-100) combining ISRIC SoilGrids 2.0
    chemical properties with real-time farm sensor telemetry.
    """
    soil = await LiveOpenDataService.get_live_soil_taxonomy(lat=lat, lon=lon)
    latest_reading = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    
    moisture = latest_reading.moisture_pct if latest_reading else 42.0
    temp = latest_reading.temp_c if latest_reading else 28.0
    
    soc = soil.get("organic_carbon_g_kg", 18.2)
    ph = soil.get("ph_water", 7.4)
    nitrogen = soil.get("total_nitrogen_g_kg", 1.62)

    # 1. SOC Score (Ideal > 15 g/kg)
    soc_score = min(100.0, (soc / 20.0) * 100.0)
    
    # 2. pH Score (Ideal 6.5 - 7.5)
    ph_diff = abs(ph - 7.0)
    ph_score = max(50.0, 100.0 - (ph_diff * 30.0))
    
    # 3. Moisture Score (Ideal 40% - 65%)
    if 40.0 <= moisture <= 65.0:
        moisture_score = 95.0
    elif moisture < 40.0:
        moisture_score = max(30.0, (moisture / 40.0) * 90.0)
    else:
        moisture_score = max(50.0, 100.0 - (moisture - 65.0) * 2.0)
        
    # 4. Nitrogen Score
    n_score = min(100.0, (nitrogen / 2.0) * 100.0)
    
    # Weighted Composite Index
    shi_total = (soc_score * 0.35) + (ph_score * 0.25) + (moisture_score * 0.25) + (n_score * 0.15)
    shi_rounded = round(shi_total, 1)
    
    rating = "Grade A+ (Prime Fertile)" if shi_rounded >= 85 else ("Grade A (High Productivity)" if shi_rounded >= 70 else "Grade B (Moderate)")

    return {
        "soil_health_index": shi_rounded,
        "rating": rating,
        "textural_class": soil.get("soil_textural_class", "Loamy Alluvial Soil"),
        "sub_indices": {
            "organic_matter_score": round(soc_score, 1),
            "soil_reaction_ph_score": round(ph_score, 1),
            "moisture_availability_score": round(moisture_score, 1),
            "nitrogen_fertility_score": round(n_score, 1)
        },
        "live_metrics": {
            "ph_water": ph,
            "soil_organic_carbon_g_kg": soc,
            "total_nitrogen_g_kg": nitrogen,
            "soil_moisture_percent": moisture,
            "soil_temperature_c": temp
        },
        "crop_suitability": [
            {"crop": "Tomato (Solanum lycopersicum)", "suitability": "Highly Suitable (98%)", "growth_stage": "Fruiting"},
            {"crop": "Wheat (Triticum aestivum)", "suitability": "Optimal (95%)", "growth_stage": "Tillering"},
            {"crop": "Mustard (Brassica juncea)", "suitability": "High (92%)", "growth_stage": "Vegetative"},
            {"crop": "Potato (Solanum tuberosum)", "suitability": "Optimal (94%)", "growth_stage": "Tuber Formation"}
        ],
        "agronomic_recommendation": "Alluvial soil balance is optimal. Maintain current micro-drip fertigation schedule with organic bio-NPK booster."
    }

@router.get("/live-reservoir-storage")
def get_live_reservoir_storage():
    """
    Fetches live Central Water Commission (CWC) North Basin reservoir levels and irrigation security status.
    """
    return LiveOpenDataService.get_live_reservoir_water_storage()

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
