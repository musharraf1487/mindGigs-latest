import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getExpertReferrals, getAffiliateRoleCommissions, SCENARIO_LABELS } from '../../../../services/affiliateService';

const MIN_PAYOUT = 50;

// Affiliate earnings ONLY — money made for bringing in a sale (as Person A,
// the affiliate who onboarded this expert, or Person B, this expert's own
// handle/coupon used on a purchase). Never reads sellingEarnings; see
// sections/Earnings.jsx for that bucket.
export function Affiliate({ user, notify }) {
  const { currentUser } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payoutRequested, setPayoutRequested] = useState(false);

  const referralLink = user?.handle ? `https://mindgigs.com/${user.handle}` : null;
  const pendingPayout = (user?.pendingPayout || 0) / 100;
  const totalEarned = (user?.affiliateEarnings || 0) / 100;

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    Promise.all([
      getExpertReferrals(currentUser.uid),
      getAffiliateRoleCommissions(currentUser.uid),
    ])
      .then(([r, c]) => { setReferrals(r); setCommissions(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    notify?.('Profile link copied!', 'success');
  };

  const handleCopyCode = () => {
    if (!user?.handle) return;
    navigator.clipboard.writeText(user.handle);
    notify?.('Coupon code copied!', 'success');
  };

  const handlePayout = async () => {
    if (pendingPayout < MIN_PAYOUT) { notify?.(`Minimum payout is $${MIN_PAYOUT}. You have $${pendingPayout.toFixed(2)} pending.`, 'warn'); return; }
    if (payoutRequested) return;
    try {
      await addDoc(collection(db, 'payoutRequests'), {
        affiliateId: currentUser.uid,
        affiliateName: user?.name || '',
        affiliateEmail: user?.email || '',
        amount: pendingPayout,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });
      setPayoutRequested(true);
      notify?.('Payout requested! Processing within 2 business days.', 'success');
    } catch { notify?.('Failed to submit payout request', 'error'); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--mu)' }}>Loading affiliate data...</div>;

  return (
    <>
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Affiliate Earnings</h2>
        <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>
          Your handle <strong>{user?.handle || '—'}</strong> doubles as your coupon code — clients can enter it at checkout on
          any expert's page. You earn 7.5% lifetime on anyone who signed up via your profile link, plus 7.5% one-time whenever
          your handle is used as a coupon.
        </p>
      </div>

      {/* Profile link / coupon code */}
      <div className="card" style={{ marginBottom: 28, padding: 24, background: 'linear-gradient(135deg, rgba(84,119,146,0.05), rgba(26,184,160,0.05))', border: '1px solid rgba(84,119,146,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Your Profile Link</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--sl)', fontFamily: 'monospace', background: '#fff', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', wordBreak: 'break-all' }}>
                {referralLink || 'Set a username to get your profile link'}
              </div>
              <button className="btn btn-gr" style={{ padding: '10px 18px', flexShrink: 0 }} onClick={handleCopy} disabled={!referralLink}>Copy</button>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Your Coupon Code</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--sl)', fontFamily: 'monospace', fontWeight: 700, background: '#fff', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                {user?.handle || 'Set a username to get a coupon code'}
              </div>
              <button className="btn btn-gr" style={{ padding: '10px 18px', flexShrink: 0 }} onClick={handleCopyCode} disabled={!user?.handle}>Copy</button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 8 }}>Clients can enter this at checkout on any expert's product, subscription, or session.</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Total Referrals', val: referrals.length, color: 'var(--teal)' },
          { label: 'Total Affiliate Earnings', val: `$${totalEarned.toFixed(2)}`, color: 'var(--gl)' },
          { label: 'Pending Payout', val: `$${pendingPayout.toFixed(2)}`, color: 'var(--gb)' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="stat-label" style={{ marginBottom: 10 }}>{s.label}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: s.color, opacity: 0.25 }} />
          </div>
        ))}
      </div>

      {/* Payout */}
      <div className="card" style={{ marginBottom: 28, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: 4 }}>
            {pendingPayout >= MIN_PAYOUT ? `$${pendingPayout.toFixed(2)} ready for withdrawal` : `$${pendingPayout.toFixed(2)} pending — need $${Math.max(0, MIN_PAYOUT - pendingPayout).toFixed(2)} more`}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>Minimum payout ${MIN_PAYOUT} · processed within 2 business days · combines selling + affiliate balances</div>
        </div>
        <button
          onClick={handlePayout}
          disabled={payoutRequested || pendingPayout < MIN_PAYOUT}
          style={{ padding: '10px 20px', background: payoutRequested ? 'rgba(0,0,0,0.05)' : pendingPayout >= MIN_PAYOUT ? 'var(--teal)' : 'rgba(0,0,0,0.05)', color: payoutRequested || pendingPayout < MIN_PAYOUT ? 'var(--mu)' : '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', cursor: payoutRequested || pendingPayout < MIN_PAYOUT ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
          {payoutRequested ? '✓ Requested' : 'Request Payout'}
        </button>
      </div>

      {/* Commission breakdown */}
      <div className="card">
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gd)' }}>How It Works</h3>
        </div>
        <div style={{ padding: 24 }}>
          <div className="grid-3" style={{ gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(84,119,146,0.04)', border: '1px solid rgba(84,119,146,0.1)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>They Sign Up Via Your Link</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gb)', marginBottom: 4 }}>+7.5%</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>Lifetime — every sale that buyer ever makes, from you or any other expert.</p>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(255,155,81,0.05)', border: '1px solid rgba(255,155,81,0.15)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your Coupon Is Used</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gl)', marginBottom: 4 }}>+7.5%</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>One-time — a buyer types your handle as a coupon at checkout, on your own or another expert's page.</p>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(26,184,160,0.04)', border: '1px solid rgba(26,184,160,0.1)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Selling Money</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--teal)', marginBottom: 4 }}>See Earnings tab</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>Your 70% as the seller is tracked separately and never mixed in here.</p>
            </div>
          </div>

          {referrals.length > 0 && (
            <div style={{ marginBottom: commissions.length > 0 ? 24 : 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 12 }}>Recent Referrals</div>
              {referrals.slice(0, 5).map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--ch)' }}>{r.email || r.name || 'Referred user'}</span>
                  <span style={{ color: 'var(--mu)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          )}

          {commissions.length > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 12 }}>Affiliate Commission History</div>
              {commissions.slice(0, 8).map((c) => {
                const amount = c.personAId === currentUser?.uid ? c.personAAmount : c.personBAmount;
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--ch)' }}>{SCENARIO_LABELS[c.scenario] || `Scenario ${c.scenario}`}</span>
                    <span style={{ color: 'var(--mu)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                    <span style={{ fontWeight: 700, color: 'var(--teal)' }}>+${((amount || 0) / 100).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
