import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';

export function Earnings({ user, affiliateData, notify }) {
  const { currentUser } = useAuth();
  const [period, setPeriod] = useState('all');
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const commissions = parseFloat(affiliateData?.totalCommissions?.replace('$', '') || 0);
  const pending = parseFloat(affiliateData?.pendingPayout || 0);
  const total = parseFloat(affiliateData?.totalEarnings?.replace('$', '') || 0);
  const withdrawn = Math.max(0, total - pending);

  const handleRequestPayout = async () => {
    if (pending < 50) return notify(`Minimum payout is $50. You have $${pending} pending.`, 'warn');
    if (payoutRequested) return;
    setRequesting(true);
    try {
      if (currentUser) {
        await addDoc(collection(db, 'payoutRequests'), {
          affiliateId: currentUser.uid,
          affiliateName: user?.name || '',
          affiliateEmail: user?.email || currentUser.email || '',
          amount: pending,
          status: 'pending',
          requestedAt: new Date().toISOString(),
        });
      }
      setPayoutRequested(true);
      notify('Payout requested! You will be notified within 2 business days.', 'success');
    } catch (e) {
      console.error(e);
      notify('Failed to submit payout request', 'error');
    } finally { setRequesting(false); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Earnings & Payouts</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Your commission history and payout records</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid rgba(26,184,160,0.15)', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--ch)' }}>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Commissions', val: `$${commissions.toLocaleString()}`, ch: 'All commissions earned', color: 'var(--teal)', icon: <DollarSign size={18} color="var(--teal)" /> },
          { label: 'Pending Payout', val: `$${pending}`, ch: 'Ready to withdraw', color: 'var(--gb)', icon: <Clock size={18} color="var(--gb)" /> },
          { label: 'Total Withdrawn', val: `$${withdrawn.toLocaleString()}`, ch: 'Successfully paid out', color: 'var(--gd)', icon: <CheckCircle size={18} color="var(--gd)" /> },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div className="stat-label">{s.label}</div>
              {s.icon}
            </div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color, marginTop: '6px' }}>{s.ch}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: s.color, opacity: 0.25 }} />
          </div>
        ))}
      </div>

      {/* Pending Payout Banner */}
      <div style={{
        marginBottom: '24px', padding: '16px 20px',
        background: pending >= 50 ? 'rgba(26,184,160,0.05)' : 'rgba(0,0,0,0.02)',
        borderRadius: '12px', border: `1.5px solid ${pending >= 50 ? 'rgba(26,184,160,0.18)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '4px' }}>
            {pending >= 50 ? `$${pending} ready for withdrawal` : `$${pending} pending — $${Math.max(0, 50 - pending).toFixed(2)} more needed`}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>
            {payoutRequested ? 'Payout request submitted. Processing within 2 business days.' : 'Payouts process every 2 weeks on Fridays. Min. $50.'}
          </div>
        </div>
        <button onClick={handleRequestPayout} disabled={requesting || payoutRequested || pending < 50}
          style={{
            padding: '10px 20px',
            background: payoutRequested ? 'rgba(0,0,0,0.05)' : pending >= 50 ? 'var(--teal)' : 'rgba(0,0,0,0.05)',
            color: payoutRequested ? 'var(--mu)' : pending >= 50 ? '#fff' : 'var(--mu)',
            borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem',
            cursor: pending >= 50 && !payoutRequested ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}>
          {requesting ? 'Submitting...' : payoutRequested ? '✓ Requested' : 'Request Payout'}
        </button>
      </div>

      {/* Payout History */}
      <div className="table-wrap">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>Payout History</div>
        </div>
        {affiliateData?.payouts?.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {affiliateData.payouts.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{p.date}</td>
                  <td style={{ fontWeight: 700, color: 'var(--teal)' }}>+{String(p.amount).includes('$') ? p.amount : `$${p.amount}`}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(26,184,160,0.08)', color: 'var(--teal)' }}>
                      {p.method}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(26,184,160,0.1)', color: 'var(--teal)' }}>
                      ✓ {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(26,184,160,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <DollarSign size={22} color="var(--teal)" />
            </div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, marginBottom: 4 }}>No payouts yet</div>
            <div style={{ fontSize: '0.82rem' }}>Reach the $50 minimum to request your first payout</div>
          </div>
        )}
      </div>
    </div>
  );
}
