import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { CreditCard, CheckCircle, Clock, DollarSign, Download, Send } from 'lucide-react';
import { SCENARIO_LABELS } from '../../../../services/affiliateService';

const PAYOUT_STATUSES = ['pending', 'processing', 'sent', 'confirmed'];
const NEXT_STATUS = { pending: 'processing', processing: 'sent', sent: 'confirmed' };
const NEXT_LABEL = { pending: 'Mark Processing', processing: 'Mark Sent', sent: 'Mark Confirmed' };
const STATUS_COLOR = {
  pending: 'var(--gb)',
  processing: 'var(--gl)',
  sent: 'var(--teal)',
  confirmed: 'var(--gd)',
};

export function Transactions({ user, adminData, notify }) {
  const [commissions, setCommissions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const [updatingPayoutId, setUpdatingPayoutId] = useState(null);

  // Full commission audit trail — the single source of truth for every sale
  // ever processed, replacing the old booking-price-based transactions view.
  useEffect(() => {
    const q = query(collection(db, 'commissions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCommissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Commissions listener error:', err);
      setCommissions([]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'payoutRequests'), orderBy('requestedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPayouts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Payout requests listener error:', err));
    return () => unsubscribe();
  }, []);

  const filtered = scenarioFilter === 'all' ? commissions : commissions.filter((c) => String(c.scenario) === scenarioFilter);

  const totalVolume = commissions.reduce((s, c) => s + (c.saleAmount || 0), 0) / 100;
  const totalPlatform = commissions.reduce((s, c) => s + (c.platformAmount || 0), 0) / 100;

  const thisMonthPlatformEarnings = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return commissions
      .filter((c) => c.createdAt && new Date(c.createdAt) >= monthStart)
      .reduce((s, c) => s + (c.platformAmount || 0), 0) / 100;
  }, [commissions]);

  const handleExportCSV = () => {
    if (filtered.length === 0) { notify?.('No transactions to export', 'warn'); return; }
    const rows = [
      ['Date', 'Booking ID', 'Sale Type', 'Sale Amount', 'Scenario', 'Seller Amount', 'Person A Amount', 'Person B Amount', 'mindGigs Amount', 'Status'],
      ...filtered.map((c) => [
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
        c.bookingId || '',
        c.saleType || '',
        `$${((c.saleAmount || 0) / 100).toFixed(2)}`,
        SCENARIO_LABELS[c.scenario] || c.scenario,
        `$${((c.sellerAmount || 0) / 100).toFixed(2)}`,
        `$${((c.personAAmount || 0) / 100).toFixed(2)}`,
        `$${((c.personBAmount || 0) / 100).toFixed(2)}`,
        `$${((c.platformAmount || 0) / 100).toFixed(2)}`,
        c.status || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `commissions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    notify?.('CSV exported!', 'success');
  };

  const handleAdvancePayoutStatus = async (payout) => {
    const next = NEXT_STATUS[payout.status];
    if (!next || !payout.affiliateId) return;
    setUpdatingPayoutId(payout.id);
    try {
      await updateDoc(doc(db, 'payoutRequests', payout.id), { status: next, [`${next}At`]: new Date().toISOString() });
      // "Sent" is the moment money actually left the platform — decrement the
      // recipient's pendingPayout by the paid amount (stored in dollars on
      // the payout doc, pendingPayout is tracked in cents).
      if (next === 'sent') {
        const amountCents = Math.round((payout.amount || 0) * 100);
        await updateDoc(doc(db, 'users', payout.affiliateId), {
          pendingPayout: increment(-amountCents),
        });
      }
      notify?.(`Payout marked ${next}.`, 'success');
    } catch (err) {
      console.error('Failed to advance payout status:', err);
      notify?.('Failed to update payout status', 'error');
    } finally {
      setUpdatingPayoutId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Transactions</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Full commission audit trail — every sale, every split, live</p>
        </div>
        <button onClick={handleExportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: 'var(--gd)' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stats Row — this month's platform earnings is the summary row the spec asks for */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'This Month — mindGigs Earnings', val: `$${thisMonthPlatformEarnings.toFixed(2)}`, sub: 'Platform cut, this calendar month', color: 'var(--teal)', icon: <DollarSign size={18} color="var(--teal)" /> },
          { label: 'Total Volume', val: `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'All-time sale amount', color: 'var(--gd)', icon: <CreditCard size={18} color="var(--gd)" /> },
          { label: 'Total mindGigs Earnings', val: `$${totalPlatform.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'All-time platform cut', color: 'var(--gb)', icon: <CheckCircle size={18} color="var(--gb)" /> },
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
        <select value={scenarioFilter} onChange={(e) => setScenarioFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--ch)' }}>
          <option value="all">All Scenarios</option>
          {Object.entries(SCENARIO_LABELS).map(([num, label]) => (
            <option key={num} value={num}>{num} — {label}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', background: 'rgba(26,184,160,0.06)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)' }}>
          {loading ? 'Syncing...' : `${filtered.length} commission${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Commission Table */}
      <div className="table-wrap" style={{ marginBottom: 32 }}>
        {filtered.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Booking ID</th>
                  <th>Sale Type</th>
                  <th>Sale Amount</th>
                  <th>Scenario</th>
                  <th>Seller</th>
                  <th>Person A</th>
                  <th>Person B</th>
                  <th>mindGigs</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--mu)', fontSize: '0.82rem' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--mu)', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                        {c.bookingId ? c.bookingId.slice(0, 8).toUpperCase() : '—'}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(26,184,160,0.06)', color: 'var(--teal)' }}>
                        {c.saleType || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>${((c.saleAmount || 0) / 100).toFixed(2)}</td>
                    <td title={SCENARIO_LABELS[c.scenario]} style={{ fontSize: '0.8rem', color: 'var(--sl)' }}>
                      {c.scenario} — {SCENARIO_LABELS[c.scenario] || 'Unknown'}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--gb)' }}>${((c.sellerAmount || 0) / 100).toFixed(2)}</td>
                    <td style={{ color: c.personAAmount ? 'var(--gl)' : 'var(--mu)', fontWeight: c.personAAmount ? 700 : 400 }}>{c.personAAmount ? `$${(c.personAAmount / 100).toFixed(2)}` : '—'}</td>
                    <td style={{ color: c.personBAmount ? 'var(--gl)' : 'var(--mu)', fontWeight: c.personBAmount ? 700 : 400 }}>{c.personBAmount ? `$${(c.personBAmount / 100).toFixed(2)}` : '—'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--teal)' }}>${((c.platformAmount || 0) / 100).toFixed(2)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: c.status === 'paid' ? 'rgba(26,184,160,0.08)' : 'rgba(255,155,81,0.08)', color: c.status === 'paid' ? 'var(--teal)' : 'var(--gb)' }}>
                        {c.status === 'paid' ? <CheckCircle size={10} /> : <Clock size={10} />} {c.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <CreditCard size={48} color="rgba(0,0,0,0.1)" />
            </div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600 }}>No commissions found</div>
            <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try a different scenario filter, or wait for sales to come in</div>
          </div>
        )}
      </div>

      {/* Payout Requests — Pending → Processing → Sent → Confirmed */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '1rem', color: 'var(--gd)', marginBottom: '4px' }}>Payout Requests</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--mu)' }}>Marking a request "Sent" deducts the amount from that user's pending balance.</div>
      </div>
      <div className="table-wrap">
        {payouts.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Name</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--mu)', fontSize: '0.82rem' }}>{p.requestedAt ? new Date(p.requestedAt).toLocaleDateString() : '—'}</td>
                  <td style={{ fontWeight: 600 }}>{p.affiliateName || '—'}</td>
                  <td style={{ color: 'var(--sl)', fontSize: '0.85rem' }}>{p.affiliateEmail || '—'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--teal)' }}>${Number(p.amount || 0).toFixed(2)}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize', background: 'rgba(0,0,0,0.04)', color: STATUS_COLOR[p.status] || 'var(--mu)' }}>
                      {p.status || 'pending'}
                    </span>
                  </td>
                  <td>
                    {NEXT_STATUS[p.status] ? (
                      <button
                        onClick={() => handleAdvancePayoutStatus(p)}
                        disabled={updatingPayoutId === p.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: updatingPayoutId === p.id ? 'wait' : 'pointer', background: 'rgba(26,184,160,0.08)', color: 'var(--teal)', border: '1px solid rgba(26,184,160,0.18)' }}>
                        <Send size={12} /> {updatingPayoutId === p.id ? 'Updating…' : NEXT_LABEL[p.status]}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--mu)' }}>✓ Complete</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--mu)' }}>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600 }}>No payout requests yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
