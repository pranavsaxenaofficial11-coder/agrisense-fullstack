import React, { useState } from 'react';
import { Settings, Globe, Bell, Shield, Sliders } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [lang, setLang] = useState('en');
  const [alerts, setAlerts] = useState({
    lowMoisture: true,
    frostWarning: true,
    pumpAutoRun: true,
    mandiPriceDrop: false
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Settings & Personalization</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configure regional language, sensor alerts, and automated thresholds</p>
      </div>

      {/* Language Selector */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe size={20} color="#10b981" />
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Regional Language (I18N)</h4>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select your preferred language for sensor advisories, AI assistance, and mandi market alerts:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {[
            { code: 'en', label: 'English' },
            { code: 'hi', label: 'हिन्दी (Hindi)' },
            { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
            { code: 'mr', label: 'मराठी (Marathi)' },
            { code: 'te', label: 'తెలుగు (Telugu)' },
            { code: 'ta', label: 'தமிழ் (Tamil)' }
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={lang === l.code ? 'agri-btn-primary' : 'agri-btn-outline'}
              style={{ justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Notifications */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={20} color="#fbbf24" />
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Real-Time Field Notifications</h4>
        </div>

        {[
          { key: 'lowMoisture' as const, title: 'Low Soil Moisture Alert (<30%)', desc: 'Instant push alert when crop zone requires replenishment.' },
          { key: 'frostWarning' as const, title: 'Extreme Weather & Rain Risk Warning', desc: '24-hour advance alert before heavy rains or sudden temperature drop.' },
          { key: 'pumpAutoRun' as const, title: 'Automated Pump Run Notification', desc: 'Alert when pump initiates and terminates irrigation cycle.' }
        ].map((item) => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#f1f5f3' }}>{item.title}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.desc}</p>
            </div>
            <input
              type="checkbox"
              checked={alerts[item.key]}
              onChange={(e) => setAlerts({ ...alerts, [item.key]: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
