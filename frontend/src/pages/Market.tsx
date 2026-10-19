import React, { useEffect, useState } from 'react';
import { marketApi } from '../api/services';
import { MarketListing } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/common/UIStates';
import { Plus, Tag, MapPin, Phone, ShieldCheck } from 'lucide-react';

export const MarketPage: React.FC = () => {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [mandiData, setMandiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    category: 'Vegetables',
    crop_name: '',
    quantity: 10,
    unit: 'Quintal',
    price_per_unit: 2000,
    location: 'Samrala, Punjab',
    seller_name: '',
    seller_phone: '',
    description: ''
  });

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, mandi] = await Promise.all([
        marketApi.getListings(category === 'All' ? undefined : category),
        marketApi.getLiveMandiRates().catch(() => null)
      ]);
      setListings(res);
      if (mandi) setMandiData(mandi);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await marketApi.createListing({
        ...form,
        mandi_benchmark: form.price_per_unit,
        quality_grade: 'Grade A',
        is_available: true
      });
      setShowModal(false);
      fetchListings();
    } catch (err: any) {
      alert(err.message || 'Failed to create listing');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live APMC Mandi Wholesale Ticker */}
      {mandiData && mandiData.live_mandi_rates && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-success">● LIVE APMC RATES</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Agmarknet Feed · Khanna & Ludhiana Mandis</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Govt CACP Mandated Minimum Support Price</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {mandiData.live_mandi_rates.slice(0, 4).map((m: any, idx: number) => (
              <div key={idx} style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.6)',
                borderRadius: '8px',
                padding: '8px 12px'
              }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.commodity}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#38bdf8' }}>₹{m.modal_price_qtl}</strong>
                  <span style={{ fontSize: '0.7rem', color: m.trend.startsWith('+') ? '#4ade80' : '#fb7185' }}>{m.trend}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{m.mandi}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['All', 'Vegetables', 'Grains', 'Oilseeds'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={category === cat ? 'agri-btn-primary' : 'agri-btn-outline'}
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            >
              {cat}
            </button>
          ))}
        </div>

        <button onClick={() => setShowModal(true)} className="agri-btn-primary">
          <Plus size={16} /> List Crop Produce
        </button>
      </div>

      {loading && !listings.length && <LoadingState message="Loading mandi market listings..." />}
      {error && !listings.length && <ErrorState message={error} onRetry={fetchListings} />}

      {!loading && !listings.length && (
        <EmptyState
          title="No produce listings found in this category"
          subtitle="Be the first farmer to list your harvest directly to verified buyers."
          action={<button onClick={() => setShowModal(true)} className="agri-btn-primary"><Plus size={16} /> Create Listing</button>}
        />
      )}

      {/* Grid of Listings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {listings.map((item) => (
          <div key={item.id} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '6px' }}>{item.category}</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{item.title}</h4>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 className="mono-val" style={{ color: '#10b981', fontSize: '1.25rem', fontWeight: 700 }}>
                  ₹{item.price_per_unit.toLocaleString('en-IN')}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>per {item.unit}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {item.description || `High-quality ${item.crop_name} direct from farm.`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              <span>Quantity: <strong style={{ color: 'var(--text-main)' }}>{item.quantity} {item.unit}</strong></span>
              <span>Grade: <strong style={{ color: '#34d399' }}>{item.quality_grade}</strong></span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <MapPin size={14} color="#10b981" /> {item.location}
              </div>
              <a
                href={`tel:${item.seller_phone}`}
                className="agri-btn-outline"
                style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
              >
                <Phone size={12} /> Contact Seller
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Creating Listing */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="agri-card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>List Produce for Sale</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Listing Title (e.g. Organic Hybrid Tomatoes)"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="Vegetables">Vegetables</option>
                  <option value="Grains">Grains</option>
                  <option value="Oilseeds">Oilseeds</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Pulses">Pulses</option>
                </select>
                <input
                  type="text"
                  placeholder="Crop Name (e.g. Tomato)"
                  required
                  value={form.crop_name}
                  onChange={(e) => setForm({ ...form, crop_name: e.target.value })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="number"
                  placeholder="Quantity"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                />
                <input
                  type="number"
                  placeholder="Price (₹ per unit)"
                  required
                  value={form.price_per_unit}
                  onChange={(e) => setForm({ ...form, price_per_unit: parseFloat(e.target.value) || 0 })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                />
              </div>
              <input
                type="text"
                placeholder="Location (e.g. Samrala Mandi, Punjab)"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <textarea
                placeholder="Description, moisture level, grade..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="agri-btn-outline">Cancel</button>
                <button type="submit" className="agri-btn-primary">Publish Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
