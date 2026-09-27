import React from 'react';
import { Award, Droplet, Sun, Zap, Gift, CheckCircle } from 'lucide-react';

export const RewardsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="agri-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, #121915 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={36} color="#fbbf24" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sustainable Farming Rewards</span>
            <h2 className="mono-val" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fbbf24' }}>1,420 AgriPoints</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>
              Level 4 Sustainable Farmer • Top 5% in Samrala Block
            </p>
          </div>
        </div>

        <button className="agri-btn-primary" onClick={() => alert('Points successfully claimed for this week!')}>
          <Gift size={16} /> Claim Daily Eco Points
        </button>
      </div>

      {/* Sustainable Badges */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Earned Conservation Badges</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {[
            { title: 'Water Guardian', desc: 'Saved over 25,000 liters using precision soil moisture triggers.', icon: Droplet, color: '#38bdf8' },
            { title: 'Solar Powered', desc: '100% solar-driven pump operation for 60 consecutive days.', icon: Sun, color: '#f59e0b' },
            { title: 'Zero Waste Spray', desc: 'Conducted all foliar sprays strictly during optimal weather windows.', icon: Zap, color: '#10b981' }
          ].map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="agri-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${b.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color={b.color} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{b.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Redeemable Perks */}
      <div className="agri-card">
        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Redeem AgriPoints for Farm Inputs</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {[
            { reward: '10% Discount on Bio-NPK Fertilizer', cost: '500 Points', partner: 'IFFCO Samrala' },
            { reward: 'Free Soil NPK Lab Testing Kit', cost: '800 Points', partner: 'PAU Agri Labs' },
            { reward: '1-Hour Drone Health Flight Survey', cost: '1,200 Points', partner: 'AgriSense UAV Fleet' },
          ].map((r, i) => (
            <div key={i} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{r.reward}</h5>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Partner: {r.partner}</p>
              </div>
              <button className="agri-btn-outline" style={{ fontSize: '0.75rem', padding: '6px 10px' }} onClick={() => alert(`Redeemed ${r.reward}!`)}>
                {r.cost}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
