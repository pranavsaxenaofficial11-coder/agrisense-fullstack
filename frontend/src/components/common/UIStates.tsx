import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading sensor data...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', gap: '12px' }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid rgba(16, 185, 129, 0.2)',
      borderTopColor: '#10b981',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{message}</p>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div style={{
    background: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    borderRadius: '10px',
    padding: '24px',
    textAlign: 'center',
    margin: '16px 0'
  }}>
    <AlertCircle size={28} color="#fb7185" style={{ margin: '0 auto 8px auto' }} />
    <p style={{ color: '#fb7185', fontWeight: 500, marginBottom: '12px' }}>{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="agri-btn-outline" style={{ borderColor: 'rgba(244,63,94,0.4)', color: '#fb7185', margin: '0 auto' }}>
        <RefreshCw size={14} /> Retry
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
    <Inbox size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px auto' }} />
    <h4 style={{ color: 'var(--text-main)', marginBottom: '4px' }}>{title}</h4>
    {subtitle && <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>{subtitle}</p>}
    {action}
  </div>
);

export const Sparkline: React.FC<{ data: number[]; height?: number; color?: string }> = ({ data, height = 36, color = '#10b981' }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const step = width / (data.length - 1);

  const points = data
    .map((val, idx) => {
      const x = idx * step;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
