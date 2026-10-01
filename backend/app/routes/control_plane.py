"""
==============================================================================
AgriSense Control Plane & AI Workload API Routes
Allows operators to control all background pipelines, trigger sync jobs,
tune AI workload parameters, observe live system hardware metrics,
and explore raw SQLite/MongoDB database tables.
==============================================================================
"""

import os
import sys
import platform
import time
import fastapi
from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.control_plane_service import control_plane
from app.database import get_db, engine
from app.config import settings
from app.mongodb import is_mongo_connected, get_collection

router = APIRouter(prefix="/api/control-plane", tags=["Control Plane & Workload"])

class PipelineToggleRequest(BaseModel):
    pipeline_id: str
    enabled: bool

class PipelineTriggerRequest(BaseModel):
    pipeline_id: str

class AIConfigUpdateRequest(BaseModel):
    active_engine: Optional[str] = None
    concurrency_limit: Optional[int] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

@router.get("/state")
def get_control_plane_state():
    """Returns the full control state: all pipelines, AI workload status, and live system metrics."""
    return control_plane.get_full_state()

@router.get("/pipelines")
def list_pipelines():
    """Returns list and execution states of all data and automation pipelines."""
    return control_plane.pipelines

@router.post("/pipelines/toggle")
def toggle_pipeline(req: PipelineToggleRequest):
    """Enables or pauses a data pipeline."""
    res = control_plane.toggle_pipeline(req.pipeline_id, req.enabled)
    if res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res

@router.post("/pipelines/trigger")
def trigger_pipeline(req: PipelineTriggerRequest):
    """Executes a pipeline immediately on-demand."""
    res = control_plane.trigger_pipeline(req.pipeline_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res

@router.get("/ai-workload")
def get_ai_workload():
    """Returns current AI engine configuration, token consumption, inference stats, and recent diagnoses."""
    return control_plane.ai_workload

@router.post("/ai-workload/config")
def update_ai_config(req: AIConfigUpdateRequest):
    """Adjusts active AI engine, concurrency limits, sampling temperature, and token budgets."""
    return control_plane.update_ai_config(
        active_engine=req.active_engine,
        concurrency_limit=req.concurrency_limit,
        temperature=req.temperature,
        max_tokens=req.max_tokens
    )

@router.post("/ai-workload/trigger-batch")
def trigger_batch_ai_diagnosis():
    """Triggers an automated agronomic batch crop diagnosis & anomaly scan across all farm zones."""
    return control_plane.trigger_batch_ai_diagnosis()

@router.get("/stats")
def get_system_stats():
    """Returns real-time host process CPU, RAM, throughput, active pipelines, and error rates."""
    return control_plane.get_system_hardware_stats()

@router.get("/system-info")
def get_system_host_info():
    """Returns genuine host environment, runtime versions, process stats, and DB storage information."""
    db_file_size_kb = 0
    if settings.DATABASE_URL.startswith("sqlite"):
        db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        if os.path.exists(db_path):
            db_file_size_kb = round(os.path.getsize(db_path) / 1024.0, 1)

    uptime_sec = int(time.time() - control_plane.start_time)
    hours, rem = divmod(uptime_sec, 3600)
    minutes, seconds = divmod(rem, 60)
    uptime_formatted = f"{hours}h {minutes}m {seconds}s"

    return {
        "hostname": platform.node(),
        "os_platform": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "python_version": sys.version.split()[0],
        "fastapi_version": fastapi.__version__,
        "process_pid": os.getpid(),
        "uptime_seconds": uptime_sec,
        "uptime_formatted": uptime_formatted,
        "sqlite_db_size_kb": db_file_size_kb,
        "sqlite_wal_mode": True,
        "mongodb_connected": is_mongo_connected(),
        "total_requests_served": control_plane.total_requests_recorded,
        "average_latency_ms": control_plane.get_avg_latency(),
        "active_pipelines_count": sum(1 for p in control_plane.pipelines.values() if p.get("enabled", False)),
        "total_pipelines_count": len(control_plane.pipelines),
        "ai_active_engine": control_plane.ai_workload.get("active_engine", "gemini-2.0-flash")
    }

ALLOWED_TABLES = [
    "users", "zones", "sensor_readings", "controls", "market_listings",
    "buyer_requirements", "community_posts", "direct_messages",
    "activity_logs", "finance_records", "calendar_events"
]

@router.get("/db/tables")
def list_db_tables(db: Session = Depends(get_db)):
    """Inspects all SQLite tables and returns schemas, column definitions, and actual row counts."""
    tables_info = []
    for tbl in ALLOWED_TABLES:
        try:
            count_res = db.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            cols_res = db.execute(text(f"PRAGMA table_info({tbl})")).fetchall()
            columns = [{"cid": c[0], "name": c[1], "type": c[2], "notnull": bool(c[3]), "pk": bool(c[5])} for c in cols_res]
            tables_info.append({
                "table_name": tbl,
                "row_count": count_res if count_res is not None else 0,
                "columns": columns,
                "column_count": len(columns)
            })
        except Exception:
            continue

    return {
        "engine": "SQLite 3 (WAL Mode)" if settings.DATABASE_URL.startswith("sqlite") else "PostgreSQL",
        "database_url": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL,
        "tables": tables_info
    }

@router.get("/db/query")
def query_db_table(table: str, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """Safely queries rows from an authorized database table for raw inspection."""
    if table not in ALLOWED_TABLES:
        raise HTTPException(status_code=400, detail=f"Table '{table}' is not authorized for direct browsing. Allowed: {ALLOWED_TABLES}")
    
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)
    
    try:
        total_count = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0
        rows_res = db.execute(text(f"SELECT * FROM {table} ORDER BY 1 DESC LIMIT :limit OFFSET :offset"), {"limit": limit, "offset": offset})
        keys = list(rows_res.keys())
        rows = [dict(zip(keys, row)) for row in rows_res.fetchall()]

        # Convert non-serializable items
        for r in rows:
            for k, v in r.items():
                if hasattr(v, "isoformat"):
                    r[k] = v.isoformat()

        return {
            "table": table,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "columns": keys,
            "rows": rows
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query table {table}: {str(e)}")

class SQLExecuteRequest(BaseModel):
    sql: str

@router.post("/db/execute-sql")
def execute_custom_sql(req: SQLExecuteRequest, db: Session = Depends(get_db)):
    """Safely executes a read-only SQL query for administrative data verification."""
    clean_sql = req.sql.strip().rstrip(";")
    upper_sql = clean_sql.upper()
    if not (upper_sql.startswith("SELECT") or upper_sql.startswith("PRAGMA")):
        raise HTTPException(status_code=400, detail="Only read-only SELECT or PRAGMA queries are permitted.")
    
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE", "REPLACE", "ATTACH", "DETACH", "GRANT", "REVOKE"]
    for word in forbidden:
        if f" {word} " in f" {upper_sql} " or upper_sql.startswith(word):
            raise HTTPException(status_code=400, detail=f"Destructive or mutating SQL keyword '{word}' is strictly forbidden.")

    if "LIMIT" not in upper_sql:
        clean_sql = f"{clean_sql} LIMIT 100"

    try:
        start = time.time()
        res = db.execute(text(clean_sql))
        dur_ms = round((time.time() - start) * 1000, 2)
        keys = list(res.keys())
        rows = [dict(zip(keys, row)) for row in res.fetchall()]
        
        for r in rows:
            for k, v in r.items():
                if hasattr(v, "isoformat"):
                    r[k] = v.isoformat()
                    
        return {
            "status": "success",
            "sql": clean_sql,
            "execution_time_ms": dur_ms,
            "row_count": len(rows),
            "columns": keys,
            "rows": rows
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL Execution Error: {str(e)}")

