import React from 'react';
import { HelpCircle, PhoneCall, Mail, MessageCircle, FileText, ExternalLink } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const faqs = [
    {
      q: 'How does AgriSense determine when to start the irrigation pump?',
      a: 'AgriSense reads real-time capacitive soil moisture sensors across Zones A, B, C, and D. When any zone drops below its configured crop-specific threshold (e.g. 35% for tomato), the edge controller automatically turns on the pump and opens the relevant solenoid valve.'
    },
    {
      q: 'Can I operate the irrigation system manually if WiFi disconnects?',
      a: 'Yes. The AgriSense IoT edge gateway is equipped with an offline fallback mode and a physical bypass toggle that directly controls the 12V DC relays and contactor.'
    },
    {
      q: 'How accurate is the leaf disease AI diagnosis scanner?',
      a: 'The AgriSense vision model is calibrated against tens of thousands of agricultural plant pathology samples from Indian agricultural research institutes (ICAR/PAU), providing over 92% diagnostic accuracy for common fungal, bacterial, and viral blights.'
    },
    {
      q: 'How do I claim PM-KISAN or PMKSY drip irrigation subsidies?',
      a: 'Navigate to the "Govt Schemes" tab on the left sidebar. There you can review eligibility criteria, prepare required land documents (Jamabandi/Aadhaar), and click direct links to the official government registration portals.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Farmer Support & Helpline</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Emergency agricultural assistance, IoT troubleshooting, and government agronomist hotlines</p>
      </div>

      {/* Emergency Hotlines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={20} color="#10b981" />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Kisan Call Center</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Govt of India (Toll-Free 24x7)</p>
            </div>
          </div>
          <a href="tel:18001801551" className="mono-val" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399', textDecoration: 'none' }}>
            1800-180-1551
          </a>
        </div>

        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={20} color="#38bdf8" />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>AgriSense Agronomy Desk</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dedicated support for sensor nodes</p>
            </div>
          </div>
          <a href="mailto:support@agrisense.io" className="mono-val" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', textDecoration: 'none' }}>
            support@agrisense.io
          </a>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Frequently Asked Questions</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
              <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f3', marginBottom: '6px' }}>{f.q}</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
