import React, { useEffect, useState } from 'react';
import { logsApi } from '../api/services';
import { ActivityLog } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { ClipboardList, Shield, RefreshCw } from 'lucide-react';

export const LogPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await logsApi.getLogs();
      setLogs(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>IoT Hardware & Automation Activity Logs</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chronological record of pump cycles, threshold alerts, and edge gateway telemetry</p>
        </div>
        <button onClick={fetchLogs} className="agri-btn-outline">
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {loading && !logs.length && <LoadingState message="Fetching system telemetry logs..." />}
      {error && !logs.length && <ErrorState message={error} onRetry={fetchLogs} />}

      <div className="agri-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#0a0f0d', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
              <th style={{ padding: '12px 16px' }}>Timestamp</th>
              <th style={{ padding: '12px 16px' }}>Level</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>Event Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td className="mono-val" style={{ padding: '12px 16px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${
                    log.level === 'SUCCESS' ? 'badge-success' : log.level === 'WARN' ? 'badge-warning' : log.level === 'ERROR' ? 'badge-danger' : 'badge-blue'
                  }`}>
                    {log.level}
                  </span>
                </td>
                <td className="mono-val" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {log.category}
                </td>
                <td style={{ padding: '12px 16px', color: '#f1f5f3' }}>
                  {log.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
