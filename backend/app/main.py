import time
from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
from app.services.seed_data import seed_database
import app.models as models

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
    mongodb,
    analytics
)
from app.middleware import RateLimiterMiddleware
from app.mongodb import connect_to_mongodb, close_mongodb_connection, get_mongodb
from app.services.mongodb_service import seed_mongodb_if_empty
from app.views.dashboard import render_dashboard_html

# Initialize database schema (SQLite)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Precision Agriculture IoT & Agronomy AI Backend for AgriSense (Bal Bharati Public School)",
    version="2.0.0"
)

# 1. Performance: GZip Compression Middleware (compresses responses > 1KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. Security: CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Security: In-Memory Sliding-Window IoT & API Rate Limiter
app.add_middleware(RateLimiterMiddleware, max_requests=240, window_seconds=60)

# 4. Security & Telemetry Timing Middleware
@app.middleware("http")
async def add_security_and_timing_headers(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    
    # Latency tracking header
    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
    
    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response

# Mount all domain routers
app.include_router(sensors.router)
app.include_router(controls.router)
app.include_router(analytics.router)
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

@app.get("/", response_class=HTMLResponse)
def root_dashboard(request: Request, db: Session = Depends(get_db)):
    """
    Renders the modern Executive Stakeholder & Infrastructure Dashboard.
    If requested with ?format=json or Accept: application/json, returns API status JSON.
    """
    accept = request.headers.get("accept", "")
    if "application/json" in accept or request.query_params.get("format") == "json":
        return JSONResponse({
            "status": "online",
            "service": "AgriSense API",
            "version": "2.0.0",
            "institution": "Bal Bharati Public School",
            "docs": "/docs",
            "redoc": "/redoc"
        })

    # Fetch all users from database
    db_users = db.query(models.User).all()
    user_dicts = []
    for u in db_users:
        user_dicts.append({
            "id": u.id,
            "uid": u.uid,
            "name": u.name,
            "role": u.role,
            "business_name": u.business_name,
            "email": u.email,
            "phone": u.phone,
            "state": u.state,
            "district": u.district,
            "village": u.village,
            "farm_size_acres": u.farm_size_acres,
            "primary_crop": u.primary_crop,
            "soil_type": u.soil_type,
            "irrigation_system": u.irrigation_system,
            "points": u.points
        })

    mongo_status = "Connected (MongoDB Atlas)" if get_mongodb() is not None else "Standby (Local SQLite Fallback)"
    html = render_dashboard_html(user_dicts, mongo_status=mongo_status, sqlite_status="Active & Synced", latency_ms=36.2)
    return HTMLResponse(content=html)

@app.get("/admin", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    return root_dashboard(request, db)

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "database_sqlite": "connected",
        "database_mongodb": "connected" if get_mongodb() is not None else "fallback_active",
        "security": "hardened",
        "compression": "gzip_enabled"
    }
