from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class CommunityPostOut(BaseModel):
    id: int
    author_name: str
    author_location: str
    channel: str
    title: str
    content: str
    upvotes: int
    replies_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class CommunityPostCreate(BaseModel):
    author_name: str
    author_location: str
    channel: str = "general"
    title: str
    content: str

class DirectMessageOut(BaseModel):
    id: int
    sender_email: str
    recipient_email: str
    sender_name: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DirectMessageCreate(BaseModel):
    sender_email: str
    recipient_email: str
    sender_name: str
    message: str
