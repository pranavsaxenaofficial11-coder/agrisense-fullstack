import React, { useState } from 'react';
import { aiApi } from '../api/services';
import { CropScanResult } from '../types';
import { ScanLine, Upload, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export const ScanPage: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CropScanResult | null>(null);
  const [crop, setCrop] = useState('Tomato');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const data = await aiApi.scanCrop(image, crop);
      setResult(data);
    } catch (err: any) {
      alert(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>AI Crop Health & Leaf Diagnostic</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Snap or upload a photo of your crop foliage to detect pests, fungal blights, and nutrient deficiencies.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '36px 20px', borderStyle: 'dashed' }}>
        {image ? (
          <div style={{ position: 'relative', width: '220px', height: '220px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #10b981' }}>
            <img src={image} alt="Crop Leaf" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ScanLine size={40} color="#10b981" />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <label className="agri-btn-outline" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Upload Crop Leaf Image
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        </div>

        {image && (
          <button
            onClick={handleScan}
            disabled={loading}
            className="agri-btn-primary"
            style={{ padding: '12px 32px', fontSize: '1rem', marginTop: '10px' }}
          >
            <Sparkles size={18} /> {loading ? 'Analyzing with Computer Vision...' : 'Diagnose Plant Health'}
          </button>
        )}
      </div>

      {/* Diagnostic Result */}
      {result && (
        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge-warning" style={{ marginBottom: '6px' }}>Severity: {result.severity}</span>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f3' }}>{result.diagnosis}</h4>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>AI Confidence</span>
              <h4 className="mono-val" style={{ color: '#10b981', fontSize: '1.3rem', fontWeight: 700 }}>
                {(result.confidence * 100).toFixed(0)}%
              </h4>
            </div>
          </div>

          <div style={{ background: '#17221b', padding: '14px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
            <strong style={{ fontSize: '0.85rem', color: '#34d399', display: 'block', marginBottom: '4px' }}>Recommended Immediate Treatment:</strong>
            <p style={{ fontSize: '0.9rem', color: '#f1f5f3' }}>{result.recommended_action}</p>
          </div>

          <div>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Preventive Measures:</strong>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {result.preventive_measures.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
