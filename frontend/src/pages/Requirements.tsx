import React, { useEffect, useState } from 'react';
import { marketApi } from '../api/services';
import { BuyerRequirement } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/common/UIStates';
import { Plus, Building, Phone, MapPin, AlertCircle } from 'lucide-react';

export const RequirementsPage: React.FC = () => {
  const [reqs, setReqs] = useState<BuyerRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    buyer_name: '',
    company: '',
    crop_name: '',
    quantity_needed: 100,
    unit: 'Quintal',
    max_budget_per_unit: 2500,
    delivery_location: '',
    contact_phone: '',
    urgency: 'Immediate',
    notes: ''
  });

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await marketApi.getRequirements();
      setReqs(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch buyer requirements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await marketApi.createRequirement(form);
      setShowModal(false);
      fetchRequirements();
    } catch (err: any) {
      alert(err.message || 'Failed to submit buyer demand');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Institutional Buyer Demands</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contract farming & bulk wholesale purchase orders</p>
        </div>
        <button onClick={() => setShowModal(true)} className="agri-btn-primary">
          <Plus size={16} /> Post Buyer Demand
        </button>
      </div>

      {loading && !reqs.length && <LoadingState message="Loading procurement orders..." />}
      {error && !reqs.length && <ErrorState message={error} onRetry={fetchRequirements} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {reqs.map((req) => (
          <div key={req.id} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-warning" style={{ marginBottom: '6px' }}>{req.urgency}</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{req.crop_name}</h4>
                {req.company && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={14} color="#10b981" /> {req.company}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Max Budget</span>
                <h3 className="mono-val" style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 700 }}>
                  ₹{req.max_budget_per_unit.toLocaleString('en-IN')}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.notes || 'Standard procurement specifications apply.'}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              <span>Target Quantity: <strong style={{ color: 'var(--text-main)' }}>{req.quantity_needed} {req.unit}</strong></span>
              <span>Buyer: <strong style={{ color: 'var(--text-main)' }}>{req.buyer_name}</strong></span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <MapPin size={14} color="#10b981" /> {req.delivery_location}
              </div>
              <a
                href={`tel:${req.contact_phone}`}
                className="agri-btn-outline"
                style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
              >
                <Phone size={12} /> Contact Buyer
              </a>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div className="agri-card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Post Bulk Procurement Demand</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Buyer / Company Name"
                required
                value={form.buyer_name}
                onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <input
                type="text"
                placeholder="Crop Needed (e.g. Basmati Rice, Tomato)"
                required
                value={form.crop_name}
                onChange={(e) => setForm({ ...form, crop_name: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="number"
                  placeholder="Quantity (Quintals)"
                  required
                  value={form.quantity_needed}
                  onChange={(e) => setForm({ ...form, quantity_needed: parseFloat(e.target.value) || 0 })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                />
                <input
                  type="number"
                  placeholder="Max Budget (₹/Quintal)"
                  required
                  value={form.max_budget_per_unit}
                  onChange={(e) => setForm({ ...form, max_budget_per_unit: parseFloat(e.target.value) || 0 })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                />
              </div>
              <input
                type="text"
                placeholder="Delivery Destination (e.g. Ludhiana Processing Unit)"
                required
                value={form.delivery_location}
                onChange={(e) => setForm({ ...form, delivery_location: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <textarea
                placeholder="Quality specifications, moisture tolerance, packaging..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="agri-btn-outline">Cancel</button>
                <button type="submit" className="agri-btn-primary">Submit Demand</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
