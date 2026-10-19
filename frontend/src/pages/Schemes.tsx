import React, { useEffect, useState } from 'react';
import { schemesApi } from '../api/services';
import { GovtScheme } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { Landmark, ExternalLink, CheckCircle, FileText } from 'lucide-react';

export const SchemesPage: React.FC = () => {
  const [schemes, setSchemes] = useState<GovtScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await schemesApi.getSchemes();
      setSchemes(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load govt schemes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  if (loading && !schemes.length) return <LoadingState message="Fetching official government agriculture schemes..." />;
  if (error && !schemes.length) return <ErrorState message={error} onRetry={fetchSchemes} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Government Schemes & Financial Subsidies</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified portals for direct cash transfers, solar pumps, and drip subsidies</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {schemes.map((s) => (
          <div key={s.id} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '6px' }}>{s.short_code}</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{s.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{s.category}</p>
              </div>
            </div>

            <div style={{ background: '#17221b', padding: '12px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Financial Benefit</span>
              <p style={{ fontSize: '0.9rem', color: '#f1f5f3', fontWeight: 500 }}>{s.benefit}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Eligibility: </strong>
                {s.eligibility}
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Required Documents: </strong>
                {s.documents}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: 'auto' }}>
              <a
                href={s.apply_url}
                target="_blank"
                rel="noreferrer"
                className="agri-btn-primary"
                style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', fontSize: '0.82rem' }}
              >
                Apply on Official Portal <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
