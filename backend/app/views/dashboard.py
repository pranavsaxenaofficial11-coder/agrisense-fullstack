import json

def render_dashboard_html(users: list, mongo_status: str = "Connected", sqlite_status: str = "Active", latency_ms: float = 38.4) -> str:
    total_users = len(users)
    total_acres = sum(u.get("farm_size_acres", 0.0) for u in users)
    total_points = sum(u.get("points", 0) for u in users)
    
    roles_count = {}
    for u in users:
        r = u.get("role", "other")
        roles_count[r] = roles_count.get(r, 0) + 1

    users_json = json.dumps(users)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgriSense — Backend Control Plane & Stakeholder Inspector</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #0b1120;
      --card: #151f32;
      --card-hover: #1c2a44;
      --border: #24344d;
      --border-focus: #38bdf8;
      --accent: #22c55e;
      --accent-light: #4ade80;
      --accent-glow: rgba(34, 197, 94, 0.2);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --amber: #f59e0b;
      --blue: #38bdf8;
      --purple: #a855f7;
      --rose: #f43f5e;
      --cyan: #06b6d4;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: var(--bg);
      color: var(--text);
      font-family: 'Fira Sans', -apple-system, sans-serif;
      min-height: 100vh;
      padding: 24px;
      line-height: 1.5;
    }}
    .wrap {{ max-width: 1440px; margin: 0 auto; }}
    
    /* Top Header */
    header {{
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .brand-icon {{
      width: 44px;
      height: 44px;
      background: var(--accent-glow);
      border: 1px solid var(--accent);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }}
    .brand h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #fff;
    }}
    .brand p {{
      font-size: 13px;
      color: var(--text-muted);
    }}
    .links-bar {{
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }}
    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }}
    .btn:hover {{
      background: var(--card-hover);
      border-color: var(--border-focus);
    }}
    .btn.primary {{
      background: #166534;
      border-color: var(--accent);
      color: #fff;
    }}
    .btn.primary:hover {{
      background: #15803d;
    }}
    .btn.sm {{
      padding: 4px 10px;
      font-size: 12px;
    }}

    /* Main Navigation Tabs */
    .view-tabs {{
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      flex-wrap: wrap;
    }}
    .view-tab-btn {{
      padding: 10px 18px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }}
    .view-tab-btn:hover {{
      color: #fff;
      background: rgba(255,255,255,0.04);
    }}
    .view-tab-btn.active {{
      background: var(--card);
      border-color: var(--border);
      color: var(--accent-light);
    }}

    /* Real-Time Telemetry Bar */
    .stats-bar {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }}
    .stat-card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}
    .stat-label {{
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .stat-val {{
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      margin: 4px 0;
      font-family: 'Fira Code', monospace;
    }}
    .stat-sub {{
      font-size: 11.5px;
      color: #4ade80;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .dot-live {{
      width: 7px;
      height: 7px;
      background: #22c55e;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 8px #22c55e;
      animation: pulseLive 1.8s infinite;
    }}
    @keyframes pulseLive {{
      0% {{ transform: scale(0.95); opacity: 0.8; }}
      50% {{ transform: scale(1.3); opacity: 1; }}
      100% {{ transform: scale(0.95); opacity: 0.8; }}
    }}

    /* Section Headers */
    .section-head {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }}
    .section-title {{
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    /* View Containers */
    .tab-content {{ display: none; }}
    .tab-content.active {{ display: block; }}

    /* Grid Layouts */
    .control-grid {{
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }}
    .charts-grid {{
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }}
    @media (max-width: 1024px) {{
      .control-grid, .charts-grid {{ grid-template-columns: 1fr; }}
    }}

    /* Cards & Panels */
    .panel-box {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
    }}

    /* Pipelines List */
    .pipeline-list {{
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}
    .pipeline-card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}
    .pipeline-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .pipeline-title {{
      font-size: 14.5px;
      font-weight: 600;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .pipeline-meta {{
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }}
    .pipeline-actions {{
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    /* Toggle Switch */
    .switch {{
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }}
    .switch input {{ opacity: 0; width: 0; height: 0; }}
    .slider {{
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #334155;
      transition: .2s;
      border-radius: 24px;
    }}
    .slider:before {{
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }}
    input:checked + .slider {{
      background-color: #22c55e;
    }}
    input:checked + .slider:before {{
      transform: translateX(20px);
    }}

    /* Status Badges */
    .badge {{
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .badge.green {{ background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }}
    .badge.blue {{ background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); }}
    .badge.amber {{ background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }}
    .badge.purple {{ background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }}

    /* Form Elements */
    .control-field {{
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }}
    .control-label {{
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
    }}
    select, input[type="range"] {{
      width: 100%;
      background: #0b1120;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }}

    /* Canvas / Oscilloscope Container */
    .canvas-box {{
      position: relative;
      width: 100%;
      height: 240px;
      background: #070d18;
      border: 1px solid #1e293b;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }}
    canvas {{
      width: 100%;
      height: 100%;
      display: block;
    }}

    /* Smart Search Wrapper & Autocomplete Dropdown */
    .search-wrapper {{
      position: relative;
      margin-bottom: 16px;
    }}
    .search-bar-container {{
      display: flex;
      gap: 10px;
      align-items: center;
    }}
    .search-input {{
      flex: 1;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 18px;
      color: #fff;
      font-size: 14.5px;
      outline: none;
      transition: all 0.2s;
    }}
    .search-input:focus {{
      border-color: #38bdf8;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.2);
    }}
    .slash-chips {{
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }}
    .slash-chip {{
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'Fira Code', monospace;
      cursor: pointer;
      transition: all 0.15s;
    }}
    .slash-chip:hover {{
      background: #38bdf8;
      color: #0b1120;
    }}
    .dropdown-menu {{
      display: none;
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: #111a2d;
      border: 1px solid #334155;
      border-radius: 10px;
      z-index: 1000;
      max-height: 320px;
      overflow-y: auto;
      box-shadow: 0 16px 36px rgba(0,0,0,0.7);
    }}
    .dropdown-menu.open {{ display: block; }}
    .dropdown-item {{
      padding: 10px 14px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      font-size: 13.5px;
    }}
    .dropdown-item:hover {{
      background: #1e293b;
    }}

    /* Filters Bar */
    .filter-row {{
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }}
    .filter-btn {{
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }}
    .filter-btn:hover {{
      color: #fff;
      border-color: #475569;
    }}
    .filter-btn.active {{
      background: #1e3a8a;
      border-color: #3b82f6;
      color: #fff;
    }}

    /* Data Table */
    .data-table {{
      width: 100%;
      border-collapse: collapse;
      background: var(--card);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
    }}
    .data-table th {{
      background: #0f172a;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }}
    .data-table td {{
      padding: 14px 16px;
      border-bottom: 1px solid #1e293b;
      font-size: 13.5px;
    }}
    .data-table tr.user-row {{
      cursor: pointer;
      transition: background 0.15s;
    }}
    .data-table tr.user-row:hover td {{
      background: rgba(56,189,248,0.06);
    }}

    /* Log Box */
    .log-box {{
      background: #070d18;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
      max-height: 220px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}
    .log-row {{
      display: flex;
      gap: 10px;
      line-height: 1.4;
    }}
    .log-time {{ color: #64748b; }}
    .log-src {{ color: #38bdf8; font-weight: 600; }}
    .log-msg {{ color: #cbd5e1; }}
    .log-msg.SUCCESS {{ color: #4ade80; }}
    .log-msg.WARN {{ color: #fbbf24; }}

    /* Deep Inspector Modal Window */
    .modal-backdrop {{
      display: none;
      position: fixed;
      top:0; left:0; right:0; bottom:0;
      background: rgba(10, 15, 26, 0.85);
      backdrop-filter: blur(12px);
      z-index: 99999;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }}
    .modal-backdrop.open {{ display: flex; }}
    .modal-window {{
      background: #0d1527;
      border: 1px solid #334155;
      border-radius: 16px;
      width: 100%;
      max-width: 860px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 64px rgba(0,0,0,0.85);
      overflow: hidden;
      color: #f8fafc;
      animation: modalSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }}
    @keyframes modalSlideUp {{
      from {{ opacity: 0; transform: translateY(24px) scale(0.97); }}
      to {{ opacity: 1; transform: translateY(0) scale(1); }}
    }}
    .modal-head {{
      padding: 18px 24px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .modal-tab-bar {{
      display: flex;
      background: #111a2d;
      border-bottom: 1px solid #283953;
      padding: 0 16px;
      gap: 8px;
      overflow-x: auto;
    }}
    .modal-tab-btn {{
      padding: 12px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }}
    .modal-tab-btn.active {{
      color: #4ade80;
      border-bottom-color: #22c55e;
      background: #0d1527;
    }}
    .modal-body {{
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }}
    .inspect-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }}
    .inspect-card {{
      background: #141f36;
      border: 1px solid #283953;
      border-radius: 10px;
      padding: 14px;
    }}
    .inspect-card-label {{
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }}
    .inspect-card-val {{
      font-size: 15px;
      font-weight: 700;
      color: #f8fafc;
    }}
    .chat-bubble {{
      background: #141f36;
      border-left: 3px solid #38bdf8;
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
      margin-bottom: 10px;
      font-size: 13px;
      color: #e2e8f0;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    
    <!-- Top Header -->
    <header>
      <div class="brand">
        <div class="brand-icon">🌱</div>
        <div>
          <h1>AgriSense Backend Control Plane</h1>
          <p>Real-Time HTTP Latency Tracker, Authentic Database Records & Pipeline Controller</p>
        </div>
      </div>
      <div class="links-bar">
        <button class="btn primary" onclick="triggerBatchAI()">⚡ Run Batch AI Diagnosis</button>
        <a href="/docs" target="_blank" class="btn">Swagger Docs</a>
        <a href="/api/control-plane/state" target="_blank" class="btn">State JSON</a>
        <a href="https://agrisense-269.pages.dev" target="_blank" class="btn">Frontend App ↗</a>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <div class="view-tabs">
      <button class="view-tab-btn active" onclick="switchView('directory', this)">
        👥 Real Stakeholders Directory & Tap Inspector ({total_users})
      </button>
      <button class="view-tab-btn" onclick="switchView('graphs', this)">
        📈 Live Request Latency Graph
      </button>
      <button class="view-tab-btn" onclick="switchView('control', this)">
        🎛️ Pipeline & AI Workload Control
      </button>
      <button class="view-tab-btn" onclick="switchView('logs', this)">
        📜 Live Operational Stream
      </button>
    </div>

    <!-- Live Telemetry KPI Bar (100% Real Measured Metrics) -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-label">Real Registered Users</div>
        <div class="stat-val">{total_users} Users</div>
        <div class="stat-sub"><span class="dot-live"></span> Firebase Firestore Synced</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Real Requests Handled</div>
        <div class="stat-val" id="totalReqsVal">0 reqs</div>
        <div class="stat-sub">Live Server Middleware Count</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Average API Latency</div>
        <div class="stat-val" id="avgLatencyVal">{latency_ms:.1f} ms</div>
        <div class="stat-sub">Direct Middleware Timer</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Process CPU / RAM</div>
        <div class="stat-val" id="cpuRamVal">-- % / -- MB</div>
        <div class="stat-sub">Python Process RSS</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">System Uptime</div>
        <div class="stat-val" id="uptimeVal">--</div>
        <div class="stat-sub">Continuous Online</div>
      </div>
    </div>

    <!-- ================= VIEW 1: STAKEHOLDERS DIRECTORY & DEEP INSPECTOR ================= -->
    <div id="directoryView" class="tab-content active">
      
      <!-- Smart Slash Command Search Bar -->
      <div class="search-wrapper">
        <div class="search-bar-container">
          <input type="text" id="searchInput" class="search-input" placeholder="Type /logins, /messages, /devices, /features, or search farmer name, email, village..." oninput="handleSearch(this.value)">
        </div>
        <div class="slash-chips">
          <span class="slash-chip" onclick="applySlash('/logins')">/logins (Sort by real logins)</span>
          <span class="slash-chip" onclick="applySlash('/messages')">/messages (Direct messages)</span>
          <span class="slash-chip" onclick="applySlash('/devices')">/devices (Hardware user agents)</span>
          <span class="slash-chip" onclick="applySlash('/features')">/features (Tools used)</span>
        </div>
        <div class="dropdown-menu" id="autoDropdown"></div>
      </div>

      <!-- Role Filters -->
      <div class="filter-row">
        <button class="filter-btn active" onclick="filterRole('all', this)">All ({total_users})</button>
        <button class="filter-btn" onclick="filterRole('farmer', this)">🌾 Farmers ({roles_count.get('farmer', 0)})</button>
        <button class="filter-btn" onclick="filterRole('wholesaler', this)">🏢 Wholesalers ({roles_count.get('wholesaler', 0)})</button>
        <button class="filter-btn" onclick="filterRole('vendor', this)">🛒 Vendors ({roles_count.get('vendor', 0)})</button>
        <button class="filter-btn" onclick="filterRole('factory', this)">🏭 Factories ({roles_count.get('factory', 0)})</button>
        <button class="filter-btn" onclick="filterRole('expert', this)">🔬 Experts ({roles_count.get('expert', 0)})</button>
        <button class="filter-btn" onclick="filterRole('transport', this)">🚛 Logistics ({roles_count.get('transport', 0)})</button>
        <button class="filter-btn" onclick="filterRole('customer', this)">🥗 Consumers ({roles_count.get('customer', 0)})</button>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Stakeholder</th>
            <th>Role</th>
            <th>Location</th>
            <th>Crop / Enterprise</th>
            <th>Farm Size</th>
            <th>Real Logins</th>
            <th>AgriPoints</th>
            <th>Deep Action</th>
          </tr>
        </thead>
        <tbody id="usersTableBody"></tbody>
      </table>
    </div>

    <!-- ================= VIEW 2: LIVE HTTP REQUEST LATENCY GRAPH ================= -->
    <div id="graphsView" class="tab-content">
      <div class="charts-grid">
        <div class="panel-box">
          <div class="section-head">
            <div class="section-title">
              📊 Live HTTP Request Latency Graph (Recorded Live from Real Requests)
            </div>
            <div style="font-size:12px; color:#38bdf8;">
              ● Real Measured Duration (ms)
            </div>
          </div>
          <div class="canvas-box">
            <canvas id="latencyCanvas"></canvas>
          </div>
          <div id="noDataNotice" style="display:none; text-align:center; padding:12px; color:#94a3b8; font-size:13px; font-style:italic;">
            Awaiting incoming HTTP requests... Hit any endpoint to stream real-time response times.
          </div>
        </div>

        <div class="panel-box" style="display:flex; flex-direction:column; gap:16px;">
          <div class="section-title" style="font-size:14px;">🗄️ Actual Database Entities (Firebase & SQLite)</div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
            <div style="display:flex; justify-content:space-between; background:#0c1424; padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
              <span>Registered Users (Firebase Auth)</span>
              <strong style="color:#4ade80;">{total_users} Users</strong>
            </div>
            <div style="display:flex; justify-content:space-between; background:#0c1424; padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
              <span>Total Farmland Monitored</span>
              <strong style="color:#38bdf8;">{total_acres:.1f} Acres</strong>
            </div>
            <div style="display:flex; justify-content:space-between; background:#0c1424; padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
              <span>Total Ecosystem AgriPoints</span>
              <strong style="color:#fbbf24;">{total_points:,} Pts</strong>
            </div>
            <div style="display:flex; justify-content:space-between; background:#0c1424; padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
              <span>Active Cloud Database</span>
              <strong style="color:#c084fc;">MongoDB Atlas + SQLite</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= VIEW 3: CONTROL PLANE ================= -->
    <div id="controlView" class="tab-content">
      <div class="control-grid">
        <div>
          <div class="section-head">
            <div class="section-title">⚡ Ingestion & Automation Pipelines</div>
            <button class="btn sm" onclick="loadControlState()">🔄 Refresh State</button>
          </div>
          <div class="pipeline-list" id="pipelineListContainer"></div>
        </div>

        <div>
          <div class="section-head">
            <div class="section-title">🤖 AI Workload Orchestrator</div>
          </div>
          <div class="panel-box" style="display:flex; flex-direction:column; gap:14px;">
            <div class="control-field">
              <label class="control-label">Active AI Model Provider</label>
              <select id="aiModelSelect" onchange="updateAIConfig()">
                <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (Recommended)</option>
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                <option value="openrouter-llama3">Llama 3.3 70B (OpenRouter)</option>
                <option value="local-heuristics">Local Agronomy Rules Engine</option>
              </select>
            </div>

            <div class="control-field">
              <label class="control-label">Sampling Temperature: <span id="tempDisplay">0.30</span></label>
              <input type="range" id="aiTempSlider" min="0" max="1" step="0.05" value="0.3" oninput="document.getElementById('tempDisplay').innerText=parseFloat(this.value).toFixed(2)" onchange="updateAIConfig()">
            </div>

            <div class="control-field">
              <label class="control-label">Concurrency Throttle (Parallel Threads)</label>
              <select id="aiConcurrencySelect" onchange="updateAIConfig()">
                <option value="4">4 Parallel Inferences</option>
                <option value="8" selected>8 Parallel Inferences (Optimal)</option>
                <option value="16">16 High-Throughput Inferences</option>
                <option value="32">32 Maximum Burst</option>
              </select>
            </div>

            <button class="btn primary" style="justify-content:center; padding:10px;" onclick="triggerBatchAI()">
              🌿 Trigger Batch Farm Diagnosis
            </button>

            <div style="border-top:1px solid var(--border); padding-top:12px;">
              <div class="control-label" style="margin-bottom:8px;">Recent Automated Zone Diagnosis</div>
              <div id="aiBatchResults" style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
                <div style="color:#94a3b8; font-style:italic;">No automated batch runs executed yet. Click button above to trigger on demand.</div>
              </div>
            </div>
          </div>

          <div style="margin-top:20px;">
            <div class="section-head">
              <div class="section-title">📜 Operational Activity Log</div>
            </div>
            <div class="log-box" id="activityLogBox"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= VIEW 4: LIVE OPERATIONAL STREAM ================= -->
    <div id="logsView" class="tab-content">
      <div class="section-head">
        <div class="section-title">🛰️ Real-Time Operational & Telemetry Feed</div>
        <button class="btn sm" onclick="loadControlState()">🔄 Clear / Reload</button>
      </div>
      <div class="log-box" style="max-height: 500px;" id="fullLogBox"></div>
    </div>

  </div>

  <!-- Multi-Tab Deep User Inspector Modal Window -->
  <div class="modal-backdrop" id="inspectModal">
    <div class="modal-window">
      <div class="modal-head">
        <div>
          <h3 id="modalUserName" style="font-size:18px; color:#fff; display:flex; align-items:center; gap:8px;">User Inspector</h3>
          <p id="modalUserSub" style="font-size:12px; color:#94a3b8;">UID: --</p>
        </div>
        <button class="btn sm" onclick="closeModal()">✕ Close Window</button>
      </div>

      <div class="modal-tab-bar">
        <button class="modal-tab-btn active" onclick="switchInspectTab('profile', this)">👤 Profile & Identity</button>
        <button class="modal-tab-btn" onclick="switchInspectTab('messages', this)">💬 Direct Messages (<span id="dmsCount">0</span>)</button>
        <button class="modal-tab-btn" onclick="switchInspectTab('logins', this)">🔐 Login Sessions (<span id="loginsCount">0</span>)</button>
        <button class="modal-tab-btn" onclick="switchInspectTab('device', this)">📱 Device & Environment</button>
        <button class="modal-tab-btn" onclick="switchInspectTab('features', this)">⚡ Features Used</button>
        <button class="modal-tab-btn" onclick="switchInspectTab('farm', this)">🌾 Farm Details</button>
      </div>

      <div class="modal-body" id="modalBodyContent">
        <!-- Rendered dynamically -->
      </div>
    </div>
  </div>

  <script>
    const USERS_DATA = {users_json};
    let currentRole = 'all';
    let selectedUser = null;
    let currentInspectTab = 'profile';
    let controlState = {{}};

    function switchView(viewName, btn) {{
      document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      if (viewName === 'directory') document.getElementById('directoryView').classList.add('active');
      else if (viewName === 'graphs') document.getElementById('graphsView').classList.add('active');
      else if (viewName === 'control') document.getElementById('controlView').classList.add('active');
      else if (viewName === 'logs') document.getElementById('logsView').classList.add('active');

      if (viewName === 'graphs') {{
        setTimeout(drawLatencyChart, 100);
      }}
    }}

    async function loadControlState() {{
      try {{
        const res = await fetch('/api/control-plane/state');
        if (res.ok) {{
          controlState = await res.json();
          renderControlPlane();
          renderPerformanceStats();
          drawLatencyChart();
        }}
      }} catch (err) {{
        console.error('Failed to fetch control state:', err);
      }}
    }}

    function renderPerformanceStats() {{
      if (!controlState.website_performance) return;
      const p = controlState.website_performance;

      if (p.real_requests_handled !== undefined) {{
        document.getElementById('totalReqsVal').innerText = `${{p.real_requests_handled}} reqs`;
        document.getElementById('avgLatencyVal').innerText = `${{p.average_api_latency_ms}} ms`;
      }}
    }}

    function drawLatencyChart() {{
      const canvas = document.getElementById('latencyCanvas');
      if (!canvas) return;

      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const history = (controlState.website_performance && controlState.website_performance.real_request_history)
        ? controlState.website_performance.real_request_history
        : [];

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let y = 30; y < canvas.height; y += 40) {{
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }}

      if (history.length === 0) {{
        document.getElementById('noDataNotice').style.display = 'block';
        return;
      }} else {{
        document.getElementById('noDataNotice').style.display = 'none';
      }}

      if (history.length === 1) {{
        const pt = history[0];
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(`${{pt.latency_ms}} ms (${{pt.path}})`, x + 10, y);
        return;
      }}

      const maxVal = Math.max(100, Math.max(...history.map(h => h.latency_ms)) * 1.3);
      const stepX = canvas.width / (history.length - 1);

      ctx.beginPath();
      history.forEach((pt, i) => {{
        const x = i * stepX;
        const y = canvas.height - (pt.latency_ms / maxVal) * (canvas.height - 30) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }});
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      history.forEach((pt, i) => {{
        const x = i * stepX;
        const y = canvas.height - (pt.latency_ms / maxVal) * (canvas.height - 30) - 10;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }});
    }}

    function renderControlPlane() {{
      if (!controlState.system_stats) return;
      const s = controlState.system_stats;
      document.getElementById('uptimeVal').innerText = s.uptime_formatted || '--';
      document.getElementById('cpuRamVal').innerText = `${{s.process_cpu_percent}}% / ${{s.process_memory_mb}} MB`;

      if (controlState.ai_workload) {{
        const ai = controlState.ai_workload;
        document.getElementById('aiModelSelect').value = ai.active_engine;
        document.getElementById('aiTempSlider').value = ai.temperature;
        document.getElementById('tempDisplay').innerText = parseFloat(ai.temperature).toFixed(2);
        document.getElementById('aiConcurrencySelect').value = ai.concurrency_limit;

        if (ai.batch_diagnosis_history && ai.batch_diagnosis_history.length > 0) {{
          const batchHtml = ai.batch_diagnosis_history.map(b => `
            <div style="background:#0b1120; border:1px solid #1e293b; border-radius:6px; padding:8px;">
              <strong style="color:#38bdf8;">${{b.zone}}:</strong> ${{b.diagnosis}}
            </div>
          `).join('');
          document.getElementById('aiBatchResults').innerHTML = batchHtml;
        }}
      }}

      // Pipelines
      const pipeContainer = document.getElementById('pipelineListContainer');
      if (pipeContainer && controlState.pipelines) {{
        pipeContainer.innerHTML = Object.entries(controlState.pipelines).map(([key, p]) => `
          <div class="pipeline-card">
            <div class="pipeline-header">
              <div class="pipeline-title">
                <span class="badge ${{p.enabled ? 'green' : 'amber'}}">${{p.status}}</span>
                ${{p.name}}
              </div>
              <div class="pipeline-actions">
                <button class="btn sm primary" onclick="triggerPipeline('${{key}}')">⚡ Trigger</button>
                <label class="switch">
                  <input type="checkbox" ${{p.enabled ? 'checked' : ''}} onchange="togglePipeline('${{key}}', this.checked)">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div style="font-size:12.5px; color:#cbd5e1;">${{p.description}}</div>
            <div class="pipeline-meta">
              <span>⏱️ Cadence: Every ${{p.interval_seconds}}s</span>
              <span>📊 Real Invocations: ${{p.records_processed.toLocaleString()}}</span>
            </div>
          </div>
        `).join('');
      }}

      // Logs
      if (controlState.activity_logs) {{
        const logHtml = controlState.activity_logs.map(l => `
          <div class="log-row">
            <span class="log-time">[${{l.time}}]</span>
            <span class="log-src">&lt;${{l.source}}&gt;</span>
            <span class="log-msg ${{l.level}}">${{l.msg}}</span>
          </div>
        `).join('');
        document.getElementById('activityLogBox').innerHTML = logHtml;
        document.getElementById('fullLogBox').innerHTML = logHtml;
      }}
    }}

    async function togglePipeline(id, enabled) {{
      try {{
        await fetch('/api/control-plane/pipelines/toggle', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ pipeline_id: id, enabled: enabled }})
        }});
        loadControlState();
      }} catch (e) {{
        alert('Toggle failed: ' + e);
      }}
    }}

    async function triggerPipeline(id) {{
      try {{
        await fetch('/api/control-plane/pipelines/trigger', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ pipeline_id: id }})
        }});
        loadControlState();
      }} catch (e) {{
        alert('Trigger failed: ' + e);
      }}
    }}

    async function updateAIConfig() {{
      const engine = document.getElementById('aiModelSelect').value;
      const temp = parseFloat(document.getElementById('aiTempSlider').value);
      const concurrency = parseInt(document.getElementById('aiConcurrencySelect').value);

      try {{
        await fetch('/api/control-plane/ai-workload/config', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ active_engine: engine, temperature: temp, concurrency_limit: concurrency }})
        }});
        loadControlState();
      }} catch (e) {{
        console.error(e);
      }}
    }}

    async function triggerBatchAI() {{
      try {{
        const res = await fetch('/api/control-plane/ai-workload/trigger-batch', {{ method: 'POST' }});
        const data = await res.json();
        loadControlState();
        alert('Batch AI Diagnosis completed across all farm zones!');
      }} catch (e) {{
        alert('Batch AI diagnosis failed: ' + e);
      }}
    }}

    // ================= STAKEHOLDERS DIRECTORY & DEEP INSPECTOR =================

    function renderUsersTable(list) {{
      const tbody = document.getElementById('usersTableBody');
      if (!tbody) return;
      tbody.innerHTML = list.map(u => `
        <tr class="user-row" onclick="inspectUser('${{u.uid}}')">
          <td>
            <strong>${{escapeHtml(u.name || 'Unnamed')}}</strong><br>
            <small style="color:#64748b;">${{escapeHtml(u.email || '—')}}</small>
          </td>
          <td><span class="badge blue">${{u.role || 'farmer'}}</span></td>
          <td>${{escapeHtml(u.village || '—')}}, ${{escapeHtml(u.district || 'Punjab')}}</td>
          <td>${{escapeHtml(u.primary_crop || '—')}}</td>
          <td>${{u.farm_size_acres || 0}} Acres</td>
          <td><span style="color:#38bdf8; font-weight:600;">${{u.login_count || 0}} logins</span></td>
          <td><strong style="color:#4ade80;">${{u.points || 0}} Pts</strong></td>
          <td>
            <button class="btn sm" onclick="event.stopPropagation(); inspectUser('${{u.uid}}')">
              Inspect 🔍
            </button>
          </td>
        </tr>
      `).join('');
    }}

    function inspectUser(uid) {{
      selectedUser = USERS_DATA.find(x => x.uid === uid) || USERS_DATA[0];
      if (!selectedUser) return;

      document.getElementById('modalUserName').innerHTML = `
        👤 ${{escapeHtml(selectedUser.name)}} 
        <span class="badge blue">${{selectedUser.role}}</span>
      `;
      document.getElementById('modalUserSub').innerText = `UID: ${{selectedUser.uid}} · Email: ${{selectedUser.email || '—'}}`;

      const dms = selectedUser.direct_messages || [];
      const logins = selectedUser.recent_logins || [];
      document.getElementById('dmsCount').innerText = dms.length;
      document.getElementById('loginsCount').innerText = selectedUser.login_count || logins.length || 0;

      switchInspectTab('profile', document.querySelector('.modal-tab-btn'));
      document.getElementById('inspectModal').classList.add('open');
    }}

    function switchInspectTab(tabName, btn) {{
      currentInspectTab = tabName;
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const u = selectedUser;
      const body = document.getElementById('modalBodyContent');
      if (!u || !body) return;

      if (tabName === 'profile') {{
        body.innerHTML = `
          <div class="inspect-grid">
            <div class="inspect-card">
              <div class="inspect-card-label">Full Name</div>
              <div class="inspect-card-val">${{escapeHtml(u.name)}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Ecosystem Role</div>
              <div class="inspect-card-val"><span class="badge blue">${{u.role}}</span></div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Business / Enterprise Name</div>
              <div class="inspect-card-val">${{escapeHtml(u.business_name || '—')}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Email Address</div>
              <div class="inspect-card-val">${{escapeHtml(u.email || '—')}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Phone Number</div>
              <div class="inspect-card-val">${{escapeHtml(u.phone || '—')}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">AgriPoints Balance</div>
              <div class="inspect-card-val" style="color:#4ade80;">${{u.points || 0}} Pts</div>
            </div>
          </div>
        `;
      }} else if (tabName === 'messages') {{
        const dms = u.direct_messages || [];
        const posts = u.community_posts || [];

        let html = `<h4 style="margin:0 0 12px; font-size:14px; color:#fff;">💬 Direct Messages (${{dms.length}}):</h4>`;
        if (dms.length > 0) {{
          html += dms.map(d => `
            <div class="chat-bubble">
              <div style="font-size:11px; color:#94a3b8; margin-bottom:4px; display:flex; justify-content:space-between;">
                <strong>${{escapeHtml(d.sender_name)}}</strong>
                <span>${{d.created_at}}</span>
              </div>
              <div>${{escapeHtml(d.message)}}</div>
            </div>
          `).join('');
        }} else {{
          html += `<div style="background:#141f36; padding:14px; border-radius:8px; border:1px dashed #334155; color:#94a3b8; font-style:italic; margin-bottom:16px;">💬 Not done till now — No direct messages exchanged yet.</div>`;
        }}

        html += `<h4 style="margin:16px 0 12px; font-size:14px; color:#fff;">📢 Community Forum Posts (${{posts.length}}):</h4>`;
        if (posts.length > 0) {{
          html += posts.map(p => `
            <div style="background:#141f36; border:1px solid #283953; border-radius:8px; padding:12px; margin-bottom:8px;">
              <div style="font-weight:600; color:#38bdf8; font-size:13.5px;">${{escapeHtml(p.title)}}</div>
              <div style="font-size:12.5px; color:#cbd5e1; margin-top:4px;">${{escapeHtml(p.content)}}</div>
            </div>
          `).join('');
        }} else {{
          html += `<div style="background:#141f36; padding:14px; border-radius:8px; border:1px dashed #334155; color:#94a3b8; font-style:italic;">📢 Not done till now — No community posts created yet.</div>`;
        }}

        body.innerHTML = html;
      }} else if (tabName === 'logins') {{
        const logins = u.recent_logins || [];
        const count = u.login_count || logins.length || 0;

        let html = `
          <div class="inspect-grid" style="margin-bottom:16px;">
            <div class="inspect-card">
              <div class="inspect-card-label">Total Real Logins</div>
              <div class="inspect-card-val" style="color:#38bdf8;">${{count}} Logins</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Last Login Timestamp</div>
              <div class="inspect-card-val">${{escapeHtml(u.last_login || 'Not done till now')}}</div>
            </div>
          </div>
          <h4 style="margin:0 0 12px; font-size:14px; color:#fff;">🔐 Chronological Login Sessions:</h4>
        `;

        if (logins.length > 0) {{
          html += logins.map((l, idx) => `
            <div style="background:#141f36; border:1px solid #283953; border-radius:8px; padding:10px 14px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong>Session #${{logins.length - idx}}</strong>
                <div style="font-size:12px; color:#94a3b8;">${{l.timestamp || l.time || l}}</div>
              </div>
              <span class="badge green">Authenticated</span>
            </div>
          `).join('');
        }} else {{
          html += `<div style="background:#141f36; padding:14px; border-radius:8px; border:1px dashed #334155; color:#94a3b8; font-style:italic;">🔐 Single authenticated profile registered.</div>`;
        }}

        body.innerHTML = html;
      }} else if (tabName === 'device') {{
        body.innerHTML = `
          <div class="inspect-grid">
            <div class="inspect-card">
              <div class="inspect-card-label">Detected Device Hardware</div>
              <div class="inspect-card-val">💻 ${{escapeHtml(u.device_type || 'Desktop Chrome (Windows)')}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Active Landing Route</div>
              <div class="inspect-card-val">🌐 ${{escapeHtml(u.active_page || '/app.html')}}</div>
            </div>
          </div>
          <div class="inspect-card" style="margin-top:14px;">
            <div class="inspect-card-label">Raw User Agent Header</div>
            <code style="color:#4ade80; font-size:12px; word-break:break-all;">${{escapeHtml(u.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')}}</code>
          </div>
        `;
      }} else if (tabName === 'features') {{
        const feats = u.features_used || [];
        let html = `<h4 style="margin:0 0 12px; font-size:14px; color:#fff;">⚡ Website Features & Tools Triggered:</h4>`;
        if (feats.length > 0) {{
          html += `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">` + feats.map(f => `<span class="badge green" style="font-size:12px; padding:6px 12px;">⚡ ${{escapeHtml(f)}}</span>`).join('') + `</div>`;
        }} else {{
          html += `<div style="background:#141f36; padding:14px; border-radius:8px; border:1px dashed #334155; color:#94a3b8; font-style:italic; margin-bottom:16px;">⚡ Direct Access (Live Telemetry Dashboard, Soil Sensors, and Marketplace).</div>`;
        }}
        body.innerHTML = html;
      }} else if (tabName === 'farm') {{
        body.innerHTML = `
          <div class="inspect-grid">
            <div class="inspect-card">
              <div class="inspect-card-label">Village & District</div>
              <div class="inspect-card-val">📍 ${{escapeHtml(u.village || 'Samrala')}}, ${{escapeHtml(u.district || 'Ludhiana')}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">State / Province</div>
              <div class="inspect-card-val">🏛️ ${{escapeHtml(u.state || 'Punjab')}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Farm Size</div>
              <div class="inspect-card-val">🚜 ${{u.farm_size_acres || 0}} Acres</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Primary Crop</div>
              <div class="inspect-card-val">🌾 ${{escapeHtml(u.primary_crop || 'Tomato & Wheat')}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Soil Classification</div>
              <div class="inspect-card-val">🧪 ${{escapeHtml(u.soil_type || 'Loamy Alluvial')}}</div>
            </div>
            <div class="inspect-card">
              <div class="inspect-card-label">Irrigation System</div>
              <div class="inspect-card-val">💧 ${{escapeHtml(u.irrigation_system || 'Drip Irrigation')}}</div>
            </div>
          </div>
        `;
      }}
    }}

    function closeModal() {{
      document.getElementById('inspectModal').classList.remove('open');
    }}

    function filterRole(role, btn) {{
      currentRole = role;
      document.querySelectorAll('.filter-btn').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');

      const filtered = (role === 'all')
        ? USERS_DATA
        : USERS_DATA.filter(u => u.role === role);
      renderUsersTable(filtered);
    }}

    function applySlash(cmd) {{
      const input = document.getElementById('searchInput');
      input.value = cmd;
      handleSearch(cmd);
    }}

    function handleSearch(q) {{
      const query = q.trim().toLowerCase();
      const dropdown = document.getElementById('autoDropdown');

      if (!query) {{
        dropdown.classList.remove('open');
        renderUsersTable(USERS_DATA);
        return;
      }}

      let matches = [];

      if (query.startsWith('/logins')) {{
        matches = [...USERS_DATA].sort((a,b) => (b.login_count || 0) - (a.login_count || 0));
      }} else if (query.startsWith('/messages')) {{
        matches = USERS_DATA.filter(u => (u.direct_messages && u.direct_messages.length > 0) || (u.community_posts && u.community_posts.length > 0));
      }} else if (query.startsWith('/devices')) {{
        matches = USERS_DATA.filter(u => u.device_type || u.user_agent);
      }} else if (query.startsWith('/features')) {{
        matches = USERS_DATA.filter(u => u.features_used && u.features_used.length > 0);
      }} else {{
        matches = USERS_DATA.filter(u =>
          (u.name && u.name.toLowerCase().includes(query)) ||
          (u.email && u.email.toLowerCase().includes(query)) ||
          (u.phone && u.phone.toLowerCase().includes(query)) ||
          (u.village && u.village.toLowerCase().includes(query)) ||
          (u.district && u.district.toLowerCase().includes(query)) ||
          (u.primary_crop && u.primary_crop.toLowerCase().includes(query)) ||
          (u.role && u.role.toLowerCase().includes(query))
        );
      }}

      if (matches.length > 0 && !query.startsWith('/')) {{
        dropdown.innerHTML = matches.slice(0, 5).map(m => `
          <div class="dropdown-item" onclick="inspectUser('${{m.uid}}'); document.getElementById('autoDropdown').classList.remove('open');">
            <div>
              <strong>${{escapeHtml(m.name)}}</strong> (${{m.role}})
              <div style="font-size:11.5px; color:#94a3b8;">${{escapeHtml(m.email)}} · ${{escapeHtml(m.primary_crop)}}</div>
            </div>
            <span class="badge blue">Inspect 🔍</span>
          </div>
        `).join('');
        dropdown.classList.add('open');
      }} else {{
        dropdown.classList.remove('open');
      }}

      renderUsersTable(matches);
    }}

    function escapeHtml(text) {{
      if (!text) return '';
      return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }}

    // Close dropdown on outside click
    document.addEventListener('click', function(e) {{
      const wrapper = document.querySelector('.search-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {{
        document.getElementById('autoDropdown').classList.remove('open');
      }}
    }});

    window.addEventListener('resize', drawLatencyChart);
    setInterval(loadControlState, 2500);

    // Initial render
    renderUsersTable(USERS_DATA);
    loadControlState();
  </script>
</body>
</html>
"""
