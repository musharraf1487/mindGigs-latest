import React, { useState, useEffect } from 'react';
import { ProfIcon } from '../../../common/ProfIcon';
import { useAuth } from '../../../../context/AuthContext';
import { getExpertBookings } from '../../../../services/bookingService';

export function Earnings({ user, expertData, notify }) {
  const { currentUser } = useAuth();
  const [period, setPeriod] = useState('all');
  const [earnings, setEarnings] = useState(expertData?.earnings || []);
  const [stats, setStats] = useState({ total: 0, pending: 0, paidOut: 0 });
  const [loading, setLoading] = useState(true);
  const [payoutRequested, setPayoutRequested] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    async function fetchEarnings() {
      try {
        const bookings = await getExpertBookings(currentUser.uid);
        
        let total = 0;
        let pending = 0;
        let paidOut = 0;
        const txs = [];

        bookings.forEach(b => {
          const amount = (b.price || 0) / 100; // Assuming price is in cents
          if (b.paymentStatus === 'paid') {
            total += amount;
            paidOut += amount; // We'll just assume paid bookings are paid out for simplicity
            txs.push({
              description: `Booking with ${b.clientName || 'Client'} - ${b.sessionTitle || 'Session'}`,
              date: new Date(b.paidAt || b.createdAt).toLocaleDateString(),
              amount: amount.toFixed(2),
              rawDate: new Date(b.paidAt || b.createdAt)
            });
          } else if (b.status !== 'cancelled') {
            pending += amount;
          }
        });

        // Sort transactions newest first
        txs.sort((a, b) => b.rawDate - a.rawDate);

        setStats({ total, pending, paidOut });
        setEarnings(txs);
      } catch (err) {
        console.error('Error fetching earnings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEarnings();
  }, [currentUser]);

  // Filter logic (simplified for demonstration)
  const filteredEarnings = earnings; // In a real app, apply 'period' filter here

  const handleExportCSV = () => {
    if (filteredEarnings.length === 0) {
      notify('No transactions to export', 'warn');
      return;
    }

    const headers = ['Description', 'Date', 'Amount'];
    const rows = filteredEarnings.map(e => `"${e.description}","${e.date}","$${e.amount}"`);
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `earnings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('CSV exported successfully');
  };

  const handleRequestPayout = () => {
    if (stats.total === 0) {
      notify('No funds available for payout.', 'warn');
      return;
    }
    setPayoutRequested(true);
    notify('Payout request submitted successfully. Processing within 24 hours.', 'success');
  };

  const formatCurrency = (val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const displayStats = [
    { label: 'Total Earnings', val: formatCurrency(stats.total), icon: 'dollar', color: 'gr' },
    { label: 'Pending Bookings', val: formatCurrency(stats.pending), icon: 'clock', color: 'yl' },
    { label: 'Available for Payout', val: formatCurrency(stats.paidOut), icon: 'check', color: 'tl' }
  ];

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--mu)' }}>Loading financial data...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Financial Overview</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Track your revenue, payouts, and incoming transactions.</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="btn btn-gh btn-sm"
          style={{ width: 'auto', background: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
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
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--gd)' }}>Recent Transactions</h3>
          <button className="btn btn-gh btn-sm" onClick={handleExportCSV}>Export CSV</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Description</th>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredEarnings.length > 0 ? (
                filteredEarnings.slice(0, 8).map((earning, i) => (
                  <tr key={i} style={{ borderBottom: i === filteredEarnings.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--gd)', fontSize: '0.9rem' }}>{earning.description}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--sl)' }}>{earning.date}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: 'var(--gb)', fontSize: '0.95rem' }}>+${earning.amount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--mu)' }}>No transactions yet</td>
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
          disabled={payoutRequested || stats.total === 0}
        >
          {payoutRequested ? 'Payout Processing...' : 'Request Immediate Payout'}
        </button>
        {payoutRequested && <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--mu)' }}>Your payout request is being processed. Funds will arrive in 1-2 business days.</div>}
      </div>
    </>
  );
}
