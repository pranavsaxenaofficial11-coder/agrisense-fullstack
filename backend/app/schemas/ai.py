from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatMessage(BaseModel):
    role: str # user, assistant, system
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    crop: Optional[str] = "Tomato"
    language: Optional[str] = "en"

class ChatResponse(BaseModel):
    reply: str
    model: str
    suggested_actions: Optional[List[str]] = []

class FarmReportRequest(BaseModel):
    field_name: Optional[str] = "Main Field"
    crop: Optional[str] = "Tomato"

class FarmReportResponse(BaseModel):
    overall_status: str
    soil_and_water: str
    weekly_todo: List[str]
    moisture_range: str
    irrigation_efficiency: str
    estimated_water_saved_liters: int

class CropScanRequest(BaseModel):
    image_base64: str
    crop: Optional[str] = "Tomato"

class CropScanResponse(BaseModel):
    diagnosis: str
    severity: str # Healthy, Mild, Moderate, Severe
    confidence: float
    recommended_action: str
    preventive_measures: List[str]
