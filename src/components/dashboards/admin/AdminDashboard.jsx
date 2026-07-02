import React, { useState } from 'react';
import { DashShell } from '../../common/DashShell';

import { Overview } from './sections/Overview';
import { Users } from './sections/Users';
import { Transactions } from './sections/Transactions';
import { Analytics } from './sections/Analytics';
import { Settings } from './sections/Settings';
import { AccountSwitcher } from '../../common/AccountSwitcher';
import { LayoutDashboard, Users as UsersIcon, CreditCard, LineChart, Settings as SettingsIcon, Shield, LogOut } from 'lucide-react';

export function AdminDashboard({ user, nav, logout, notify }) {
  const [active, setActive] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} color="var(--teal)" />, group: 'MAIN' },
    { id: 'users', label: 'Users', icon: <UsersIcon size={18} color="var(--teal)" />, group: 'MAIN' },
    { id: 'transactions', label: 'Transactions', icon: <CreditCard size={18} color="var(--teal)" />, group: 'MAIN' },
    { id: 'analytics', label: 'Analytics', icon: <LineChart size={18} color="var(--teal)" />, group: 'REPORTS' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} color="var(--teal)" />, group: 'SYSTEM' },
  ];

  const groups = ['MAIN', 'REPORTS', 'SYSTEM'];

  const renderPage = () => {
    switch (active) {
      case 'overview': return <Overview user={user} adminData={{}} notify={notify} />;
      case 'users': return <Users user={user} adminData={{}} notify={notify} />;
      case 'transactions': return <Transactions user={user} adminData={{}} />;
      case 'analytics': return <Analytics user={user} adminData={{}} />;
      case 'settings': return <Settings user={user} notify={notify} logout={logout} nav={nav} />;
      default: return <Overview user={user} adminData={{}} notify={notify} />;
    }
  };

  const Sidebar = () => (
    <div className="sidebar sidebar-admin">
      {/* Logo */}
      <div className="sidebar-logo" onClick={() => nav('landingboard')} style={{ cursor: 'pointer' }}>
        <div className="sidebar-logo-dot" style={{ background: 'var(--gb)' }} />
        <span className="sidebar-logo-mark">mindGigs</span>
        <span className="sidebar-role-badge role-admin">Admin</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {groups.map(group => {
          const items = navItems.filter(i => i.group === group);
          return (
            <div key={group}>
              <div className="nav-group-label">{group}</div>
              {items.map(item => (
                <button
                  key={item.id}
                  className={`nav-item nav-item-admin ${active === item.id ? 'active' : ''}`}
                  onClick={() => setActive(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(26, 184, 160, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}><Shield size={18} color="var(--teal)" /></div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{user.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Platform Admin</div>
          </div>
        </div>
        <button
          onClick={() => { logout(); nav('home'); }}
          style={{
            width: '100%', padding: '8px', borderRadius: '6px',
            background: 'rgba(232,68,68,0.12)', color: '#e84444',
            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            border: '1px solid rgba(232,68,68,0.2)', transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(232,68,68,0.22)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(232,68,68,0.12)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><LogOut size={16} /> Logout</div>
        </button>
      </div>
    </div>
  );

  const topbarRight = (
    <div className="topbar-user">
      <div style={{ fontSize: '0.82rem', color: '#666' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
      <AccountSwitcher user={user} role="admin" logout={logout} nav={nav} />
    </div>
  );

  return (
    <DashShell
      sidebar={<Sidebar />}
      topbarTitle={navItems.find(i => i.id === active)?.label || 'Dashboard'}
      topbarRight={topbarRight}
    >
      {renderPage()}
    </DashShell>
  );
}
