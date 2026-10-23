"""
==============================================================================
AgriSense API Keys Management & Configuration Routes
Provides secure inspection, validation, runtime updating, and persistence
of external AI and government data API keys.
==============================================================================
"""

import os
from typing import Optional, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/config/api-keys", tags=["API Keys Configuration"])

class ApiKeysUpdateRequest(BaseModel):
    openrouter_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gmaps_key: Optional[str] = None
    data_gov_in_api_key: Optional[str] = None
    iot_api_key: Optional[str] = None

def mask_key(val: Optional[str]) -> Dict[str, Any]:
    if not val or not val.strip():
        return {"configured": False, "masked": None, "length": 0}
    val = val.strip()
    if len(val) <= 8:
        masked = "****" + val[-2:]
    else:
        masked = val[:4] + "••••••••" + val[-4:]
    return {"configured": True, "masked": masked, "length": len(val)}

def update_env_file(updates: Dict[str, str]):
    """Safely updates or appends key-value pairs into the backend .env file."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_path = os.path.join(backend_dir, ".env")

    existing_lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            existing_lines = f.readlines()

    keys_written = set()
    new_lines = []

    for line in existing_lines:
        line_stripped = line.strip()
        matched = False
        for k, v in updates.items():
            if line_stripped.startswith(f"{k}=") or line_stripped.startswith(f"{k} ="):
                new_lines.append(f"{k}={v}\n")
                keys_written.add(k)
                matched = True
                break
        if not matched:
            new_lines.append(line)

    for k, v in updates.items():
        if k not in keys_written:
            new_lines.append(f"{k}={v}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

@router.get("")
def list_api_keys():
    """Returns the configuration status and masked values of all platform API keys."""
    return {
        "openrouter": {
            "name": "OpenRouter Cloud AI",
            "env_var": "OPENROUTER_API_KEY",
            **mask_key(getattr(settings, "OPENROUTER_API_KEY", ""))
        },
        "gemini": {
            "name": "Google Gemini Vision & Multimodal",
            "env_var": "GEMINI_API_KEY",
            **mask_key(getattr(settings, "GEMINI_API_KEY", ""))
        },
        "gmaps": {
            "name": "Google Maps Platform (Geocoding & Satellite)",
            "env_var": "GMAPS_KEY",
            **mask_key(getattr(settings, "GMAPS_KEY", ""))
        },
        "data_gov_in": {
            "name": "Data.gov.in (National Mandi & Soil APIs)",
            "env_var": "DATA_GOV_IN_API_KEY",
            **mask_key(getattr(settings, "DATA_GOV_IN_API_KEY", ""))
        },
        "iot_hardware": {
            "name": "IoT Edge Hardware Node Authentication Token",
            "env_var": "IOT_API_KEY",
            **mask_key(getattr(settings, "IOT_API_KEY", "agrisense-iot-token-2026"))
        }
    }

@router.post("")
def update_api_keys(req: ApiKeysUpdateRequest):
    """
    Updates platform API keys dynamically in memory and persists them to the .env file.
    """
    env_updates = {}

    if req.openrouter_api_key is not None:
        key = req.openrouter_api_key.strip()
        settings.OPENROUTER_API_KEY = key
        env_updates["OPENROUTER_API_KEY"] = key

    if req.gemini_api_key is not None:
        key = req.gemini_api_key.strip()
        settings.GEMINI_API_KEY = key
        env_updates["GEMINI_API_KEY"] = key

    if req.gmaps_key is not None:
        key = req.gmaps_key.strip()
        settings.GMAPS_KEY = key
        env_updates["GMAPS_KEY"] = key

    if req.data_gov_in_api_key is not None:
        key = req.data_gov_in_api_key.strip()
        settings.DATA_GOV_IN_API_KEY = key
        env_updates["DATA_GOV_IN_API_KEY"] = key

    if req.iot_api_key is not None:
        key = req.iot_api_key.strip()
        settings.IOT_API_KEY = key
        env_updates["IOT_API_KEY"] = key

    if env_updates:
        try:
            update_env_file(env_updates)
        except Exception as e:
            return {
                "status": "partial_success",
                "message": f"Updated in memory, but could not write to .env ({e})"
            }

    return {
        "status": "success",
        "message": f"Updated {len(env_updates)} API key(s) successfully and persisted to environment.",
        "keys_updated": list(env_updates.keys())
    }
