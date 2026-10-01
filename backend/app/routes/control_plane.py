"""
==============================================================================
AgriSense Control Plane & AI Workload API Routes
Allows operators to control all background pipelines, trigger sync jobs,
tune AI workload parameters, and observe live system hardware metrics.
==============================================================================
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.services.control_plane_service import control_plane

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
