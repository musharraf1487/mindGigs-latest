import React, { useState } from 'react';
import { DashShell } from '../../common/DashShell';
import { AccountSwitcher } from '../../common/AccountSwitcher';
import { Overview } from './sections/Overview';
import { Offers } from './sections/Offers';
import { Bookings } from './sections/Bookings';
import { Sessions } from './sections/Sessions';
import { Subscriptions } from './sections/Subscriptions';
import { Products } from './sections/Products';
import { Books } from './sections/Books';
import { CustomOfferings } from './sections/CustomOfferings';
import { Affiliate } from './sections/Affiliate';
import { Earnings } from './sections/Earnings';
import { Settings } from './sections/Settings';
import { Availability } from './sections/Availability';
import { LayoutDashboard, Briefcase, Calendar, Clock, RefreshCw, Package, BookOpen, Sparkles, Rocket, DollarSign, Settings as SettingsIcon, LogOut, User } from 'lucide-react';

export function ExpertDashboard({ user, nav, logout, notify }) {
  const [active, setActive] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} color="var(--teal)" />, group: 'MAIN' },
    { id: 'offers', label: 'My Offers', icon: <Briefcase size={18} color="var(--teal)" />, group: 'MANAGEMENT' },
    { id: 'bookings', label: 'Bookings', icon: <Calendar size={18} color="var(--teal)" />, group: 'MANAGEMENT' },
    { id: 'availability', label: 'Availability', icon: <Clock size={18} color="var(--teal)" />, group: 'MANAGEMENT' },
    { id: 'sessions', label: '1:1 Sessions', icon: <Calendar size={18} color="var(--teal)" />, group: 'OFFERINGS' },
    { id: 'subscriptions', label: 'Subscriptions', icon: <RefreshCw size={18} color="var(--teal)" />, group: 'OFFERINGS' },
    { id: 'products', label: 'Digital Products', icon: <Package size={18} color="var(--teal)" />, group: 'OFFERINGS' },
    { id: 'books', label: 'Books', icon: <BookOpen size={18} color="var(--teal)" />, group: 'OFFERINGS' },
    { id: 'custom-offerings', label: 'Custom Offerings', icon: <Sparkles size={18} color="var(--teal)" />, group: 'OFFERINGS' },
    { id: 'affiliate', label: 'Affiliate', icon: <Rocket size={18} color="var(--teal)" />, group: 'NETWORK' },
    { id: 'earnings', label: 'Earnings', icon: <DollarSign size={18} color="var(--teal)" />, group: 'NETWORK' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} color="var(--teal)" />, group: 'ACCOUNT' },
  ];

  const renderPage = () => {
    switch (active) {
      case 'overview': return <Overview user={user} notify={notify} nav={nav} setActive={setActive} />;
      case 'offers': return <Offers user={user} notify={notify} />;
      case 'bookings': return <Bookings user={user} notify={notify} />;
      case 'availability': return <Availability user={user} notify={notify} />;
      case 'sessions': return <Sessions user={user} notify={notify} />;
      case 'subscriptions': return <Subscriptions user={user} notify={notify} />;
      case 'products': return <Products user={user} notify={notify} />;
      case 'books': return <Books user={user} notify={notify} />;
      case 'custom-offerings': return <CustomOfferings user={user} notify={notify} />;
      case 'affiliate': return <Affiliate user={user} notify={notify} />;
      case 'earnings': return <Earnings user={user} notify={notify} />;
      case 'settings': return <Settings user={user} notify={notify} logout={logout} nav={nav} />;
      default: return <Overview user={user} notify={notify} nav={nav} setActive={setActive} />;
    }
  };

  const Sidebar = () => (
    <div className="sidebar">
      <div className="sidebar-logo" onClick={() => nav('landingboard')} style={{ cursor: 'pointer' }}>
        <div className="sidebar-logo-dot" />
        <span className="sidebar-logo-mark">mind<span style={{ color: 'var(--teal)' }}>G</span>igs</span>
        <span className="sidebar-role-badge role-expert">Expert</span>
      </div>
      <nav className="sidebar-nav">
        {['MAIN', 'MANAGEMENT', 'OFFERINGS', 'NETWORK', 'ACCOUNT'].map(group => (
          <div key={group}>
            <div className="nav-group-label">{group}</div>
            {navItems.filter(i => i.group === group).map(item => (
              <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => setActive(item.id)}>
                <span className="nav-icon">{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', border: '1px solid rgba(26,184,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} color="var(--teal)" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Certified Expert</div>
          </div>
        </div>
        <button onClick={() => { logout(); nav('home'); }}
          style={{ width: '100%', padding: 8, borderRadius: 6, background: 'rgba(232,68,68,0.12)', color: '#e84444', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(232,68,68,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><LogOut size={16} /> Logout</div>
        </button>
      </div>
    </div>
  );

  return (
    <DashShell
      sidebar={<Sidebar />}
      topbarTitle={navItems.find(i => i.id === active)?.label || 'Dashboard'}
      topbarRight={
        <div className="topbar-user">
          <div style={{ fontSize: '0.82rem', color: '#666' }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <AccountSwitcher user={user} role="expert" logout={logout} nav={nav} />
        </div>
      }
    >
      {renderPage()}
    </DashShell>
  );
}
