import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { DollarSign, Users, Brain, CreditCard, CheckCircle, Clock } from 'lucide-react';

export function Overview({ user, adminData, notify }) {
  const [liveStats, setLiveStats] = useState(null);
  const [liveTxns, setLiveTxns] = useState([]);

  // Real-time user count
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const users = snap.docs.map(d => d.data());
      const experts = users.filter(u => u.role === 'expert').length;
      setLiveStats(prev => ({ ...prev, totalUsers: snap.size, experts }));
    }, () => {});

    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubTxns = onSnapshot(q, (snap) => {
      const txns = snap.docs.slice(0, 5).map(d => {
        const data = d.data();
        return {
          id: d.id.slice(0, 8).toUpperCase(),
          user: data.clientName || 'Client',
          type: data.sessionTitle ? 'Session' : 'Booking',
          date: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
          amount: `$${((data.price || 0) / 100).toFixed(2)}`,
          status: data.paymentStatus === 'paid' ? 'completed' : 'pending',
        };
      });
      const totalRevenue = snap.docs.reduce((s, d) => {
        const p = d.data().paymentStatus === 'paid' ? (d.data().price || 0) / 100 : 0;
        return s + p;
      }, 0);
      setLiveTxns(txns);
      setLiveStats(prev => ({ ...prev, totalRevenue, totalTxns: snap.size }));
    }, () => {});

    return () => { unsubUsers(); unsubTxns(); };
  }, []);

  const stats = [
    {
      label: 'Platform Revenue',
      val: liveStats?.totalRevenue != null ? `$${liveStats.totalRevenue.toFixed(2)}` : (adminData?.stats?.[1]?.val || '$0'),
      ch: 'All-time revenue',
      color: 'var(--teal)',
      icon: <DollarSign size={18} color="var(--teal)" />,
    },
    {
      label: 'Total Users',
      val: liveStats?.totalUsers ?? (adminData?.stats?.[0]?.val || '0'),
      ch: 'Registered accounts',
      color: 'var(--gd)',
      icon: <Users size={18} color="var(--gd)" />,
    },
    {
      label: 'Active Experts',
      val: liveStats?.experts ?? (adminData?.stats?.[2]?.val || '0'),
      ch: 'Published profiles',
      color: 'var(--teal)',
      icon: <Brain size={18} color="var(--teal)" />,
    },
    {
      label: 'Total Transactions',
      val: liveStats?.totalTxns ?? (adminData?.stats?.[3]?.val || '0'),
      ch: 'Platform bookings',
      color: 'var(--gb)',
      icon: <CreditCard size={18} color="var(--gb)" />,
    },
  ];

  const recentTxns = liveTxns.length > 0 ? liveTxns : (adminData?.recentTransactions || []);
  const bars = adminData?.chartBars || [];
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Platform Overview</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Real-time platform metrics and insights</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div className="stat-label">{s.label}</div>
              {s.icon}
            </div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', color: s.color, fontWeight: 600, marginTop: '6px' }}>{s.ch}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: s.color, opacity: 0.25 }} />
          </div>
        ))}
      </div>

      {/* Chart + Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>Revenue Over Time</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: '2px' }}>Last 12 months</div>
            </div>
            <span style={{ fontSize: '1.2rem', fontFamily: 'var(--fu)', fontWeight: 800, color: 'var(--teal)' }}>
              {liveStats?.totalRevenue != null ? `$${liveStats.totalRevenue.toFixed(0)}` : adminData?.stats?.[1]?.val}
            </span>
          </div>
          <div className="chart-bars" style={{ height: '140px' }}>
            {bars.map((h, i) => (
              <div key={i} className={`cbar ${h === 100 ? 'cbar-high' : 'cbar-main'}`} style={{ height: `${h}%` }} title={`${months[i]}: ${h}%`} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            {months.map((m, i) => (
              <div key={i} style={{ fontSize: '0.6rem', color: 'var(--mu)', fontFamily: 'var(--fu)', flex: 1, textAlign: 'center' }}>{m}</div>
            ))}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '16px' }}>Key Metrics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {adminData?.keyMetrics?.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(26,184,160,0.04)', borderRadius: '8px', border: '1px solid rgba(26,184,160,0.08)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--mu)', fontFamily: 'var(--fu)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--fu)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--gd)' }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--mu)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Platform Health</div>
            {adminData?.platformMetrics?.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--mu)' }}>{m.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--gd)' }}>{m.value} <span style={{ color: 'var(--teal)', fontWeight: 500, fontSize: '0.75rem' }}>{m.trend}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="table-wrap">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>Recent Transactions</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--mu)' }}>Last 5</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>User</th><th>Type</th><th>Date</th><th>Amount</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentTxns.slice(0, 5).map((txn, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--mu)' }}>{txn.id}</td>
                <td style={{ fontWeight: 500 }}>{txn.user}</td>
                <td>{txn.type}</td>
                <td style={{ color: 'var(--mu)' }}>{txn.date}</td>
                <td style={{ fontWeight: 700, color: 'var(--teal)' }}>+{txn.amount}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: txn.status === 'completed' ? 'rgba(26,184,160,0.08)' : 'rgba(255,155,81,0.08)', color: txn.status === 'completed' ? 'var(--teal)' : 'var(--gb)' }}>
                    {txn.status === 'completed' ? <CheckCircle size={10} /> : <Clock size={10} />} {txn.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
