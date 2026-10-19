import React, { useEffect, useState } from 'react';
import { aiApi } from '../api/services';
import { FarmReport } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { FileText, Sparkles, CheckCircle, Droplet, ArrowUpRight } from 'lucide-react';

export const ReportPage: React.FC = () => {
  const [report, setReport] = useState<FarmReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await aiApi.getReport('Tomato');
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate weekly farm report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) return <LoadingState message="AgriSense AI is synthesizing weekly sensor logs & telemetry..." />;
  if (error) return <ErrorState message={error} onRetry={fetchReport} />;
  if (!report) return null;

  const today = new Date();
  const pastWeek = new Date();
  pastWeek.setDate(today.getDate() - 7);
  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Weekly Farm Agronomy Intelligence</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Period: {formatDate(pastWeek)} – {formatDate(today)} • Samrala Farm (Ludhiana)
          </p>
        </div>
        <button onClick={fetchReport} className="agri-btn-primary">
          <Sparkles size={16} /> Regenerate Report
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Water Saved</span>
          <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            {report.estimated_water_saved_liters.toLocaleString('en-IN')} Liters
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>vs. Traditional Flood Irrigation</span>
        </div>

        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Irrigation Efficiency</span>
          <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
            {report.irrigation_efficiency}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Automated Sensor-Trigger Precision</span>
        </div>

        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Moisture Range</span>
          <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>
            {report.moisture_range}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Target: 40% - 65%</span>
        </div>
      </div>

      {/* Executive Overview */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Overall Agronomy Status</h4>
        <p style={{ fontSize: '0.92rem', color: '#f1f5f3', lineHeight: 1.6 }}>{report.overall_status}</p>

        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '10px' }}>Soil & Water Balance</h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{report.soil_and_water}</p>
      </div>

      {/* Actionable To-Do Checklist */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#34d399' }}>AI Recommended Actions For This Week</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {report.weekly_todo.map((todo, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{todo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
