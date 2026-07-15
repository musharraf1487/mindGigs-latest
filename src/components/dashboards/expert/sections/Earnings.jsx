import React, { useState, useEffect } from 'react';
import { ProfIcon } from '../../../common/ProfIcon';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getSellerCommissions, SCENARIO_LABELS } from '../../../../services/affiliateService';

const MIN_PAYOUT = 50;

// Selling earnings ONLY — money made as the seller (sellerAmount on
// commissions where sellerId == this expert). Never reads affiliateEarnings;
// see sections/Affiliate.jsx for that bucket.
export function Earnings({ user, notify }) {
  const { currentUser } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payoutRequested, setPayoutRequested] = useState(false);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    getSellerCommissions(currentUser.uid)
      .then(setCommissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  const sellingEarnings = (user?.sellingEarnings || 0) / 100;
  const pendingPayout = (user?.pendingPayout || 0) / 100;
  const pendingCount = commissions.filter((c) => c.status === 'pending').length;

  const handleExportCSV = () => {
    if (commissions.length === 0) {
      notify('No transactions to export', 'warn');
      return;
    }
    const headers = ['Date', 'Sale Type', 'Scenario', 'Sale Amount', 'Your Cut'];
    const rows = commissions.map((c) => [
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
      c.saleType || '',
      SCENARIO_LABELS[c.scenario] || c.scenario,
      `$${((c.saleAmount || 0) / 100).toFixed(2)}`,
      `$${((c.sellerAmount || 0) / 100).toFixed(2)}`,
    ].map((v) => `"${v}"`).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `selling_earnings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('CSV exported successfully');
  };

  const handleRequestPayout = async () => {
    if (pendingPayout < MIN_PAYOUT) {
      notify(`Minimum payout is $${MIN_PAYOUT}. You have $${pendingPayout.toFixed(2)} pending.`, 'warn');
      return;
    }
    if (payoutRequested || !currentUser) return;
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
      notify('Payout request submitted. Processing within 2 business days.', 'success');
    } catch (err) {
      console.error(err);
      notify('Failed to submit payout request', 'error');
    }
  };

  const formatCurrency = (val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const displayStats = [
    { label: 'Selling Earnings', val: formatCurrency(sellingEarnings), icon: 'dollar', color: 'gr' },
    { label: 'Pending Commissions', val: pendingCount, icon: 'clock', color: 'yl' },
    { label: 'Pending Payout', val: formatCurrency(pendingPayout), icon: 'check', color: 'tl' },
  ];

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--mu)' }}>Loading financial data...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Selling Earnings</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Money you earned as the seller — affiliate/referral bonuses live in the Affiliate tab.</p>
        </div>
      </div>

      <div className="grid-3" style={{ gap: '24px', marginBottom: '32px' }}>
        {displayStats.map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>{s.label}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--gd)' }}>{s.val}</div>
              <ProfIcon icon={s.icon} size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '30px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--gd)' }}>Selling History</h3>
          <button className="btn btn-gh btn-sm" onClick={handleExportCSV}>Export CSV</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Sale Type</th>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Scenario</th>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase', textAlign: 'right' }}>Your Cut</th>
              </tr>
            </thead>
            <tbody>
              {commissions.length > 0 ? (
                commissions.slice(0, 20).map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i === commissions.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--sl)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--gd)', fontSize: '0.9rem', textTransform: 'capitalize' }}>{c.saleType || '—'}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--sl)' }}>{SCENARIO_LABELS[c.scenario] || `Scenario ${c.scenario}`}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: 'var(--gb)', fontSize: '0.95rem' }}>+${((c.sellerAmount || 0) / 100).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--mu)' }}>No sales yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          className={`btn ${payoutRequested ? 'btn-gh' : 'btn-gr'}`}
          style={{ padding: '12px 32px' }}
          onClick={handleRequestPayout}
          disabled={payoutRequested || pendingPayout < MIN_PAYOUT}
        >
          {payoutRequested ? 'Payout Processing...' : 'Request Payout'}
        </button>
        {payoutRequested ? (
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--mu)' }}>Your payout request is being processed. Funds will arrive in 1-2 business days.</div>
        ) : (
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--mu)' }}>Minimum payout is ${MIN_PAYOUT} — this requests your full pending balance (selling + affiliate combined).</div>
        )}
      </div>
    </>
  );
}
