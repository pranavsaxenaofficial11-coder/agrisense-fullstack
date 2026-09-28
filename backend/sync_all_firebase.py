import os
import json
import asyncio
from datetime import datetime, timezone
import requests
from google.oauth2 import service_account
import google.auth.transport.requests
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.orm import Session
from app.config import settings
from app.database import SessionLocal
import app.models as models

KEY_PATH = os.path.join(os.path.dirname(__file__), "firebase_service_account.json")

def parse_val(v):
    if not isinstance(v, dict):
        return v
    if "stringValue" in v:
        return v["stringValue"]
    if "integerValue" in v:
        return int(v["integerValue"])
    if "doubleValue" in v:
        return float(v["doubleValue"])
    if "booleanValue" in v:
        return bool(v["booleanValue"])
    if "timestampValue" in v:
        return v["timestampValue"]
    if "mapValue" in v:
        fields = v["mapValue"].get("fields", {})
        return {k: parse_val(sub_v) for k, sub_v in fields.items()}
    if "arrayValue" in v:
        arr = v["arrayValue"].get("values", [])
        return [parse_val(x) for x in arr]
    return v

def parse_doc(doc):
    doc_id = doc.get("name", "").split("/")[-1]
    fields = doc.get("fields", {})
    item = {k: parse_val(v) for k, v in fields.items()}
    item["_firestore_id"] = doc_id
    if "createTime" in doc:
        item["_created_at"] = doc["createTime"]
    if "updateTime" in doc:
        item["_updated_at"] = doc["updateTime"]
    return item

async def main():
    print("==========================================")
    print("[*] Synchronizing All Firebase Data [*]")
    print("==========================================")

    # 1. Get Google OAuth2 Token
    cred = service_account.Credentials.from_service_account_file(
        KEY_PATH,
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )
    cred.refresh(google.auth.transport.requests.Request())
    token = cred.token
    headers = {'Authorization': f'Bearer {token}'}
    project_id = cred.project_id
    print(f"[OK] Authenticated with Firebase ({project_id})")

    # 2. Connect to MongoDB Atlas
    mongo = AsyncIOMotorClient(settings.MONGODB_URL)
    db_mongo = mongo[settings.MONGODB_DB_NAME]
    await mongo.admin.command('ping')
    print(f"[OK] Connected to MongoDB Atlas ({settings.MONGODB_DB_NAME})")

    # 3. Connect to SQLite
    sqlite_db: Session = SessionLocal()
    print("[OK] Connected to Local SQLite Database")

    # 4. Fetch All Collections
    collections = ['users', 'profiles', 'community', 'messages', 'market', 'transport', 'requirements', 'readings', 'logins']
    all_data = {}

    for c in collections:
        url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/{c}?pageSize=300"
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
            raw = resp.json().get("documents", [])
            parsed = [parse_doc(d) for d in raw]
            all_data[c] = parsed
            print(f"[OK] Fetched {len(parsed)} documents from '{c}'")
        else:
            all_data[c] = []

    # 5. Insert Into MongoDB Atlas
    print("\n[+] Saving to MongoDB Atlas...")
    for c, docs in all_data.items():
        if docs:
            for d in docs:
                await db_mongo[c].update_one(
                    {"_firestore_id": d["_firestore_id"]},
                    {"$set": d},
                    upsert=True
                )
            print(f" -> Synced {len(docs)} documents into MongoDB '{c}' collection.")

    # 6. Insert Into SQLite
    print("\n[+] Syncing Real Users & Data into SQLite...")
    
    # Real Users & Profiles
    existing_emails = {u.email.lower() for u in sqlite_db.query(models.User).all() if u.email}
    users_merged = {}
    
    # Process 'users' collection
    for u in all_data.get('users', []):
        email = (u.get('email') or '').strip().lower()
        if email:
            users_merged[email] = {
                'uid': u.get('_firestore_id', f"user_{len(users_merged)}"),
                'name': u.get('name') or u.get('displayName') or email.split('@')[0],
                'email': email,
                'role': u.get('role', 'farmer'),
                'business_name': u.get('farmName') or u.get('business_name') or "AgriSense Farm",
                'phone': u.get('phone', '+91 98765 00000'),
                'state': u.get('state', 'Punjab'),
                'district': u.get('district', 'Ludhiana'),
                'village': u.get('village', 'Samrala'),
                'farm_size_acres': float(u.get('farmSize', u.get('farm_size_acres', 10.0))),
                'primary_crop': u.get('primaryCrop', u.get('primary_crop', 'Tomato & Wheat')),
                'soil_type': u.get('soilType', 'Loamy'),
                'irrigation_system': u.get('irrigationSystem', 'Drip'),
                'points': int(u.get('points', 1000))
            }

    # Process 'profiles' collection
    for p in all_data.get('profiles', []):
        email = (p.get('email') or '').strip().lower()
        if email:
            if email in users_merged:
                users_merged[email].update({
                    'name': p.get('name') or users_merged[email]['name'],
                    'phone': p.get('phone') or users_merged[email]['phone'],
                    'business_name': p.get('farmName') or p.get('business_name') or users_merged[email]['business_name']
                })
            else:
                users_merged[email] = {
                    'uid': p.get('_firestore_id', f"user_{len(users_merged)}"),
                    'name': p.get('name') or email.split('@')[0],
                    'email': email,
                    'role': p.get('role', 'farmer'),
                    'business_name': p.get('farmName') or p.get('business_name') or "AgriSense Farm",
                    'phone': p.get('phone', '+91 98765 00000'),
                    'state': p.get('state', 'Punjab'),
                    'district': p.get('district', 'Ludhiana'),
                    'village': p.get('village', 'Samrala'),
                    'farm_size_acres': float(p.get('farmSize', 10.0)),
                    'primary_crop': p.get('primaryCrop', 'Tomato & Wheat'),
                    'soil_type': p.get('soilType', 'Loamy'),
                    'irrigation_system': p.get('irrigationSystem', 'Drip'),
                    'points': int(p.get('points', 1000))
                }

    added_users = 0
    for email, u_data in users_merged.items():
        if email not in existing_emails:
            sqlite_db.add(models.User(**u_data))
            existing_emails.add(email)
            added_users += 1
            print(f" -> Added User: {u_data['name']} <{u_data['email']}>")

    # Sync Real Messages
    added_msgs = 0
    for m in all_data.get('messages', []):
        sender = m.get('from', m.get('sender_email', 'farmer@agrisense.io'))
        recipient = m.get('to', m.get('recipient_email', 'pranav@agrisense.io'))
        text = m.get('text', m.get('message', ''))
        if text:
            sqlite_db.add(models.DirectMessage(
                sender_email=sender,
                recipient_email=recipient,
                sender_name=m.get('name', 'Farmer'),
                message=text,
                is_read=True
            ))
            added_msgs += 1

    # Sync Real Community Posts
    added_posts = 0
    for p in all_data.get('community', []):
        content = p.get('text', p.get('content', ''))
        if content:
            sqlite_db.add(models.CommunityPost(
                author_name=p.get('name', 'Farmer'),
                author_location=p.get('location', 'Punjab'),
                channel=p.get('channel', 'general'),
                title=p.get('title', 'Community Message'),
                content=content,
                upvotes=int(p.get('upvotes', 0)),
                replies_count=int(p.get('replies', 0))
            ))
            added_posts += 1

    sqlite_db.commit()
    sqlite_db.close()
    print(f"\n[OK] SQLite Synced: {added_users} new real users, {added_msgs} real messages, {added_posts} real community posts.")
    print("\n==========================================")
    print("[SUCCESS] ALL FIREBASE DATA SUCCESSFULLY IMPORTED!")
    print("==========================================")

if __name__ == '__main__':
    asyncio.run(main())
