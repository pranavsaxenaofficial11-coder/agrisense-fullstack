import React, { useEffect, useState } from 'react';
import { sensorApi, controlApi } from '../api/services';
import { FieldOverviewData } from '../types';
import { LoadingState, ErrorState, Sparkline } from '../components/common/UIStates';
import { Droplet, Sun, Wind, Thermometer, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

export const HomePage: React.FC<{ onNavigate: (screen: any) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<FieldOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await sensorApi.getOverview();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch field overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) return <LoadingState message="Loading field telemetry..." />;
  if (error && !data) return <ErrorState message={error} onRetry={fetchData} />;
  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Alert if any zone is low */}
      {(() => {
        const lowZone = data.zones.find(z => z.current_moisture < z.moisture_min);
        return lowZone ? (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle color="#fbbf24" size={24} />
              <div>
                <p style={{ fontWeight: 600, color: '#fbbf24' }}>Irrigation Attention Required</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Zone {lowZone.zone_code} ({lowZone.crop}) is at {lowZone.current_moisture.toFixed(1)}% moisture, below the minimum {lowZone.moisture_min}% threshold.
                </p>
              </div>
            </div>
            <button onClick={() => onNavigate('controls')} className="agri-btn-primary" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
              Open Controls <ArrowRight size={14} />
            </button>
          </div>
        ) : null;
      })()}

      {/* Environmental Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Thermometer color="#38bdf8" size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ambient Temp</p>
            <h3 className="mono-val" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{data.ambient_temp.toFixed(1)}°C</h3>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wind color="#10b981" size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Air Humidity</p>
            <h3 className="mono-val" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{data.humidity.toFixed(0)}%</h3>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sun color="#f59e0b" size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sunlight (Lux)</p>
            <h3 className="mono-val" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{(data.sunlight_lux / 1000).toFixed(1)}k lx</h3>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Droplet color="#c084fc" size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Water Tank Reserve</p>
            <h3 className="mono-val" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{data.water_tank_level.toFixed(0)}%</h3>
          </div>
        </div>
      </div>

      {/* Zone Moisture Gauges */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Field Zone Soil Moisture</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-sync every 15s</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {data.zones.map((zone) => {
            const isOptimal = zone.current_moisture >= zone.moisture_min && zone.current_moisture <= zone.moisture_max;
            const isDry = zone.current_moisture < zone.moisture_min;

            return (
              <div key={zone.id} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: '6px' }}>Zone {zone.zone_code}</span>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{zone.name}</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{zone.crop}</p>
                  </div>
                  <span className={`badge ${isOptimal ? 'badge-success' : isDry ? 'badge-danger' : 'badge-warning'}`}>
                    {zone.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Moisture Level</span>
                    <span className="mono-val" style={{ fontWeight: 700, color: isOptimal ? '#34d399' : '#fb7185' }}>
                      {zone.current_moisture.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, zone.current_moisture)}%`,
                      height: '100%',
                      background: isOptimal ? 'linear-gradient(90deg, #059669, #10b981)' : '#f43f5e',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    <span>Min: {zone.moisture_min}%</span>
                    <span>Max: {zone.moisture_max}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sparkline & Historical Trend card */}
      <div className="agri-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Zone A 24-Hour Moisture Trend</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Diurnal cycle stabilized with solar automated drip</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Sparkline data={data.sparkline_moisture} height={42} color="#10b981" />
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Avg Moisture</span>
            <span className="mono-val" style={{ fontWeight: 700, color: '#10b981' }}>
              {(data.sparkline_moisture && data.sparkline_moisture.length > 0 
                ? (data.sparkline_moisture.reduce((a, b) => a + b, 0) / data.sparkline_moisture.length).toFixed(1)
                : data.zones[0]?.current_moisture?.toFixed(1) || '38.0')}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
