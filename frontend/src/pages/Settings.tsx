import React, { useState } from 'react';
import { userApi } from '../api/services';
import { Settings, Globe, Bell, Shield, Sliders, Trash2, AlertTriangle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [lang, setLang] = useState('en');
  const [alerts, setAlerts] = useState({
    lowMoisture: true,
    frostWarning: true,
    pumpAutoRun: true,
    mandiPriceDrop: false
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type "DELETE" to confirm account and data deletion.');
      return;
    }

    try {
      setDeleting(true);
      const res = await userApi.deleteAccount();
      setDeleteStatus(res.message);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

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

      {/* Danger Zone: Account Deletion & Permanent Data Purge */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(244, 63, 94, 0.4)', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.06) 0%, #131f33 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trash2 size={20} color="#f43f5e" />
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#fb7185' }}>Danger Zone: Delete Account & Purge Data</h4>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Permanently delete your account and wipe all associated records from AgriSense database (including farm telemetry, direct messages, forum posts, marketplace listings, transport shares, and login sessions). This action is <strong>irreversible</strong>.
        </p>

        <div>
          <button 
            onClick={() => setShowDeleteModal(true)} 
            className="agri-btn-outline" 
            style={{ borderColor: '#f43f5e', color: '#fb7185', fontSize: '0.85rem' }}
          >
            <Trash2 size={16} /> Delete My Account & All Data
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="agri-card" style={{ maxWidth: '480px', width: '100%', border: '1px solid rgba(244, 63, 94, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color="#f43f5e" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Confirm Account Deletion</h4>
                <p style={{ fontSize: '0.78rem', color: '#fb7185' }}>Irreversible Data Purge</p>
              </div>
            </div>

            {deleteStatus ? (
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', color: '#34d399', fontSize: '0.9rem', textAlign: 'center' }}>
                ✓ {deleteStatus}
                <p style={{ fontSize: '0.78rem', marginTop: '6px', color: 'var(--text-muted)' }}>Refreshing app...</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                  This will permanently erase your profile, sensor readings, messages, marketplace listings, and history. To proceed, please type <strong style={{ color: '#fff' }}>DELETE</strong> in the box below:
                </p>

                <input
                  type="text"
                  placeholder='Type "DELETE"'
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                    disabled={deleting}
                    className="agri-btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== 'DELETE'}
                    style={{
                      background: deleteConfirmText === 'DELETE' ? '#f43f5e' : 'rgba(244, 63, 94, 0.3)',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {deleting ? 'Purging All Data...' : 'Permanently Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
