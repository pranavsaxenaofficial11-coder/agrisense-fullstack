import React, { useEffect, useState } from 'react';
import { sensorApi } from '../api/services';
import { ZoneInfo, FieldOverviewData } from '../types';
import { LoadingState } from '../components/common/UIStates';
import { Plane, Compass, BatteryCharging, Radio, Activity } from 'lucide-react';

export const DronePage: React.FC = () => {
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [overview, setOverview] = useState<FieldOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [z, o] = await Promise.all([
          sensorApi.getZones(),
          sensorApi.getOverview()
        ]);
        setZones(z);
        setOverview(o);
      } catch (err) {
        console.error('Failed to load drone telemetry:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLaunchDrone = () => {
    setLaunching(true);
    setStatusMsg('Dispatching autonomous flight waypoints across active farm sectors...');
    setTimeout(() => {
      setLaunching(false);
      setStatusMsg('Scout X4 UAV is in flight. Real-time multispectral scan in progress.');
    }, 2000);
  };

  if (loading) return <LoadingState message="Connecting to remote sensing & UAV telemetry stream..." />;

  const avgMoisture = zones.length > 0 
    ? Math.round(zones.reduce((a, b) => a + (b.current_moisture || 0), 0) / zones.length) 
    : 58;
  const totalZones = zones.length || 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Field Remote Sensing & Satellite NDVI</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Multi-spectral vegetation index & autonomous drone survey</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-success">Sentinel-2 Sync: Live</span>
          <span className="badge badge-blue">Drone: {launching ? 'In-Flight' : 'Ready for Launch'}</span>
        </div>
      </div>

      {statusMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '0.85rem',
          color: '#34d399',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Activity size={16} /> {statusMsg}
        </div>
      )}

      {/* Flight Telemetry Status Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Plane size={24} color="#10b981" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Survey UAV</span>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>AgriSense Scout X4</h4>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <BatteryCharging size={24} color="#34d399" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Battery Status</span>
            <h4 className="mono-val" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>94% (32 Min)</h4>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Compass size={24} color="#38bdf8" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Active Sectors</span>
            <h4 className="mono-val" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{totalZones} Live Zones</h4>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Radio size={24} color="#fbbf24" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Avg Soil Moisture</span>
            <h4 className="mono-val" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981' }}>{avgMoisture}%</h4>
          </div>
        </div>
      </div>

      {/* Satellite Imagery & Zone Visualizer */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Multispectral NDVI Field Map (Samrala Farm)</h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dynamic Live Zone Grid</span>
        </div>

        <div style={{
          position: 'relative',
          minHeight: '280px',
          borderRadius: '12px',
          background: 'radial-gradient(circle at center, #1b3524 0%, #0d1e14 70%, #08120c 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          {/* Farm Field Zones Overlay */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', width: '100%' }}>
            {zones.map((zone) => {
              const moisture = zone.current_moisture || 50;
              const isHealthy = moisture >= 40 && moisture <= 75;
              const ndviScore = (0.70 + (moisture / 400)).toFixed(2);

              return (
                <div
                  key={zone.id}
                  style={{
                    border: `2px dashed ${isHealthy ? 'rgba(16,185,129,0.6)' : 'rgba(245,158,11,0.6)'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    background: isHealthy ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#f1f5f3' }}>{zone.name}</strong>
                    <span className={`badge ${isHealthy ? 'badge-success' : 'badge-warning'}`}>
                      NDVI {ndviScore}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Crop: <strong style={{ color: '#fff' }}>{zone.crop}</strong>
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    <span>Moisture: {moisture}%</span>
                    <span>Status: {zone.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }} /> Healthy Biomass (&gt;0.7)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '3px' }} /> Low Moisture (&lt;40%)
            </span>
          </div>

          <button
            className="agri-btn-primary"
            onClick={handleLaunchDrone}
            disabled={launching}
            style={{ opacity: launching ? 0.7 : 1 }}
          >
            <Plane size={16} /> {launching ? 'Dispatching...' : 'Launch Drone Inspection'}
          </button>
        </div>
      </div>
    </div>
  );
};
