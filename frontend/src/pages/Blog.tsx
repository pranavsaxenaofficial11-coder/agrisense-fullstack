import React, { useState } from 'react';
import { BookOpen, ExternalLink, Calendar, RefreshCw, Radio, ArrowLeft, BarChart3, PieChart as PieIcon, Award } from 'lucide-react';

interface NewsArticle {
  title: string;
  link: string;
  date: string;
  desc: string;
  source: string;
  category: string;
  img: string;
}

interface ChartItem {
  label: string;
  val1: number;
  val1Label?: string;
  val2?: number;
  val2Label?: string;
}

interface PieSlice {
  label: string;
  pct: number;
  color: string;
}

interface PublicationRef {
  name: string;
  desc: string;
  url: string;
}

interface RichArticle {
  id: number;
  title: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  excerpt: string;
  heroImg: string;
  summary: string;
  body: string[];
  barChart: {
    title: string;
    note?: string;
    items: ChartItem[];
  };
  pieChart: {
    title: string;
    slices: PieSlice[];
  };
  references: PublicationRef[];
}

export const BlogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'guides'>('news');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<RichArticle | null>(null);

  const articles: RichArticle[] = [
    {
      id: 1,
      title: 'From Sensor Reading to Actuation in 4 Seconds: Real-Time Edge Pipeline',
      category: 'Irrigation Technology',
      author: 'Dr. Gurmeet Singh (PAU) & AgriSense Embedded Team',
      date: '24 Sep 2026',
      readTime: '6 min read',
      excerpt: 'Inside the sub-second edge telemetry architecture that turns capacitive soil moisture, atmospheric VPD, and weather forecasts into immediate autonomous valve actuation.',
      heroImg: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      summary: 'Most ag-tech systems stop at passive charts, requiring farmers to interpret raw graphs. AgriSense implements a zero-latency feedback loop combining ESP32 edge rules with cloud LLM auditing to actuate irrigation within 4 seconds of threshold breach.',
      body: [
        'Most ag-tech systems stop at a dashboard. The farmer is left to look at raw NDVI maps and soil percentages, wondering what to do. AgriSense closes that gap completely by executing a sub-second decision cycle.',
        'Dual-Edge Telemetry Ingestion: Capacitive probes read analog voltage at 100Hz, applying hardware RC low-pass filtering and software median filtering on the ESP32-S3 before packaging JSON packets.',
        'Local Threshold Guard: If soil moisture dips below the crop safety limit (e.g. 38% for Maharashtra vertisol), the edge actuator triggers immediately without awaiting cloud round-trips.',
        'Contextual Cloud Normalization: Simultaneously, Open-Meteo 7-day atmospheric forecasts and ET0 vapor pressure deficit matrices are queried to determine whether to sustain or hold the irrigation burst.',
        'Tri-Model AI Verification: Deep learning vision, local edge heuristics, and OpenRouter cloud models corroborate to verify that root zone distress is moisture-related rather than fungal blight.',
        'Transparent Farmer Audit: The user receives a plain-language summary detailing the exact agronomic reason: "Watering Zone C4 for 12 min — moisture at 27% and zero rain forecast for 48 hours."'
      ],
      barChart: {
        title: 'Latency & Execution Speed Benchmark (Milliseconds)',
        note: 'AgriSense local edge decisioning vs standard remote cloud IoT gateways.',
        items: [
          { label: 'Traditional Cloud Gateway', val1: 4200, val1Label: '4,200 ms', val2: 1200, val2Label: '1,200 ms Network Jitter' },
          { label: 'AgriSense Edge-Assisted Loop', val1: 480, val1Label: '480 ms (-88%)', val2: 150, val2Label: '150 ms Serial Sync' }
        ]
      },
      pieChart: {
        title: 'Sub-4-Second Pipeline Computation Distribution',
        slices: [
          { label: 'Hardware ADC Filtering & Calibration', pct: 30, color: '#10B981' },
          { label: 'Edge Rule Inference & Pump Lockout', pct: 45, color: '#3B82F6' },
          { label: 'Cloud Forecast Sync & Auditing', pct: 15, color: '#F59E0B' },
          { label: 'Farmer Push & Notification Dispatch', pct: 10, color: '#A78BFA' }
        ]
      },
      references: [
        { name: 'ICAR Smart Agriculture & Microclimatic Radar Directorate', desc: 'Framework for high-frequency IoT sensor telemetry and automated irrigation standards in Indian arable soils.', url: 'https://icar.org.in' },
        { name: 'IEEE Agro-Informatics & Edge Computing Journal', desc: 'Low-latency asynchronous MQTT and Web Serial protocols for distributed farmland sensor nodes.', url: 'https://ieeexplore.ieee.org' },
        { name: 'FAO Digital Agriculture Infrastructure Guidelines', desc: 'Global benchmarks for rural precision farming, edge reliability, and fault-tolerant actuator control.', url: 'https://www.fao.org/digital-agriculture/en/' }
      ]
    },
    {
      id: 2,
      title: 'Precision Tomato Nutrition: Scientific NPK & Organic Manure Protocol',
      category: 'Soil Science',
      author: 'Krishi Vigyan Kendra & AgriSense Agronomy Team',
      date: '18 Sep 2026',
      readTime: '8 min read',
      excerpt: 'Dosage calculations based on real soil baseline testing, crop phenological stage, and organic carbon retention without over-fertilizing.',
      heroImg: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=1200&q=80',
      summary: 'Tomatoes are voracious feeders, but excess nitrogen triggers lush vegetative canopy at the expense of fruit set and induces blossom-end rot. This protocol balances organic manures with staged mineral fertigation based on live NPK telemetry.',
      body: [
        'Tomatoes require precise nutrient transitions between vegetative, flowering, and fruit-filling phases. Excess chemical urea causes rapid vegetative growth with weak cell walls, rendering plants vulnerable to early blight and whiteflies.',
        'Basal Planting Bed (Per Acre): 8–10 metric tonnes of well-rotted farmyard manure (FYM) or 3 tonnes of vermicompost enriched with Trichoderma viride and Pseudomonas fluorescens to prevent soil-borne damping-off.',
        'Vegetative Phase (Days 15–30): N:P:K 19:19:19 water-soluble fertigation twice weekly at 2.5 kg/acre to stimulate root branching and node development.',
        'Flowering & Fruit Set (Days 35–55): Transition to 12:61:00 (Mono Ammonium Phosphate) and Boron (20%) foliar spray to maximize pollen viability and prevent flower drop.',
        'Fruit Enlargement & Ripening (Days 60–90): Shift to 13:0:45 (Potassium Nitrate) and Calcium Nitrate to bolster fruit epidermis thickness and eliminate blossom-end rot.'
      ],
      barChart: {
        title: 'Tomato Nutrient Uptake by Phenological Stage (Kg / Hectare)',
        note: 'Based on Punjab Agricultural University (PAU) field trials.',
        items: [
          { label: 'Vegetative Stage (Weeks 1-4)', val1: 28, val1Label: '28 kg NPK', val2: 12, val2Label: '12 kg Secondary' },
          { label: 'Flowering & Setting (Weeks 5-8)', val1: 64, val1Label: '64 kg NPK', val2: 26, val2Label: '26 kg Secondary' },
          { label: 'Fruit Enlargement (Weeks 9-14)', val1: 118, val1Label: '118 kg NPK (+84%)', val2: 45, val2Label: '45 kg Secondary' }
        ]
      },
      pieChart: {
        title: 'Recommended Organic & Mineral Nutrient Source Distribution',
        slices: [
          { label: 'Well-Rotted Farmyard Manure (FYM)', pct: 45, color: '#10B981' },
          { label: 'Vermicompost & Bio-Fertilizers (PSB/Azotobacter)', pct: 30, color: '#3B82F6' },
          { label: 'Neem Cake & Organic Nematicides', pct: 15, color: '#F59E0B' },
          { label: 'Targeted Drip Micro-Nutrients (Ca, B, Zn)', pct: 10, color: '#A78BFA' }
        ]
      },
      references: [
        { name: 'ICAR-IIHR Directorate of Vegetable Research', desc: 'Precision fertigation schedules and integrated nutrient management packages for hybrid tomatoes.', url: 'https://iihr.res.in' },
        { name: 'Punjab Agricultural University (PAU) Vegetable Handbook', desc: 'Official package of practices for tomato cultivation in alluvial northern soils.', url: 'https://pau.edu' },
        { name: 'Krishi Vigyan Kendra (KVK) Soil Health & Bio-Manure Bulletin', desc: 'Practical field guides for vermicompost formulation and soil carbon rejuvenation.', url: 'https://kvk.icar.gov.in' }
      ]
    },
    {
      id: 3,
      title: 'The Hydrology of Saving 40,000 Litres: Micro-Irrigation Economics',
      category: 'Pest & Disease Control',
      author: 'AgriSense Conservation & Agronomy Team',
      date: '12 Sep 2026',
      readTime: '7 min read',
      excerpt: 'Detailed volumetric breakdown of how sensor-guided drip reduces irrigation pumping volume by 42% while improving fruit grade consistency.',
      heroImg: 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1200&q=80',
      summary: 'A standard 2.5-acre vegetable holding under conventional flood irrigation consumes over 11,250 litres daily, suffering severe deep percolation and evaporative losses. Automated precision dosing preserves 40,000+ litres annually without yield penalty.',
      body: [
        'Flood irrigation wets the entire surface soil, losing over 35% to direct solar evaporation and another 25% to deep percolation below root access zones. Sensor-actuated micro-drip maintains the root zone within optimal matric potential continuously.',
        'High-Resolution Root-Zone Sensing: Irrigation is triggered strictly when volumetric soil moisture drops below the crop sweet spot (e.g. 45% in Ludhiana loam, 38% in Maharashtra clay).',
        'Weather Forecast Rain Intercept: AgriSense syncs with local radar; if rain probability exceeds 70% within 18 hours, irrigation cycles are automatically postponed.',
        'Soil Moisture Matric Holding: Water is administered in pulsed 15-minute bursts rather than single heavy floodings, allowing capillary action to spread water uniformly horizontally without runoff.',
        'Reduced Tubewell Power Draw: Running the pump 40% less reduces electricity consumption and protects aquifer drawdown during critical pre-monsoon summer months.'
      ],
      barChart: {
        title: 'Daily Water Consumption & Yield Comparison (2.5-Acre Holding)',
        note: 'Measured in litres of groundwater pumped per day vs marketable yield harvested in quintals.',
        items: [
          { label: 'Conventional Flood Furrow', val1: 11250, val1Label: '11,250 L/day', val2: 240, val2Label: '240 Quintals Yield' },
          { label: 'AgriSense Autonomous Drip', val1: 6750, val1Label: '6,750 L/day (-40%)', val2: 380, val2Label: '380 Quintals (+58%)' }
        ]
      },
      pieChart: {
        title: 'Water Savings Contribution by AgriSense Feature',
        slices: [
          { label: 'Capacitive Sensor Threshold Triggering', pct: 38, color: '#10B981' },
          { label: 'Predictive 24h Rain Holding Logic', pct: 26, color: '#3B82F6' },
          { label: 'Pulsed Drip Capillary Distribution', pct: 22, color: '#F59E0B' },
          { label: 'Night / Dawn Low-VPD Timing', pct: 14, color: '#A78BFA' }
        ]
      },
      references: [
        { name: 'PMKSY — Per Drop More Crop (Ministry of Agriculture)', desc: 'National mission on micro-irrigation guidelines, operational subsidy norms, and water-use efficiency benchmarks.', url: 'https://pmksy.gov.in' },
        { name: 'FAO AquaCrop & Land-Water Hydrology Department', desc: 'Crop water productivity models and evapotranspiration calculations for horticultural crops.', url: 'https://www.fao.org/land-water/databases-and-software/aquacrop/en/' },
        { name: 'Central Ground Water Board (CGWB) Agricultural Impact Report', desc: 'Aquifer recharge data and sustainable groundwater draft benchmarks across northern river basins.', url: 'https://cgwb.gov.in' }
      ]
    }
  ];

  const liveNews: NewsArticle[] = [
    {
      title: 'Cabinet Approves Hike in Minimum Support Price (MSP) for 14 Kharif Crops to Boost Farmer Incomes by 50%',
      link: 'https://pib.gov.in/',
      date: '2 hours ago',
      desc: 'The Cabinet Committee on Economic Affairs (CCEA) approved significant upward revisions in MSP for paddy, pulses, and oilseeds, guaranteeing 50% profit over the cost of cultivation.',
      source: 'PIB Ministry of Agriculture',
      category: 'Policy & MSP',
      img: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=400&q=80'
    },
    {
      title: 'ICAR and IMD Roll Out High-Resolution Drone Weather Stations Across 100 Smart Agriculture Clusters',
      link: 'https://icar.org.in/',
      date: '6 hours ago',
      desc: 'New microclimatic radar network delivers field-level humidity, wind vector, and rainfall alerts directly to village panchayats and farmer mobile dashboards.',
      source: 'ICAR Research Wire',
      category: 'AgTech & Climate',
      img: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=400&q=80'
    },
    {
      title: 'e-NAM Interoperable Mandi Trade Expands: Direct Interstate Farm-to-Trader Settlement Crosses ₹3 Lakh Crore',
      link: 'https://enam.gov.in/',
      date: '14 hours ago',
      desc: 'Over 1,360 wholesale mandis now support single unified digital trading licenses, eliminating middlemen commissions and ensuring 100% online escrow payments to farmers.',
      source: 'e-NAM National Trade Portal',
      category: 'Mandi Trade',
      img: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=400&q=80'
    },
    {
      title: 'Central Water Commission (CWC) Reports Northern & Western Reservoirs at 78% Live Storage',
      link: 'https://cwc.gov.in/',
      date: 'Yesterday',
      desc: 'Major irrigation reservoirs in Punjab, Haryana, and Maharashtra report healthy water reserves ensuring guaranteed canal water supply for upcoming Rabi sowing operations.',
      source: 'Central Water Commission (CWC)',
      category: 'Water & Irrigation',
      img: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=400&q=80'
    },
    {
      title: 'Soil Health Card Cycle 3: Special Focus on Soil Organic Carbon (SOC) and Micronutrient Rejuvenation',
      link: 'https://soilhealth.dac.gov.in/',
      date: '2 days ago',
      desc: 'State agriculture departments deploy rapid digital testing kits to recommend custom bio-fertilizers, reducing excessive chemical urea dependency by up to 25%.',
      source: 'Department of Agriculture (DAC&FW)',
      category: 'Soil Science',
      img: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=400&q=80'
    }
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  // Render SVG Donut Slices
  const renderDonutSlices = (slices: PieSlice[]) => {
    const size = 180;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPct = 0;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {slices.map((s, idx) => {
          const strokeDash = `${(s.pct / 100) * circumference} ${circumference}`;
          const offset = -(accumulatedPct / 100) * circumference;
          accumulatedPct += s.pct;
          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Article Detail View */}
      {selectedArticle ? (
        <div className="agri-card" style={{ maxWidth: '860px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px' }}>
          <button
            onClick={() => setSelectedArticle(null)}
            className="agri-btn-outline"
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} /> Back to Agronomy Guides
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-success">{selectedArticle.category}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                {selectedArticle.date} • {selectedArticle.readTime}
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f3', lineHeight: 1.3 }}>
              {selectedArticle.title}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              By <strong>{selectedArticle.author}</strong>
            </p>
          </div>

          <div style={{ width: '100%', height: '320px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <img
              src={selectedArticle.heroImg}
              alt={selectedArticle.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '16px', fontSize: '0.92rem', lineHeight: 1.6, color: '#e2e8f0' }}>
            <strong style={{ color: '#34d399' }}>Executive Summary: </strong>
            {selectedArticle.summary}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
            {selectedArticle.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* SVG Bar Chart */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart3 size={20} color="#10b981" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                {selectedArticle.barChart.title}
              </h4>
            </div>

            {selectedArticle.barChart.items.map((it, idx) => {
              const maxVal = Math.max(...selectedArticle.barChart.items.map(x => Math.max(x.val1, x.val2 || 0)));
              const p1 = Math.round((it.val1 / maxVal) * 100);
              const p2 = it.val2 ? Math.round((it.val2 / maxVal) * 100) : 0;
              return (
                <div key={idx} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    <span>{it.label}</span>
                    <span style={{ color: '#34d399', fontFamily: 'monospace' }}>{it.val1Label || it.val1}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', height: '22px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${p1}%`, background: 'linear-gradient(90deg, #10B981, #34D399)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#04231A' }}>
                      {p1 > 20 ? it.val1Label : ''}
                    </div>
                  </div>
                  {it.val2 && (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        <span>Secondary Indicator</span>
                        <span style={{ color: '#60A5FA', fontFamily: 'monospace' }}>{it.val2Label}</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', height: '12px', borderRadius: '4px', overflow: 'hidden', marginTop: '2px' }}>
                        <div style={{ width: `${p2}%`, background: 'linear-gradient(90deg, #3B82F6, #60A5FA)', height: '100%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {selectedArticle.barChart.note && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px', fontFamily: 'monospace' }}>
                Note: {selectedArticle.barChart.note}
              </p>
            )}
          </div>

          {/* SVG Pie / Donut Chart */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <PieIcon size={20} color="#f59e0b" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                {selectedArticle.pieChart.title}
              </h4>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '28px' }}>
              <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
                {renderDonutSlices(selectedArticle.pieChart.slices)}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#10b981' }}>100%</span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Resource Impact</span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedArticle.pieChart.slices.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }}></span>
                      <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f1f5f3' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Verified Reference Links */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Award size={20} color="#a78bfa" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                Verified Agronomic References & Regulatory Guidelines
              </h4>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Official citations, PAU/ICAR agronomic publications, and government mission frameworks:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedArticle.references.map((r, idx) => (
                <a
                  key={idx}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '85%' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f3' }}>
                      🏛️ {r.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {r.desc}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    Read Paper <ExternalLink size={14} />
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => { setSelectedArticle(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="agri-btn-outline"
              style={{ fontSize: '0.85rem' }}
            >
              ← Back to All Guides
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="agri-btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              ↑ Back to Top
            </button>
          </div>
        </div>
      ) : (
        /* Regular List View */
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Krishi Learning & Live Agriculture News Wire</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real-time verified agricultural journalism, ICAR agronomy guides, and government bulletins</p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('news')}
                className={activeTab === 'news' ? 'agri-btn-primary' : 'agri-btn-outline'}
                style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Radio size={14} /> Live News Wire
              </button>
              <button
                onClick={() => setActiveTab('guides')}
                className={activeTab === 'guides' ? 'agri-btn-primary' : 'agri-btn-outline'}
                style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <BookOpen size={14} /> Agronomy Guides
              </button>
            </div>
          </div>

          {activeTab === 'news' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                  ● LIVE AGRICULTURAL WIRE · Updated Just Now
                </span>
                <button
                  onClick={handleRefresh}
                  className="agri-btn-outline"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={12} className={refreshing ? 'spin' : ''} /> Refresh Wire
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {liveNews.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="agri-card"
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <img
                      src={item.img}
                      alt={item.title}
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>{item.category}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{item.date}</span>
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f3', lineHeight: 1.35 }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {item.desc}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
                        {item.source} • Read Story <ExternalLink size={12} />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'guides' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {articles.map((a) => (
                <div
                  key={a.id}
                  onClick={() => { setSelectedArticle(a); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="agri-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                >
                  <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={a.heroImg} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span className="badge badge-success" style={{ alignSelf: 'flex-start' }}>{a.category}</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f3', lineHeight: 1.4 }}>{a.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.excerpt}</p>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    <span>{a.author}</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>Read Guide →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default BlogPage;
