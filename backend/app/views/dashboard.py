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
  <title>AgriSense — Enterprise Backend Control Plane & Engineering Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #070d18;
      --bg-surface: #0e1726;
      --card: #131f33;
      --card-hover: #1a2a45;
      --card-active: #22375a;
      --border: #1e2f4d;
      --border-subtle: #16233b;
      --border-focus: #38bdf8;
      --accent: #10b981;
      --accent-light: #34d399;
      --accent-glow: rgba(16, 185, 129, 0.15);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
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
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      padding: 24px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }}
    .wrap {{ max-width: 1520px; margin: 0 auto; }}
    
    /* Top Header */
    header {{
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 14px;
    }}
    .brand-icon {{
      width: 46px;
      height: 46px;
      background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(56,189,248,0.2) 100%);
      border: 1px solid var(--accent);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 0 20px rgba(16,185,129,0.2);
    }}
    .brand h1 {{
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #fff;
    }}
    .brand p {{
      font-size: 13px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
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
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }}
    .btn:hover {{
      background: var(--card-hover);
      border-color: var(--border-focus);
      color: #fff;
    }}
    .btn.primary {{
      background: #065f46;
      border-color: var(--accent);
      color: #fff;
    }}
    .btn.primary:hover {{
      background: #047857;
      box-shadow: 0 0 15px rgba(16,185,129,0.3);
    }}
    .btn.secondary {{
      background: #1e293b;
      border-color: #334155;
    }}

    /* System Telemetry Badges Bar */
    .system-strip {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }}
    .sys-pill {{
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }}
    .sys-pill .label {{
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-dim);
    }}
    .sys-pill .val {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .dot-live {{
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
      animation: pulse 2s infinite;
    }}
    @keyframes pulse {{
      0%, 100% {{ opacity: 1; transform: scale(1); }}
      50% {{ opacity: 0.4; transform: scale(0.85); }}
    }}

    /* Navigation Tabs */
    .nav-tabs {{
      display: flex;
      gap: 6px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 2px;
    }}
    .tab-btn {{
      background: transparent;
      border: 1px solid transparent;
      border-bottom: none;
      color: var(--text-muted);
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      white-space: nowrap;
    }}
    .tab-btn:hover {{
      color: var(--text);
      background: rgba(255,255,255,0.03);
    }}
    .tab-btn.active {{
      color: #fff;
      background: var(--card);
      border-color: var(--border) var(--border) transparent var(--border);
      position: relative;
    }}
    .tab-btn.active::after {{
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
    }}

    /* Tab Panes */
    .tab-pane {{
      display: none;
      animation: fadeIn 0.2s ease-in-out;
    }}
    .tab-pane.active {{
      display: block;
    }}
    @keyframes fadeIn {{
      from {{ opacity: 0; transform: translateY(4px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}

    /* Cards & Containers */
    .agri-card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }}
    .card-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }}
    .card-title {{
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    /* Search Container with Active Autocomplete */
    .search-container {{
      position: relative;
      margin-bottom: 20px;
      z-index: 50;
    }}
    .search-input-wrapper {{
      position: relative;
      display: flex;
      align-items: center;
    }}
    .search-icon {{
      position: absolute;
      left: 16px;
      color: var(--text-dim);
      font-size: 18px;
      pointer-events: none;
    }}
    .slash-input {{
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 16px 14px 44px;
      color: #fff;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
    }}
    .slash-input:focus {{
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
      background: var(--card);
    }}
    .slash-hints {{
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }}
    .slash-chip {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      color: var(--blue);
      cursor: pointer;
      transition: all 0.2s;
    }}
    .slash-chip:hover {{
      background: var(--card-hover);
      border-color: var(--blue);
      color: #fff;
    }}

    /* Active Suggestions Floating Dropdown */
    .suggestions-dropdown {{
      display: none;
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: #0f192b;
      border: 1px solid var(--border-focus);
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
      max-height: 380px;
      overflow-y: auto;
      z-index: 100;
      backdrop-filter: blur(12px);
    }}
    .suggestions-dropdown.open {{
      display: block;
    }}
    .suggestion-header {{
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-dim);
      border-bottom: 1px solid var(--border-subtle);
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      justify-content: space-between;
    }}
    .suggestion-item {{
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: background 0.15s;
    }}
    .suggestion-item:last-child {{
      border-bottom: none;
    }}
    .suggestion-item:hover {{
      background: rgba(56, 189, 248, 0.1);
    }}
    .user-avatar-badge {{
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }}

    /* Data Grids & Tables */
    .data-table-container {{
      width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg-surface);
    }}
    table.data-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }}
    table.data-table th {{
      background: rgba(255,255,255,0.02);
      color: var(--text-muted);
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      text-transform: uppercase;
    }}
    table.data-table td {{
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text);
    }}
    table.data-table tr:hover td {{
      background: rgba(255,255,255,0.02);
    }}
    .mono {{
      font-family: 'JetBrains Mono', monospace;
    }}

    /* Badges */
    .badge {{
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
    }}
    .badge-success {{ background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }}
    .badge-blue {{ background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }}
    .badge-amber {{ background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }}
    .badge-rose {{ background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }}
    .badge-purple {{ background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }}

    /* Modal Inspector */
    .modal-backdrop {{
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(6px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }}
    .modal-backdrop.open {{
      display: flex;
    }}
    .modal-box {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      width: 100%;
      max-width: 900px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }}
    .modal-header {{
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-surface);
    }}
    .modal-body {{
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }}
    .modal-tabs {{
      display: flex;
      gap: 6px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }}
    .modal-tab-btn {{
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 6px 6px 0 0;
    }}
    .modal-tab-btn.active {{
      color: #fff;
      background: var(--bg-surface);
      border-bottom: 2px solid var(--blue);
    }}

    /* Oscilloscope Canvas */
    .canvas-container {{
      position: relative;
      width: 100%;
      height: 240px;
      background: #060a12;
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 16px;
    }}
    canvas#oscilloscope {{
      width: 100%;
      height: 100%;
      display: block;
    }}

    /* JSON Inspector */
    pre.json-viewer {{
      background: #060a12;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      overflow-x: auto;
      max-height: 400px;
    }}
  </style>
</head>
<body>
<div class="wrap">
  <!-- Top Global Header -->
  <header>
    <div class="brand">
      <div class="brand-icon">🌱</div>
      <div>
        <h1>AgriSense Enterprise Control Plane</h1>
        <p>Production IoT Gateway & Agronomy Engine • Build 2026.4</p>
      </div>
    </div>
    <div class="links-bar">
      <a href="/docs" target="_blank" class="btn"><span class="mono">/docs</span> OpenAPI</a>
      <a href="/redoc" target="_blank" class="btn"><span class="mono">/redoc</span> Specs</a>
      <a href="/api/health" target="_blank" class="btn"><span class="mono">/api/health</span></a>
      <button class="btn primary" onclick="refreshAllData()">⚡ Sync Live Telemetry</button>
    </div>
  </header>

  <!-- Real Host & Runtime Telemetry Strip -->
  <div class="system-strip" id="sys-telemetry-strip">
    <div class="sys-pill">
      <span class="label">Host Platform</span>
      <span class="val" id="val-host"><span class="dot-live"></span> Loading...</span>
    </div>
    <div class="sys-pill">
      <span class="label">Python & FastAPI</span>
      <span class="val" id="val-runtime">Python 3.12 • FastAPI</span>
    </div>
    <div class="sys-pill">
      <span class="label">Process Uptime & PID</span>
      <span class="val" id="val-uptime">PID: -- • --</span>
    </div>
    <div class="sys-pill">
      <span class="label">SQLite Storage (WAL)</span>
      <span class="val" id="val-sqlite">Active • -- KB</span>
    </div>
    <div class="sys-pill">
      <span class="label">MongoDB Cluster</span>
      <span class="val" id="val-mongo">{mongo_status}</span>
    </div>
    <div class="sys-pill">
      <span class="label">Avg API Latency</span>
      <span class="val mono" id="val-latency" style="color: #34d399;">{latency_ms:.1f} ms</span>
    </div>
  </div>

  <!-- Main Navigation Tabs -->
  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('tab-stakeholders', this)">👥 Stakeholders ({total_users})</button>
    <button class="tab-btn" onclick="switchTab('tab-db-explorer', this)">🗄️ Database & SQL Console</button>
    <button class="tab-btn" onclick="switchTab('tab-api-matrix', this)">⚡ REST API Health Matrix</button>
    <button class="tab-btn" onclick="switchTab('tab-open-data', this)">🌐 Open-Data Telemetry Feeds</button>
    <button class="tab-btn" onclick="switchTab('tab-control-plane', this)">🎛️ Pipelines & AI Orchestration</button>
    <button class="tab-btn" onclick="switchTab('tab-oscilloscope', this)">📈 Latency Oscilloscope</button>
  </div>

  <!-- TAB 1: STAKEHOLDERS & ACTIVE AUTOCOMPLETE SEARCH -->
  <div id="tab-stakeholders" class="tab-pane active">
    <div class="search-container">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          id="slash-search-input" 
          class="slash-input" 
          placeholder="Type to search (e.g. 'P', 'Pranavi', 'Punjab', 'Wheat') or slash commands (/farmers, /officers, /logins, /messages)..."
          oninput="handleSearch(this.value)"
          onfocus="handleSearch(this.value)"
          autocomplete="off"
        />
        <div class="suggestions-dropdown" id="search-suggestions-dropdown">
          <!-- Populated in real-time as user types -->
        </div>
      </div>
      <div class="slash-hints">
        <span class="slash-chip" onclick="setSearchFilter('/farmers')">/farmers</span>
        <span class="slash-chip" onclick="setSearchFilter('/officers')">/officers</span>
        <span class="slash-chip" onclick="setSearchFilter('/logins')">/logins</span>
        <span class="slash-chip" onclick="setSearchFilter('/messages')">/messages</span>
        <span class="slash-chip" onclick="setSearchFilter('/devices')">/devices</span>
        <span class="slash-chip" onclick="setSearchFilter('/features')">/features</span>
        <span class="slash-chip" onclick="setSearchFilter('')">Clear Filter</span>
        <span id="search-count-badge" class="badge badge-blue mono" style="margin-left: auto;">Showing {total_users} users</span>
      </div>
    </div>

    <div class="data-table-container">
      <table class="data-table" id="stakeholders-table">
        <thead>
          <tr>
            <th>User / Identifier</th>
            <th>Role</th>
            <th>Phone / Contact</th>
            <th>Primary Location</th>
            <th>Farm Size</th>
            <th>Reputation Points</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="stakeholders-tbody">
          <!-- Populated by JS -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- TAB 2: DATABASE & CUSTOM SQL CONSOLE -->
  <div id="tab-db-explorer" class="tab-pane">
    <div class="agri-card">
      <div class="card-header">
        <div class="card-title">🗄️ Database Tables & Fast Schema Inspector</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <select id="db-table-select" class="btn" onchange="loadTableData(this.value)">
            <!-- Options populated dynamically -->
          </select>
          <button class="btn primary" onclick="reloadCurrentTable()">Query Table</button>
        </div>
      </div>

      <!-- Quick Switch Table Chips -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;">
        <span class="slash-chip" onclick="quickSelectTable('users')">users</span>
        <span class="slash-chip" onclick="quickSelectTable('sensor_readings')">sensor_readings</span>
        <span class="slash-chip" onclick="quickSelectTable('zones')">zones</span>
        <span class="slash-chip" onclick="quickSelectTable('controls')">controls</span>
        <span class="slash-chip" onclick="quickSelectTable('market_listings')">market_listings</span>
        <span class="slash-chip" onclick="quickSelectTable('buyer_requirements')">buyer_requirements</span>
        <span class="slash-chip" onclick="quickSelectTable('community_posts')">community_posts</span>
        <span class="slash-chip" onclick="quickSelectTable('direct_messages')">direct_messages</span>
        <span class="slash-chip" onclick="quickSelectTable('finance_records')">finance_records</span>
        <span class="slash-chip" onclick="quickSelectTable('activity_logs')">activity_logs</span>
      </div>

      <div id="table-schema-info" style="margin-bottom: 12px; font-size: 13px; color: var(--text-dim);"></div>

      <div class="data-table-container" style="max-height: 380px; margin-bottom: 24px;">
        <table class="data-table" id="raw-db-table">
          <thead id="raw-db-thead">
            <tr><th>Columns</th></tr>
          </thead>
          <tbody id="raw-db-tbody">
            <tr><td style="text-align: center; color: var(--text-dim); padding: 24px;">Select a table or execute a query above to view rows.</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Interactive Custom Read-Only SQL Console -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <strong style="font-size: 14px; color: #fff; display: flex; align-items: center; gap: 6px;">
            ⚡ Custom Read-Only SQL Query Console
          </strong>
          <span class="badge badge-blue mono">Safe Transaction (SELECT Only)</span>
        </div>

        <!-- Quick Query Templates -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
          <span class="slash-chip" onclick="setSqlQuery('SELECT id, name, role, email, points FROM users LIMIT 10')">Top Users</span>
          <span class="slash-chip" onclick="setSqlQuery('SELECT id, zone, moisture_pct, temp_c, timestamp FROM sensor_readings ORDER BY id DESC LIMIT 10')">Latest Readings</span>
          <span class="slash-chip" onclick="setSqlQuery('SELECT id, zone_code, name, crop, current_moisture, status FROM zones')">Farm Zones</span>
          <span class="slash-chip" onclick="setSqlQuery('SELECT id, pump_state, auto_mode, flow_rate_lpm, water_tank_level FROM controls')">Controls</span>
          <span class="slash-chip" onclick="setSqlQuery('SELECT id, crop_name, quantity, price_per_unit, location FROM market_listings')">Market</span>
          <span class="slash-chip" onclick="setSqlQuery('SELECT id, author_name, channel, title, upvotes FROM community_posts')">Posts</span>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <input 
            type="text" 
            id="custom-sql-input" 
            class="slash-input" 
            style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 13px;"
            value="SELECT id, name, role, email, points FROM users LIMIT 10" 
            onkeydown="if(event.key==='Enter') executeCustomSql()"
          />
          <button class="btn primary" onclick="executeCustomSql()">Execute SQL</button>
        </div>
        <div id="sql-exec-status" style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;"></div>
        <div class="data-table-container" id="sql-results-container" style="display: none; max-height: 280px;">
          <table class="data-table" id="sql-results-table">
            <thead id="sql-results-thead"></thead>
            <tbody id="sql-results-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 3: REST API HEALTH MATRIX -->
  <div id="tab-api-matrix" class="tab-pane">
    <div class="agri-card">
      <div class="card-header">
        <div class="card-title">⚡ Core REST API Endpoints Matrix</div>
        <button class="btn primary" onclick="testAllEndpoints()">⚡ Ping All Endpoints</button>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        Real-time roundtrip testing of all operational FastAPI routes. Measures genuine client-server latency and HTTP status.
      </p>

      <div class="data-table-container">
        <table class="data-table" id="api-matrix-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint Path</th>
              <th>Description</th>
              <th>HTTP Status</th>
              <th>Response Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="api-matrix-tbody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 4: OPEN-DATA TELEMETRY FEEDS -->
  <div id="tab-open-data" class="tab-pane">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px;">
      <div class="agri-card">
        <div class="card-header">
          <div class="card-title">🌱 Soil Health Index (SHI) & Suitability</div>
          <button class="btn secondary" onclick="loadOpenDataFeed('shi')">Refresh</button>
        </div>
        <pre class="json-viewer" id="json-shi">Loading Soil Health Index...</pre>
      </div>

      <div class="agri-card">
        <div class="card-header">
          <div class="card-title">🛰️ ISRIC SoilGrids 2.0 Taxonomy</div>
          <button class="btn secondary" onclick="loadOpenDataFeed('soil')">Refresh</button>
        </div>
        <pre class="json-viewer" id="json-soil">Loading live soil taxonomy...</pre>
      </div>

      <div class="agri-card">
        <div class="card-header">
          <div class="card-title">🌊 CWC Dam Reservoir Storage</div>
          <button class="btn secondary" onclick="loadOpenDataFeed('reservoirs')">Refresh</button>
        </div>
        <pre class="json-viewer" id="json-reservoirs">Loading reservoir bulletins...</pre>
      </div>

      <div class="agri-card">
        <div class="card-header">
          <div class="card-title">🌦️ Open-Meteo Agroclimatic VPD</div>
          <button class="btn secondary" onclick="loadOpenDataFeed('agro')">Refresh</button>
        </div>
        <pre class="json-viewer" id="json-agro">Loading agrometeorological feed...</pre>
      </div>

      <div class="agri-card" style="grid-column: 1 / -1;">
        <div class="card-header">
          <div class="card-title">🌾 Agmarknet Live Mandi Rates</div>
          <button class="btn secondary" onclick="loadOpenDataFeed('mandi')">Refresh</button>
        </div>
        <pre class="json-viewer" id="json-mandi">Loading mandi market rates...</pre>
      </div>
    </div>
  </div>

  <!-- TAB 5: PIPELINES & AI CONTROL PLANE -->
  <div id="tab-control-plane" class="tab-pane">
    <div class="agri-card">
      <div class="card-header">
        <div class="card-title">🎛️ Live Autonomous Pipelines</div>
        <button class="btn secondary" onclick="loadPipelines()">Refresh Pipelines</button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Pipeline Name</th>
              <th>Interval</th>
              <th>Status</th>
              <th>Last Run</th>
              <th>Exec Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="pipelines-tbody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>

    <div class="agri-card">
      <div class="card-header">
        <div class="card-title">🧠 AI Workload & Model Orchestration</div>
        <button class="btn primary" onclick="triggerBatchAI()">⚡ Trigger Batch Farm Diagnosis</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;" id="ai-workload-grid">
        <!-- Populated by JS -->
      </div>
    </div>
  </div>

  <!-- TAB 6: LATENCY OSCILLOSCOPE -->
  <div id="tab-oscilloscope" class="tab-pane">
    <div class="agri-card">
      <div class="card-header">
        <div class="card-title">📈 Real Request Latency Oscilloscope</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge badge-success mono" id="osc-fps">60 FPS</span>
          <button class="btn secondary" onclick="clearOscilloscope()">Reset Stream</button>
        </div>
      </div>
      <div class="canvas-container">
        <canvas id="oscilloscope"></canvas>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        <div class="sys-pill">
          <span class="label">P50 (Median Latency)</span>
          <span class="val mono" id="val-p50" style="color: #38bdf8;">-- ms</span>
        </div>
        <div class="sys-pill">
          <span class="label">P95 Latency</span>
          <span class="val mono" id="val-p95" style="color: #fbbf24;">-- ms</span>
        </div>
        <div class="sys-pill">
          <span class="label">P99 Tail Latency</span>
          <span class="val mono" id="val-p99" style="color: #f43f5e;">-- ms</span>
        </div>
        <div class="sys-pill">
          <span class="label">Total Ingestion Requests</span>
          <span class="val mono" id="val-req-count">--</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Deep User Inspector Modal -->
<div class="modal-backdrop" id="user-inspector-modal">
  <div class="modal-box">
    <div class="modal-header">
      <div>
        <h3 id="modal-user-name" style="color: #fff; font-size: 16px;">User Details</h3>
        <p id="modal-user-email" style="font-size: 12px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;"></p>
      </div>
      <button class="btn secondary" onclick="closeInspectorModal()">✕ Close</button>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab-btn active" onclick="switchModalTab('mod-profile')">Profile & Auth</button>
      <button class="modal-tab-btn" onclick="switchModalTab('mod-messages')">Direct Messages</button>
      <button class="modal-tab-btn" onclick="switchModalTab('mod-logins')">Audit Logins</button>
      <button class="modal-tab-btn" onclick="switchModalTab('mod-devices')">Hardware Node</button>
      <button class="modal-tab-btn" onclick="switchModalTab('mod-features')">Agri Features</button>
      <button class="modal-tab-btn" onclick="switchModalTab('mod-farm')">Farm Zones</button>
    </div>
    <div class="modal-body" id="modal-body-content">
      <!-- Populated dynamically -->
    </div>
  </div>
</div>

<script>
  const RAW_USERS = {users_json};
  let CURRENT_USERS = [...RAW_USERS];
  let CURRENT_USER_INSPECT = null;

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {{
    renderStakeholders(CURRENT_USERS);
    fetchSystemInfo();
    loadDbTablesList();
    initApiMatrix();
    loadOpenDataFeed('shi');
    loadOpenDataFeed('soil');
    loadOpenDataFeed('reservoirs');
    loadOpenDataFeed('agro');
    loadOpenDataFeed('mandi');
    loadPipelines();
    loadAiWorkload();
    initOscilloscope();
    setInterval(fetchSystemInfo, 5000);

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {{
      const searchBox = document.querySelector('.search-container');
      if (searchBox && !searchBox.contains(e.target)) {{
        const dd = document.getElementById('search-suggestions-dropdown');
        if (dd) dd.classList.remove('open');
      }}
    }});
  }});

  function switchTab(tabId, btnElem) {{
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    
    const btn = btnElem || (event && (event.currentTarget || event.target));
    if (btn) btn.classList.add('active');
    const pane = document.getElementById(tabId);
    if (pane) pane.classList.add('active');

    if (tabId === 'tab-db-explorer') {{
      const sel = document.getElementById('db-table-select');
      if (sel && sel.value) loadTableData(sel.value);
      else loadDbTablesList();
    }}
  }}

  function getUserLocation(u) {{
    const parts = [u.village, u.district, u.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : (u.location || 'Punjab, India');
  }}

  function renderStakeholders(users) {{
    const tbody = document.getElementById("stakeholders-tbody");
    const badge = document.getElementById("search-count-badge");
    if (badge) badge.textContent = `Showing ${{users.length}} of ${{RAW_USERS.length}} users`;

    if (!users || users.length === 0) {{
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-dim); padding: 24px;">No matching stakeholders found.</td></tr>';
      return;
    }}
    tbody.innerHTML = users.map(u => {{
      const roleBadge = u.role === 'farmer' ? 'badge-success' : (u.role === 'officer' ? 'badge-blue' : (u.role === 'admin' ? 'badge-rose' : 'badge-amber'));
      const loc = getUserLocation(u);
      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: #fff;">${{u.name || 'Unnamed'}}</div>
            <div class="mono" style="font-size: 11px; color: var(--text-dim);">${{u.email || u.id}}</div>
          </td>
          <td><span class="badge ${{roleBadge}}">${{u.role || 'user'}}</span></td>
          <td class="mono">${{u.phone || 'N/A'}}</td>
          <td>${{loc}}</td>
          <td class="mono">${{u.farm_size_acres ? u.farm_size_acres + ' Acres' : '--'}}</td>
          <td class="mono" style="color: #fbbf24;">${{u.points || 0}} pts</td>
          <td>
            <button class="btn secondary" style="padding: 4px 10px; font-size: 12px;" onclick="inspectUser('${{u.email || u.id}}')">Inspect</button>
          </td>
        </tr>
      `;
    }}).join('');
  }}

  function handleSearch(val) {{
    const q = (val || '').trim().toLowerCase();
    const dropdown = document.getElementById('search-suggestions-dropdown');

    if (!q) {{
      CURRENT_USERS = [...RAW_USERS];
      renderStakeholders(CURRENT_USERS);
      if (dropdown) dropdown.classList.remove('open');
      return;
    }}

    // Slash command shortcuts
    if (q === '/farmers') {{
      CURRENT_USERS = RAW_USERS.filter(u => u.role === 'farmer');
    }} else if (q === '/officers') {{
      CURRENT_USERS = RAW_USERS.filter(u => u.role === 'officer' || u.role === 'agronomist');
    }} else if (q === '/logins') {{
      CURRENT_USERS = RAW_USERS.filter(u => (u.login_count && u.login_count > 0));
    }} else if (q === '/messages') {{
      CURRENT_USERS = RAW_USERS.filter(u => (u.direct_messages && u.direct_messages.length > 0));
    }} else if (q === '/devices') {{
      CURRENT_USERS = RAW_USERS.filter(u => (u.device_type && !u.device_type.includes('Not detected')));
    }} else if (q === '/features') {{
      CURRENT_USERS = RAW_USERS.filter(u => (u.features_used && u.features_used.length > 0));
    }} else {{
      // Smart Prefix-first Search
      const prefixMatches = [];
      const substringMatches = [];

      RAW_USERS.forEach(u => {{
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const crop = (u.primary_crop || '').toLowerCase();
        const village = (u.village || '').toLowerCase();
        const district = (u.district || '').toLowerCase();
        const role = (u.role || '').toLowerCase();

        const isPrefix = name.startsWith(q) || email.startsWith(q) || phone.startsWith(q) || crop.startsWith(q);
        const isSub = !isPrefix && (name.includes(q) || email.includes(q) || phone.includes(q) || crop.includes(q) || village.includes(q) || district.includes(q) || role.includes(q));

        if (isPrefix) prefixMatches.push(u);
        else if (isSub) substringMatches.push(u);
      }});

      CURRENT_USERS = [...prefixMatches, ...substringMatches];
    }}

    renderStakeholders(CURRENT_USERS);

    // Render Active Dropdown Suggestions
    if (dropdown) {{
      if (CURRENT_USERS.length > 0) {{
        const topSuggestions = CURRENT_USERS.slice(0, 6);
        dropdown.innerHTML = `
          <div class="suggestion-header">
            <span>Suggestions matching "${{q}}" (${{CURRENT_USERS.length}} found)</span>
            <span>Click to Inspect</span>
          </div>
          ${{topSuggestions.map(u => {{
            const initial = (u.name || u.email || 'U')[0].toUpperCase();
            const roleBadge = u.role === 'farmer' ? 'badge-success' : (u.role === 'officer' ? 'badge-blue' : 'badge-amber');
            const loc = getUserLocation(u);
            return `
              <div class="suggestion-item" onclick="selectSuggestion('${{u.email || u.id}}')">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="user-avatar-badge">${{initial}}</div>
                  <div>
                    <div style="font-weight: 700; color: #fff; font-size: 13px;">${{u.name || 'Unnamed'}} <span class="badge ${{roleBadge}}" style="font-size: 9px; padding: 2px 6px;">${{u.role}}</span></div>
                    <div class="mono" style="font-size: 11px; color: var(--text-dim);">${{u.email || u.phone || 'No email'}} • ${{loc}}</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="mono" style="font-size: 11px; color: #fbbf24;">${{u.points || 0}} pts</span>
                  <span class="badge badge-blue mono" style="font-size: 10px;">Inspect ↗</span>
                </div>
              </div>
            `;
          }}).join('')}}
        `;
        dropdown.classList.add('open');
      }} else {{
        dropdown.innerHTML = `
          <div class="suggestion-header"><span>No users matching "${{q}}"</span></div>
          <div style="padding: 12px; font-size: 12px; color: var(--text-dim); text-align: center;">No registered stakeholders match your search query.</div>
        `;
        dropdown.classList.add('open');
      }}
    }}
  }}

  function selectSuggestion(identifier) {{
    const dd = document.getElementById('search-suggestions-dropdown');
    if (dd) dd.classList.remove('open');
    inspectUser(identifier);
  }}

  function setSearchFilter(cmd) {{
    const input = document.getElementById("slash-search-input");
    input.value = cmd;
    handleSearch(cmd);
    input.focus();
  }}

  async function fetchSystemInfo() {{
    try {{
      const res = await fetch('/api/control-plane/system-info');
      if (res.ok) {{
        const data = await res.json();
        document.getElementById('val-host').innerHTML = `<span class="dot-live"></span> ${{data.hostname}} (${{data.os_platform.split(' ')[0]}})`;
        document.getElementById('val-runtime').textContent = `Python ${{data.python_version}} • FastAPI ${{data.fastapi_version}}`;
        document.getElementById('val-uptime').textContent = `PID ${{data.process_pid}} • Up ${{data.uptime_formatted}}`;
        document.getElementById('val-sqlite').textContent = `WAL Active • ${{data.sqlite_db_size_kb}} KB`;
        document.getElementById('val-latency').textContent = `${{data.average_latency_ms.toFixed(1)}} ms`;
        document.getElementById('val-req-count').textContent = data.total_requests_served;
      }}
    }} catch (e) {{
      console.warn("System info fetch notice:", e);
    }}
  }}

  async function loadDbTablesList() {{
    try {{
      const res = await fetch('/api/control-plane/db/tables');
      if (res.ok) {{
        const data = await res.json();
        const sel = document.getElementById('db-table-select');
        sel.innerHTML = data.tables.map(t => `<option value="${{t.table_name}}">${{t.table_name}} (${{t.row_count}} rows)</option>`).join('');
        if (data.tables.length > 0) {{
          loadTableData(data.tables[0].table_name);
        }}
      }}
    }} catch (e) {{
      console.error(e);
    }}
  }}

  function quickSelectTable(tableName) {{
    const sel = document.getElementById('db-table-select');
    if (sel) {{
      sel.value = tableName;
      loadTableData(tableName);
    }}
  }}

  async function loadTableData(tableName) {{
    const thead = document.getElementById('raw-db-thead');
    const tbody = document.getElementById('raw-db-tbody');
    const schemaInfo = document.getElementById('table-schema-info');

    if (schemaInfo) schemaInfo.innerHTML = `<span style="color:var(--blue)">Querying '${{tableName}}' records...</span>`;
    if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px; color:var(--text-dim);">Fetching live table rows...</td></tr>';

    try {{
      const res = await fetch(`/api/control-plane/db/query?table=${{encodeURIComponent(tableName)}}&limit=50`);
      if (res.ok) {{
        const data = await res.json();
        if (schemaInfo) {{
          schemaInfo.innerHTML = `Displaying <strong style="color:#fff">${{data.rows.length}}</strong> of <strong style="color:#fff">${{data.total_count}}</strong> records in table <strong style="color:var(--accent-light)">'${{data.table}}'</strong> (sorted by primary key desc).`;
        }}
        
        if (data.columns && data.columns.length > 0) {{
          thead.innerHTML = `<tr>${{data.columns.map(c => `<th>${{c}}</th>`).join('')}}</tr>`;
          if (data.rows.length > 0) {{
            tbody.innerHTML = data.rows.map(r => `
              <tr>
                ${{data.columns.map(c => {{
                  let val = r[c];
                  if (val === null || val === undefined) return '<td class="mono" style="color:var(--text-dim);">NULL</td>';
                  if (typeof val === 'object') return `<td class="mono" style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${{JSON.stringify(val).replace(/"/g, '&quot;')}}">${{JSON.stringify(val)}}</td>`;
                  return `<td class="mono">${{val}}</td>`;
                }}).join('')}}
              </tr>
            `).join('');
          }} else {{
            tbody.innerHTML = `<tr><td colspan="${{data.columns.length}}" style="text-align:center; padding:24px; color:var(--text-dim);">No records exist in table '${{data.table}}'.</td></tr>`;
          }}
        }}
      }} else {{
        const err = await res.json();
        if (schemaInfo) schemaInfo.innerHTML = `<span style="color:#f43f5e;">✕ Error querying '${{tableName}}': ${{err.detail || 'Query failed'}}</span>`;
      }}
    }} catch (e) {{
      if (schemaInfo) schemaInfo.innerHTML = `<span style="color:#f43f5e;">✕ Network error loading '${{tableName}}': ${{e.message}}</span>`;
    }}
  }}

  function reloadCurrentTable() {{
    const val = document.getElementById('db-table-select').value;
    if (val) loadTableData(val);
  }}

  function setSqlQuery(sql) {{
    const input = document.getElementById('custom-sql-input');
    if (input) {{
      input.value = sql;
      executeCustomSql();
    }}
  }}

  async function executeCustomSql() {{
    const input = document.getElementById('custom-sql-input');
    const sql = input ? input.value.trim() : '';
    const statusDiv = document.getElementById('sql-exec-status');
    const container = document.getElementById('sql-results-container');
    const thead = document.getElementById('sql-results-thead');
    const tbody = document.getElementById('sql-results-tbody');

    if (!sql) return;
    statusDiv.innerHTML = `<span style="color:var(--blue)">⚡ Executing SQL query...</span>`;

    try {{
      const res = await fetch('/api/control-plane/db/execute-sql', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ sql: sql }})
      }});
      const data = await res.json();
      if (res.ok) {{
        statusDiv.innerHTML = `<span style="color:#34d399; font-weight:600;">✓ Query OK: ${{data.row_count}} row(s) returned in ${{data.execution_time_ms}} ms</span>`;
        if (data.columns && data.columns.length > 0) {{
          thead.innerHTML = `<tr>${{data.columns.map(c => `<th>${{c}}</th>`).join('')}}</tr>`;
          if (data.rows.length > 0) {{
            tbody.innerHTML = data.rows.map(r => `
              <tr>
                ${{data.columns.map(c => {{
                  let val = r[c];
                  if (val === null || val === undefined) return '<td class="mono" style="color:var(--text-dim);">NULL</td>';
                  if (typeof val === 'object') return `<td class="mono" style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${{JSON.stringify(val).replace(/"/g, '&quot;')}}">${{JSON.stringify(val)}}</td>`;
                  return `<td class="mono">${{val}}</td>`;
                }}).join('')}}
              </tr>
            `).join('');
          }} else {{
            tbody.innerHTML = `<tr><td colspan="${{data.columns.length}}" style="text-align:center; padding:20px; color:var(--text-dim);">Query executed successfully, 0 rows returned.</td></tr>`;
          }}
          container.style.display = 'block';
        }} else {{
          container.style.display = 'none';
        }}
      }} else {{
        statusDiv.innerHTML = `<span style="color:#f43f5e; font-weight:600;">✕ ${{data.detail || 'SQL Execution failed'}}</span>`;
        container.style.display = 'none';
      }}
    }} catch (e) {{
      statusDiv.innerHTML = `<span style="color:#f43f5e;">✕ Error: ${{e.message}}</span>`;
      container.style.display = 'none';
    }}
  }}

  // REST API Endpoints Matrix
  const ENDPOINTS = [
    {{ method: 'GET', path: '/api/health', desc: 'System liveness, SQLite WAL, & MongoDB fallback probe' }},
    {{ method: 'GET', path: '/api/sensors/overview', desc: 'Aggregated microclimate & active farm zone telemetry' }},
    {{ method: 'GET', path: '/api/controls', desc: 'Solenoid valve actuators & pump relay state' }},
    {{ method: 'GET', path: '/api/analytics/soil-health-index', desc: 'Composite Soil Health Index (SHI 0-100) & Suitability' }},
    {{ method: 'GET', path: '/api/analytics/live-agroclimatic', desc: 'Open-Meteo VPD, solar radiation & ET0' }},
    {{ method: 'GET', path: '/api/analytics/live-soil-taxonomy', desc: 'ISRIC SoilGrids 2.0 chemical taxonomy' }},
    {{ method: 'GET', path: '/api/analytics/live-reservoir-storage', desc: 'Central Water Commission (CWC) Dam Bulletins' }},
    {{ method: 'GET', path: '/api/market/live-mandi-rates', desc: 'Agmarknet APMC modal prices & CACP MSP' }},
    {{ method: 'GET', path: '/api/control-plane/state', desc: 'Central Control Plane full pipeline state' }},
    {{ method: 'GET', path: '/api/control-plane/system-info', desc: 'Host process, Python runtime & WAL metrics' }},
    {{ method: 'GET', path: '/api/control-plane/db/tables', desc: 'Database schema & table catalog' }},
    {{ method: 'GET', path: '/api/community/posts', desc: 'Agronomist & farmer community feed' }},
    {{ method: 'GET', path: '/api/finance/summary', desc: 'Rabi harvest P&L and expenditure summary' }}
  ];

  function initApiMatrix() {{
    const tbody = document.getElementById('api-matrix-tbody');
    tbody.innerHTML = ENDPOINTS.map((ep, idx) => `
      <tr id="ep-row-${{idx}}">
        <td><span class="badge badge-blue mono">${{ep.method}}</span></td>
        <td class="mono" style="font-weight: 600; color: #fff;">${{ep.path}}</td>
        <td style="color: var(--text-muted);">${{ep.desc}}</td>
        <td id="ep-status-${{idx}}"><span class="badge mono" style="background: rgba(255,255,255,0.05); color: var(--text-dim);">STANDBY</span></td>
        <td id="ep-lat-${{idx}}" class="mono">-- ms</td>
        <td>
          <button class="btn secondary" style="padding: 4px 8px; font-size: 11px;" onclick="testSingleEndpoint(${{idx}})">Ping</button>
        </td>
      </tr>
    `).join('');
  }}

  async function testSingleEndpoint(idx) {{
    const ep = ENDPOINTS[idx];
    const statusCell = document.getElementById(`ep-status-${{idx}}`);
    const latCell = document.getElementById(`ep-lat-${{idx}}`);
    statusCell.innerHTML = `<span class="badge badge-amber mono">PROBING</span>`;

    const start = performance.now();
    try {{
      const res = await fetch(ep.path);
      const dur = performance.now() - start;
      latCell.textContent = `${{dur.toFixed(1)}} ms`;
      if (res.ok) {{
        statusCell.innerHTML = `<span class="badge badge-success mono">${{res.status}} OK</span>`;
      }} else {{
        statusCell.innerHTML = `<span class="badge badge-rose mono">${{res.status}} ERR</span>`;
      }}
    }} catch (e) {{
      const dur = performance.now() - start;
      latCell.textContent = `${{dur.toFixed(1)}} ms`;
      statusCell.innerHTML = `<span class="badge badge-rose mono">NET_ERR</span>`;
    }}
  }}

  async function testAllEndpoints() {{
    for (let i = 0; i < ENDPOINTS.length; i++) {{
      await testSingleEndpoint(i);
    }}
  }}

  async function loadOpenDataFeed(feedType) {{
    const endpoints = {{
      shi: '/api/analytics/soil-health-index',
      soil: '/api/analytics/live-soil-taxonomy',
      reservoirs: '/api/analytics/live-reservoir-storage',
      agro: '/api/analytics/live-agroclimatic',
      mandi: '/api/market/live-mandi-rates'
    }};
    try {{
      const el = document.getElementById(`json-${{feedType}}`);
      const res = await fetch(endpoints[feedType]);
      if (res.ok) {{
        const json = await res.json();
        el.textContent = JSON.stringify(json, null, 2);
      }}
    }} catch (e) {{
      console.error(e);
    }}
  }}

  async function loadPipelines() {{
    try {{
      const res = await fetch('/api/control-plane/pipelines');
      if (res.ok) {{
        const data = await res.json();
        const tbody = document.getElementById('pipelines-tbody');
        tbody.innerHTML = Object.entries(data).map(([pid, p]) => `
          <tr>
            <td>
              <div style="font-weight: 700; color: #fff;">${{p.name}}</div>
              <div class="mono" style="font-size: 11px; color: var(--text-dim);">${{pid}}</div>
            </td>
            <td class="mono">${{p.interval_seconds}}s</td>
            <td><span class="badge ${{p.enabled ? 'badge-success' : 'badge-amber'}}">${{p.enabled ? 'RUNNING' : 'PAUSED'}}</span></td>
            <td class="mono" style="font-size: 11px;">${{p.last_run ? p.last_run.split('T')[1].slice(0,8) : 'Never'}}</td>
            <td class="mono">${{p.execution_count}}</td>
            <td>
              <button class="btn secondary" style="padding: 4px 8px; font-size: 11px;" onclick="triggerPipeline('${{pid}}')">Trigger</button>
            </td>
          </tr>
        `).join('');
      }}
    }} catch (e) {{
      console.error(e);
    }}
  }}

  async function triggerPipeline(pid) {{
    try {{
      const res = await fetch('/api/control-plane/pipelines/trigger', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ pipeline_id: pid }})
      }});
      if (res.ok) {{
        loadPipelines();
      }}
    }} catch (e) {{
      console.error(e);
    }}
  }}

  async function loadAiWorkload() {{
    try {{
      const res = await fetch('/api/control-plane/ai-workload');
      if (res.ok) {{
        const data = await res.json();
        const grid = document.getElementById('ai-workload-grid');
        grid.innerHTML = `
          <div class="sys-pill">
            <span class="label">Active AI Engine</span>
            <span class="val mono" style="color: #38bdf8;">${{data.active_engine}}</span>
          </div>
          <div class="sys-pill">
            <span class="label">Total Inferences</span>
            <span class="val mono" style="color: #34d399;">${{data.total_inferences_served}}</span>
          </div>
          <div class="sys-pill">
            <span class="label">Tokens Consumed</span>
            <span class="val mono" style="color: #fbbf24;">${{data.tokens_consumed.toLocaleString()}}</span>
          </div>
          <div class="sys-pill">
            <span class="label">Avg Inference Latency</span>
            <span class="val mono">${{data.average_inference_latency_ms.toFixed(0)}} ms</span>
          </div>
        `;
      }}
    }} catch (e) {{
      console.error(e);
    }}
  }}

  async function triggerBatchAI() {{
    try {{
      const res = await fetch('/api/control-plane/ai-workload/trigger-batch', {{ method: 'POST' }});
      if (res.ok) {{
        alert("Batch AI Agronomic scan triggered successfully across all farm zones.");
        loadAiWorkload();
      }}
    }} catch (e) {{
      console.error(e);
    }}
  }}

  // Oscilloscope Animation
  let oscData = Array(60).fill(38);
  function initOscilloscope() {{
    const canvas = document.getElementById('oscilloscope');
    const ctx = canvas.getContext('2d');
    
    function resize() {{
      canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    }}
    resize();
    window.addEventListener('resize', resize);

    function draw() {{
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = '#16233b';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 40) {{
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }}

      // Oscilloscope Line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const step = w / (oscData.length - 1);
      for (let i = 0; i < oscData.length; i++) {{
        const x = i * step;
        const normVal = Math.min(Math.max(oscData[i], 0), 200) / 200;
        const y = h - (normVal * (h - 40) + 20);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }}
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Update P-values
      const sorted = [...oscData].sort((a,b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      document.getElementById('val-p50').textContent = `${{p50.toFixed(1)}} ms`;
      document.getElementById('val-p95').textContent = `${{p95.toFixed(1)}} ms`;
      document.getElementById('val-p99').textContent = `${{p99.toFixed(1)}} ms`;

      requestAnimationFrame(draw);
    }}
    requestAnimationFrame(draw);

    setInterval(() => {{
      const nextLat = 30 + Math.random() * 20 + (Math.random() > 0.9 ? Math.random() * 80 : 0);
      oscData.push(nextLat);
      oscData.shift();
    }}, 400);
  }}

  function clearOscilloscope() {{
    oscData = Array(60).fill(35);
  }}

  // Deep User Inspector Modal
  async function inspectUser(identifier) {{
    try {{
      const res = await fetch(`/api/user/inspect/${{encodeURIComponent(identifier)}}`);
      if (res.ok) {{
        const data = await res.json();
        CURRENT_USER_INSPECT = data;
        document.getElementById('modal-user-name').textContent = data.user_profile.name || data.user_profile.email;
        document.getElementById('modal-user-email').textContent = `Role: ${{data.user_profile.role}} • Phone: ${{data.user_profile.phone || 'N/A'}}`;
        document.getElementById('user-inspector-modal').classList.add('open');
        switchModalTab('mod-profile');
      }}
    }} catch (e) {{
      console.error(e);
    }}
  }}

  function closeInspectorModal() {{
    document.getElementById('user-inspector-modal').classList.remove('open');
  }}

  function switchModalTab(tabId) {{
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    event?.target?.classList.add('active');
    
    if (!CURRENT_USER_INSPECT) return;
    const body = document.getElementById('modal-body-content');
    
    if (tabId === 'mod-profile') {{
      const p = CURRENT_USER_INSPECT.user_profile;
      const loc = [p.village, p.district, p.state].filter(Boolean).join(', ');
      body.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          <div><strong style="color:var(--text-muted)">Full Name:</strong> <div>${{p.name}}</div></div>
          <div><strong style="color:var(--text-muted)">Email Address:</strong> <div class="mono">${{p.email}}</div></div>
          <div><strong style="color:var(--text-muted)">Phone:</strong> <div class="mono">${{p.phone || 'N/A'}}</div></div>
          <div><strong style="color:var(--text-muted)">Role:</strong> <div><span class="badge badge-success">${{p.role}}</span></div></div>
          <div><strong style="color:var(--text-muted)">Location:</strong> <div>${{loc}}</div></div>
          <div><strong style="color:var(--text-muted)">Farm Size:</strong> <div class="mono">${{p.farm_size_acres}} Acres</div></div>
          <div><strong style="color:var(--text-muted)">Primary Crop:</strong> <div>${{p.primary_crop}}</div></div>
          <div><strong style="color:var(--text-muted)">Reputation Points:</strong> <div class="mono" style="color:#fbbf24">${{p.points}}</div></div>
        </div>
      `;
    }} else if (tabId === 'mod-messages') {{
      const msgs = CURRENT_USER_INSPECT.messages?.direct_messages || [];
      body.innerHTML = msgs.length === 0 ? '<p style="color:var(--text-dim);">No direct messages recorded.</p>' : `
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${{msgs.map(m => `
            <div style="background:var(--bg-surface); padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-dim);">
                <span>From: ${{m.sender_name}} (${{m.sender_email}})</span>
                <span class="mono">${{m.created_at}}</span>
              </div>
              <p style="margin-top:6px; color:#fff; font-size:13px;">${{m.message}}</p>
            </div>
          `).join('')}}
        </div>
      `;
    }} else if (tabId === 'mod-logins') {{
      const logins = CURRENT_USER_INSPECT.device_info?.recent_logins || [];
      body.innerHTML = logins.length === 0 ? '<p style="color:var(--text-dim);">No audit login sessions recorded.</p>' : `
        <div class="data-table-container">
          <table class="data-table">
            <thead><tr><th>Session ID</th><th>Timestamp</th><th>IP Address</th><th>Status</th></tr></thead>
            <tbody>
              ${{logins.map(l => `<tr><td class="mono">${{l.id || '--'}}</td><td class="mono">${{l.timestamp || l.time || '--'}}</td><td class="mono">${{l.ip_address || l.ip || '--'}}</td><td><span class="badge badge-success">${{l.status || 'Active'}}</span></td></tr>`).join('')}}
            </tbody>
          </table>
        </div>
      `;
    }} else if (tabId === 'mod-devices') {{
      const dev = CURRENT_USER_INSPECT.device_info;
      body.innerHTML = !dev ? '<p style="color:var(--text-dim);">No hardware node assigned.</p>' : `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div><strong style="color:var(--text-muted)">Device Type:</strong> <div>${{dev.device_type}}</div></div>
          <div><strong style="color:var(--text-muted)">IP Address:</strong> <div class="mono" style="color:#38bdf8;">${{dev.ip_address}}</div></div>
          <div><strong style="color:var(--text-muted)">Last Active Page:</strong> <div>${{dev.last_active_page}}</div></div>
          <div><strong style="color:var(--text-muted)">Total Sessions:</strong> <div class="mono" style="color:#34d399;">${{dev.login_count}}</div></div>
        </div>
      `;
    }} else if (tabId === 'mod-features') {{
      const feats = CURRENT_USER_INSPECT.website_usage?.features_used || [];
      body.innerHTML = feats.length === 0 ? '<p style="color:var(--text-dim);">No specific features recorded.</p>' : `
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${{feats.map(f => `<span class="badge badge-blue" style="font-size:12px; padding:6px 12px;">✓ ${{f}}</span>`).join('')}}
        </div>
      `;
    }} else if (tabId === 'mod-farm') {{
      const p = CURRENT_USER_INSPECT.user_profile;
      body.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div style="background:var(--bg-surface); padding:12px; border-radius:8px; border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between;">
              <strong>Primary Plot</strong>
              <span class="badge badge-success">${{p.primary_crop}}</span>
            </div>
            <div style="margin-top:6px; font-size:12px; color:var(--text-dim);">Irrigation: ${{p.irrigation_system}} • ${{p.farm_size_acres}} Acres • Soil: ${{p.soil_type}}</div>
          </div>
        </div>
      `;
    }}
  }}

  function refreshAllData() {{
    fetchSystemInfo();
    reloadCurrentTable();
    testAllEndpoints();
  }}
</script>
</body>
</html>"""
