import React, { useEffect, useState } from 'react';
import { controlApi } from '../api/services';
import { ControlStatus } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { Power, Sliders, CheckCircle2, ShieldCheck, Gauge, AlertCircle } from 'lucide-react';

export const ControlsPage: React.FC = () => {
  const [status, setStatus] = useState<ControlStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await controlApi.getStatus();
      setStatus(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load control status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTogglePump = async () => {
    try {
      setUpdating(true);
      const updated = await controlApi.togglePump();
      setStatus(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle pump');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleValve = async (valveKey: 'valve_a' | 'valve_b' | 'valve_c' | 'valve_d') => {
    if (!status) return;
    try {
      setUpdating(true);
      const updated = await controlApi.updateControls({ [valveKey]: !status[valveKey] });
      setStatus(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update valve');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAuto = async () => {
    if (!status) return;
    try {
      setUpdating(true);
      const updated = await controlApi.updateControls({ auto_mode: !status.auto_mode });
      setStatus(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update mode');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !status) return <LoadingState message="Connecting to IoT Gateway..." />;
  if (error && !status) return <ErrorState message={error} onRetry={fetchStatus} />;
  if (!status) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Master Pump Switch Card */}
      <div className="agri-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        background: status.pump_state ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, #121915 100%)' : 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: status.pump_state ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Power size={28} color={status.pump_state ? '#10b981' : '#64746d'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Main Irrigation Pump</h3>
              <span className={`badge ${status.pump_state ? 'badge-success' : 'badge-warning'}`}>
                {status.pump_state ? 'RUNNING (18.5 LPM)' : 'STANDBY'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Solar Submersible 5 HP • Connected to samrala-esp32-node1
            </p>
          </div>
        </div>

        <button
          onClick={handleTogglePump}
          disabled={updating}
          style={{
            padding: '12px 28px',
            borderRadius: '10px',
            border: 'none',
            background: status.pump_state ? '#f43f5e' : '#10b981',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            opacity: updating ? 0.6 : 1
          }}
        >
          <Power size={18} />
          {status.pump_state ? 'STOP PUMP' : 'START PUMP'}
        </button>
      </div>

      {/* Mode & Telemetry Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="agri-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Automation Engine</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {status.auto_mode ? 'Trigger pump automatically when moisture < 35%' : 'Manual override active'}
            </p>
          </div>
          <button
            onClick={handleToggleAuto}
            className={status.auto_mode ? 'agri-btn-primary' : 'agri-btn-outline'}
            style={{ fontSize: '0.82rem' }}
          >
            {status.auto_mode ? 'Auto Enabled' : 'Manual'}
          </button>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Gauge size={32} color="#38bdf8" />
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Measured Flow Rate</p>
            <h3 className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {status.flow_rate_lpm.toFixed(1)} Liters/Min
            </h3>
          </div>
        </div>

        <div className="agri-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ShieldCheck size={32} color="#10b981" />
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Safety Cutoff</p>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#34d399' }}>Dry-run Protected</h3>
          </div>
        </div>
      </div>

      {/* Zone Solenoid Valves Grid */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Zone Solenoid Valves</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {[
            { key: 'valve_a' as const, label: 'Zone A — Tomato Greenhouse', open: status.valve_a },
            { key: 'valve_b' as const, label: 'Zone B — Wheat Field', open: status.valve_b },
            { key: 'valve_c' as const, label: 'Zone C — Mustard Ridge', open: status.valve_c },
            { key: 'valve_d' as const, label: 'Zone D — Nursery Beds', open: status.valve_d },
          ].map((valve) => (
            <div key={valve.key} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${valve.open ? 'badge-success' : 'badge-warning'}`}>
                  {valve.open ? 'OPEN' : 'CLOSED'}
                </span>
                <span className="mono-val" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>12V DC Relay</span>
              </div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>{valve.label}</h4>
              <button
                onClick={() => handleToggleValve(valve.key)}
                disabled={updating}
                className={valve.open ? 'agri-btn-outline' : 'agri-btn-primary'}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', marginTop: '6px' }}
              >
                {valve.open ? 'Close Valve' : 'Open Valve'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
