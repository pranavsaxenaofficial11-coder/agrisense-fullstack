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
  <title>AgriSense — Backend Control Plane & AI Workload Orchestrator</title>
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
    .btn.accent {{
      background: #1e3a8a;
      border-color: #3b82f6;
      color: #fff;
    }}
    .btn.sm {{
      padding: 4px 10px;
      font-size: 12px;
    }}

    /* Main View Navigation Tabs */
    .view-tabs {{
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
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
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

    /* Control Plane Grid */
    .control-grid {{
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }}
    @media (max-width: 1024px) {{
      .control-grid {{ grid-template-columns: 1fr; }}
    }}

    /* Pipelines Panel */
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
      transition: border-color 0.2s;
    }}
    .pipeline-card:hover {{
      border-color: #38bdf8;
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

    /* AI Workload Panel */
    .ai-panel {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }}
    .control-field {{
      display: flex;
      flex-direction: column;
      gap: 6px;
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
    select:focus {{
      border-color: #38bdf8;
    }}

    /* Activity Log Console */
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

    /* Search Bar and Directory Table */
    .directory-view {{ display: none; }}
    .directory-view.active {{ display: block; }}
    .control-plane-view {{ display: none; }}
    .control-plane-view.active {{ display: block; }}

    .search-wrapper {{
      position: relative;
      margin-bottom: 16px;
    }}
    .search-input {{
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      color: #fff;
      font-size: 14px;
      outline: none;
    }}
    .search-input:focus {{
      border-color: #38bdf8;
    }}
    .dropdown-menu {{
      display: none;
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: #111a2d;
      border: 1px solid #334155;
      border-radius: 10px;
      z-index: 1000;
      max-height: 300px;
      overflow-y: auto;
      box-shadow: 0 16px 36px rgba(0,0,0,0.6);
    }}
    .dropdown-menu.open {{ display: block; }}
    .dropdown-item {{
      padding: 10px 14px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
    }}
    .dropdown-item:hover {{
      background: #1e293b;
    }}

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
    .data-table tr:hover td {{
      background: rgba(56,189,248,0.04);
      cursor: pointer;
    }}

    /* Modal Inspector */
    .modal-backdrop {{
      display: none;
      position: fixed;
      top:0; left:0; right:0; bottom:0;
      background: rgba(10, 15, 26, 0.85);
      backdrop-filter: blur(10px);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }}
    .modal-backdrop.open {{ display: flex; }}
    .modal-card {{
      background: #0e172a;
      border: 1px solid #334155;
      border-radius: 16px;
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.8);
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
          <p>Mission Control, AI Workload Orchestrator & Live IoT Telemetry Engine · Production v2.1</p>
        </div>
      </div>
      <div class="links-bar">
        <button class="btn primary" onclick="triggerBatchAI()">⚡ Run Batch AI Diagnosis</button>
        <a href="/docs" target="_blank" class="btn">Swagger Docs</a>
        <a href="/api/control-plane/state" target="_blank" class="btn">Control State JSON</a>
        <a href="https://agrisense-269.pages.dev" target="_blank" class="btn">Frontend App ↗</a>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <div class="view-tabs">
      <button class="view-tab-btn active" onclick="switchView('control', this)">
        🎛️ Pipeline & AI Control Plane
      </button>
      <button class="view-tab-btn" onclick="switchView('directory', this)">
        👥 Stakeholders Directory & Tap Inspector ({total_users})
      </button>
      <button class="view-tab-btn" onclick="switchView('logs', this)">
        📜 Live Operational Stream
      </button>
    </div>

    <!-- Live Telemetry Bar -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-label">System Uptime</div>
        <div class="stat-val" id="uptimeVal">--</div>
        <div class="stat-sub"><span class="dot-live"></span> Continuous Online</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Process CPU / RAM</div>
        <div class="stat-val" id="cpuRamVal">-- % / -- MB</div>
        <div class="stat-sub">Host Memory Health</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Pipelines</div>
        <div class="stat-val" id="activePipesVal">6 / 6</div>
        <div class="stat-sub"><span class="dot-live"></span> Real-time Streaming</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">AI Inferences / Tokens</div>
        <div class="stat-val" id="aiInferenceVal">482 / 142k</div>
        <div class="stat-sub">Gemini 2.0 Flash Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Database Sync</div>
        <div class="stat-val" id="dbHealthVal">100% OK</div>
        <div class="stat-sub">SQLite + Atlas Hybrid</div>
      </div>
    </div>

    <!-- ================= VIEW 1: CONTROL PLANE & AI WORKLOAD ================= -->
    <div id="controlView" class="control-plane-view active">
      <div class="control-grid">
        
        <!-- Left: Pipelines Management -->
        <div>
          <div class="section-head">
            <div class="section-title">⚡ Ingestion & Automation Pipelines</div>
            <button class="btn sm" onclick="loadControlState()">🔄 Refresh State</button>
          </div>
          <div class="pipeline-list" id="pipelineListContainer">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Right: AI Workload & Model Orchestrator -->
        <div>
          <div class="section-head">
            <div class="section-title">🤖 AI Workload Orchestrator</div>
          </div>
          <div class="ai-panel">
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
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>

          <div style="margin-top:20px;">
            <div class="section-head">
              <div class="section-title">📜 Operational Activity Log</div>
            </div>
            <div class="log-box" id="activityLogBox">
              <!-- Logs populated -->
            </div>
          </div>

        </div>

      </div>
    </div>

    <!-- ================= VIEW 2: STAKEHOLDERS DIRECTORY & INSPECTOR ================= -->
    <div id="directoryView" class="directory-view">
      <div class="search-wrapper">
        <input type="text" id="searchInput" class="search-input" placeholder="Type /logins, /messages, or search farmer name, location, crop..." oninput="handleSearch(this.value)">
        <div class="dropdown-menu" id="autoDropdown"></div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Stakeholder</th>
            <th>Role</th>
            <th>Location</th>
            <th>Crop / Enterprise</th>
            <th>Farm Size</th>
            <th>AgriPoints</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="usersTableBody">
          <!-- Populated by JS -->
        </tbody>
      </table>
    </div>

    <!-- ================= VIEW 3: LIVE OPERATIONAL STREAM ================= -->
    <div id="logsView" class="control-plane-view">
      <div class="section-head">
        <div class="section-title">🛰️ Real-Time Operational & Telemetry Feed</div>
        <button class="btn sm" onclick="loadControlState()">🔄 Clear / Reload</button>
      </div>
      <div class="log-box" style="max-height: 500px;" id="fullLogBox"></div>
    </div>

  </div>

  <!-- User Inspector Modal -->
  <div class="modal-backdrop" id="inspectModal">
    <div class="modal-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 id="modalUserName" style="color:#4ade80;">User Inspector</h3>
        <button class="btn sm" onclick="closeModal()">✕ Close</button>
      </div>
      <div id="modalContent"></div>
    </div>
  </div>

  <script>
    const USERS_DATA = {users_json};
    let controlState = {{}};

    function switchView(viewName, btn) {{
      document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('controlView').classList.toggle('active', viewName === 'control');
      document.getElementById('directoryView').classList.toggle('active', viewName === 'directory');
      document.getElementById('logsView').classList.toggle('active', viewName === 'logs');
    }}

    async function loadControlState() {{
      try {{
        const res = await fetch('/api/control-plane/state');
        if (res.ok) {{
          controlState = await res.json();
          renderControlPlane();
        }}
      }} catch (err) {{
        console.error('Failed to fetch control state:', err);
      }}
    }}

    function renderControlPlane() {{
      if (!controlState.system_stats) return;

      const s = controlState.system_stats;
      document.getElementById('uptimeVal').innerText = s.uptime_formatted || '--';
      document.getElementById('cpuRamVal').innerText = `${{s.process_cpu_percent}}% / ${{s.process_memory_mb}} MB`;
      document.getElementById('activePipesVal').innerText = `${{s.active_pipelines}} / ${{s.total_pipelines}}`;

      if (controlState.ai_workload) {{
        const ai = controlState.ai_workload;
        document.getElementById('aiInferenceVal').innerText = `${{ai.metrics.total_inferences}} / ${{Math.round(ai.metrics.tokens_generated / 1000)}}k`;
        document.getElementById('aiModelSelect').value = ai.active_engine;
        document.getElementById('aiTempSlider').value = ai.temperature;
        document.getElementById('tempDisplay').innerText = parseFloat(ai.temperature).toFixed(2);
        document.getElementById('aiConcurrencySelect').value = ai.concurrency_limit;

        if (ai.batch_diagnosis_history) {{
          const batchHtml = ai.batch_diagnosis_history.slice(0, 3).map(b => `
            <div style="background:#0b1120; border:1px solid #1e293b; border-radius:6px; padding:8px;">
              <strong style="color:#38bdf8;">${{b.zone}}:</strong> ${{b.diagnosis}}
            </div>
          `).join('');
          document.getElementById('aiBatchResults').innerHTML = batchHtml;
        }}
      }}

      // Render Pipelines
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
              <span>📊 Records: ${{p.records_processed.toLocaleString()}}</span>
              <span>⚡ Latency: ${{p.avg_latency_ms}}ms</span>
            </div>
          </div>
        `).join('');
      }}

      // Render Logs
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
        const res = await fetch('/api/control-plane/pipelines/trigger', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ pipeline_id: id }})
        }});
        const data = await res.json();
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

    function renderUsersTable(list) {{
      const tbody = document.getElementById('usersTableBody');
      if (!tbody) return;
      tbody.innerHTML = list.map(u => `
        <tr onclick="inspectUser('${{u.uid}}')">
          <td><strong>${{u.name || 'Unnamed'}}</strong><br><small style="color:#64748b;">${{u.email || '—'}}</small></td>
          <td><span class="badge blue">${{u.role || 'farmer'}}</span></td>
          <td>${{u.village || '—'}}, ${{u.district || 'Punjab'}}</td>
          <td>${{u.primary_crop || '—'}}</td>
          <td>${{u.farm_size_acres || 0}} Acres</td>
          <td><strong style="color:#4ade80;">${{u.points || 0}} Pts</strong></td>
          <td><button class="btn sm" onclick="event.stopPropagation(); inspectUser('${{u.uid}}')">Inspect 🔍</button></td>
        </tr>
      `).join('');
    }}

    function inspectUser(uid) {{
      const u = USERS_DATA.find(x => x.uid === uid) || USERS_DATA[0];
      document.getElementById('modalUserName').innerText = `Inspector: ${{u.name}} (${{u.role}})`;
      document.getElementById('modalContent').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
          <div style="background:#151f32; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#94a3b8;">EMAIL & PHONE</div>
            <div>${{u.email}} | ${{u.phone}}</div>
          </div>
          <div style="background:#151f32; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#94a3b8;">FARM & CROP</div>
            <div>${{u.farm_size_acres}} Acres · ${{u.primary_crop}}</div>
          </div>
          <div style="background:#151f32; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#94a3b8;">IRRIGATION SYSTEM</div>
            <div>${{u.irrigation_system}} · Soil: ${{u.soil_type}}</div>
          </div>
          <div style="background:#151f32; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#94a3b8;">LOYALTY POINTS</div>
            <div style="color:#4ade80; font-weight:700;">${{u.points}} AgriPoints</div>
          </div>
        </div>
      `;
      document.getElementById('inspectModal').classList.add('open');
    }}

    function closeModal() {{
      document.getElementById('inspectModal').classList.remove('open');
    }}

    function handleSearch(q) {{
      const filter = q.toLowerCase();
      const filtered = USERS_DATA.filter(u => 
        (u.name && u.name.toLowerCase().includes(filter)) ||
        (u.email && u.email.toLowerCase().includes(filter)) ||
        (u.primary_crop && u.primary_crop.toLowerCase().includes(filter)) ||
        (u.role && u.role.toLowerCase().includes(filter))
      );
      renderUsersTable(filtered);
    }}

    // Auto-polling for real-time telemetry every 3 seconds
    setInterval(loadControlState, 3000);

    // Initial load
    renderUsersTable(USERS_DATA);
    loadControlState();
  </script>
</body>
</html>
"""
