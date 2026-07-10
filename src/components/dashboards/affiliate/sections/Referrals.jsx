import React, { useState } from 'react';
import { Users, DollarSign, Copy, Mail, Plus, Lightbulb, User } from 'lucide-react';

function InviteModal({ onClose, notify, affiliateCode }) {
  const [email, setEmail] = useState('');

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!email) return;
    if (!affiliateCode) { notify?.('Your coupon code has not been assigned yet.', 'warn'); return; }
    const subject = encodeURIComponent("Save with my mindGigs coupon!");
    const body = encodeURIComponent(`Hi there,\n\nUse my coupon code ${affiliateCode} at signup or checkout on mindGigs.\n\nBest,`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    notify?.(`Invite email draft opened for ${email}`, 'success');
    onClose();
  };

  const handleCopy = () => {
    if (!affiliateCode) { notify?.('Your coupon code has not been assigned yet.', 'warn'); return; }
    navigator.clipboard.writeText(affiliateCode);
    notify?.('Coupon code copied!', 'success');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 30, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={18} color="var(--teal)" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>Invite a Buyer</h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: 20 }}>
          Share your coupon code <strong style={{ fontFamily: 'monospace' }}>{affiliateCode}</strong> — tell them to enter it at signup or checkout on any expert's session, subscription, or product.
        </p>

        <form onSubmit={handleSendInvite}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Their Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="friend@example.com" required style={{ width: '100%', padding: '10px 14px', border: '1.5px solid rgba(26,184,160,0.18)', borderRadius: '8px', fontSize: '0.875rem' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-gh" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={handleCopy}>
              <Copy size={16} /> Copy Code
            </button>
            <button type="submit" className="btn btn-gr" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Mail size={16} /> Send Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Referrals({ user, affiliateData, notify }) {
  const [showInvite, setShowInvite] = useState(false);
  const affiliateCode = user?.affiliateCode || null;

  const referredUsers = affiliateData?.referrals || [];
  const total = referredUsers.length;

  // Per-buyer commission earned, derived from the commissions list already
  // loaded by AffiliateDashboard.jsx (each commission doc carries buyerId).
  const commissions = affiliateData?.commissions || [];
  const earningsByBuyer = commissions.reduce((acc, c) => {
    if (!c.buyerId) return acc;
    acc[c.buyerId] = (acc[c.buyerId] || 0) + (c.affiliateAmount || 0);
    return acc;
  }, {});
  const totalEarned = commissions.reduce((s, c) => s + (c.affiliateAmount || 0), 0) / 100;

  return (
    <div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} notify={notify} affiliateCode={affiliateCode} />}

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>My Referrals</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Buyers who used your coupon code, and what they've earned you</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          <Plus size={14} /> Invite a Buyer
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Referred', val: total, color: 'var(--teal)', icon: <Users size={18} color="var(--teal)" /> },
          { label: 'Total Commission Earned', val: `$${totalEarned.toFixed(2)}`, color: 'var(--gd)', icon: <DollarSign size={18} color="var(--gd)" /> },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div className="stat-label">{s.label}</div>
              {s.icon}
            </div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: s.color, opacity: 0.25 }} />
          </div>
        ))}
      </div>

      {/* Referrals Table */}
      <div className="table-wrap">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>
            Referral List <span style={{ fontWeight: 400, color: 'var(--mu)', fontSize: '0.82rem' }}>({total})</span>
          </div>
        </div>
        {total > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Joined</th>
                <th>Earnings</th>
              </tr>
            </thead>
            <tbody>
              {referredUsers.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} color="var(--teal)" />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--ch)' }}>{r.name || r.email || 'Buyer'}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--mu)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</td>
                  <td style={{ fontWeight: 700, color: 'var(--teal)' }}>${((earningsByBuyer[r.id] || 0) / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(26,184,160,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Users size={22} color="var(--teal)" />
            </div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, marginBottom: 4 }}>No referrals yet</div>
            <div style={{ fontSize: '0.82rem', marginBottom: 16 }}>Start sharing your coupon code to earn commissions.</div>
          </div>
        )}
      </div>

      {/* Tip */}
      <div style={{
        marginTop: '16px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
        background: 'rgba(26,184,160,0.04)', borderRadius: '10px',
        border: '1.5px solid rgba(26,184,160,0.12)', fontSize: '0.82rem', color: 'var(--sl)',
      }}>
        <div style={{ marginTop: 2 }}><Lightbulb size={16} color="var(--teal)" /></div>
        <div>
          <strong style={{ color: 'var(--teal)' }}>Pro Tip:</strong> Share your coupon code <strong style={{ fontFamily: 'monospace' }}>{affiliateCode || '—'}</strong> anywhere — you earn a 10% lifetime commission on every sale it's tied to, forever.
        </div>
      </div>
    </div>
  );
}
