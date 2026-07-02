import React, { useState, useEffect } from 'react';
import { usePlatformConfig } from '../../../context/PlatformConfigContext';
import { AlertTriangle, LayoutDashboard, Users, Megaphone, DollarSign, Settings as SettingsIcon, Link as LinkIcon, LogOut } from 'lucide-react';
import { DashShell } from '../../common/DashShell';
import { AccountSwitcher } from '../../common/AccountSwitcher';
import { Overview } from './sections/Overview';
import { Referrals } from './sections/Referrals';
import { Campaigns } from './sections/Campaigns';
import { Earnings } from './sections/Earnings';
import { Settings } from './sections/Settings';
import { getAffiliateCommissions, getExpertReferrals } from '../../../services/affiliateService';
import { useAuth } from '../../../context/AuthContext';

export function AffiliateDashboard({ user, nav, logout, notify }) {
  const [active, setActive] = useState('overview');
  const { features } = usePlatformConfig();
  const { currentUser } = useAuth();
  const [affiliateData, setAffiliateData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    async function load() {
      try {
        const [commissions, referrals] = await Promise.all([
          getAffiliateCommissions(currentUser.uid),
          getExpertReferrals(currentUser.uid),
        ]);
        const totalEarned = commissions.reduce((s, c) => s + (c.affiliateAmount || 0), 0) / 100;
        const pending = (user?.pendingPayout || 0) / 100;
        setAffiliateData({
          commissions,
          referrals,
          totalEarnings: `$${totalEarned.toFixed(2)}`,
          totalCommissions: `$${totalEarned.toFixed(2)}`,
          pendingPayout: pending.toFixed(2),
        });
      } catch (err) {
        console.error(err);
        setAffiliateData({ commissions: [], referrals: [], totalEarnings: '$0', totalCommissions: '$0', pendingPayout: '0' });
      } finally { setLoading(false); }
    }
    load();
  }, [currentUser, user]);

  if (features['Affiliate Program'] === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cr)', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(232,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={28} color="#e84444" />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--gd)', marginBottom: 12 }}>Affiliate Program Unavailable</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--mu)', marginBottom: 24 }}>The Affiliate Program has been temporarily disabled by the platform administrator.</p>
          <button className="btn btn-gh" onClick={() => { logout(); nav('home'); }}>Return to Home</button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} color="var(--teal)" />, group: 'MAIN' },
    { id: 'referrals', label: 'Referrals', icon: <Users size={18} color="var(--teal)" />, group: 'MAIN' },
    { id: 'campaigns', label: 'Campaigns', icon: <Megaphone size={18} color="var(--teal)" />, group: 'MAIN' },
    { id: 'earnings', label: 'Earnings', icon: <DollarSign size={18} color="var(--teal)" />, group: 'FINANCE' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} color="var(--teal)" />, group: 'ACCOUNT' },
  ];

  const renderPage = () => {
    if (loading || !affiliateData) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--mu)' }}>Loading your dashboard...</div>;
    switch (active) {
      case 'overview': return <Overview user={user} affiliateData={affiliateData} notify={notify} />;
      case 'referrals': return <Referrals user={user} affiliateData={affiliateData} notify={notify} />;
      case 'campaigns': return <Campaigns user={user} affiliateData={affiliateData} notify={notify} />;
      case 'earnings': return <Earnings user={user} affiliateData={affiliateData} notify={notify} />;
      case 'settings': return <Settings user={user} notify={notify} logout={logout} nav={nav} />;
      default: return <Overview user={user} affiliateData={affiliateData} notify={notify} />;
    }
  };

  const Sidebar = () => (
    <div className="sidebar sidebar-aff">
      <div className="sidebar-logo" onClick={() => nav('landingboard')} style={{ cursor: 'pointer' }}>
        <div className="sidebar-logo-dot" style={{ background: '#1ab8a0' }} />
        <span className="sidebar-logo-mark">mindGigs</span>
        <span className="sidebar-role-badge role-aff">Affiliate</span>
      </div>
      <nav className="sidebar-nav">
        {['MAIN', 'FINANCE', 'ACCOUNT'].map(group => (
          <div key={group}>
            <div className="nav-group-label">{group}</div>
            {navItems.filter(i => i.group === group).map(item => (
              <button key={item.id} className={`nav-item nav-item-aff ${active === item.id ? 'active' : ''}`} onClick={() => setActive(item.id)}>
                <span className="nav-icon">{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(26,184,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LinkIcon size={18} color="var(--teal)" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{user.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Affiliate Partner</div>
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
          <AccountSwitcher user={user} role="affiliate" logout={logout} nav={nav} />
        </div>
      }
    >
      {renderPage()}
    </DashShell>
  );
}
