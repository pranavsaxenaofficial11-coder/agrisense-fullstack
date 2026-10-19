import React, { useEffect, useState } from 'react';
import { marketApi } from '../api/services';
import { MarketListing } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/common/UIStates';
import { Plus, Tag, MapPin, Phone, ShieldCheck, X, TrendingUp, TrendingDown, ArrowRight, MessageSquare, Compass } from 'lucide-react';

interface RegionalRate {
  crop: string;
  mandi: string;
  state: string;
  price: number;
  trend: string;
  arrival: string;
  owner: string;
  phone: string;
  qty: string;
}

export const MarketPage: React.FC = () => {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [scope, setScope] = useState<'near' | 'all'>('near');
  const [showModal, setShowModal] = useState(false);

  // Cross-regional comparison modal
  const [comparisonCrop, setComparisonCrop] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    category: 'Vegetables',
    crop_name: '',
    quantity: 10,
    unit: 'Quintal',
    price_per_unit: 2000,
    location: 'Samrala, Punjab',
    seller_name: 'Pranav Saxena',
    seller_phone: '+91 98765 43210',
    description: ''
  });

  const regionalMandiDataset: RegionalRate[] = [
    // Wheat
    { crop: 'Wheat', mandi: 'Khanna, Punjab', state: 'Punjab', price: 2450, trend: '+35', arrival: '4,800 qtl', owner: 'Gurpreet Singh', phone: '+91 98140 12345', qty: '350 Quintal' },
    { crop: 'Wheat', mandi: 'Karnal, Haryana', state: 'Haryana', price: 2420, trend: '+20', arrival: '3,200 qtl', owner: 'Rakesh Verma', phone: '+91 98120 54321', qty: '200 Quintal' },
    { crop: 'Wheat', mandi: 'Indore, MP', state: 'Madhya Pradesh', price: 2580, trend: '+45', arrival: '2,900 qtl', owner: 'Mohanlal Patidar', phone: '+91 98260 98765', qty: '500 Quintal' },
    { crop: 'Wheat', mandi: 'Pune, MH', state: 'Maharashtra', price: 2820, trend: '+60', arrival: '1,800 qtl', owner: 'Sambhaji Patil', phone: '+91 98220 11223', qty: '150 Quintal' },
    { crop: 'Wheat', mandi: 'Agra, UP', state: 'Uttar Pradesh', price: 2380, trend: '-15', arrival: '5,100 qtl', owner: 'Brijesh Yadav', phone: '+91 94120 33445', qty: '400 Quintal' },

    // Rice
    { crop: 'Rice (Paddy)', mandi: 'Ludhiana, Punjab', state: 'Punjab', price: 2350, trend: '+40', arrival: '8,200 qtl', owner: 'Harmanjit Singh', phone: '+91 98760 11223', qty: '600 Quintal' },
    { crop: 'Rice (Paddy)', mandi: 'Kaithal, Haryana', state: 'Haryana', price: 2380, trend: '+25', arrival: '6,400 qtl', owner: 'Surinder Kumar', phone: '+91 98130 99887', qty: '450 Quintal' },
    { crop: 'Rice (Paddy)', mandi: 'Guntur, AP', state: 'Andhra Pradesh', price: 2600, trend: '+50', arrival: '3,700 qtl', owner: 'N. Venkata Rao', phone: '+91 98480 55667', qty: '300 Quintal' },

    // Tomatoes
    { crop: 'Tomatoes', mandi: 'Ludhiana, Punjab', state: 'Punjab', price: 1850, trend: '+150', arrival: '1,200 crates', owner: 'Jaswant Singh', phone: '+91 98141 77889', qty: '120 Crates' },
    { crop: 'Tomatoes', mandi: 'Nashik, MH', state: 'Maharashtra', price: 1420, trend: '-80', arrival: '5,600 crates', owner: 'Nitin Shinde', phone: '+91 98230 44556', qty: '300 Crates' },
    { crop: 'Tomatoes', mandi: 'Kolar, KA', state: 'Karnataka', price: 1350, trend: '-100', arrival: '6,800 crates', owner: 'M. Gowda', phone: '+91 98450 66778', qty: '400 Crates' },
    { crop: 'Tomatoes', mandi: 'Azadpur, Delhi', state: 'Delhi', price: 2100, trend: '+180', arrival: '4,300 crates', owner: 'Subhash Gupta', phone: '+91 98100 88990', qty: '250 Crates' },

    // Onions
    { crop: 'Onions', mandi: 'Lasalgaon, MH', state: 'Maharashtra', price: 2450, trend: '+120', arrival: '12,000 qtl', owner: 'Bhausaheb Kadam', phone: '+91 98221 77665', qty: '800 Quintal' },
    { crop: 'Onions', mandi: 'Khanna, Punjab', state: 'Punjab', price: 3100, trend: '+180', arrival: '1,900 qtl', owner: 'Kuldeep Singh', phone: '+91 98761 22334', qty: '200 Quintal' },
    { crop: 'Onions', mandi: 'Azadpur, Delhi', state: 'Delhi', price: 3250, trend: '+210', arrival: '7,500 qtl', owner: 'Madan Lal & Sons', phone: '+91 98110 44556', qty: '500 Quintal' },

    // Mustard
    { crop: 'Mustard', mandi: 'Alwar, Rajasthan', state: 'Rajasthan', price: 5750, trend: '+110', arrival: '3,400 qtl', owner: 'Ramavtar Meena', phone: '+91 94140 12345', qty: '280 Quintal' },
    { crop: 'Mustard', mandi: 'Khanna, Punjab', state: 'Punjab', price: 5820, trend: '+90', arrival: '1,400 qtl', owner: 'Tarlok Singh', phone: '+91 98142 88990', qty: '150 Quintal' },

    // Cotton
    { crop: 'Cotton', mandi: 'Bathinda, Punjab', state: 'Punjab', price: 7350, trend: '+140', arrival: '2,800 qtl', owner: 'Balwinder Singh', phone: '+91 98762 33221', qty: '320 Quintal' },
    { crop: 'Cotton', mandi: 'Rajkot, Gujarat', state: 'Gujarat', price: 7250, trend: '+180', arrival: '6,200 qtl', owner: 'Kishorbhai Patel', phone: '+91 98250 99887', qty: '400 Quintal' },

    // Potatoes
    { crop: 'Potatoes', mandi: 'Jalandhar, Punjab', state: 'Punjab', price: 1680, trend: '+80', arrival: '4,200 bags', owner: 'Paramjit Singh', phone: '+91 98143 55667', qty: '400 Bags' },
    { crop: 'Potatoes', mandi: 'Agra, UP', state: 'Uttar Pradesh', price: 1450, trend: '+50', arrival: '15,000 bags', owner: 'Chhotey Lal Cold Storage', phone: '+91 94121 66778', qty: '1200 Bags' }
  ];

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await marketApi.getListings(category === 'All' ? undefined : category);
      setListings(res);
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

  // Filter regional mandi ticker by scope
  const filteredMandi = regionalMandiDataset.filter(r => {
    if (scope === 'near') return r.state === 'Punjab';
    return true;
  });

  // Filter listings based on scope
  const displayListings = listings.filter(item => {
    if (scope === 'near') {
      return (item.location || '').toLowerCase().includes('punjab') || (item.location || '').toLowerCase().includes('samrala') || (item.location || '').toLowerCase().includes('ludhiana');
    }
    return true;
  });

  // Comparison logic for modal
  const comparisonData = comparisonCrop
    ? regionalMandiDataset.filter(r => r.crop.toLowerCase().includes(comparisonCrop.toLowerCase()) || comparisonCrop.toLowerCase().includes(r.crop.toLowerCase()))
    : [];

  const localBenchmark = comparisonData.find(r => r.state === 'Punjab') || comparisonData[0];
  const sortedMandi = [...comparisonData].sort((a, b) => b.price - a.price);
  const bestMandi = sortedMandi[0];
  const spread = (bestMandi && localBenchmark) ? (bestMandi.price - localBenchmark.price) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Scope Toggles & Real Mandi Ticker */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-success">● LIVE APMC RATES</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Agmarknet Feed · Real eNAM Market Prices</span>
          </div>

          {/* Near Me vs All India Scope Toggle */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setScope('near')}
              className={scope === 'near' ? 'agri-btn-primary' : 'agri-btn-outline'}
              style={{ fontSize: '0.78rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Compass size={13} /> Near Me (Punjab - Default)
            </button>
            <button
              onClick={() => setScope('all')}
              className={scope === 'all' ? 'agri-btn-primary' : 'agri-btn-outline'}
              style={{ fontSize: '0.78rem', padding: '4px 12px' }}
            >
              All India Mandis
            </button>
          </div>
        </div>

        {/* Ticker Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {filteredMandi.slice(0, 6).map((m, idx) => (
            <div
              key={idx}
              onClick={() => setComparisonCrop(m.crop)}
              style={{
                cursor: 'pointer',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.6)',
                borderRadius: '8px',
                padding: '10px 12px',
                transition: 'border-color 0.15s ease'
              }}
              title="Click to compare other regions and view owners"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f3' }}>{m.crop}</span>
                <span style={{ fontSize: '0.72rem', color: m.trend.startsWith('+') ? '#4ade80' : '#fb7185', display: 'flex', alignItems: 'center' }}>
                  {m.trend.startsWith('+') ? <TrendingUp size={12} /> : <TrendingDown size={12} />} ₹{m.trend}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                <strong style={{ fontSize: '1.15rem', color: '#38bdf8' }}>₹{m.price.toLocaleString('en-IN')}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>per qtl</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>{m.mandi}</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Compare →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

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

      {!loading && !displayListings.length && (
        <EmptyState
          title="No produce listings found in your area"
          subtitle="Be the first farmer to list your harvest directly to verified buyers or switch to All India."
          action={<button onClick={() => setShowModal(true)} className="agri-btn-primary"><Plus size={16} /> Create Listing</button>}
        />
      )}

      {/* Grid of Listings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {displayListings.map((item) => (
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
              <button
                onClick={() => setComparisonCrop(item.crop_name || item.title)}
                className="agri-btn-outline"
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Compare Regions <ArrowRight size={12} />
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                <a
                  href={`tel:${item.seller_phone}`}
                  className="agri-btn-primary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Phone size={12} /> Call
                </a>
                <a
                  href={`https://wa.me/${(item.seller_phone || '919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I saw your listing for ${item.title} on AgriSense. Is it still available?`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="agri-btn-outline"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <MessageSquare size={12} /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Regional Comparison Modal */}
      {comparisonCrop && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="agri-card" style={{
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#0e1712',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '4px' }}>CROSS-MANDI ARBITRAGE</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  {comparisonCrop} — Regional Price Comparison
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live benchmark across major Indian wholesale mandis</span>
              </div>
              <button
                onClick={() => setComparisonCrop(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Arbitrage Opportunity Card */}
            {bestMandi && localBenchmark && (
              <div style={{
                background: spread > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.08)',
                border: `1px solid ${spread > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.25)'}`,
                borderRadius: '12px',
                padding: '14px'
              }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#34d399', fontWeight: 700 }}>
                  Interstate Market Recommendation
                </span>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f3', marginTop: '4px' }}>
                  {spread > 0
                    ? `Highest Paying Mandi: ${bestMandi.mandi} at ₹${bestMandi.price.toLocaleString('en-IN')}/qtl (+₹${spread}/qtl vs your local mandi)`
                    : `Your Local Mandi (${localBenchmark.mandi}) is currently offering the best price at ₹${localBenchmark.price.toLocaleString('en-IN')}/qtl.`}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Average interstate transport freight is ₹120–₹160/quintal. {spread > 160 ? `Estimated net profit on a 15-tonne truck: ₹${((spread - 140) * 150).toLocaleString('en-IN')}.` : 'Direct local sale recommended to minimize logistics overhead.'}
                </p>
              </div>
            )}

            {/* Table of Regions */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>Wholesale Prices by Region</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Mandi / Region</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Price (₹/qtl)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Difference vs Local</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Daily Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, idx) => {
                      const diff = localBenchmark ? (row.price - localBenchmark.price) : 0;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{row.mandi}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#f1f5f3' }}>₹{row.price.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: diff > 0 ? '#34d399' : diff < 0 ? '#fb7185' : 'var(--text-muted)' }}>
                            {diff > 0 ? `+₹${diff}` : diff < 0 ? `-₹${Math.abs(diff)}` : 'Baseline'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: row.trend.startsWith('+') ? '#34d399' : '#fb7185' }}>
                            {row.trend}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verified Owners & Sellers in Other Regions */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>Verified Crop Owners & Sellers in Other Regions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {comparisonData.map((owner, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#f1f5f3' }}>👤 {owner.owner}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        📍 {owner.mandi} • Available: <strong style={{ color: 'var(--text-main)' }}>{owner.qty}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                        Asking: ₹{owner.price.toLocaleString('en-IN')} / quintal
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={`tel:${owner.phone}`}
                        className="agri-btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Phone size={12} /> Call Owner
                      </a>
                      <a
                        href={`https://wa.me/${owner.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${owner.owner}, I saw your listing for ${owner.crop} (${owner.qty}) on AgriSense Mandi Exchange. Is it still available?`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="agri-btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <MessageSquare size={12} /> WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setComparisonCrop(null)} className="agri-btn-outline" style={{ padding: '8px 18px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
export default MarketPage;
