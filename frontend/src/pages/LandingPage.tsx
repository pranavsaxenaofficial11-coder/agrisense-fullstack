import React, { useState, useEffect } from 'react';
import './landing.css';

export const LandingPage: React.FC = () => {
  // 1. Mobile menu toggle
  const [menuOpen, setMenuOpen] = useState(false);

  // 2. Know more popup
  const [knowMoreOpen, setKnowMoreOpen] = useState(false);

  // 3. Hero rotating cue cards
  const heroCues = [
    { chip: 'Act now', cls: 'chip-act', time: '06:40 · Zone B3', cue: 'Water Zone B3 now.', why: 'soil moisture 19% · no rain for 72h · pump ready on relay 1' },
    { chip: 'Auto', cls: 'chip-auto', time: '06:41 · Zone B3', cue: 'Irrigation started automatically.', why: 'pump on · target 24% moisture · auto-stop in ~18 min' },
    { chip: 'Check', cls: 'chip-check', time: '06:42 · Zone A2', cue: 'Check Zone A2 for pests.', why: 'leaf-zone humidity spike · pattern matches early aphid pressure' },
    { chip: 'All good', cls: 'chip-ok', time: '06:43 · Full plot', cue: 'No further action today.', why: 'all 16 zones within range · next scan tomorrow 06:30' }
  ];
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroCues.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 4. Interactive Live Demo
  const rows = ['A', 'B', 'C', 'D'];
  const allZoneIds: string[] = [];
  rows.forEach((r) => {
    for (let c = 1; c <= 4; c++) allZoneIds.push(`${r}${c}`);
  });

  const [zoneStates, setZoneStates] = useState<Record<string, { status: string; isScanning: boolean; isFlagged: boolean }>>(() => {
    const init: Record<string, { status: string; isScanning: boolean; isFlagged: boolean }> = {};
    allZoneIds.forEach((id) => {
      init[id] = { status: '', isScanning: false, isFlagged: false };
    });
    return init;
  });

  const [feedLogs, setFeedLogs] = useState<string[]>(['— awaiting scan —']);
  const [isScanning, setIsScanning] = useState(false);
  const [demoCues, setDemoCues] = useState<
    Array<{ zone: string; status: string; cue: string; why: string; show: boolean; openWhy: boolean; highlighted: boolean }>
  >([]);
  const [scanNote, setScanNote] = useState('Zones are named A1–D4, like a map grid.');

  const results = [
    {
      zone: 'B3',
      status: 'auto',
      cue: 'Irrigating Zone B3 — pump on.',
      why: 'soil moisture 19% (ideal 24–30%) · no rain forecast for 72h · AI started the pump via relay 1 · auto-stop at target moisture · tap to override'
    },
    {
      zone: 'A2',
      status: 'check',
      cue: 'Check Zone A2 for pests.',
      why: 'humidity spike at canopy level · growth rate −6% vs neighbours · matches early aphid signature, not water stress · a 2-minute look now beats a sprayer later'
    },
    {
      zone: 'C4',
      status: 'act',
      cue: 'Add nitrogen in Zone C4.',
      why: 'NPK sensor: N low (38 mg/kg, ideal 50+) · P and K within range · recommended dose sent to the app · fertilizer feed ready on relay 2'
    }
  ];

  const feedLines = [
    'sensor sweep 06:31 · 16/16 zones reporting',
    'weather: 31°C · RH 38% · rain 0% next 72h',
    'soil probes: 14 in range · B3 low (19%) · C4 N-deficit',
    'AI analysis complete · 2 cues · 1 automated action'
  ];

  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const runFieldScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setDemoCues([]);
    setFeedLogs([]);

    // Reset zones
    setZoneStates((prev) => {
      const next = { ...prev };
      allZoneIds.forEach((id) => {
        next[id] = { status: '', isScanning: false, isFlagged: false };
      });
      return next;
    });

    // Animate scanning pass
    for (let i = 0; i < allZoneIds.length; i++) {
      const zid = allZoneIds[i];
      setZoneStates((prev) => ({
        ...prev,
        [zid]: { ...prev[zid], isScanning: true }
      }));
      if (i % 4 === 3) await wait(120);
    }
    await wait(250);

    // Stream feed lines
    for (let f = 0; f < feedLines.length; f++) {
      const line = feedLines[f];
      setFeedLogs((prev) => [...prev, `> ${line}`]);
      await wait(330);
    }

    // Flagged zones mapping
    const flaggedMap: Record<string, string> = {
      B3: 'auto',
      A2: 'check',
      C4: 'act'
    };

    setZoneStates((prev) => {
      const next = { ...prev };
      allZoneIds.forEach((id) => {
        const st = flaggedMap[id] || 'ok';
        next[id] = {
          status: st,
          isScanning: false,
          isFlagged: Boolean(flaggedMap[id])
        };
      });
      return next;
    });

    await wait(300);

    // Add cues one by one
    for (let k = 0; k < results.length; k++) {
      const r = results[k];
      setDemoCues((prev) => [
        ...prev,
        { ...r, show: true, openWhy: false, highlighted: false }
      ]);
      await wait(260);
    }

    setScanNote('Tap a flagged zone on the map to find its cue. Purple = automated action.');
    setIsScanning(false);
  };

  const handleZoneClick = (id: string) => {
    const isFl = zoneStates[id]?.isFlagged;
    if (!isFl) return;

    setDemoCues((prev) =>
      prev.map((c) => ({
        ...c,
        highlighted: c.zone === id
      }))
    );

    setTimeout(() => {
      setDemoCues((prev) =>
        prev.map((c) => ({
          ...c,
          highlighted: false
        }))
      );
    }, 1800);
  };

  const currentHero = heroCues[heroIndex];

  return (
    <div style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', position: 'relative' }}>
      {/* Background Gradient Blobs */}
      <div className="blobs" aria-hidden="true" />

      {/* Navigation */}
      <nav>
        <div className="nav-in">
          <a className="logo" href="#top">
            Agri<span>Sense</span>
          </a>
          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            id="hamburger"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`} id="navLinks">
            <a href="#problem" onClick={() => setMenuOpen(false)}>Problem</a>
            <a href="#solution" onClick={() => setMenuOpen(false)}>Solution</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>Working model</a>
            <a href="#demo" onClick={() => setMenuOpen(false)}>Live demo</a>
            <a href="#prototype" onClick={() => setMenuOpen(false)}>Prototype</a>
            <a href="#team" onClick={() => setMenuOpen(false)}>Team</a>
            <a
              href="/app.html"
              style={{
                color: 'var(--green-deep)',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Open app →
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero" id="top">
        <div className="wrap hero-grid">
          <div>
            <h1>Agri<span>Sense</span></h1>
            <p className="sub">Smart AI-Based Farming and Automation System</p>
            <p className="quote">"Empowering farmers with intelligent, data-driven agriculture for a sustainable future."</p>
            <div className="hero-ctas">
              <a className="btn" href="/app.html">🌐 Use web app →</a>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '12px', fontFamily: 'var(--mono)' }}>
              Works online with full features — AI, login, and live data ·{' '}
              <a href="#demo" style={{ color: 'var(--green-deep)', textDecoration: 'none' }}>see the demo ↓</a>
            </p>
          </div>

          {/* Hero Cue Card */}
          <div className="cue-card" aria-label="Example AgriSense instruction card">
            <div className="cue-top">
              <span className={`cue-chip ${currentHero.cls}`} id="heroChip">{currentHero.chip}</span>
              <span className="cue-time" id="heroTime">{currentHero.time}</span>
            </div>
            <div className="cue-instruction" id="heroCue">{currentHero.cue}</div>
            <div className="cue-why" id="heroWhy">{currentHero.why}</div>
            <div className="cue-dots" id="heroDots">
              {heroCues.map((_, idx) => (
                <i key={idx} className={idx === heroIndex ? 'on' : ''} />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Problem Statement */}
      <section id="problem">
        <div className="wrap split">
          <div>
            <div className="eyebrow">Problem statement</div>
            <h2>Farmers don't lack effort. They lack real-time answers.</h2>
            <p className="lede">
              Today's farming runs on guesswork: when to water, how much fertilizer, what the weather will do. The data that could answer these questions either doesn't reach the field — or arrives as charts that demand expert knowledge to read.
            </p>
            <p className="pq">
              "Farmers face low crop yield due to lack of real-time soil monitoring, inefficient use of water and fertilizers, unpredictable weather, and limited access to modern technology — leading to poor productivity."
            </p>
          </div>
          <div className="x-grid" aria-label="Four core problems">
            <div className="x-item"><div className="x">✕</div><p>No real-time soil and crop monitoring</p></div>
            <div className="x-item"><div className="x">✕</div><p>Overuse or underuse of water and fertilizers</p></div>
            <div className="x-item"><div className="x">✕</div><p>Weather unpredictability impacting yield</p></div>
            <div className="x-item"><div className="x">✕</div><p>Low productivity from manual labor and guesswork</p></div>
          </div>
        </div>
      </section>

      {/* Proposed Solution */}
      <section id="solution">
        <div className="wrap">
          <div className="eyebrow">Proposed solution</div>
          <h2>Sense it. Decide it. Do it.</h2>
          <p className="lede">
            AgriSense is an AI-powered smart farming system that integrates field sensors, controllers, and cloud analytics — then closes the loop by acting on its own recommendations.
          </p>
          <div className="dark-cards cols-3">
            <div className="dc">
              <div className="tick">✓</div>
              <h3>IoT Hardware</h3>
              <p>ESP32/Arduino microcontrollers with soil moisture, temperature, humidity, and NPK nutrient sensors — reading your field's real conditions, in real time.</p>
            </div>
            <div className="dc">
              <div className="tick">✓</div>
              <h3>AI Analytics</h3>
              <p>A cloud-based AI engine compares live readings against ideal farming parameters, detects stress early, and predicts crop growth and health.</p>
            </div>
            <div className="dc">
              <div className="tick">✓</div>
              <h3>Smart Control</h3>
              <p>Automated irrigation and fertilizer delivery through a pump-and-relay system — triggered by AI recommendations, always with the farmer in control.</p>
            </div>
          </div>
          <p className="hw-note">
            Prototype hardware: ESP32 · capacitive soil moisture sensor · DHT temperature &amp; humidity sensor · NPK nutrient sensor · water pump + relay · mobile dashboard with live LED plant-health indicators
          </p>
        </div>
      </section>

      {/* Working Model */}
      <section id="how">
        <div className="wrap">
          <div className="eyebrow">Working model</div>
          <h2>From sensors to smart decisions.</h2>
          <p className="lede">Data flows in one continuous loop — collected in the field, processed on the controller, analyzed in the cloud, and turned into action.</p>
          <div className="flow">
            <div className="fl"><span className="n">01 · Collect</span><h3>Data collection</h3><p>IoT sensors gather soil moisture, temperature, humidity, and NPK levels across the field.</p></div>
            <div className="fl"><span className="n">02 · Process</span><h3>Processing</h3><p>The ESP32 microcontroller processes sensor data and prepares it for transmission.</p></div>
            <div className="fl"><span className="n">03 · Analyze</span><h3>Cloud + AI</h3><p>Data is uploaded to the cloud, where the AI engine generates insights, predictions, and recommendations.</p></div>
            <div className="fl"><span className="n">04 · Act</span><h3>Smart action</h3><p>Clear instructions reach the farmer — and approved actions like irrigation run automatically via the relay.</p></div>
          </div>
        </div>
      </section>

      {/* AI Integration */}
      <section id="ai">
        <div className="wrap split">
          <div>
            <div className="eyebrow">AI integration</div>
            <h2>The brain behind every instruction.</h2>
            <p className="lede">
              AgriSense AI analyzes real-time data from soil and environmental sensors to understand crop conditions. It compares live values against ideal farming parameters and turns the difference into smart, specific recommendations — for irrigation, fertilizers, and plant care. And because every farmer should be able to talk to their field, a multilingual AI chatbot answers questions in the farmer's own language.
            </p>
          </div>
          <div className="ok-grid" aria-label="AI capabilities">
            <div className="ok-item"><div className="ok">✓</div><h3>Continuous health analysis</h3><p>Soil and crop conditions monitored around the clock, with stress detected before it's visible.</p></div>
            <div className="ok-item"><div className="ok">✓</div><h3>Irrigation &amp; fertilizer guidance</h3><p>Exact, field-specific recommendations — how much, where, and when — not generic advice.</p></div>
            <div className="ok-item"><div className="ok">✓</div><h3>Growth &amp; maturity predictions</h3><p>The AI forecasts crop development, helping plan harvests and spot problems early.</p></div>
            <div className="ok-item"><div className="ok">✓</div><h3>Multilingual farmer chatbot</h3><p>Ask anything, in your language — the assistant explains every cue and answers farming queries.</p></div>
          </div>
        </div>
      </section>

      {/* Live Demo Simulation */}
      <section id="demo">
        <div className="inner">
          <div className="eyebrow">Live demo</div>
          <h2>One morning with AgriSense.</h2>
          <p className="lede">A simulation of a 16-zone plot. Run the scan and watch raw sensor readings become instructions — and one automated action.</p>
          <div className="demo-grid">
            <div>
              <div className="field" id="field" aria-label="Field map, 16 zones">
                {allZoneIds.map((id) => {
                  const z = zoneStates[id] || { status: '', isScanning: false, isFlagged: false };
                  const cls = ['zone', z.status, z.isScanning ? 'scanning' : '', z.isFlagged ? 'flagged' : ''].filter(Boolean).join(' ');
                  return (
                    <div
                      key={id}
                      className={cls}
                      id={`z-${id}`}
                      onClick={() => handleZoneClick(id)}
                    >
                      {id}
                      <span className="pulse" />
                    </div>
                  );
                })}
              </div>
              <p className="scan-note" id="scanNote">{scanNote}</p>
            </div>

            <div className="demo-side">
              <h3>Morning briefing</h3>
              <p>Press scan to pull today's sensor sweep, weather, and AI analysis.</p>
              <div className="feed" id="feed">
                {feedLogs.map((line, idx) => (
                  <div key={idx} className="feed-line">{line}</div>
                ))}
              </div>
              <button
                className="btn demo-btn"
                id="scanBtn"
                type="button"
                disabled={isScanning}
                onClick={runFieldScan}
              >
                {isScanning ? 'Scanning…' : demoCues.length ? 'Run scan again' : 'Run field scan'}
              </button>

              <div className="cues" id="cues" aria-live="polite">
                {demoCues.map((c) => (
                  <div
                    key={c.zone}
                    className={`cue p-${c.status} ${c.show ? 'show' : ''} ${c.highlighted ? 'hl' : ''}`}
                    id={`cue-${c.zone}`}
                  >
                    <div className="cue-line">
                      <strong>{c.cue}</strong>
                      <button
                        className="why-btn"
                        type="button"
                        aria-expanded={c.openWhy}
                        onClick={() => {
                          setDemoCues((prev) =>
                            prev.map((item) =>
                              item.zone === c.zone ? { ...item, openWhy: !item.openWhy } : item
                            )
                          );
                        }}
                      >
                        {c.openWhy ? 'hide' : 'why?'}
                      </button>
                    </div>
                    <div className={`why-body ${c.openWhy ? 'open' : ''}`}>{c.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prototype Design */}
      <section id="prototype">
        <div className="wrap split">
          <div>
            <div className="eyebrow">Prototype design</div>
            <h2>Not a slide. A working model.</h2>
            <p className="lede">
              Our prototype is a miniature farm built around an ESP32 with live sensors in real soil. It collects moisture, temperature, and nutrient data, sends it to the app for AI analysis, and automates irrigation through a visible pump-and-relay system — with LED indicators showing real-time plant health and a mobile dashboard displayed alongside.
            </p>
          </div>
          <div className="spec" aria-label="Prototype specifications">
            <div className="hd">Prototype — bill of materials</div>
            <b>controller</b> · ESP32 / Arduino<br />
            <b>sensing</b> · capacitive soil moisture · DHT temp &amp; humidity · NPK nutrient probe<br />
            <b>action</b> · water pump + relay (auto irrigation)<br />
            <b>feedback</b> · LED plant-health indicators<br />
            <b>interface</b> · mobile dashboard · live graphs · one-tap pump control<br />
            <b>connectivity</b> · Wi-Fi → cloud → AI engine
          </div>
        </div>
      </section>

      {/* Expected Outcomes */}
      <section id="outcomes">
        <div className="wrap">
          <div className="eyebrow">Expected outcomes</div>
          <h2>Less guesswork. More harvest.</h2>
          <div className="dark-cards cols-4">
            <div className="dc"><div className="tick">✓</div><h3>Higher crop yield</h3><p>Optimized resource use means healthier crops and better, more consistent results.</p></div>
            <div className="dc"><div className="tick">✓</div><h3>Less water wasted</h3><p>Irrigation runs only when the soil actually needs it — cutting wastage and costs.</p></div>
            <div className="dc"><div className="tick">✓</div><h3>Data-driven decisions</h3><p>Every instruction comes with its reason, sharpening the farmer's own judgment.</p></div>
            <div className="dc"><div className="tick">✓</div><h3>Sustainable farming</h3><p>Smarter inputs and early detection move agriculture toward long-term food security.</p></div>
          </div>
        </div>
      </section>

      {/* Future Scope & Team */}
      <section id="future">
        <div className="wrap split">
          <div>
            <div className="eyebrow">Future scope</div>
            <h2>Where AgriSense grows next.</h2>
            <p className="lede">
              The prototype is one field. The architecture scales much further: aerial drone monitoring for full-farm crop and soil analysis, satellite data for enhanced weather forecasting and climate alerts, and ultimately autonomous farms with robotic actuators and AI-driven operations.
            </p>
          </div>
          <div id="team">
            <div className="eyebrow">The team</div>
            <h2 style={{ fontSize: 'clamp(22px,3vw,30px)' }}>Built by</h2>
            <div className="team">
              <span className="member">Team AgriSense</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section & Modal */}
      <section id="contact">
        <div className="wrap">
          <div className="cta-box">
            <h2>Let's grow the future of agriculture together.</h2>
            <p>AgriSense empowers farmers with smart, sustainable solutions. Reach out to see the prototype in action.</p>
            <a className="btn" href="mailto:agrisense000@gmail.com?subject=AgriSense%20enquiry">Contact the team</a>
            <button
              className="btn"
              id="knowMoreBtn"
              type="button"
              style={{ marginLeft: '10px' }}
              onClick={() => setKnowMoreOpen(!knowMoreOpen)}
            >
              ✨ Know more
            </button>

            {knowMoreOpen && (
              <div
                id="knowMorePop"
                style={{
                  display: 'block',
                  margin: '18px auto 0',
                  maxWidth: '420px',
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(151,188,98,.45)',
                  borderRadius: '16px',
                  padding: '14px',
                  textAlign: 'left',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <a
                  href="/AgriSense_Pitch_Deck.pptx"
                  download
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    color: '#EAF3E2',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                  className="km-link"
                >
                  <span style={{ fontSize: '22px' }}>📊</span>
                  <span>Pitch deck (PPT)<br /><small style={{ fontWeight: 400, color: '#B9CDAA' }}>19 slides — full project story · download</small></span>
                </a>
                <a
                  href="/prototype_3d.html"
                  target="_blank"
                  rel="noopener"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    color: '#EAF3E2',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                  className="km-link"
                >
                  <span style={{ fontSize: '22px' }}>🌱</span>
                  <span>Prototype — 3D model<br /><small style={{ fontWeight: 400, color: '#B9CDAA' }}>interactive — drag to rotate, opens in new tab</small></span>
                </a>
                <a
                  href="/app.html"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    color: '#EAF3E2',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                  className="km-link"
                >
                  <span style={{ fontSize: '22px' }}>📱</span>
                  <span>Open Full Web App<br /><small style={{ fontWeight: 400, color: '#B9CDAA' }}>Interactive AgriSense Dashboard</small></span>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="wrap foot">
          <div><strong>AgriSense</strong> — transforming agriculture with AI, IoT, and smart automation.</div>
          <div>© 2026 AgriSense</div>
        </div>
      </footer>
    </div>
  );
};
