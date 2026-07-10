import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getExpertAffiliateStats } from '../../../../services/affiliateService';
import { db } from '../../../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';

export function Affiliate({ user, notify }) {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ referralCount: 0, sellingEarnings: 0, referralEarnings: 0, totalEarned: 0, pendingCount: 0, referrals: [] });
  const [loading, setLoading] = useState(true);
  const [payoutRequested, setPayoutRequested] = useState(false);

  const referralLink = user?.handle ? `https://mindgigs.com/${user.handle}` : null;
  const pendingPayout = (user?.pendingPayout || 0) / 100;
  const totalEarned = (user?.affiliateEarnings || 0) / 100;

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    getExpertAffiliateStats(currentUser.uid)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    notify?.('Profile link copied!', 'success');
  };

  const handlePayout = async () => {
    if (pendingPayout < 50) { notify?.(`Minimum payout is $50. You have $${pendingPayout.toFixed(2)} pending.`, 'warn'); return; }
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
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Affiliate Program</h2>
        <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Anyone who signs up via your profile link is linked to you for life. You earn 80% when they buy from you, or a 10% lifetime bonus when they buy from another expert.</p>
      </div>

      {/* Referral link */}
      <div className="card" style={{ marginBottom: 28, padding: 24, background: 'linear-gradient(135deg, rgba(84,119,146,0.05), rgba(26,184,160,0.05))', border: '1px solid rgba(84,119,146,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
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
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Total Referrals', val: stats.referralCount, color: 'var(--teal)' },
          { label: 'Total Earned', val: `$${totalEarned.toFixed(2)}`, color: 'var(--gl)' },
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
            {pendingPayout >= 50 ? `$${pendingPayout.toFixed(2)} ready for withdrawal` : `$${pendingPayout.toFixed(2)} pending — need $${Math.max(0, 50 - pendingPayout).toFixed(2)} more`}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>Minimum payout $50 · processed within 2 business days</div>
        </div>
        <button
          onClick={handlePayout}
          disabled={payoutRequested || pendingPayout < 50}
          style={{ padding: '10px 20px', background: payoutRequested ? 'rgba(0,0,0,0.05)' : pendingPayout >= 50 ? 'var(--teal)' : 'rgba(0,0,0,0.05)', color: payoutRequested || pendingPayout < 50 ? 'var(--mu)' : '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', cursor: payoutRequested || pendingPayout < 50 ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
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
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(26,184,160,0.04)', border: '1px solid rgba(26,184,160,0.1)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Standard Sale</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--teal)', marginBottom: 4 }}>70%</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>No referral or coupon involved. You earn 70%, mindGigs keeps 30%.</p>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(84,119,146,0.04)', border: '1px solid rgba(84,119,146,0.1)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>They Buy From You</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gb)', marginBottom: 4 }}>80%</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>Someone who signed up via your link buys from you: 70% selling + 10% referral, mindGigs keeps 20%.</p>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(255,155,81,0.05)', border: '1px solid rgba(255,155,81,0.15)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>They Buy Elsewhere</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gl)', marginBottom: 4 }}>+10%</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>Someone who signed up via your link buys from another expert: you still earn a 10% lifetime bonus, mindGigs keeps 20%.</p>
            </div>
          </div>
          {/* Recent referrals */}
          {stats.referrals.length > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 12 }}>Recent Referrals</div>
              {stats.referrals.slice(0, 5).map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--ch)' }}>{r.email || r.name || 'Referred user'}</span>
                  <span style={{ color: 'var(--mu)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
