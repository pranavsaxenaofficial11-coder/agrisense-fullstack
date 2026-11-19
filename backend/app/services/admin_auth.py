import time
import hmac
import hashlib
from typing import Optional
from fastapi import Request
from app.config import settings

ADMIN_EMAIL = "pranavsaxenaofficial11@gmail.com"
ADMIN_PASSWORD = "PranavSaxena@220011"
COOKIE_NAME = "agrisense_admin_token"
SESSION_DURATION_SECONDS = 7 * 24 * 3600  # 7 days

# In-memory IP rate limiter for failed login attempts
_failed_attempts = {}

def is_ip_rate_limited(ip: str) -> bool:
    now = time.time()
    records = _failed_attempts.get(ip, [])
    # Keep records from last 300 seconds (5 mins)
    records = [t for t in records if now - t < 300]
    _failed_attempts[ip] = records
    return len(records) >= 6

def record_failed_attempt(ip: str):
    now = time.time()
    records = _failed_attempts.get(ip, [])
    records.append(now)
    _failed_attempts[ip] = records

def clear_failed_attempts(ip: str):
    if ip in _failed_attempts:
        del _failed_attempts[ip]

def create_admin_token() -> str:
    timestamp = str(int(time.time()))
    payload = f"{ADMIN_EMAIL}:{timestamp}"
    signature = hmac.new(settings.SECRET_KEY.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{timestamp}.{signature}"

def verify_admin_token(token: Optional[str]) -> bool:
    if not token or "." not in token:
        return False
    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return False
        timestamp_str, signature = parts
        timestamp = int(timestamp_str)
        now = int(time.time())
        # Check token expiration
        if now - timestamp > SESSION_DURATION_SECONDS or timestamp > now + 300:
            return False
        payload = f"{ADMIN_EMAIL}:{timestamp_str}"
        expected_sig = hmac.new(settings.SECRET_KEY.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected_sig)
    except Exception:
        return False

def check_admin_credentials(email: str, password: str) -> bool:
    clean_email = (email or "").strip().lower()
    clean_password = (password or "").strip()
    email_ok = hmac.compare_digest(clean_email, ADMIN_EMAIL.lower())
    pass_ok = hmac.compare_digest(clean_password, ADMIN_PASSWORD)
    return email_ok and pass_ok

def is_authenticated_admin(request: Request) -> bool:
    # 1. Check HTTP-only cookie
    token = request.cookies.get(COOKIE_NAME)
    if token and verify_admin_token(token):
        return True
    
    # 2. Check Authorization Header (Bearer token)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        header_token = auth_header[7:].strip()
        if verify_admin_token(header_token):
            return True
            
    return False

def render_login_html(error_msg: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgriSense Backend — Restricted Security Gateway</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #070d18;
      --bg-card: #0f192b;
      --border: #1e2f4d;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.2);
      --red: #ef4444;
      --red-glow: rgba(239, 68, 68, 0.15);
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow-x: hidden;
    }}
    .bg-grid {{
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 50% 10%, rgba(16, 185, 129, 0.12), transparent 45%),
        linear-gradient(rgba(30, 47, 77, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30, 47, 77, 0.3) 1px, transparent 1px);
      background-size: 100% 100%, 36px 36px, 36px 36px;
      z-index: 0;
      pointer-events: none;
    }}
    .auth-card {{
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 440px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 34px 30px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px var(--accent-glow);
      backdrop-filter: blur(12px);
    }}
    .brand-row {{
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }}
    .brand-icon {{
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent);
    }}
    .brand-title {{
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text);
    }}
    .badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: #fca5a5;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 14px;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }}
    p.desc {{
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 22px;
    }}
    .field {{
      margin-bottom: 16px;
      text-align: left;
    }}
    label {{
      display: block;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}
    input.input {{
      width: 100%;
      height: 44px;
      padding: 0 14px;
      background: #09111f;
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      font-size: 14px;
      font-family: inherit;
      transition: all 0.18s ease;
      outline: none;
    }}
    input.input:focus {{
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }}
    .pass-wrap {{
      position: relative;
    }}
    .toggle-pass {{
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 12px;
      padding: 4px;
    }}
    .btn {{
      width: 100%;
      height: 46px;
      background: var(--accent);
      color: #064e3b;
      font-weight: 700;
      font-size: 14px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      margin-top: 8px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }}
    .btn:hover {{
      background: #34d399;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
    }}
    .btn:disabled {{
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }}
    .error-box {{
      padding: 10px 14px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 8px;
      color: #fca5a5;
      font-size: 12.5px;
      line-height: 1.45;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .security-notice {{
      margin-top: 22px;
      padding-top: 16px;
      border-top: 1px solid rgba(30, 47, 77, 0.6);
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.5;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
    }}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="auth-card">
    <div class="brand-row">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <div>
        <div class="brand-title">AgriSense Backend</div>
        <div style="font-size:11.5px;color:var(--text-muted)">Bal Bharati Public School</div>
      </div>
    </div>

    <div class="badge">
      <span style="font-size:13px">🔒</span> High-Security Gateway
    </div>

    <h1>Administrative Sign In</h1>
    <p class="desc">This backend portal is restricted to authorized operators. All unauthorized connections are logged and rejected.</p>

    <div id="errBox" class="error-box" style="display:{'flex' if error_msg else 'none'}">
      <span>⚠️</span>
      <span id="errMsg">{error_msg or 'Access Denied'}</span>
    </div>

    <form id="adminForm" onsubmit="handleLogin(event)">
      <div class="field">
        <label>Operator Email</label>
        <input class="input" id="admEmail" type="email" required autocomplete="email" placeholder="admin@domain.com" value="">
      </div>

      <div class="field">
        <label>Security Password</label>
        <div class="pass-wrap">
          <input class="input" id="admPass" type="password" required autocomplete="current-password" placeholder="••••••••••••">
          <button type="button" class="toggle-pass" onclick="togglePass()">SHOW</button>
        </div>
      </div>

      <button type="submit" class="btn" id="submitBtn">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>Authenticate &amp; Unlock</span>
      </button>
    </form>

    <div class="security-notice">
      TAMPER-PROOF SESSION SECURITY ACTIVE<br>
      FAILED ATTEMPTS LOCK IP TEMPORARILY
    </div>
  </div>

  <script>
    function togglePass() {{
      const p = document.getElementById('admPass');
      const b = event.target;
      if (p.type === 'password') {{
        p.type = 'text';
        b.textContent = 'HIDE';
      }} else {{
        p.type = 'password';
        b.textContent = 'SHOW';
      }}
    }}

    async function handleLogin(e) {{
      e.preventDefault();
      const email = document.getElementById('admEmail').value.trim();
      const pass = document.getElementById('admPass').value.trim();
      const btn = document.getElementById('submitBtn');
      const errBox = document.getElementById('errBox');
      const errMsg = document.getElementById('errMsg');

      errBox.style.display = 'none';
      btn.disabled = true;
      btn.innerHTML = '<span>Verifying credentials…</span>';

      try {{
        const res = await fetch('/api/auth/admin-login', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ email: email, password: pass }})
        }});

        const data = await res.json();

        if (res.ok && data.status === 'ok') {{
          btn.innerHTML = '<span>✓ Access Granted. Redirecting…</span>';
          btn.style.background = '#059669';
          setTimeout(() => {{
            window.location.href = '/';
          }}, 400);
        }} else {{
          errBox.style.display = 'flex';
          errMsg.textContent = data.detail || 'Access Denied: Invalid operator credentials.';
          btn.disabled = false;
          btn.innerHTML = '<span>Authenticate &amp; Unlock</span>';
        }}
      }} catch (err) {{
        errBox.style.display = 'flex';
        errMsg.textContent = 'Network or security timeout. Please try again.';
        btn.disabled = false;
        btn.innerHTML = '<span>Authenticate &amp; Unlock</span>';
      }}
    }}
  </script>
</body>
</html>"""
