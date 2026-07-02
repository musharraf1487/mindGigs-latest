import React, { useState } from 'react';
import { ProfIcon } from '../../../common/ProfIcon';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';

export function Overview({ user, affiliateData, notify }) {
  const { currentUser } = useAuth();
  const [payoutRequested, setPayoutRequested] = useState(false);
  const stats = [
    { label: 'Total Earnings', val: affiliateData?.totalEarnings || '$0', ch: 'All-time commission', color: 'var(--teal)', icon: 'dollar' },
    { label: 'Active Referrals', val: affiliateData?.referrals?.length || 0, ch: 'Approved experts', color: 'var(--teal)', icon: 'users' },
    { label: 'Active Campaigns', val: affiliateData?.campaigns?.length || 0, ch: 'Marketing efforts', color: 'var(--gb)', icon: 'megaphone' },
    { label: 'Pending Payout', val: `$${affiliateData?.pendingPayout || '0'}`, ch: 'Ready to withdraw', color: 'var(--gb)', icon: 'clock' },
  ];

  const username = user?.username || user?.name?.split(' ')[0]?.toLowerCase() || 'zaid';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>
          Welcome {user?.name?.split(' ')[0]}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Here's your affiliate performance at a glance</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div className="stat-label">{s.label}</div>
              <ProfIcon icon={s.icon} size={18} />
            </div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color, marginTop: '6px' }}>{s.ch}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: s.color, opacity: 0.3 }} />
          </div>
        ))}
      </div>

      {/* Affiliate Link */}
      <div style={{
        marginBottom: '24px', padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(191,201,209,0.08), rgba(191,201,209,0.03))',
        borderRadius: '12px', border: '1.5px solid rgba(191,201,209,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--gd)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ProfIcon icon="link" size={14} /> Your Affiliate Link
          </div>
          <div className="ref-box" style={{ marginTop: 0 }}>
            <span className="ref-url">https://mindgigs.com/ref/{username}</span>
          </div>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`https://mindgigs.com/ref/${username}`);
            notify?.('Affiliate link copied!', 'success');
          }}
          style={{
            padding: '10px 18px', background: 'var(--teal)', color: '#fff',
            borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600,
            fontSize: '0.82rem', cursor: 'pointer', flexShrink: 0,
          }}
        >Copy Link</button>
      </div>

      {/* Two-column: Commissions + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Commission Breakdown */}
        <div className="stat-card">
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '16px' }}>
            Commission Breakdown
          </div>
          {[
            { label: 'Total Commissions', val: affiliateData?.totalCommissions, color: 'var(--gl)' },
            { label: 'Total Earnings', val: affiliateData?.totalEarnings, color: 'var(--teal)' },
            { label: 'Pending Payout', val: `$${affiliateData?.pendingPayout}`, color: 'var(--gold)' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', marginBottom: '8px',
              background: 'var(--gmt)', borderRadius: '8px',
              border: '1px solid rgba(255,155,81,0.07)',
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--mu)' }}>{item.label}</span>
              <span style={{ fontFamily: 'var(--fu)', fontWeight: 800, color: item.color }}>{item.val}</span>
            </div>
          ))}
          <button
            onClick={async () => {
              const pending = parseFloat(affiliateData?.pendingPayout || 0);
              if (pending < 50) { notify?.(`Minimum payout is $50. You have $${pending} pending.`, 'warn'); return; }
              if (payoutRequested) return;
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
                notify?.('Payout requested! Processing within 2 business days.', 'success');
              } catch (e) { notify?.('Failed to submit request', 'error'); }
            }}
            disabled={payoutRequested}
            style={{
              marginTop: '12px', width: '100%', padding: '10px',
              background: payoutRequested ? 'rgba(0,0,0,0.05)' : 'var(--teal)',
              color: payoutRequested ? 'var(--mu)' : '#fff', borderRadius: '8px',
              fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: payoutRequested ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >{payoutRequested ? '✓ Requested' : 'Request Payout'}</button>
        </div>

        {/* Recent Activity */}
        <div className="stat-card">
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '16px' }}>
            Recent Activity
          </div>
          {affiliateData?.activities?.slice(0, 4).map((a, i) => (
            <div key={i} className="activity-item" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <ProfIcon icon={a.icon} size={14} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--ch)', marginBottom: '2px' }}>{a.text}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--mu)' }}>{a.time}</div>
              </div>
              {a.val && <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--gl)', flexShrink: 0 }}>{a.val}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
