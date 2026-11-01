import React from 'react';

interface NotFoundPageProps {
  onNavigateHome?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigateHome }) => {
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#070D09',
      color: '#ECFDF5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Radial Glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 40%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Decorative Grid Lines */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        opacity: 0.6,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        maxWidth: '580px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        background: 'rgba(15, 23, 18, 0.85)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '24px',
        padding: '48px 32px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.1)'
      }}>
        {/* Eyebrow Status */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#F87171',
          padding: '6px 14px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '20px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block', boxShadow: '0 0 8px #EF4444' }} />
          HTTP 404 · Sector Not Found
        </div>

        {/* Big Glitch 404 Heading */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <h1 style={{
            fontSize: '96px',
            fontWeight: 900,
            lineHeight: 1,
            margin: 0,
            background: 'linear-gradient(135deg, #34D399 0%, #10B981 50%, #047857 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
            textShadow: '0 0 40px rgba(16, 185, 129, 0.2)'
          }}>
            404
          </h1>
          <div style={{
            fontSize: '38px',
            position: 'absolute',
            top: '-10px',
            right: '25%',
            filter: 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.6))'
          }}>
            🌱
          </div>
        </div>

        {/* Message */}
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginBottom: '12px' }}>
          This Field Hasn't Sprouted Yet!
        </h2>
        <p style={{ fontSize: '15px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '28px', maxWidth: '440px', margin: '0 auto 28px auto' }}>
          You scanned our payment QR gateway, but the checkout endpoint or sensor sector you're looking for is either in sandbox mode or currently under seasonal maintenance.
        </p>

        {/* Diagnostic Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '16px',
          textAlign: 'left',
          marginBottom: '32px',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: '12px',
          color: '#6EE7B7'
        }}>
          <div style={{ color: '#94A3B8', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            System Diagnostic Readout:
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#94A3B8' }}>Gateway Route:</span>
            <span>/upi/payment-gateway-session</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#94A3B8' }}>Trigger:</span>
            <span>QR_SCAN_TERMINATED</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94A3B8' }}>IoT Gateway Node:</span>
            <span>ESP32-S3-PRO-NODE-04</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleHomeClick}
            style={{
              width: '100%',
              background: '#10B981',
              color: '#064E3B',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#34D399')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#10B981')}
          >
            ← Return to AgriSense Landing Page
          </button>

          <a
            href="/app.html"
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#F1F5F9',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
          >
            Launch Farm Dashboard (app.html) →
          </a>
        </div>
      </div>

      {/* Footer Branding */}
      <div style={{
        marginTop: '28px',
        fontSize: '12px',
        color: '#64748B',
        textAlign: 'center'
      }}>
        AgriSense AI Smart Precision Agriculture · Official Hackathon & IoT Prototype
      </div>
    </div>
  );
};

export default NotFoundPage;
