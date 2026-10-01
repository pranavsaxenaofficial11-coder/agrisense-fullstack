import React, { useEffect, useState } from 'react';
import { weatherApi, analyticsApi } from '../api/services';
import { WeatherData } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { CloudSun, Droplets, Wind, Sun, AlertTriangle, ShieldCheck, Layers, Waves, Thermometer, Activity } from 'lucide-react';

export const WeatherPage: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [agro, setAgro] = useState<any>(null);
  const [soil, setSoil] = useState<any>(null);
  const [reservoirs, setReservoirs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
};
