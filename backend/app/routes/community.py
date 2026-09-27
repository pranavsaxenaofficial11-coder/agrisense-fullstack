from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
import app.models as models
from app.schemas.community import (
    CommunityPostOut, CommunityPostCreate,
    DirectMessageOut, DirectMessageCreate
)

router = APIRouter(prefix="/api/community", tags=["Community"])

@router.get("/posts", response_model=List[CommunityPostOut])
def get_posts(channel: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.CommunityPost)
    if channel and channel.lower() != "all":
        query = query.filter(models.CommunityPost.channel == channel)
    return query.order_by(models.CommunityPost.created_at.desc()).all()

@router.post("/posts", response_model=CommunityPostOut)
def create_post(post: CommunityPostCreate, db: Session = Depends(get_db)):
    db_post = models.CommunityPost(**post.dict())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@router.post("/posts/{post_id}/upvote", response_model=CommunityPostOut)
def upvote_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.upvotes += 1
    db.commit()
    db.refresh(post)
    return post

@router.get("/messages", response_model=List[DirectMessageOut])
def get_messages(email: str = "pranav@agrisense.io", db: Session = Depends(get_db)):
    return db.query(models.DirectMessage).filter(
        (models.DirectMessage.sender_email == email) | (models.DirectMessage.recipient_email == email)
    ).order_by(models.DirectMessage.created_at.asc()).all()

@router.post("/messages", response_model=DirectMessageOut)
def send_message(msg: DirectMessageCreate, db: Session = Depends(get_db)):
    db_msg = models.DirectMessage(**msg.dict())
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg
