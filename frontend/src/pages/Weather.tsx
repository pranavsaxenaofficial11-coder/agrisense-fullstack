import React, { useEffect, useState } from 'react';
import { weatherApi } from '../api/services';
import { WeatherData } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { CloudSun, Droplets, Wind, Sun, AlertTriangle, ShieldCheck } from 'lucide-react';

export const WeatherPage: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await weatherApi.getWeather();
      setWeather(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  if (loading && !weather) return <LoadingState message="Fetching hyperlocal weather forecast..." />;
  if (error && !weather) return <ErrorState message={error} onRetry={fetchWeather} />;
  if (!weather) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Current Hyperlocal Overview */}
      <div className="agri-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.1) 0%, #121915 100%)'
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

      {/* Atmospheric Metrics */}
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
          <Sun size={24} color="#f59e0b" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>UV Index</span>
            <h4 className="mono-val" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{weather.uv_index} (Moderate)</h4>
          </div>
        </div>
      </div>

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
