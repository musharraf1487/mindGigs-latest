import React, { useState } from 'react';
import { Users, UserCheck, Clock, DollarSign, Copy, Mail, Plus, Lightbulb, User } from 'lucide-react';

function InviteModal({ onClose, notify, referralCode }) {
  const [email, setEmail] = useState('');

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!email) return;
    if (!referralCode) { notify?.('Set a username in Settings to get your referral link first.', 'warn'); return; }
    const link = `https://mindgigs.com/?ref=${referralCode}`;
    const subject = encodeURIComponent("You're invited to join mindGigs as an Expert!");
    const body = encodeURIComponent(`Hi there,\n\nI think you'd be a great fit as an expert on mindGigs. You can monetize your skills and get paid for your time.\n\nSign up using my link: ${link}\n\nBest,`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    notify?.(`Invite email draft opened for ${email}`, 'success');
    onClose();
  };

  const handleCopy = () => {
    if (!referralCode) { notify?.('Set a username in Settings to get your referral link first.', 'warn'); return; }
    navigator.clipboard.writeText(`https://mindgigs.com/?ref=${referralCode}`);
    notify?.('Invite link copied!', 'success');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 30, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={18} color="var(--teal)" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>Invite an Expert</h3>
        </div>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: 20 }}>
          Send an email invitation or copy your unique referral link directly.
        </p>

        <form onSubmit={handleSendInvite}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expert's Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="expert@example.com" required style={{ width: '100%', padding: '10px 14px', border: '1.5px solid rgba(26,184,160,0.18)', borderRadius: '8px', fontSize: '0.875rem' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-gh" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={handleCopy}>
              <Copy size={16} /> Copy Link
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
  // Only referralCode is looked up server-side for commission attribution —
  // an invite link built from anything else would silently never attribute.
  const referralCode = user?.referralCode || null;

  const active = affiliateData?.referrals?.filter(r => r.status === 'active').length || 0;
  const pending = affiliateData?.referrals?.filter(r => r.status === 'pending').length || 0;
  const total = affiliateData?.referrals?.length || 0;
  const totalEarned = affiliateData?.referrals?.reduce((s, r) => s + parseFloat(r.earnings?.replace('$', '') || 0), 0) || 0;

  return (
    <div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} notify={notify} referralCode={referralCode} />}

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>My Referrals</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Track referred experts and your commissions</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          <Plus size={14} /> Invite Expert
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Referred', val: total, color: 'var(--teal)', icon: <Users size={18} color="var(--teal)" /> },
          { label: 'Active', val: active, color: 'var(--teal)', icon: <UserCheck size={18} color="var(--teal)" /> },
          { label: 'Pending Approval', val: pending, color: 'var(--gb)', icon: <Clock size={18} color="var(--gb)" /> },
          { label: 'Total Earned', val: `$${totalEarned}`, color: 'var(--gd)', icon: <DollarSign size={18} color="var(--gd)" /> },
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
                <th>Expert</th>
                <th>Joined</th>
                <th>Referral Link</th>
                <th>Earnings</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {affiliateData.referrals.map((r, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} color="var(--teal)" />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--ch)' }}>{r.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--mu)' }}>{r.joined}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--teal)', background: 'rgba(26,184,160,0.05)', padding: '3px 8px', borderRadius: '4px' }}>
                      {r.referralLink}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--teal)' }}>{r.earnings}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600,
                      background: r.status === 'active' ? 'rgba(26,184,160,0.1)' : 'rgba(0,0,0,0.05)', 
                      color: r.status === 'active' ? 'var(--teal)' : 'var(--mu)',
                    }}>
                      {r.status === 'active' ? '●' : '◐'} {r.status}
                    </span>
                  </td>
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
            <div style={{ fontSize: '0.82rem', marginBottom: 16 }}>Start inviting experts to earn commissions.</div>
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
          <strong style={{ color: 'var(--teal)' }}>Pro Tip:</strong> Share your affiliate link on LinkedIn or directly with experts to earn 20% on their first year + 10% recurring commission.
        </div>
      </div>
    </div>
  );
}
