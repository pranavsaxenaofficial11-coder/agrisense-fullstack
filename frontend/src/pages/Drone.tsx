import React from 'react';
import { Plane, Compass, BatteryCharging, Radio, Eye } from 'lucide-react';

export const DronePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Field Remote Sensing & Satellite NDVI</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Multi-spectral vegetation index (NDVI) & autonomous drone survey</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-success">Sentinel-2 Sync: Live</span>
          <span className="badge badge-blue">Drone: Ready for Launch</span>
        </div>
      </div>

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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Field Coverage</span>
            <h4 className="mono-val" style={{ fontSize: '1.05rem', fontWeight: 700 }}>14.5 / 14.5 Acres</h4>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Radio size={24} color="#fbbf24" />
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mean NDVI Score</span>
            <h4 className="mono-val" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981' }}>0.78 (Healthy)</h4>
          </div>
        </div>
      </div>

      {/* Satellite Imagery Simulation / Zone Visualizer */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Multispectral NDVI Field Map (Samrala Farm)</h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>High-Res Satellite View</span>
        </div>

        <div style={{
          position: 'relative',
          height: '340px',
          borderRadius: '12px',
          background: 'radial-gradient(circle at center, #1b3524 0%, #0d1e14 70%, #08120c 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {/* Farm Field Zones Overlay */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '80%', height: '80%' }}>
            <div style={{ border: '2px dashed rgba(16,185,129,0.6)', borderRadius: '8px', padding: '12px', background: 'rgba(16,185,129,0.1)' }}>
              <span className="badge badge-success">Zone A: NDVI 0.84</span>
              <p style={{ fontSize: '0.8rem', color: '#f1f5f3', marginTop: '6px' }}>Dense Tomato Foliage</p>
            </div>
            <div style={{ border: '2px dashed rgba(16,185,129,0.6)', borderRadius: '8px', padding: '12px', background: 'rgba(16,185,129,0.08)' }}>
              <span className="badge badge-success">Zone B: NDVI 0.79</span>
              <p style={{ fontSize: '0.8rem', color: '#f1f5f3', marginTop: '6px' }}>Wheat Seedlings</p>
            </div>
            <div style={{ border: '2px dashed rgba(245,158,11,0.6)', borderRadius: '8px', padding: '12px', background: 'rgba(245,158,11,0.08)' }}>
              <span className="badge badge-warning">Zone C: NDVI 0.62</span>
              <p style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '6px' }}>Water Stress Detected</p>
            </div>
            <div style={{ border: '2px dashed rgba(16,185,129,0.6)', borderRadius: '8px', padding: '12px', background: 'rgba(16,185,129,0.12)' }}>
              <span className="badge badge-success">Zone D: NDVI 0.81</span>
              <p style={{ fontSize: '0.8rem', color: '#f1f5f3', marginTop: '6px' }}>Nursery Beds</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }} /> Healthy Biomass (&gt;0.7)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '3px' }} /> Moderate Moisture (0.5 - 0.7)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: '#f43f5e', borderRadius: '3px' }} /> Stressed Foliage (&lt;0.5)
            </span>
          </div>

          <button className="agri-btn-primary" onClick={() => alert('Survey waypoint dispatched to Scout X4')}>
            <Plane size={16} /> Launch Drone Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
