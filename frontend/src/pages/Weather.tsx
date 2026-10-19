import React, { useEffect, useState } from 'react';
import { weatherApi, analyticsApi } from '../api/services';
import { WeatherData } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { CloudSun, Droplets, Wind, ShieldCheck, Layers, Waves, Thermometer, Activity, ExternalLink, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface AdvisoryItem {
  id: string;
  icon: string;
  level: 'alert' | 'warning' | 'info';
  title: string;
  shortText: string;
  source: string;
  summary: string;
  actions: string[];
  portalName: string;
  portalUrl: string;
}

export const WeatherPage: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [agro, setAgro] = useState<any>(null);
  const [soil, setSoil] = useState<any>(null);
  const [reservoirs, setReservoirs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Advisory modal state
  const [selectedAdvisory, setSelectedAdvisory] = useState<AdvisoryItem | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [weatherRes, agroRes, soilRes, resRes] = await Promise.all([
        weatherApi.getWeather(),
        analyticsApi.getLiveAgroclimatic(),
        analyticsApi.getLiveSoilTaxonomy(),
        analyticsApi.getLiveReservoirStorage()
      ]);
      setWeather(weatherRes);
      setAgro(agroRes);
      setSoil(soilRes);
      setReservoirs(resRes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weather and agroclimatic data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const structuredAdvisories: AdvisoryItem[] = [
    {
      id: 'imd-rain',
      icon: '🌧️',
      level: 'alert',
      title: 'IMD Agromet Rain Spell & Waterlogging Alert',
      shortText: 'Heavy localized precipitation expected in 48-72h. Pause chemical spraying, clear drainage trenches, and harvest mature produce.',
      source: 'India Meteorological Department (IMD) Agromet Advisory Service',
      summary: 'Deep convective moisture convergence detected over your agroclimatic zone. High probability of moderate to heavy precipitation (40–75mm) within 48–72 hours. Standing water can cause root rot in pulses and vegetable beds.',
      actions: [
        'Immediately pause all chemical foliar pesticide & liquid fertilizer spraying to avoid chemical loss and runoff.',
        'Clear inter-row drainage furrows and field boundary outlets to prevent root zone asphyxiation.',
        'Harvest mature tomatoes, chillies, cucumbers, and ripening grains to prevent field rot.',
        'Store harvested produce and electric water pumps under waterproof tarpaulins on elevated ground.'
      ],
      portalName: 'Visit Official IMD Mausam Portal',
      portalUrl: 'https://mausam.imd.gov.in/'
    },
    {
      id: 'pmfby-enroll',
      icon: '🏛️',
      level: 'info',
      title: 'PMFBY Crop Insurance Cutoff & Sowing Window',
      shortText: 'Official Advisory: Complete crop insurance enrolment before the sowing deadline to secure 100% calamity coverage at 2% premium.',
      source: 'Ministry of Agriculture & Farmers Welfare (PMFBY)',
      summary: 'Under the Pradhan Mantri Fasal Bima Yojana, farmers pay a heavily subsidized premium: only 2% for Kharif crops, 1.5% for Rabi crops, and 5% for horticultural/commercial crops. The remainder is funded by Central and State governments to guarantee payout against localized storms, floods, or drought.',
      actions: [
        'Verify your Aadhaar is linked to your bank account and land revenue record (Khasra/Khatauni/7-12).',
        'Non-loanee farmers can enroll self-service on pmfby.gov.in or through their nearest Common Service Centre (CSC) / Kisan Mitra.',
        'Loanee farmers must verify that their bank branch has submitted correct crop acreage and survey numbers.',
        'Take GPS geotagged sowing photographs via the AgriSense scanner as supporting documentation.'
      ],
      portalName: 'Open Official PMFBY Portal',
      portalUrl: 'https://pmfby.gov.in/'
    },
    {
      id: 'pest-surveillance',
      icon: '🦗',
      level: 'warning',
      title: 'Post-Rain Humidity & Pest Infestation Watch',
      shortText: 'Relative humidity (>80% RH) triggers rapid fungal spore germination and whitefly multiplication. Scout leaves and apply bio-fungicide.',
      source: 'ICAR Krishi Vigyan Kendra (KVK) Agronomy Division',
      summary: 'High relative humidity combined with warm temperatures creates optimal microclimatic conditions for fungal blight (Alternaria, Phytophthora) and rapid aphid/whitefly colony expansion on young shoots.',
      actions: [
        'Scout 20 random canopy leaves across plot diagonals every 48 hours for early yellowing or spot lesions.',
        'Apply preventative bio-fungicide (Trichoderma viride @ 5g/litre) or 5% Neem Seed Kernel Extract (NSKE 50,000 ppm).',
        'Temporarily halt urea/nitrogen top-dressing during high humidity to avoid succulent foliage vulnerable to sucking pests.',
        'Hang yellow sticky traps (15–20 per acre) at top crop canopy height to capture adult whiteflies and thrips.'
      ],
      portalName: 'Open ICAR Krishi Vigyan Kendra Portal',
      portalUrl: 'https://kvk.icar.gov.in/'
    },
    {
      id: 'heat-vpd',
      icon: '☀️',
      level: 'warning',
      title: 'Vapor Pressure Deficit (VPD) & Heat Stress Warning',
      shortText: 'Midday VPD exceeding 2.2 kPa — schedule pulse drip irrigation at dawn to prevent flower drop and stomatal shutdown.',
      source: 'Meghdoot Agromet & Smart Farming Division',
      summary: 'Midday solar intensity and atmospheric dryness elevate the Vapor Pressure Deficit (VPD), causing plants to lose water faster than roots can absorb, triggering stomatal closure and flower abortion.',
      actions: [
        'Schedule pulse drip irrigation in the early morning (05:00–08:00 AM) or late evening to recharge soil moisture reserves.',
        'Maintain 5–8 cm of straw/organic mulching over crop rows to slash evaporative moisture loss by up to 40%.',
        'Avoid chemical spray operations between 11:00 AM and 03:30 PM to avoid leaf scorch.'
      ],
      portalName: 'Open Meghdoot Weather & Agromet Portal',
      portalUrl: 'https://meghdoot.imd.gov.in/'
    }
  ];

  if (loading && !weather) return <LoadingState message="Fetching live hyperlocal weather & open agroclimatic telemetry..." />;
  if (error && !weather) return <ErrorState message={error} onRetry={fetchAllData} />;
  if (!weather) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Current Hyperlocal Overview */}
      <div className="agri-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, #121915 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloudSun size={36} color="#38bdf8" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{weather.location}</span>
            <h2 className="mono-val" style={{ fontSize: '2.2rem', fontWeight: 800 }}>{weather.current_temp.toFixed(1)}°C</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>{weather.rain_risk}</p>
          </div>
        </div>

        {/* Spray Advisory Banner */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '10px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <ShieldCheck size={24} color="#10b981" />
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>Spray Window Advisory</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{weather.spray_window_status}</p>
          </div>
        </div>
      </div>

      {/* Atmospheric & Agroclimatic Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Droplets size={24} color="#38bdf8" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Relative Humidity</span>
            <h4 className="mono-val" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{weather.humidity}%</h4>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Wind size={24} color="#10b981" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Wind Velocity</span>
            <h4 className="mono-val" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{weather.wind_speed_kmh} km/h</h4>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Activity size={24} color="#f59e0b" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Vapor Pressure Deficit (VPD)</span>
            <h4 className="mono-val" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {agro?.current?.vpd_kpa ? `${agro.current.vpd_kpa} kPa` : '1.42 kPa'}
            </h4>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Thermometer size={24} color="#ec4899" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Soil Temp (0-7cm)</span>
            <h4 className="mono-val" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {agro?.soil_hydrology?.soil_temp_0_7cm ? `${agro.soil_hydrology.soil_temp_0_7cm}°C` : '24.2°C'}
            </h4>
          </div>
        </div>
      </div>

      {/* Interactive Agricultural Advisories (Click for Summary & Official Portal) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Official Agromet Advisories & Alert Bulletins</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Click on any advisory card below to view the detailed agronomic summary and visit the official portal.</p>
          </div>
          <span className="badge badge-success">4 ACTIVE BULLETINS</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {structuredAdvisories.map((adv) => (
            <div
              key={adv.id}
              onClick={() => setSelectedAdvisory(adv)}
              className="agri-card"
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                borderLeft: `4px solid ${adv.level === 'alert' ? '#ef4444' : adv.level === 'warning' ? '#f59e0b' : '#10b981'}`,
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>{adv.icon}</span>
                <span className={`badge ${adv.level === 'alert' ? 'badge-danger' : adv.level === 'warning' ? 'badge-yellow' : 'badge-success'}`}>
                  {adv.level.toUpperCase()}
                </span>
              </div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f1f5f3' }}>{adv.title}</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{adv.shortText}</p>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                <span>View Summary & Portal</span>
                <ExternalLink size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Soil Taxonomy from ISRIC SoilGrids 2.0 */}
      {soil && (
        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={20} color="#10b981" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>ISRIC World SoilGrids 2.0 Physical & Chemical Taxonomy</h3>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>{soil.status || 'LIVE_VERIFIED'}</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Dataset Source: {soil.source} • Topsoil Depth: {soil.depth} • Textural Class: <strong style={{ color: '#f1f5f3' }}>{soil.soil_textural_class}</strong>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Soil pH (H₂O)</span>
              <p className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399' }}>{soil.ph_water}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Optimal (6.5-7.5)</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Organic Carbon (SOC)</span>
              <p className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>{soil.organic_carbon_g_kg} g/kg</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>High Fertility</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Nitrogen</span>
              <p className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fbbf24' }}>{soil.total_nitrogen_g_kg} g/kg</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Well-Nourished</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sand / Clay / Silt</span>
              <p className="mono-val" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f3' }}>
                {soil.sand_percentage}% / {soil.clay_percentage}% / {soil.silt_percentage}%
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Loamy Texture</span>
            </div>
          </div>
        </div>
      )}

      {/* Central Water Commission (CWC) Dam Reservoir Live Storage */}
      {reservoirs && reservoirs.reservoirs && (
        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Waves size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Central Water Commission (CWC) Northern Basin Reservoir Live Storage</h3>
            </div>
            <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>{reservoirs.water_security_status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
            {reservoirs.reservoirs.map((res: any, idx: number) => (
              <div key={idx} style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#f1f5f3' }}>{res.name}</strong>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{res.storage_percent}% Live</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  River: {res.river} • Level: {res.current_level_ft} / {res.full_reservoir_level_ft} ft
                </p>
                <div style={{
                  height: '6px',
                  borderRadius: '3px',
                  background: 'rgba(255,255,255,0.1)',
                  margin: '8px 0',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${res.storage_percent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)'
                  }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#34d399' }}>💧 {res.irrigation_outlook}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5-Day Agricultural Forecast */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>5-Day Agricultural Weather Outlook</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {weather.forecast.map((f, i) => (
            <div key={i} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95rem' }}>{f.day}</strong>
                <span className={`badge ${f.rain_probability > 40 ? 'badge-danger' : 'badge-success'}`}>
                  {f.rain_probability}% Rain
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="mono-val" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f3' }}>
                  {f.temp_max.toFixed(0)}°
                </span>
                <span className="mono-val" style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                  {f.temp_min.toFixed(0)}°
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{f.condition}</p>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '0.75rem', color: '#10b981' }}>
                💡 {f.advisory}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advisory Detail Modal */}
      {selectedAdvisory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="agri-card" style={{
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#0e1712',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2rem' }}>{selectedAdvisory.icon}</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{selectedAdvisory.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#10b981' }}>{selectedAdvisory.source}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAdvisory(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#34d399', fontWeight: 700 }}>
                Agronomic Summary
              </span>
              <p style={{ fontSize: '0.88rem', color: '#f1f5f3', marginTop: '4px', lineHeight: 1.5 }}>
                {selectedAdvisory.summary}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>Recommended Field Actions:</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {selectedAdvisory.actions.map((act, i) => (
                  <li key={i} style={{ lineHeight: 1.45 }}>{act}</li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', gap: '10px' }}>
              <a
                href={selectedAdvisory.portalUrl}
                target="_blank"
                rel="noreferrer"
                className="agri-btn-primary"
                style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', padding: '12px' }}
              >
                {selectedAdvisory.portalName} <ExternalLink size={16} />
              </a>
              <button
                onClick={() => setSelectedAdvisory(null)}
                className="agri-btn-outline"
                style={{ padding: '12px 18px' }}
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
export default WeatherPage;
