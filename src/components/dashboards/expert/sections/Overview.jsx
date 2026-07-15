import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getExpertBookings } from '../../../../services/bookingService';
import { ProfIcon } from '../../../common/ProfIcon';

export function Overview({ user, notify, nav, setActive }) {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ totalEarnings: 0, monthlyRevenue: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    getExpertBookings(currentUser.uid)
      .then(data => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let total = 0, monthly = 0, upcoming = 0;
        data.forEach(b => {
          const amt = (b.price || 0) / 100;
          if (b.paymentStatus === 'paid') { total += amt; }
          const created = new Date(b.createdAt);
          if (b.paymentStatus === 'paid' && created >= monthStart) monthly += amt;
          if (b.status === 'confirmed' || b.status === 'pending') upcoming++;
        });
        setStats({ totalEarnings: total, monthlyRevenue: monthly, upcoming });
        setBookings(data.slice(0, 4));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  const fmt = v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const displayStats = [
    { label: 'Selling Earnings', val: fmt((user?.sellingEarnings || 0) / 100), ch: 'All-time', color: 'gr' },
    { label: 'Monthly Revenue', val: fmt(stats.monthlyRevenue), ch: 'This month', color: 'gr' },
    { label: 'Upcoming Sessions', val: stats.upcoming, ch: 'Confirmed', color: 'tl' },
    { label: 'Affiliate Earnings', val: fmt((user?.affiliateEarnings || 0) / 100), ch: 'From referrals & coupons', color: 'gd' },
  ];

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--mu)' }}>Loading dashboard...</div>;

  return (
    <>
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Dashboard Overview</h2>
        <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Welcome back, {user?.name || 'Expert'}!</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 40, gap: 20 }}>
        {displayStats.map((s, i) => (
          <div key={i} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className={`stat-badge bg-${s.color}`} style={{ padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>{s.ch}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gd)', marginBottom: 4 }}>{s.val}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--sl)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 30 }}>
        <div className="card">
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gd)' }}>Recent Bookings</h3>
            <button className="btn btn-gh btn-sm" onClick={() => setActive?.('bookings')}>View All</button>
          </div>
          <div style={{ padding: 20 }}>
            {bookings.length > 0 ? bookings.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < bookings.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gd)' }}>{b.clientName || 'Client'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--mu)' }}>{b.sessionTitle} · {b.date}</div>
                </div>
                <span className={`tag ${b.status === 'confirmed' ? 'tag-gr' : 'tag-yl'}`} style={{ fontSize: '0.65rem' }}>{b.status}</span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--mu)', fontSize: '0.85rem' }}>No bookings yet</div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 20 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button className="btn btn-gr" style={{ padding: 16, height: 'auto', flexDirection: 'column', gap: 10 }} onClick={() => setActive?.('offers')}>
              <ProfIcon icon="package" size={24} color="#fff" style={{ background: 'transparent', border: 'none' }} />
              <span style={{ fontSize: '0.8rem' }}>New Offer</span>
            </button>
            <button className="btn btn-gh" style={{ padding: 16, height: 'auto', flexDirection: 'column', gap: 10 }} onClick={() => nav('public-profile', { expertId: user?.uid, expert: user })}>
              <ProfIcon icon="users" size={24} />
              <span style={{ fontSize: '0.8rem' }}>My Profile</span>
            </button>
            <button className="btn btn-gh" style={{ padding: 16, height: 'auto', flexDirection: 'column', gap: 10 }} onClick={() => setActive?.('affiliate')}>
              <ProfIcon icon="link" size={24} />
              <span style={{ fontSize: '0.8rem' }}>Affiliate</span>
            </button>
            <button className="btn btn-gh" style={{ padding: 16, height: 'auto', flexDirection: 'column', gap: 10 }} onClick={() => setActive?.('earnings')}>
              <ProfIcon icon="dollar" size={24} />
              <span style={{ fontSize: '0.8rem' }}>Payouts</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
