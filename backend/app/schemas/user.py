from pydantic import BaseModel
from typing import Optional

class UserProfileOut(BaseModel):
    id: int
    uid: str
    name: str
    role: str = "farmer"
    business_name: Optional[str] = "Saxena Family Farm"
    email: str
    phone: str
    state: str
    district: str
    village: str
    farm_size_acres: float
    primary_crop: str
    soil_type: str
    irrigation_system: str
    points: int = 0
    login_count: Optional[int] = 0
    last_login: Optional[str] = "Not done till now"
    last_ip: Optional[str] = "Not recorded"
    user_agent: Optional[str] = None
    device_type: Optional[str] = "Not detected (Not done till now)"
    active_page: Optional[str] = "Not visited yet"
    features_used: Optional[str] = None
    recent_logins: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    business_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    farm_size_acres: Optional[float] = None
    primary_crop: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_system: Optional[str] = None

class DeviceDetail(BaseModel):
    device_type: str = "Not detected (Not done till now)"
    os: str = "Not detected"
    browser: str = "Not detected"
    ip_address: str = "Not recorded"
    user_agent: str = "Not done till now — No device detected yet"
    last_active_page: str = "Not visited yet"
    last_seen: str = "Not done till now"
    login_count: int = 0
    last_login: str = "Not done till now"
    recent_logins: list[dict] = []

class WebsiteUsage(BaseModel):
    features_used: list[str] = []
    total_sessions: int = 0
    total_activity_events: int = 0
    preferred_theme: str = "Greenery Dark Mode"

class MessagesAndPosts(BaseModel):
    community_posts: list[dict] = []
    direct_messages: list[dict] = []
    ai_queries: list[str] = []

class UserInspectionOut(BaseModel):
    user_profile: UserProfileOut
    device_info: DeviceDetail
    website_usage: WebsiteUsage
    messages: MessagesAndPosts

