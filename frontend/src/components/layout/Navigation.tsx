import React from 'react';
import {
  LayoutDashboard,
  Sliders,
  Sparkles,
  Calendar,
  ClipboardList,
  Store,
  Users,
  CloudSun,
  ScanLine,
  Truck,
  FileText,
  DollarSign,
  Award,
  BookOpen,
  User,
  Settings,
  HelpCircle,
  Landmark,
  CreditCard,
  Plane
} from 'lucide-react';

export type ScreenId =
  | 'home'
  | 'controls'
  | 'ai'
  | 'scan'
  | 'report'
  | 'weather'
  | 'market'
  | 'community'
  | 'requirements'
  | 'transport'
  | 'finance'
  | 'calendar'
  | 'drone'
  | 'schemes'
  | 'rewards'
  | 'blog'
  | 'log'
  | 'schedule'
  | 'payments'
  | 'profile'
  | 'settings'
  | 'help';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  badge?: string;
}

export const navItems: NavItem[] = [
  { id: 'home', label: 'Field Overview', icon: LayoutDashboard },
  { id: 'controls', label: 'Pump & Valves', icon: Sliders },
  { id: 'ai', label: 'AI Agronomist', icon: Sparkles, badge: 'AI' },
  { id: 'scan', label: 'Crop Scan', icon: ScanLine },
  { id: 'report', label: 'Farm Report', icon: FileText },
  { id: 'weather', label: 'Weather & Spray', icon: CloudSun },
  { id: 'market', label: 'Crop Market', icon: Store },
  { id: 'requirements', label: 'Buyer Requests', icon: ClipboardList },
  { id: 'community', label: 'Farmer Community', icon: Users },
  { id: 'transport', label: 'Transport Share', icon: Truck },
  { id: 'finance', label: 'Farm Finance', icon: DollarSign },
  { id: 'calendar', label: 'Crop Calendar', icon: Calendar },
  { id: 'drone', label: 'Satellite & Drone', icon: Plane },
  { id: 'schemes', label: 'Govt Schemes', icon: Landmark },
  { id: 'rewards', label: 'AgriPoints', icon: Award },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'blog', label: 'Krishi Learning', icon: BookOpen },
  { id: 'log', label: 'Activity Logs', icon: ClipboardList },
  { id: 'profile', label: 'Farm Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
];

interface NavigationProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
}

export const Sidebar: React.FC<NavigationProps> = ({ currentScreen, onSelectScreen }) => {
  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#0c130f',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto'
    }}>
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 12px var(--primary-glow)'
        }}>
          🌱
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f1f5f3' }}>
            Agri<span style={{ color: 'var(--primary)' }}>Sense</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Precision IoT & AI Farm</p>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                color: isActive ? '#34d399' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#f1f5f3';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <Icon size={18} color={isActive ? '#10b981' : 'currentColor'} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Status pill */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', background: '#080d0a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', color: '#090d0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
            PS
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Pranav Saxena</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Samrala • 14.5 Ac</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export const Header: React.FC<{
  currentScreen: ScreenId;
  waterTankLevel: number;
  pumpRunning: boolean;
  onTogglePump: () => void;
}> = ({ currentScreen, waterTankLevel, pumpRunning, onTogglePump }) => {
  const currentTitle = navItems.find((n) => n.id === currentScreen)?.label || 'AgriSense';

  return (
    <header style={{
      height: '68px',
      backgroundColor: 'rgba(9, 13, 11, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f3' }}>{currentTitle}</h2>
      </div>

      {/* Quick Field Telemetry Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="badge badge-blue mono-val" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          💧 Tank: {waterTankLevel.toFixed(0)}%
        </div>

        <button
          onClick={onTogglePump}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            border: pumpRunning ? '1px solid #10b981' : '1px solid var(--border-subtle)',
            background: pumpRunning ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
            color: pumpRunning ? '#34d399' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.8rem',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: pumpRunning ? '#10b981' : '#64746d',
            boxShadow: pumpRunning ? '0 0 8px #10b981' : 'none'
          }} />
          Pump: {pumpRunning ? 'RUNNING' : 'STANDBY'}
        </button>
      </div>
    </header>
  );
};
