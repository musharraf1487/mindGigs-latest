import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';
import { getPersonACommissions, getPersonBCommissions, SCENARIO_LABELS } from '../../../../services/affiliateService';

const MIN_PAYOUT = 50;

export function Earnings({ user, notify }) {
  const { currentUser } = useAuth();
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [lifetimeCommissions, setLifetimeCommissions] = useState([]);
  const [oneTimeCommissions, setOneTimeCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    Promise.all([getPersonACommissions(currentUser.uid), getPersonBCommissions(currentUser.uid)])
      .then(([a, b]) => { setLifetimeCommissions(a); setOneTimeCommissions(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  const lifetimeTotal = lifetimeCommissions.reduce((s, c) => s + (c.personAAmount || 0), 0) / 100;
  const oneTimeTotal = oneTimeCommissions.reduce((s, c) => s + (c.personBAmount || 0), 0) / 100;
  const total = (user?.affiliateEarnings || 0) / 100;
  const pending = (user?.pendingPayout || 0) / 100;
  const withdrawn = Math.max(0, total - pending);

  // Combined history — date, scenario, amount, status — newest first.
  const history = [
    ...lifetimeCommissions.map((c) => ({ ...c, role: 'Lifetime', amount: c.personAAmount })),
    ...oneTimeCommissions.map((c) => ({ ...c, role: 'One-time', amount: c.personBAmount })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleRequestPayout = async () => {
    if (pending < MIN_PAYOUT) return notify(`Minimum payout is $${MIN_PAYOUT}. You have $${pending.toFixed(2)} pending.`, 'warn');
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

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--mu)' }}>Loading earnings...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Earnings & Payouts</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Lifetime commission from experts you onboarded, plus one-time commission from your coupon at checkout.</p>
      </div>

      {/* Lifetime vs one-time split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="stat-label">Lifetime Earnings</div>
          <div className="stat-val" style={{ color: 'var(--gb)' }}>${lifetimeTotal.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gb)', marginTop: '6px' }}>From experts you onboarded at signup</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--gb)', opacity: 0.25 }} />
        </div>
        <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="stat-label">One-Time Coupon Earnings</div>
          <div className="stat-val" style={{ color: 'var(--gl)' }}>${oneTimeTotal.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gl)', marginTop: '6px' }}>From your coupon used at checkout</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--gl)', opacity: 0.25 }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Earnings', val: `$${total.toFixed(2)}`, ch: 'All commissions earned', color: 'var(--teal)', icon: <DollarSign size={18} color="var(--teal)" /> },
          { label: 'Pending Payout', val: `$${pending.toFixed(2)}`, ch: 'Ready to withdraw', color: 'var(--gb)', icon: <Clock size={18} color="var(--gb)" /> },
          { label: 'Total Withdrawn', val: `$${withdrawn.toFixed(2)}`, ch: 'Already paid out', color: 'var(--gd)', icon: <CheckCircle size={18} color="var(--gd)" /> },
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
        background: pending >= MIN_PAYOUT ? 'rgba(26,184,160,0.05)' : 'rgba(0,0,0,0.02)',
        borderRadius: '12px', border: `1.5px solid ${pending >= MIN_PAYOUT ? 'rgba(26,184,160,0.18)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '4px' }}>
            {pending >= MIN_PAYOUT ? `$${pending.toFixed(2)} ready for withdrawal` : `$${pending.toFixed(2)} pending — $${Math.max(0, MIN_PAYOUT - pending).toFixed(2)} more needed`}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>
            {payoutRequested ? 'Payout request submitted. Processing within 2 business days.' : `Payouts process every 2 weeks on Fridays. Min. $${MIN_PAYOUT}.`}
          </div>
        </div>
        <button onClick={handleRequestPayout} disabled={requesting || payoutRequested || pending < MIN_PAYOUT}
          style={{
            padding: '10px 20px',
            background: payoutRequested ? 'rgba(0,0,0,0.05)' : pending >= MIN_PAYOUT ? 'var(--teal)' : 'rgba(0,0,0,0.05)',
            color: payoutRequested ? 'var(--mu)' : pending >= MIN_PAYOUT ? '#fff' : 'var(--mu)',
            borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem',
            cursor: pending >= MIN_PAYOUT && !payoutRequested ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}>
          {requesting ? 'Submitting...' : payoutRequested ? '✓ Requested' : 'Request Payout'}
        </button>
      </div>

      {/* Commission History */}
      <div className="table-wrap">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>Commission History</div>
        </div>
        {history.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Scenario</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 20).map((c, i) => (
                <tr key={`${c.id}-${c.role}-${i}`}>
                  <td style={{ fontWeight: 500 }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</td>
                  <td style={{ color: 'var(--sl)' }}>{SCENARIO_LABELS[c.scenario] || `Scenario ${c.scenario}`}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: c.role === 'Lifetime' ? 'rgba(84,119,146,0.1)' : 'rgba(255,155,81,0.1)', color: c.role === 'Lifetime' ? 'var(--gb)' : 'var(--gl)' }}>
                      {c.role}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--teal)' }}>+${((c.amount || 0) / 100).toFixed(2)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: c.status === 'paid' ? 'rgba(26,184,160,0.1)' : 'rgba(255,155,81,0.08)', color: c.status === 'paid' ? 'var(--teal)' : 'var(--gb)' }}>
                      {c.status === 'paid' ? '✓' : '○'} {c.status || 'pending'}
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
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, marginBottom: 4 }}>No commissions yet</div>
            <div style={{ fontSize: '0.82rem' }}>Share your coupon code to start earning</div>
          </div>
        )}
      </div>
    </div>
  );
}
