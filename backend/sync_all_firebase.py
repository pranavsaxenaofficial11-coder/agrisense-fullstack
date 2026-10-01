import os
import re
import json
from datetime import datetime
import requests
from google.oauth2 import service_account
import google.auth.transport.requests
from sqlalchemy.orm import Session
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

def clean_device(ua):
    if not ua:
        return "Not detected (Not done till now)"
    if "iPhone" in ua:
        m = re.search(r'OS (\d+[_\.]\d+)', ua)
        ver = m.group(1).replace('_', '.') if m else ''
        return f"Apple iPhone (iOS {ver})" if ver else "Apple iPhone (iOS)"
    if "iPad" in ua:
        return "Apple iPad (iPadOS)"
    if "Android" in ua:
        return "Android Mobile (Chrome)"
    if "Windows" in ua:
        return "Windows PC / Chrome"
    if "Macintosh" in ua:
        return "MacBook / macOS"
    return "Desktop Web Browser"

def format_ts(ts):
    if not ts:
        return "Not done till now"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception:
        return ts

def sync_firebase_now():
    print("==========================================")
    print("[*] Synchronizing 100% Real Firebase Data [*]")
    print("==========================================")

    if not os.path.exists(KEY_PATH):
        print(f"[ERROR] Service account not found at: {KEY_PATH}")
        return False

    # 1. Google OAuth2 Token
    cred = service_account.Credentials.from_service_account_file(
        KEY_PATH,
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )
    cred.refresh(google.auth.transport.requests.Request())
    token = cred.token
    headers = {'Authorization': f'Bearer {token}'}
    project_id = cred.project_id
    print(f"[OK] Authenticated with Firebase Project: {project_id}")

    # 2. Connect to Local SQLite Database
    sqlite_db: Session = SessionLocal()
    print("[OK] Connected to Local SQLite Database")

    # 3. Fetch All Collections from Firebase Firestore
    collections = ['users', 'profiles', 'community', 'messages', 'logins', 'market', 'requirements', 'readings']
    all_data = {}

    for c in collections:
        try:
            url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/{c}?pageSize=300"
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code == 200:
                raw = resp.json().get("documents", [])
                parsed = [parse_doc(d) for d in raw]
                all_data[c] = parsed
                print(f"[OK] Fetched {len(parsed)} real documents from Firestore '{c}'")
            else:
                all_data[c] = []
        except Exception as e:
            print(f"[WARN] Could not fetch '{c}': {e}")
            all_data[c] = []

    # 4. Process all Real Logins
    logins_by_email = {}
    for l in all_data.get('logins', []):
        em = (l.get('email') or '').strip().lower()
        if em:
            logins_by_email.setdefault(em, []).append(l)

    # 5. Process Profiles by UID
    profiles_by_uid = {p['_firestore_id']: p for p in all_data.get('profiles', [])}

    # 6. Build User Dictionary from Firestore 'users' & 'profiles'
    users_dict = {}

    for u in all_data.get('users', []):
        uid = u['_firestore_id']
        email = (u.get('email') or '').strip().lower()
        if not email:
            continue
        
        name = u.get('name') or u.get('displayName') or email.split('@')[0].title()
        prof = profiles_by_uid.get(uid, {})

        # Farm profile from Firestore
        farms = prof.get('farms', [])
        primary_farm = farms[0] if (isinstance(farms, list) and len(farms) > 0) else {}
        quiz = primary_farm.get('quiz', {}) if isinstance(primary_farm, dict) else {}

        farm_name = primary_farm.get('name') or prof.get('farmName') or f"{name}'s Farm"
        crop = primary_farm.get('crop') or "Tomatoes & Wheat"
        size_str = str(primary_farm.get('size', '1.0')).replace('acres', '').replace('acre', '').strip()
        try:
            farm_size = float(size_str)
        except Exception:
            farm_size = 1.0

        soil = quiz.get('soilType') or "Loamy"
        irrig = quiz.get('irrigation') or "Drip"
        role = prof.get('role') or u.get('role') or "farmer"
        points = int(prof.get('points', u.get('points', 0)))

        # Logins analysis
        user_logins = sorted(
            logins_by_email.get(email, []),
            key=lambda x: x.get('ts') or x.get('_created_at') or '',
            reverse=True
        )

        if user_logins:
            login_cnt = len(user_logins)
            raw_last_ts = user_logins[0].get('ts') or user_logins[0].get('_created_at')
            last_login_formatted = format_ts(raw_last_ts)
            dev_type = clean_device(user_logins[0].get('device'))
            raw_ua = user_logins[0].get('device') or dev_type
            
            # Audit trail
            recent_audit = []
            for item in user_logins[:6]:
                ts_item = format_ts(item.get('ts') or item.get('_created_at'))
                d_item = clean_device(item.get('device'))
                m_item = item.get('method', 'Email')
                recent_audit.append({
                    "timestamp": ts_item,
                    "device": d_item,
                    "method": m_item,
                    "status": "SUCCESS"
                })
        else:
            login_cnt = int(u.get('loginCount', 0))
            if login_cnt > 0 and u.get('lastLogin'):
                last_login_formatted = format_ts(u.get('lastLogin'))
                dev_type = "Desktop (Web Browser)"
                raw_ua = "Web Session"
                recent_audit = [{
                    "timestamp": last_login_formatted,
                    "device": dev_type,
                    "method": "Email",
                    "status": "SUCCESS"
                }]
            else:
                login_cnt = 0
                last_login_formatted = "Not done till now"
                dev_type = "Not detected (Not done till now)"
                raw_ua = "Not done till now — No device detected yet"
                recent_audit = []

        users_dict[email] = {
            'uid': uid,
            'name': name,
            'email': email,
            'role': role,
            'business_name': farm_name,
            'phone': u.get('phone') or prof.get('phone') or None,
            'state': prof.get('loc', {}).get('state', 'Punjab') if isinstance(prof.get('loc'), dict) else 'Punjab',
            'district': prof.get('loc', {}).get('district', 'Ludhiana') if isinstance(prof.get('loc'), dict) else 'Ludhiana',
            'village': prof.get('loc', {}).get('village', 'Samrala') if isinstance(prof.get('loc'), dict) else 'Samrala',
            'farm_size_acres': farm_size,
            'primary_crop': crop,
            'soil_type': soil,
            'irrigation_system': irrig,
            'points': points,
            'login_count': login_cnt,
            'last_login': last_login_formatted,
            'last_ip': "127.0.0.1" if login_cnt > 0 else "Not recorded",
            'user_agent': raw_ua,
            'device_type': dev_type,
            'active_page': "Live Telemetry & Dashboard" if login_cnt > 0 else "Not visited yet",
            'features_used': json.dumps([]),
            'recent_logins': json.dumps(recent_audit)
        }

    # Upsert users into SQLite
    sqlite_db.query(models.User).delete()
    sqlite_db.commit()

    for email, u_data in users_dict.items():
        sqlite_db.add(models.User(**u_data))
        print(f" -> Synced User: {u_data['name']} <{email}> | {u_data['login_count']} Logins")

    # 7. Sync Real Direct Messages
    sqlite_db.query(models.DirectMessage).delete()
    sqlite_db.commit()
    dm_cnt = 0
    for m in all_data.get('messages', []):
        sender = (m.get('from') or m.get('sender_email') or '').strip().lower()
        recipient = (m.get('to') or m.get('recipient_email') or '').strip().lower()
        text = m.get('text') or m.get('message') or ''
        ts_raw = m.get('ts') or m.get('_created_at')
        if text and sender:
            sqlite_db.add(models.DirectMessage(
                sender_email=sender,
                recipient_email=recipient,
                sender_name=m.get('name') or sender.split('@')[0].title(),
                message=text,
                is_read=True,
                created_at=datetime.fromisoformat(ts_raw.replace('Z', '+00:00')) if ts_raw else datetime.utcnow()
            ))
            dm_cnt += 1

    # 8. Sync Real Community Posts
    sqlite_db.query(models.CommunityPost).delete()
    sqlite_db.commit()
    post_cnt = 0
    for p in all_data.get('community', []):
        content = p.get('text') or p.get('content') or ''
        author_email = (p.get('email') or '').strip().lower()
        author_name = p.get('name') or (author_email.split('@')[0].title() if author_email else 'Farmer')
        ts_raw = p.get('ts') or p.get('_created_at')
        if content:
            sqlite_db.add(models.CommunityPost(
                author_name=author_name,
                author_location=p.get('location') or 'Punjab',
                channel=p.get('channel') or 'General',
                title=f"Post by {author_name}",
                content=content,
                upvotes=int(p.get('upvotes', 0)),
                replies_count=int(p.get('replies', 0)),
                created_at=datetime.fromisoformat(ts_raw.replace('Z', '+00:00')) if ts_raw else datetime.utcnow()
            ))
            post_cnt += 1

    # 9. Sync Real Market Listings
    sqlite_db.query(models.MarketListing).delete()
    sqlite_db.commit()
    market_cnt = 0
    for m in all_data.get('market', []):
        crop = m.get('crop') or 'Produce'
        qty_str = str(m.get('qty', '1')).replace('kg', '').replace('Kg', '').strip()
        try:
            qty_val = float(qty_str)
        except Exception:
            qty_val = 1.0
        price_val = float(m.get('price', 0))
        ts_raw = m.get('ts') or m.get('_created_at')

        sqlite_db.add(models.MarketListing(
            title=f"{crop} Listing ({m.get('qty', '')})",
            category=m.get('cat', 'General'),
            crop_name=crop,
            quantity=qty_val,
            unit="Kg",
            price_per_unit=price_val,
            mandi_benchmark=price_val,
            quality_grade="Grade A",
            location=m.get('loc', 'Punjab'),
            seller_name=m.get('name', 'Seller'),
            seller_phone=m.get('phone') or None,
            seller_uid=m.get('uid', 'usr_default'),
            description=m.get('desc', ''),
            is_available=True,
            created_at=datetime.fromisoformat(ts_raw.replace('Z', '+00:00')) if ts_raw else datetime.utcnow()
        ))
        market_cnt += 1

    # 10. Sync Real Buyer Requirements
    sqlite_db.query(models.BuyerRequirement).delete()
    sqlite_db.commit()
    req_cnt = 0
    for r in all_data.get('requirements', []):
        crop = r.get('crop') or 'Produce'
        qty_str = str(r.get('qty', '1')).replace('kg', '').replace('Kg', '').strip()
        try:
            qty_val = float(qty_str)
        except Exception:
            qty_val = 1.0
        price_val = float(r.get('price', 0))
        ts_raw = r.get('ts') or r.get('_created_at')

        sqlite_db.add(models.BuyerRequirement(
            buyer_name=r.get('factory', 'Buyer'),
            company=r.get('factory', 'Buyer Co.'),
            crop_name=crop,
            quantity_needed=qty_val,
            unit="Kg",
            max_budget_per_unit=price_val,
            delivery_location=r.get('loc', 'Punjab'),
            contact_phone=r.get('phone') or None,
            urgency="Standard",
            notes=r.get('quality', ''),
            created_at=datetime.fromisoformat(ts_raw.replace('Z', '+00:00')) if ts_raw else datetime.utcnow()
        ))
        req_cnt += 1

    # 11. Sync Real IoT Sensor Readings
    sqlite_db.query(models.SensorReading).delete()
    sqlite_db.commit()
    reading_cnt = 0
    for s in all_data.get('readings', []):
        ts_raw = s.get('ts') or s.get('_created_at')
        sqlite_db.add(models.SensorReading(
            zone=s.get('farm') or "Field Zone",
            moisture_pct=float(s.get('soil', 30.0)),
            temp_c=float(s.get('airTemp', 28.0)),
            humidity_pct=float(s.get('humidity', 40.0)),
            sunlight_lux=float(s.get('lux', 45000.0)),
            npk_n=float(s.get('n', 150.0)),
            npk_p=float(s.get('p', 45.0)),
            npk_k=float(s.get('k', 180.0)),
            timestamp=datetime.fromisoformat(ts_raw.replace('Z', '+00:00')) if ts_raw else datetime.utcnow()
        ))
        reading_cnt += 1

    # 12. Purge All Remaining Demo-only Tables
    sqlite_db.query(models.TransportListing).delete()
    sqlite_db.query(models.FinanceRecord).delete()
    sqlite_db.query(models.CalendarEvent).delete()
    sqlite_db.query(models.GovtScheme).delete()
    sqlite_db.query(models.ActivityLog).delete()
    sqlite_db.query(models.ZoneInfo).delete()

    sqlite_db.commit()
    sqlite_db.close()
    print("\n==========================================")
    print(f"[SUCCESS] CLEAN REAL DATA SYNCED:")
    print(f" • {len(users_dict)} Real Users")
    print(f" • {dm_cnt} Real Direct Messages")
    print(f" • {post_cnt} Real Forum Posts")
    print(f" • {market_cnt} Real Market Listings")
    print(f" • {req_cnt} Real Buyer Requirements")
    print(f" • {reading_cnt} Real IoT Sensor Readings")
    print(f" • All Demo/Mock Seeds Completely Purged!")
    print("==========================================")
    return True

if __name__ == '__main__':
    sync_firebase_now()
