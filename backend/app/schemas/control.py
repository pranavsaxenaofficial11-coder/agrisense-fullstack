from pydantic import BaseModel
from typing import Optional

class ControlStatusOut(BaseModel):
    pump_state: bool
    auto_mode: bool
    manual_override: bool
    pump_runtime_minutes: int
    water_tank_level: float
    valve_a: bool
    valve_b: bool
    valve_c: bool
    valve_d: bool
    flow_rate_lpm: float

    class Config:
        from_attributes = True

class ControlUpdateRequest(BaseModel):
    pump_state: Optional[bool] = None
    auto_mode: Optional[bool] = None
    manual_override: Optional[bool] = None
    pump_runtime_minutes: Optional[int] = None
    valve_a: Optional[bool] = None
    valve_b: Optional[bool] = None
    valve_c: Optional[bool] = None
    valve_d: Optional[bool] = None
