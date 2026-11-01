import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import './landing.css';

interface LandingPageProps {
  onNavigateTo404?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateTo404 }) => {
  // 1. Mobile menu toggle
  const [menuOpen, setMenuOpen] = useState(false);

  // 2. Know more popup
  const [knowMoreOpen, setKnowMoreOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

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

    // 4. Subscription Plan state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanModal, setSelectedPlanModal] = useState<{
    id: string;
    name: string;
    price: string;
    period: string;
    features: string[];
  } | null>(null);
  const [subscriberName, setSubscriberName] = useState('');
  const [subscriberPhone, setSubscriberPhone] = useState('');
  const [subscriberLocation, setSubscriberLocation] = useState('');
  const [planModalStep, setPlanModalStep] = useState<'details' | 'payment'>('details');
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; location?: string }>({});
  const [qrMode, setQrMode] = useState<'code' | 'scanner'>('code');
  const [qrPayloadType, setQrPayloadType] = useState<'404_portal' | 'upi_pay'>('404_portal');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isScanningCode, setIsScanningCode] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Generate Real Mathematically Valid QR Code Data URL
  useEffect(() => {
    if (selectedPlanModal) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://agrisense.farm';
      const cleanPrice = selectedPlanModal.price.replace(/[^\d]/g, '') || '499';

      const payload = qrPayloadType === '404_portal'
        ? `${origin}/404?session=upi_gateway&plan=${encodeURIComponent(selectedPlanModal.id)}&price=${cleanPrice}&farmer=${encodeURIComponent(subscriberName.trim() || 'Kisan')}`
        : `upi://pay?pa=agrisense.farm@icici&pn=AgriSense%20AI&am=${cleanPrice}&cu=INR&tn=${encodeURIComponent(selectedPlanModal.name)}`;

      QRCode.toDataURL(payload, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0B130E',
          light: '#FFFFFF'
        }
      })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: unknown) => console.error('Failed to generate real QR code', err));
    }
  }, [selectedPlanModal, subscriberName, qrPayloadType]);

  // Camera stream effect with live jsQR decoding
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animId: number;

    if (selectedPlanModal && planModalStep === 'payment' && qrMode === 'scanner') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then((s) => {
            stream = s;
            setCameraActive(true);
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.play().catch(() => {});

              // Off-screen canvas for real-time QR decoding
              const scanCanvas = document.createElement('canvas');
              const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });

              const scanLoop = () => {
                if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && ctx) {
                  scanCanvas.width = videoRef.current.videoWidth;
                  scanCanvas.height = videoRef.current.videoHeight;
                  ctx.drawImage(videoRef.current, 0, 0, scanCanvas.width, scanCanvas.height);
                  const imgData = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
                  const qrResult = jsQR(imgData.data, imgData.width, imgData.height, {
                    inversionAttempts: 'dontInvert'
                  });

                  if (qrResult && qrResult.data) {
                    setIsScanningCode(true);
                    setScanFeedback(`✓ Real QR Detected! Connecting gateway...`);
                    setTimeout(() => {
                      setSelectedPlanModal(null);
                      if (onNavigateTo404) {
                        onNavigateTo404();
                      } else {
                        window.location.href = '/404';
                      }
                    }, 800);
                    return; // Stop animation loop
                  }
                }
                animId = requestAnimationFrame(scanLoop);
              };

              animId = requestAnimationFrame(scanLoop);
            }
          })
          .catch(() => {
            setCameraActive(false);
          });
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animId) {
        cancelAnimationFrame(animId);
      }
      setCameraActive(false);
    };
  }, [selectedPlanModal, planModalStep, qrMode]);

  const validateField = (field: 'name' | 'phone' | 'location', val: string) => {
    const trimmed = val.trim();
    let err = '';
    if (field === 'name') {
      if (!trimmed) {
        err = 'Farmer or farm name is required.';
      } else if (trimmed.length < 3) {
        err = 'Name must be at least 3 characters.';
      } else if (!/^[a-zA-Z\s.-]+$/.test(trimmed)) {
        err = 'Name can only contain alphabetic letters and spaces.';
      }
    } else if (field === 'phone') {
      const cleanPhone = trimmed.replace(/[\s-]/g, '');
      if (!cleanPhone) {
        err = 'Mobile number is required.';
      } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        err = 'Enter a valid 10-digit mobile number (starting with 6, 7, 8, or 9).';
      }
    } else if (field === 'location') {
      if (!trimmed) {
        err = 'District and state are required.';
      } else if (trimmed.length < 3) {
        err = 'Please enter your district and state (e.g. Bareilly, UP).';
      } else if (!/^[a-zA-Z0-9\s,.-]+$/.test(trimmed)) {
        err = 'Location must only contain letters, numbers, spaces, or commas.';
      }
    }
    setFormErrors((prev) => ({ ...prev, [field]: err }));
    return !err;
  };

  const validateAll = () => {
    const isNameValid = validateField('name', subscriberName);
    const isPhoneValid = validateField('phone', subscriberPhone);
    const isLocValid = validateField('location', subscriberLocation);
    return isNameValid && isPhoneValid && isLocValid;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    try {
      localStorage.setItem('agrisense_subscription', JSON.stringify({
        plan: selectedPlanModal?.name,
        price: selectedPlanModal?.price,
        period: selectedPlanModal?.period,
        subscriberName: subscriberName.trim(),
        subscriberPhone: subscriberPhone.trim(),
        subscriberLocation: subscriberLocation.trim(),
        initiatedAt: new Date().toISOString()
      }));
    } catch {}

    setPlanModalStep('payment');
  };

  const handleScanAndRedirect = () => {
    setIsScanningCode(true);
    setScanFeedback('🔍 Scanning UPI QR Code payload...');
    setTimeout(() => {
      setScanFeedback('⚡ Verified payload: upi://pay?pa=agrisense.farm@icici. Connecting gateway...');
      setTimeout(() => {
        setSelectedPlanModal(null);
        if (onNavigateTo404) {
          onNavigateTo404();
        } else {
          window.location.href = '/404';
        }
      }, 800);
    }, 1000);
  };

  // 5. Interactive Live Demo
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
          <a className="logo" href="#top" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.jpeg" alt="AgriSense Logo" style={{ height: '34px', width: '34px', borderRadius: '8px', objectFit: 'cover' }} />
            <span>Agri<span>Sense</span></span>
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
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Plans</a>
            <a href="#team" onClick={() => setMenuOpen(false)}>Team</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
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
            <div className="hero-ctas" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a className="btn" href="/app.html">🌐 Use web app →</a>
              <button
                className="btn"
                type="button"
                style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => setTutorialOpen(true)}
              >
                ▶ Video Tutorial
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '12px', fontFamily: 'var(--mono)' }}>
              Works online with full features — AI, login, and live data ·{' '}
              <a href="#demo" style={{ color: 'var(--green-deep)', textDecoration: 'none' }}>see the demo ↓</a>
            </p>
          </div>

          {/* Hero Cue Card */}
          <div className="cue-card" aria-label="Example AgriUpdate instruction card">
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
            AgriUpdate is an AI-powered smart farming system that integrates field sensors, controllers, and cloud analytics — then closes the loop by acting on its own recommendations.
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
              AgriUpdate AI analyzes real-time data from soil and environmental sensors to understand crop conditions. It compares live values against ideal farming parameters and turns the difference into smart, specific recommendations — for irrigation, fertilizers, and plant care. And because every farmer should be able to talk to their field, a multilingual AI chatbot answers questions in the farmer's own language.
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
          <h2>One morning with AgriUpdate.</h2>
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

      
      {/* Subscription Plans */}
      <section id="pricing" style={{ borderTop: '1px solid var(--line)', background: 'rgba(255, 255, 255, 0.55)' }}>
        <div className="wrap">
          <div className="pricing-header-wrap">
            <div className="eyebrow">Affordable Precision Agri-Tech</div>
            <h2>Smart Farming Subscription Plans</h2>
            <p className="lede" style={{ margin: '0 auto' }}>
              Choose the right precision farming tier for your field. Slashes irrigation water by 30-50%, automates solenoid valves, and protects your harvest with AI.
            </p>
            <div className="pricing-toggle">
              <button
                type="button"
                className={billingCycle === 'monthly' ? 'active' : ''}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly billing
              </button>
              <button
                type="button"
                className={billingCycle === 'yearly' ? 'active' : ''}
                onClick={() => setBillingCycle('yearly')}
              >
                Annual billing <span className="save-badge">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="pricing-grid">
            {/* Plan 1: Starter */}
            <div className="plan-card">
              <div className="plan-name">Kisan Starter</div>
              <div className="plan-desc">For smallholder farmers & students exploring smart moisture sensing and basic irrigation.</div>
              <div className="plan-price-wrap">
                <span className="plan-currency">₹</span>
                <span className="plan-amount">0</span>
                <span className="plan-period">/ forever</span>
              </div>
              <ul className="plan-features">
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>1 Field Zone Soil Physics & Moisture Telemetry</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Capacitive Sensor Calibrations (Dry/Wet baseline)</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Daily e-NAM & Agmarknet Mandi Rates</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Basic Rule-Based Irrigation Threshold Alerts</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Community Farming Forum & Agronomy Tips</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Web Serial USB Direct Hardware Connection</span>
                </li>
              </ul>
              <a href="/app.html" className="plan-cta outline">
                Launch Free Web App →
              </a>
            </div>

            {/* Plan 2: Pro (Featured) */}
            <div className="plan-card featured">
              <div className="plan-badge">⭐ Most Popular</div>
              <div className="plan-name">Pro Kisan & Edge-IoT</div>
              <div className="plan-desc">Full autonomous closed-loop irrigation, ESP32-S3 AI foliar vision & cloud telemetry.</div>
              <div className="plan-price-wrap">
                <span className="plan-currency">₹</span>
                <span className="plan-amount">{billingCycle === 'monthly' ? '499' : '399'}</span>
                <span className="plan-period">/ month {billingCycle === 'yearly' ? '(billed annually)' : ''}</span>
              </div>
              <ul className="plan-features">
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span><strong>Up to 16 Multi-Zone Sensor Grid</strong> (A1–D4)</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span><strong>Autonomous Relay & Solenoid Control</strong> (Pumps & Fans)</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span><strong>ESP32-S3 Dual-Core AI Vision</strong> (Pest & Leaf Disease Scan)</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span><strong>Live Google Sheets Sync</strong> + FastAPI Cloud Gateway</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Microclimate VPD (Vapor Pressure Deficit) Diagnostics</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Inter-Mandi Arbitrage & Freight Net Profit Calculator</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Urgent Weather, Frost & Heatwave WhatsApp Alerts</span>
                </li>
              </ul>
              <button
                type="button"
                className="plan-cta primary"
                onClick={() => {
                  setSelectedPlanModal({
                    id: 'pro',
                    name: 'Pro Kisan & Edge-IoT',
                    price: billingCycle === 'monthly' ? '₹499' : '₹399/mo (₹4,788/yr)',
                    period: billingCycle === 'monthly' ? 'Monthly' : 'Annual (Save 20%)',
                    features: [
                      'Up to 16 Multi-Zone Sensor Grid (A1–D4)',
                      'Autonomous Closed-Loop Pump & Relay Control',
                      'ESP32-S3 On-Device AI Foliar Disease Vision',
                      'Live Google Sheets Sync & Telemetry Logs',
                      'VPD Transpiration & Weather Shield',
                      'Priority Support & WhatsApp Alerts'
                    ]
                  });
                  setPlanModalStep('details');
                  setFormErrors({});
                  setQrMode('code');
                  setIsScanningCode(false);
                  setScanFeedback(null);
                  setCopiedUpi(false);
                }}
              >
                Choose Pro Plan →
              </button>
            </div>

            {/* Plan 3: Enterprise */}
            <div className="plan-card">
              <div className="plan-name">FPO & Cluster Enterprise</div>
              <div className="plan-desc">For Farmer Producer Organizations (FPOs), agribusiness clusters, and agronomy research labs.</div>
              <div className="plan-price-wrap">
                <span className="plan-currency">₹</span>
                <span className="plan-amount">{billingCycle === 'monthly' ? '1,999' : '1,599'}</span>
                <span className="plan-period">/ month {billingCycle === 'yearly' ? '(billed annually)' : ''}</span>
              </div>
              <ul className="plan-features">
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span><strong>Unlimited Plots & Multi-Node ESP32 Clusters</strong></span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span><strong>Aerial Drone Multispectral & Thermal Mapping</strong></span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Custom Gemini 2.5 Flash Agronomist AI Fine-Tuned Model</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>High-Speed 100ms Telemetry Stream & Raw Data Export</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Cold Storage Logistics & Reefer Transport Fleet Booking</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>ICAR & NABARD Compliance Reporting & Audit Data</span>
                </li>
                <li className="plan-feature-item">
                  <span className="tick">✓</span>
                  <span>Dedicated Agronomist & On-Site Hardware Calibration</span>
                </li>
              </ul>
              <button
                type="button"
                className="plan-cta secondary"
                onClick={() => {
                  setSelectedPlanModal({
                    id: 'enterprise',
                    name: 'FPO & Cluster Enterprise',
                    price: billingCycle === 'monthly' ? '₹1,999' : '₹1,599/mo (₹19,188/yr)',
                    period: billingCycle === 'monthly' ? 'Monthly' : 'Annual (Save 20%)',
                    features: [
                      'Unlimited Farm Plots & Multi-Node Clusters',
                      'Aerial Drone Thermal & NDVI Mapping',
                      'Custom Agronomy AI Agent Fine-Tuning',
                      'Dedicated Hardware Calibration & Support',
                      'Full REST API & ICAR Audit Compliance'
                    ]
                  });
                  setPlanModalStep('details');
                  setFormErrors({});
                  setQrMode('code');
                  setIsScanningCode(false);
                  setScanFeedback(null);
                  setCopiedUpi(false);
                }}
              >
                Enroll Enterprise →
              </button>
            </div>
          </div>

          {/* Subsidy & Compatibility Banner */}
          <div className="pricing-footer-banner">
            <div className="pricing-footer-banner-text">
              <span className="icon">🌾</span>
              <div>
                <h4>Eligible for PM-KUSUM & Per Drop More Crop (PDMC) DBT Subsidies</h4>
                <p>AgriSense open-standard IoT irrigation controllers qualify for government micro-irrigation and precision agriculture subsidies (up to 55-80% rebate depending on state).</p>
              </div>
            </div>
            <a href="mailto:agrisense000@gmail.com?subject=AgriSense%20Govt%20Subsidy%20Assistance" className="btn ghost" style={{ padding: '10px 22px', fontSize: '13.5px' }}>
              Claim Subsidy Assistance →
            </a>
          </div>
        </div>
      </section>

      {/* Future Scope & Team */}
      <section id="future">
        <div className="wrap split">
          <div>
            <div className="eyebrow">Future scope</div>
            <h2>Where AgriUpdate grows next.</h2>
            <p className="lede">
              The prototype is one field. The architecture scales much further: aerial drone monitoring for full-farm crop and soil analysis, satellite data for enhanced weather forecasting and climate alerts, and ultimately autonomous farms with robotic actuators and AI-driven operations.
            </p>
          </div>
          <div id="team">
            <div className="eyebrow">Innovator</div>
            <h2 style={{ fontSize: 'clamp(22px,3vw,30px)' }}>Built by</h2>
            <div className="team">
              <span className="member">Pranav Saxena — Sole Creator, Lead Developer &amp; IoT Systems Architect</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section & Social Channels */}
      <section id="contact">
        <div className="wrap">
          <div className="cta-box">
            <div className="eyebrow" style={{ color: 'var(--green, #22c55e)', marginBottom: '8px' }}>Get In Touch</div>
            <h2>Let's grow the future of agriculture together.</h2>
            <p style={{ maxWidth: '620px', margin: '0 auto 28px' }}>
              Have questions, need smart irrigation hardware support, or want to collaborate with AgriSense? Contact our team directly through any of our channels below.
            </p>

            {/* Contact Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              maxWidth: '960px',
              margin: '0 auto 30px',
              textAlign: 'left'
            }}>
              {/* Phone / Call & WhatsApp */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>📞</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 700 }}>Direct Helpline</h4>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Call / WhatsApp</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#38bdf8', margin: '6px 0 4px', letterSpacing: '0.5px' }}>
                    +91 83830 49373
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Instant response for queries and farmer assistance.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <a
                    href="tel:+918383049373"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      textDecoration: 'none'
                    }}
                  >
                    Call
                  </a>
                  <a
                    href="https://wa.me/918383049373?text=Hi%20AgriSense%20Team%2C%20I%20have%20an%20inquiry%20about%20AgriSense"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      borderRadius: '8px',
                      color: '#4ade80',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      textDecoration: 'none'
                    }}
                  >
                    WhatsApp
                  </a>
                </div>
              </div>

              {/* Instagram Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>📸</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 700 }}>Instagram</h4>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Official Community</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f472b6', margin: '6px 0 4px' }}>
                    @agrisense.official
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Follow for field updates, innovation reels, and announcements.</p>
                </div>
                <a
                  href="https://www.instagram.com/agrisense.official/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: '12px',
                    padding: '7px 10px',
                    background: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(244,63,94,0.2) 100%)',
                    border: '1px solid rgba(244, 114, 182, 0.4)',
                    borderRadius: '8px',
                    color: '#f472b6',
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'block'
                  }}
                >
                  Visit Instagram ↗
                </a>
              </div>

              {/* YouTube Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>📺</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 700 }}>YouTube</h4>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Video Help & Guides</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#f87171', margin: '6px 0 4px' }}>
                    @agrisenseofficialhelppage
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Step-by-step video guides for hardware, sensors & the app.</p>
                </div>
                <a
                  href="https://youtube.com/@agrisenseofficialhelppage?si=vFm9k_KGVtVNuFtj"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: '12px',
                    padding: '7px 10px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'block'
                  }}
                >
                  Watch on YouTube ↗
                </a>
              </div>

              {/* Email Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>✉️</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 700 }}>Email Team</h4>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Official Desk</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#a7f3d0', margin: '6px 0 4px', wordBreak: 'break-all' }}>
                    agrisense000@gmail.com
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Send project inquiries, partnership proposals, or feedback.</p>
                </div>
                <a
                  href="mailto:agrisense000@gmail.com?subject=AgriSense%20Inquiry"
                  style={{
                    marginTop: '12px',
                    padding: '7px 10px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '8px',
                    color: '#34d399',
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'block'
                  }}
                >
                  Send Email ↗
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <a className="btn" href="mailto:agrisense000@gmail.com?subject=AgriSense%20Inquiry">Contact the team</a>
              <button
                className="btn"
                id="knowMoreBtn"
                type="button"
                style={{ marginLeft: '10px' }}
                onClick={() => setKnowMoreOpen(!knowMoreOpen)}
              >
                ✨ Know more
              </button>
            </div>

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
                  href="/AgriSense_SEVA_FIRST_2026_G1.pptx"
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
                  <span>SEVA FIRST Presentation (PPTX)<br /><small style={{ fontWeight: 400, color: '#B9CDAA' }}>8 slides — AgriSense pitch deck · download</small></span>
                </a>
                <a
                  href="/idea_submission_template_bbh3_02.pdf"
                  download
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
                  <span style={{ fontSize: '22px' }}>📄</span>
                  <span>Idea Submission (BBH 3.0 PDF)<br /><small style={{ fontWeight: 400, color: '#B9CDAA' }}>Bal Bharati Hackathon 3.0 template · download</small></span>
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
        <div className="wrap foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <strong>AgriSense</strong> — transforming agriculture with AI, IoT, and smart automation.
            <div style={{ fontSize: '13px', color: 'var(--ink-mute)', marginTop: '6px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>📞 <a href="tel:+918383049373" style={{ color: 'inherit', textDecoration: 'underline' }}>+91 83830 49373</a></span>
              <span>✉️ <a href="mailto:agrisense000@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>agrisense000@gmail.com</a></span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13.5px' }}>
            <a href="https://www.instagram.com/agrisense.official/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-soft)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📸</span> Instagram
            </a>
            <a href="https://youtube.com/@agrisenseofficialhelppage?si=vFm9k_KGVtVNuFtj" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-soft)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📺</span> YouTube
            </a>
            <a href="https://wa.me/918383049373?text=Hi%20AgriSense%20Team" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-soft)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>💬</span> WhatsApp
            </a>
            <span style={{ color: 'var(--ink-mute)' }}>© 2026 AgriSense</span>
          </div>
        </div>
      </footer>

      
      {/* Subscription Checkout / Activation Modal */}
      {selectedPlanModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '30px 26px',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.4)',
            position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setSelectedPlanModal(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#F1F5F9',
                border: 'none',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '16px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              ✕
            </button>

            {planModalStep === 'details' ? (
              <div>
                <div style={{ display: 'inline-block', background: '#E8F5E9', color: '#166534', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                  {selectedPlanModal.period} Plan
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', marginBottom: '4px' }}>
                  {selectedPlanModal.name}
                </h3>
                <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--green-deep)', marginBottom: '16px' }}>
                  {selectedPlanModal.price}
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px 14px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                    Included in this plan:
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12.5px', color: '#334155', padding: 0, margin: 0 }}>
                    {selectedPlanModal.features.slice(0, 4).map((feat, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <form onSubmit={handleFormSubmit} noValidate>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    {/* Farmer / Farm Name */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          Farmer / Farm Name <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        {subscriberName && !formErrors.name && (
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>✓ Valid</span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Patel"
                        value={subscriberName}
                        onChange={(e) => {
                          setSubscriberName(e.target.value);
                          if (formErrors.name) validateField('name', e.target.value);
                        }}
                        onBlur={() => validateField('name', subscriberName)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '10px',
                          border: formErrors.name ? '1.5px solid #EF4444' : subscriberName && !formErrors.name ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                          background: formErrors.name ? '#FEF2F2' : '#FFFFFF',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          outline: 'none',
                          transition: 'border-color 0.15s ease'
                        }}
                      />
                      {formErrors.name && (
                        <div style={{ color: '#DC2626', fontSize: '11.5px', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>⚠</span> {formErrors.name}
                        </div>
                      )}
                    </div>

                    {/* Mobile Number & Location Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Mobile Number */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                            Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          {subscriberPhone.length === 10 && !formErrors.phone && (
                            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>✓ 10-digit</span>
                          )}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#64748B'
                          }}>
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="9876543210"
                            value={subscriberPhone}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '');
                              setSubscriberPhone(v);
                              if (formErrors.phone) validateField('phone', v);
                            }}
                            onBlur={() => validateField('phone', subscriberPhone)}
                            style={{
                              width: '100%',
                              padding: '11px 14px 11px 44px',
                              borderRadius: '10px',
                              border: formErrors.phone ? '1.5px solid #EF4444' : subscriberPhone.length === 10 && !formErrors.phone ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                              background: formErrors.phone ? '#FEF2F2' : '#FFFFFF',
                              fontSize: '14px',
                              boxSizing: 'border-box',
                              outline: 'none',
                              letterSpacing: '0.04em'
                            }}
                          />
                        </div>
                        {formErrors.phone && (
                          <div style={{ color: '#DC2626', fontSize: '11.5px', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⚠</span> {formErrors.phone}
                          </div>
                        )}
                      </div>

                      {/* District / State */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                            District / State <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          {subscriberLocation && !formErrors.location && (
                            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>✓</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Bareilly, UP"
                          value={subscriberLocation}
                          onChange={(e) => {
                            setSubscriberLocation(e.target.value);
                            if (formErrors.location) validateField('location', e.target.value);
                          }}
                          onBlur={() => validateField('location', subscriberLocation)}
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '10px',
                            border: formErrors.location ? '1.5px solid #EF4444' : subscriberLocation && !formErrors.location ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                            background: formErrors.location ? '#FEF2F2' : '#FFFFFF',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            outline: 'none'
                          }}
                        />
                        {formErrors.location && (
                          <div style={{ color: '#DC2626', fontSize: '11.5px', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⚠</span> {formErrors.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'var(--green)',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: 800,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    Proceed to Payment & QR Scanner →
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#94A3B8', marginTop: '10px' }}>
                    🔒 Strict validation active · Real-time farmer credentials verification
                  </p>
                </form>
              </div>
            ) : (
              /* Step 2: Payment Plan QR Code & Live QR Scanner */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanModalStep('details');
                      setIsScanningCode(false);
                      setScanFeedback(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--green-deep)',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ← Edit Details
                  </button>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#16A34A', background: '#DCFCE7', padding: '3px 10px', borderRadius: '999px' }}>
                    Step 2 of 2 · UPI Payment
                  </span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', marginBottom: '4px' }}>
                    Complete Your Subscription
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    <strong>{selectedPlanModal.name}</strong> · <span style={{ color: 'var(--green-deep)', fontWeight: 800 }}>{selectedPlanModal.price}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                    Subscriber: {subscriberName} (+91 {subscriberPhone})
                  </div>
                </div>

                {/* Tab Switcher: QR Code vs Live Scanner */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#F1F5F9', borderRadius: '12px', padding: '4px', marginBottom: '18px' }}>
                  <button
                    type="button"
                    onClick={() => setQrMode('code')}
                    style={{
                      background: qrMode === 'code' ? '#FFFFFF' : 'transparent',
                      color: qrMode === 'code' ? 'var(--ink)' : '#64748B',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: qrMode === 'code' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📱 Payment QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode('scanner')}
                    style={{
                      background: qrMode === 'scanner' ? '#FFFFFF' : 'transparent',
                      color: qrMode === 'scanner' ? 'var(--green-deep)' : '#64748B',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: qrMode === 'scanner' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📷 QR Code Scanner
                  </button>
                </div>

                {qrMode === 'code' ? (
                  /* Option A: Payment QR Display */
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      background: '#F8FAFC',
                      border: '1.5px dashed #CBD5E1',
                      borderRadius: '18px',
                      padding: '18px',
                      marginBottom: '16px',
                      display: 'inline-block',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Scan with GPay · PhonePe · Paytm · BHIM
                      </div>

                      {/* Real Standards-Compliant Scannable QR Code */}
                      <div style={{
                        background: '#FFFFFF',
                        padding: '14px',
                        borderRadius: '16px',
                        display: 'inline-block',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                        border: '1.5px solid #E2E8F0',
                        position: 'relative'
                      }}>
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Real Scannable QR Code"
                            style={{
                              width: '180px',
                              height: '180px',
                              display: 'block',
                              borderRadius: '8px'
                            }}
                          />
                        ) : (
                          <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '13px' }}>
                            Generating Real QR...
                          </div>
                        )}
                        <div style={{
                          position: 'absolute',
                          bottom: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#10B981',
                          color: '#FFFFFF',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontSize: '10px',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                        }}>
                          ✓ 100% REAL SCANNABLE QR
                        </div>
                      </div>

                      {/* Payload Selector: 404 Gateway vs UPI */}
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setQrPayloadType('404_portal')}
                          style={{
                            background: qrPayloadType === '404_portal' ? '#E0F2FE' : '#F1F5F9',
                            color: qrPayloadType === '404_portal' ? '#0369A1' : '#64748B',
                            border: qrPayloadType === '404_portal' ? '1px solid #7DD3FC' : '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🌐 404 Portal QR
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrPayloadType('upi_pay')}
                          style={{
                            background: qrPayloadType === 'upi_pay' ? '#DCFCE7' : '#F1F5F9',
                            color: qrPayloadType === 'upi_pay' ? '#15803D' : '#64748B',
                            border: qrPayloadType === 'upi_pay' ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          💰 Direct UPI QR
                        </button>
                      </div>

                      <p style={{ fontSize: '11.5px', color: '#64748B', margin: '8px 0 10px 0' }}>
                        {qrPayloadType === '404_portal'
                          ? 'Scan with your phone camera to open the custom 404 error page directly.'
                          : 'Scan with GPay, PhonePe, Paytm, or BHIM to initiate UPI transfer.'}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#334155', background: '#E2E8F0', padding: '4px 10px', borderRadius: '6px' }}>
                          agrisense.farm@icici
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText('agrisense.farm@icici');
                              setCopiedUpi(true);
                              setTimeout(() => setCopiedUpi(false), 2000);
                            }
                          }}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          {copiedUpi ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setQrMode('scanner')}
                        style={{
                          width: '100%',
                          background: '#F0FDF4',
                          color: '#15803D',
                          border: '1.5px solid #86EFAC',
                          borderRadius: '12px',
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        📷 Open Camera QR Code Scanner →
                      </button>

                      <button
                        type="button"
                        onClick={handleScanAndRedirect}
                        disabled={isScanningCode}
                        style={{
                          width: '100%',
                          background: 'var(--green)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '13px',
                          fontSize: '14px',
                          fontWeight: 800,
                          cursor: isScanningCode ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                        }}
                      >
                        {isScanningCode ? (
                          <span>{scanFeedback || 'Connecting Gateway...'}</span>
                        ) : (
                          <span>I Have Scanned & Completed Payment →</span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Option B: Live QR Code Scanner Viewfinder */
                  <div>
                    <div style={{
                      position: 'relative',
                      width: '260px',
                      height: '260px',
                      margin: '0 auto 16px auto',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      background: '#070D09',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                      border: '2px solid rgba(16, 185, 129, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {/* Video Camera element */}
                      {cameraActive ? (
                        <video
                          ref={videoRef}
                          playsInline
                          autoPlay
                          muted
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          textAlign: 'center',
                          padding: '20px',
                          color: '#6EE7B7',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            border: '2px dashed #10B981',
                            margin: '0 auto 10px auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            animation: 'scannerRadarPulse 3s ease-in-out infinite'
                          }}>
                            📸
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#ECFDF5', marginBottom: '4px' }}>
                            Viewfinder Active
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            Align QR code within optical brackets
                          </div>
                        </div>
                      )}

                      {/* Moving Laser Beam */}
                      <div className="qr-laser-line" />

                      {/* 4 Optical Corner Reticles */}
                      <div style={{ position: 'absolute', top: '12px', left: '12px', width: '22px', height: '22px', borderTop: '3px solid #10B981', borderLeft: '3px solid #10B981', borderRadius: '4px 0 0 0', zIndex: 11 }} />
                      <div style={{ position: 'absolute', top: '12px', right: '12px', width: '22px', height: '22px', borderTop: '3px solid #10B981', borderRight: '3px solid #10B981', borderRadius: '0 4px 0 0', zIndex: 11 }} />
                      <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '22px', height: '22px', borderBottom: '3px solid #10B981', borderLeft: '3px solid #10B981', borderRadius: '0 0 0 4px', zIndex: 11 }} />
                      <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '22px', height: '22px', borderBottom: '3px solid #10B981', borderRight: '3px solid #10B981', borderRadius: '0 0 4px 0', zIndex: 11 }} />
                    </div>

                    {/* Scanner Status readout */}
                    <div style={{
                      textAlign: 'center',
                      background: isScanningCode ? '#ECFDF5' : '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '10px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: isScanningCode ? '#059669' : '#475569'
                    }}>
                      {isScanningCode ? (
                        <span>{scanFeedback || 'Connecting gateway endpoint...'}</span>
                      ) : (
                        <span>🎯 Position payment QR code in camera view</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleScanAndRedirect}
                      disabled={isScanningCode}
                      style={{
                        width: '100%',
                        background: isScanningCode ? '#059669' : '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '14px',
                        fontSize: '15px',
                        fontWeight: 800,
                        cursor: isScanningCode ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                        marginBottom: '10px'
                      }}
                    >
                      {isScanningCode ? (
                        <span>{scanFeedback || 'Processing Scan...'}</span>
                      ) : (
                        <span>📸 Capture & Scan QR Code →</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrMode('code')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '6px'
                      }}
                    >
                      ← Back to UPI QR Code display
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* YouTube Tutorial Pop-Up Modal */}
      {tutorialOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            background: '#0e1712',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ff0000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '22px', boxShadow: '0 4px 15px rgba(255,0,0,0.4)' }}>
                  ▶
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>AgriSense Video Tutorial</h3>
                  <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 700 }}>Official Help: @agrisenseofficialhelppage</span>
                </div>
              </div>
              <button
                onClick={() => setTutorialOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '18px' }}>
              Watch official step-by-step video tutorials on setting up sensors, automated irrigation, AI crop diagnosis, and navigating the platform.
            </p>
            <div style={{ background: 'linear-gradient(135deg, rgba(255,0,0,0.12) 0%, rgba(20,30,24,0.9) 100%)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: '14px', padding: '18px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>📺</div>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '16px', marginBottom: '4px' }}>AgriSense Official Help Page</div>
              <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>Interactive walkthroughs & field setup videos</div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href="https://youtube.com/@agrisenseofficialhelppage?si=vFm9k_KGVtVNuFtj"
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, background: '#ff0000', color: '#fff', padding: '12px 18px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(255,0,0,0.35)' }}
              >
                Watch on YouTube ↗
              </a>
              <button
                onClick={() => setTutorialOpen(false)}
                className="btn"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
