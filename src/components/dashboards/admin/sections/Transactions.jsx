import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { CreditCard, CheckCircle, Clock, DollarSign, Download } from 'lucide-react';

const SCENARIO_LABELS = {
  1: 'Standard (70/30)',
  2: 'Self-Referral (80/20)',
  3: 'Cross-Referral (70/10/20)',
  4: 'Affiliate Coupon (70/10/20)',
};

export function Transactions({ user, adminData, notify }) {
  const [bookingDocs, setBookingDocs] = useState([]);
  const [commissionsByBookingId, setCommissionsByBookingId] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Real-time listener on bookings collection (paid bookings = transactions)
  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBookingDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Transactions listener error:', err);
      setBookingDocs([]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener on commissions collection, indexed by bookingId so
  // each transaction row can show which of the 4 scenarios applied.
  useEffect(() => {
    const q = query(collection(db, 'commissions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.bookingId) map[data.bookingId] = data;
      });
      setCommissionsByBookingId(map);
    }, (err) => console.error('Commissions listener error:', err));
    return () => unsubscribe();
  }, []);

  const liveTxns = useMemo(() => bookingDocs.map(data => {
    const commission = commissionsByBookingId[data.id];
    return {
      id: data.id.slice(0, 8).toUpperCase(),
      fullId: data.id,
      user: data.clientName || 'Client',
      expert: data.expertName || 'Expert',
      type: data.sessionTitle ? 'Session' : 'Booking',
      date: data.paidAt
        ? new Date(data.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: `$${((data.price || 0) / 100).toFixed(2)}`,
      rawAmount: (data.price || 0) / 100,
      status: data.paymentStatus === 'paid' ? 'completed' : data.status === 'cancelled' ? 'cancelled' : 'pending',
      scenario: commission?.scenario || null,
    };
  }), [bookingDocs, commissionsByBookingId]);

  const allTxns = liveTxns.length > 0 ? liveTxns : (adminData?.recentTransactions?.map(t => ({ ...t, rawAmount: parseFloat(t.amount?.replace('$', '') || 0), scenario: null })) || []);

  const types = [...new Set(allTxns.map(t => t.type))];

  const filtered = allTxns.filter(t =>
    (statusFilter === 'all' || t.status === statusFilter) &&
    (typeFilter === 'all' || t.type === typeFilter)
  );

  const totalVolume = allTxns.reduce((s, t) => s + (t.rawAmount || 0), 0);
  const completedCnt = allTxns.filter(t => t.status === 'completed').length;
  const pendingCnt = allTxns.filter(t => t.status === 'pending').length;

  const handleExportCSV = () => {
    if (filtered.length === 0) { notify?.('No transactions to export', 'warn'); return; }
    const rows = [
      ['ID', 'User', 'Expert', 'Type', 'Date', 'Amount', 'Status', 'Scenario'],
      ...filtered.map(t => [t.id, t.user, t.expert || '', t.type, t.date, t.amount, t.status, t.scenario ? SCENARIO_LABELS[t.scenario] : '']),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    notify?.('CSV exported!', 'success');
  };

  const statusColor = { completed: 'var(--teal)', pending: 'var(--gb)', cancelled: '#e84444' };
  const statusBg = { completed: 'rgba(26,184,160,0.08)', pending: 'rgba(255,155,81,0.08)', cancelled: 'rgba(232,68,68,0.08)' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Transactions</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Monitor all platform financial activity in real-time</p>
        </div>
        <button onClick={handleExportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: 'var(--gd)' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Volume', val: `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'All transactions', color: 'var(--teal)', icon: <DollarSign size={18} color="var(--teal)" /> },
          { label: 'Completed', val: completedCnt, sub: 'Successfully processed', color: 'var(--teal)', icon: <CheckCircle size={18} color="var(--teal)" /> },
          { label: 'Pending', val: pendingCnt, sub: 'Awaiting confirmation', color: 'var(--gb)', icon: <Clock size={18} color="var(--gb)" /> },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div className="stat-label">{s.label}</div>
              {s.icon}
            </div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', color: s.color, fontWeight: 600, marginTop: 6 }}>{s.sub}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: s.color, opacity: 0.25 }} />
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--ch)' }}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--ch)' }}>
          <option value="all">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', background: 'rgba(26,184,160,0.06)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)' }}>
          {loading ? 'Syncing...' : `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {filtered.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Client</th>
                <th>Expert</th>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Scenario</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn, i) => (
                <tr key={i}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--mu)', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                      {txn.id}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{txn.user}</td>
                  <td style={{ color: 'var(--mu)', fontSize: '0.82rem' }}>{txn.expert || '—'}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(26,184,160,0.06)', color: 'var(--teal)' }}>
                      {txn.type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--mu)', fontSize: '0.82rem' }}>{txn.date}</td>
                  <td style={{ fontWeight: 700, color: 'var(--teal)' }}>+{txn.amount}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: statusBg[txn.status] || 'rgba(0,0,0,0.05)', color: statusColor[txn.status] || 'var(--mu)' }}>
                      {txn.status === 'completed' ? <CheckCircle size={10} /> : <Clock size={10} />} {txn.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--mu)', fontSize: '0.78rem' }}>{txn.scenario ? SCENARIO_LABELS[txn.scenario] : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <CreditCard size={48} color="rgba(0,0,0,0.1)" />
            </div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600 }}>No transactions found</div>
            <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try adjusting filters or waiting for bookings to come in</div>
          </div>
        )}
      </div>
    </div>
  );
}
