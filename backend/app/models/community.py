from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.database import Base

class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    author_name = Column(String(100))
    author_location = Column(String(100))
    channel = Column(String(50), default="general") # general, pest-control, organic, market-trends, irrigation
    title = Column(String(200))
    content = Column(Text)
    upvotes = Column(Integer, default=0)
    replies_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_email = Column(String(120), index=True)
    recipient_email = Column(String(120), index=True)
    sender_name = Column(String(100))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
