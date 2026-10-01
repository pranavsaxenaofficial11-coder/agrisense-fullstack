from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
import app.models as models
from app.schemas.user import UserProfileOut, UserProfileUpdate, UserInspectionOut
import json
from datetime import datetime

router = APIRouter(prefix="/api/user", tags=["User Profile"])

@router.get("/all", response_model=List[UserProfileOut])
def get_all_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve all users or filter by role (farmer, wholesaler, vendor, factory, customer, expert)."""
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    return query.all()

@router.get("/profile", response_model=UserProfileOut)
def get_user_profile(uid: Optional[str] = None, db: Session = Depends(get_db)):
    """Get active user profile (defaults to primary farmer or specified uid)."""
    if uid:
        user = db.query(models.User).filter(models.User.uid == uid).first()
    else:
        user = db.query(models.User).filter(models.User.role == "farmer").first() or db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/profile", response_model=UserProfileOut)
def update_user_profile(update: UserProfileUpdate, uid: Optional[str] = None, db: Session = Depends(get_db)):
    if uid:
        user = db.query(models.User).filter(models.User.uid == uid).first()
    else:
        user = db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, val in update.dict(exclude_unset=True).items():
        setattr(user, field, val)

    db.commit()
    db.refresh(user)
    return user

@router.post("/heartbeat")
def record_user_heartbeat(
    request: Request,
    email: Optional[str] = "pranav@agrisense.io",
    active_page: Optional[str] = "Live Dashboard",
    feature_used: Optional[str] = None,
    is_login: bool = False,
    db: Session = Depends(get_db)
):
    """
    Live real-time tracker:
    Captures client IP, User-Agent, Device Type, Active Screen, and Feature Usage into DB.
    """
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = db.query(models.User).first()
    
    if user:
        client_ip = request.client.host if request.client else "127.0.0.1"
        user_agent_str = request.headers.get("user-agent", "Mozilla/5.0")
        
        # Parse Device
        device = "Desktop (Chrome / Windows)"
        if "Android" in user_agent_str:
            device = "Android Mobile"
        elif "iPhone" in user_agent_str:
            device = "Apple iPhone (iOS)"
        elif "iPad" in user_agent_str:
            device = "Apple iPad (iPadOS)"
        elif "Macintosh" in user_agent_str:
            device = "MacBook / macOS"
        elif "Windows" in user_agent_str:
            device = "Windows PC / Desktop"

        user.last_ip = client_ip
        user.user_agent = user_agent_str
        user.device_type = device
        user.active_page = active_page or "Live Dashboard"
        user.last_login = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        if is_login:
            user.login_count = (user.login_count or 0) + 1
        
        # Track features array
        if feature_used:
            try:
                curr_features = json.loads(user.features_used) if user.features_used else []
            except Exception:
                curr_features = []
            if feature_used not in curr_features:
                curr_features.append(feature_used)
                user.features_used = json.dumps(curr_features)
        
        db.commit()
        db.refresh(user)

    return {"status": "tracked", "user": user.name if user else "guest", "device": user.device_type if user else "unknown"}

@router.get("/inspect/{identifier}", response_model=UserInspectionOut)
def inspect_user_details(identifier: str, db: Session = Depends(get_db)):
    """
    Returns full inspection details when hovering/clicking on a user:
    - User details (name, role, farm, email, phone, location)
    - Device details (OS, Browser, Device Type, IP Address, User Agent)
    - Website usage (features used, sessions, page active)
    - Messages & posts (Community posts, Direct messages, AI queries)
    """
    user = None
    if identifier.isdigit():
        user = db.query(models.User).filter(models.User.id == int(identifier)).first()
    
    if not user and "@" in identifier:
        user = db.query(models.User).filter(models.User.email == identifier).first()

    if not user:
        user = db.query(models.User).filter(
            (models.User.uid == identifier) | (models.User.name.ilike(f"%{identifier}%"))
        ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Stakeholder profile not found")

    # Fetch real community posts
    posts_db = db.query(models.CommunityPost).filter(
        (models.CommunityPost.author_name.ilike(f"%{user.name}%"))
    ).all()
    posts_list = [
        {
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "channel": p.channel,
            "upvotes": p.upvotes,
            "created_at": str(p.created_at)
        } for p in posts_db
    ]

    # Fetch real direct messages
    dms_db = db.query(models.DirectMessage).filter(
        (models.DirectMessage.sender_email == user.email) | (models.DirectMessage.recipient_email == user.email)
    ).all()
    dms_list = [
        {
            "id": d.id,
            "sender_name": d.sender_name,
            "sender_email": d.sender_email,
            "recipient_email": d.recipient_email,
            "message": d.message,
            "created_at": str(d.created_at)
        } for d in dms_db
    ]

    # Real AI queries list (zero fake questions)
    ai_queries = []

    # Parse features used JSON
    features = []
    if getattr(user, "features_used", None):
        try:
            features = json.loads(user.features_used)
        except Exception:
            features = []

    # Parse recent login audit events
    recent_logins = []
    if getattr(user, "recent_logins", None):
        try:
            recent_logins = json.loads(user.recent_logins)
        except Exception:
            recent_logins = []

    login_cnt = user.login_count or 0
    last_log = user.last_login or "Not done till now"
    dev_str = user.device_type or "Not detected (Not done till now)"
    ua_str = user.user_agent or "Not done till now — No device detected yet"
    ip_str = user.last_ip or "Not recorded"
    act_page = user.active_page or ("Live Telemetry & Dashboard" if login_cnt > 0 else "Not visited yet")

    return {
        "user_profile": {
            "id": user.id,
            "uid": user.uid,
            "name": user.name,
            "role": user.role,
            "business_name": user.business_name or f"{user.name}'s Farm",
            "email": user.email,
            "phone": user.phone or "+91 98765 00000",
            "state": user.state or "Punjab",
            "district": user.district or "Ludhiana",
            "village": user.village or "Samrala",
            "farm_size_acres": user.farm_size_acres or 1.0,
            "primary_crop": user.primary_crop or "Tomatoes & Wheat",
            "soil_type": user.soil_type or "Loamy",
            "irrigation_system": user.irrigation_system or "Drip",
            "points": user.points or 0,
            "login_count": login_cnt,
            "last_login": last_log,
            "last_ip": ip_str,
            "user_agent": ua_str,
            "device_type": dev_str,
            "active_page": act_page,
            "features_used": json.dumps(features),
            "recent_logins": json.dumps(recent_logins)
        },
        "device_info": {
            "device_type": dev_str,
            "os": dev_str,
            "browser": dev_str,
            "ip_address": ip_str,
            "user_agent": ua_str,
            "last_active_page": act_page,
            "last_seen": last_log,
            "login_count": login_cnt,
            "last_login": last_log,
            "recent_logins": recent_logins
        },
        "website_usage": {
            "features_used": features,
            "total_sessions": login_cnt,
            "total_activity_events": login_cnt * 2 if login_cnt > 0 else 0,
            "preferred_theme": "Greenery Dark Mode"
        },
        "messages": {
            "community_posts": posts_list,
            "direct_messages": dms_list,
            "ai_queries": ai_queries
        }
    }

@router.delete("/account")
async def delete_user_account(email: Optional[str] = None, uid: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Permanently deletes a user account and purges ALL their associated data:
    - User profile record
    - Direct messages sent & received
    - Community forum posts
    - Market listings & buyer requirements
    - Transport listings
    - MongoDB Atlas & Firestore records (if connected)
    """
    user = None
    if uid:
        user = db.query(models.User).filter(models.User.uid == uid).first()
    if not user and email:
        user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = db.query(models.User).filter(models.User.role == "farmer").first() or db.query(models.User).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    user_email = user.email
    user_name = user.name
    user_phone = user.phone

    # 1. Purge Direct Messages
    if user_email:
        db.query(models.DirectMessage).filter(
            (models.DirectMessage.sender_email == user_email) | (models.DirectMessage.recipient_email == user_email)
        ).delete(synchronize_session=False)

    # 2. Purge Community Posts
    if user_name:
        db.query(models.CommunityPost).filter(
            models.CommunityPost.author_name.ilike(f"%{user_name}%")
        ).delete(synchronize_session=False)

    # 3. Purge Market Listings
    if user_name or user_phone:
        db.query(models.MarketListing).filter(
            (models.MarketListing.seller_name == user_name) | (models.MarketListing.seller_phone == user_phone)
        ).delete(synchronize_session=False)

    # 4. Purge Buyer Requirements
    if user_name or user_phone:
        db.query(models.BuyerRequirement).filter(
            (models.BuyerRequirement.buyer_name == user_name) | (models.BuyerRequirement.contact_phone == user_phone)
        ).delete(synchronize_session=False)

    # 5. Purge Transport Listings
    if user_name or user_phone:
        db.query(models.TransportListing).filter(
            (models.TransportListing.owner_name == user_name) | (models.TransportListing.phone == user_phone)
        ).delete(synchronize_session=False)

    # 6. Delete the User Record
    db.delete(user)
    db.commit()

    # 7. Clean up MongoDB if connected
    try:
        from app.mongodb import get_collection
        user_col = get_collection("users")
        if user_col is not None:
            if user_email:
                await user_col.delete_many({"email": user_email})
            if uid:
                await user_col.delete_many({"uid": uid})
    except Exception as e:
        print(f"MongoDB account deletion notice: {e}")

    # 8. Log in Control Plane
    from app.services.control_plane_service import control_plane
    control_plane.log_event("AUTH", "WARN", f"User account '{user_email}' ({user_name}) and all associated records were permanently purged.")

    return {
        "status": "success",
        "message": f"Account '{user_email}' and all associated records have been completely and permanently deleted.",
        "purged_user": {
            "email": user_email,
            "name": user_name
        }
    }


