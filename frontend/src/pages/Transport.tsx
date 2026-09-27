import React, { useEffect, useState } from 'react';
import { transportApi } from '../api/services';
import { TransportListing } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { Truck, Plus, MapPin, Phone } from 'lucide-react';

export const TransportPage: React.FC = () => {
  const [listings, setListings] = useState<TransportListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    owner_name: 'Pranav Saxena',
    vehicle_type: 'Mahindra 575 DI + Trolley',
    capacity: '6 Ton',
    rate: '₹600/hour',
    location: 'Samrala, Punjab',
    phone: '+91 98765 43210',
    notes: 'Available for evening harvesting transit.'
  });

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await transportApi.getListings();
      setListings(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load transport listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transportApi.createListing({
        ...form,
        is_available: true
      });
      setShowModal(false);
      fetchListings();
    } catch (err: any) {
      alert(err.message || 'Failed to list vehicle');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Farm Machinery & Transport Pooling</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Share tractors, combine harvesters, and mandi transport to cut logistics costs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="agri-btn-primary">
          <Plus size={16} /> List Vehicle / Equipment
        </button>
      </div>

      {loading && !listings.length && <LoadingState message="Loading available farm vehicles..." />}
      {error && !listings.length && <ErrorState message={error} onRetry={fetchListings} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {listings.map((item) => (
          <div key={item.id} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '6px' }}>Available</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{item.vehicle_type}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Owner: {item.owner_name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="mono-val" style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>{item.rate}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Capacity: {item.capacity}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.notes || 'Equipped for heavy agricultural hauling.'}</p>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                <MapPin size={12} color="#10b981" /> {item.location}
              </span>
              <a href={`tel:${item.phone}`} className="agri-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}>
                <Phone size={12} /> Call Owner
              </a>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="agri-card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>List Equipment / Vehicle</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Vehicle / Equipment Type (e.g. Combine Harvester 70HP)"
                required
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Capacity (e.g. 5 Ton, 50 HP)"
                  required
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                />
                <input
                  type="text"
                  placeholder="Rate (e.g. ₹650/hour, ₹30/km)"
                  required
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                />
              </div>
              <input
                type="text"
                placeholder="Service Area / Location"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <textarea
                placeholder="Details, attachments, operator included..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="agri-btn-outline">Cancel</button>
                <button type="submit" className="agri-btn-primary">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
