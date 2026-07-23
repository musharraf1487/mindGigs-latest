import React, { useState } from 'react';
import { Users, DollarSign, Copy, Mail, Plus, Lightbulb, User, Link as LinkIcon } from 'lucide-react';
import { usePlatformConfig } from '../../../../context/PlatformConfigContext';
import { buildReferralLink } from '../../../../services/referralService';
import { AffiliateProgramDisabled } from './AffiliateProgramGate';

function InviteModal({ onClose, notify, couponCode }) {
  const [email, setEmail] = useState('');

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!email) return;
    if (!couponCode) { notify?.('Your coupon code has not been assigned yet.', 'warn'); return; }
    const subject = encodeURIComponent("Join mindGigs with my referral link!");
    // Leads with the link (code fills itself in) and keeps the raw code as a
    // fallback for anyone who retypes the address by hand.
    const body = encodeURIComponent(`Hi there,\n\nSign up as an expert on mindGigs using my referral link — the code fills in automatically:\n\n${buildReferralLink(couponCode)}\n\nOr enter the code ${couponCode} manually at signup. I'll earn a lifetime referral commission, at no cost to you.\n\nBest,`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    notify?.(`Invite email draft opened for ${email}`, 'success');
    onClose();
  };

  const handleCopy = () => {
    if (!couponCode) { notify?.('Your coupon code has not been assigned yet.', 'warn'); return; }
    navigator.clipboard.writeText(couponCode);
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>Invite a New Expert</h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: 20 }}>
          Share your coupon code <strong style={{ fontFamily: 'monospace' }}>{couponCode}</strong> — an expert who enters it while signing up gets tied to you for life. You earn 7.5% of every sale they ever make.
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
  const { features } = usePlatformConfig();
  const couponCode = user?.couponCode || null;

  // Experts onboarded via this client's referral code at signup
  // (onboardedByAffiliateId) — the lifetime commission source, earning on every
  // sale they ever make. Buyers who merely redeem the code are one-time and
  // listed separately below.
  const onboardedExperts = affiliateData?.referrals || [];
  const total = onboardedExperts.length;

  // Per-expert lifetime commission earned, derived from the combined
  // commissions list already loaded by AffiliateDashboard.jsx — only the
  // Person A (lifetime) entries count toward "what this expert has earned you".
  const commissions = affiliateData?.commissions || [];
  const earningsByExpert = commissions.reduce((acc, c) => {
    if (!c.sellerId || c.personAId !== user?.uid) return acc;
    acc[c.sellerId] = (acc[c.sellerId] || 0) + (c.personAAmount || 0);
    return acc;
  }, {});
  const totalEarned = commissions
    .filter((c) => c.personAId === user?.uid)
    .reduce((s, c) => s + (c.personAAmount || 0), 0) / 100;

  // Buyers who redeemed this code at checkout. Each redemption is a one-time
  // commission (the buyer isn't attached to the referrer the way an onboarded
  // expert is), so the same person shows up once per purchase — collapsed here
  // into one row each, with their redemption count and running total.
  //
  // buyerId/buyerName are denormalized onto the commission doc by
  // processCommissionSplit: a referrer can read the commission but not the
  // buyer's users/ doc, so there's nothing else to resolve a name from.
  // Commissions written before that field existed have no buyerId — they still
  // count toward the total but group under a single "Unattributed" row rather
  // than silently disappearing.
  const redemptions = commissions.filter((c) => c.personBId === user?.uid);
  const redemptionTotal = redemptions.reduce((s, c) => s + (c.personBAmount || 0), 0) / 100;
  const buyers = Object.values(
    redemptions.reduce((acc, c) => {
      const key = c.buyerId || '__unattributed__';
      if (!acc[key]) {
        acc[key] = {
          key,
          name: c.buyerId ? (c.buyerName || 'mindGigs buyer') : 'Unattributed (pre-tracking)',
          known: !!c.buyerId,
          count: 0,
          earned: 0,
          lastAt: null,
        };
      }
      acc[key].count += 1;
      acc[key].earned += c.personBAmount || 0;
      if (c.createdAt && (!acc[key].lastAt || new Date(c.createdAt) > new Date(acc[key].lastAt))) {
        acc[key].lastAt = c.createdAt;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.earned - a.earned);

  const handleCopyCode = () => {
    if (!couponCode) { notify?.('Your referral code has not been assigned yet.', 'warn'); return; }
    navigator.clipboard.writeText(couponCode);
    notify?.('Referral code copied!', 'success');
  };

  // Anyone who follows this gets the code filled into their signup form
  // automatically — no typing, no remembering a 6-char string.
  const referralLink = buildReferralLink(couponCode);
  const handleCopyLink = () => {
    if (!referralLink) { notify?.('Your referral code has not been assigned yet.', 'warn'); return; }
    navigator.clipboard.writeText(referralLink);
    notify?.('Referral link copied!', 'success');
  };

  if (features['Affiliate Program'] === false) return <AffiliateProgramDisabled />;

  return (
    <div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} notify={notify} couponCode={couponCode} />}

      {/* Referral code — the one thing every visit to this tab is really for */}
      <div style={{
        marginBottom: 24, padding: '20px 24px', borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(26,184,160,0.06), rgba(84,119,146,0.04))',
        border: '1.5px solid rgba(26,184,160,0.14)',
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Your Referral Code
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: 180, fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem',
            letterSpacing: '0.08em', color: 'var(--gd)', background: '#fff',
            padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)',
          }}>
            {couponCode || 'Not assigned yet'}
          </div>
          <button className="btn btn-gr" style={{ padding: '12px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleCopyCode} disabled={!couponCode}>
            <Copy size={15} /> Copy
          </button>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--mu)', marginTop: 10 }}>
          Share it with experts to onboard them (7.5% lifetime), or with buyers at checkout (7.5% one-time).
        </div>

        {/* Shareable link — the easy path. Fills the code in for them. */}
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Your Referral Link
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, minWidth: 180, fontFamily: 'monospace', fontSize: '0.82rem',
              color: 'var(--sl)', background: '#fff', padding: '12px 16px',
              borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', wordBreak: 'break-all',
            }}>
              {referralLink || 'Not assigned yet'}
            </div>
            <button className="btn btn-gh" style={{ padding: '12px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleCopyLink} disabled={!referralLink}>
              <LinkIcon size={15} /> Copy Link
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mu)', marginTop: 10 }}>
            Anyone who signs up after following this link gets your code filled in for them — nothing to type or remember.
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Experts Onboarded</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Experts who joined with your coupon code, and what they've earned you — for life</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          <Plus size={14} /> Invite an Expert
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Experts Onboarded', val: total, color: 'var(--teal)', icon: <Users size={18} color="var(--teal)" /> },
          { label: 'Lifetime Commission Earned', val: `$${totalEarned.toFixed(2)}`, color: 'var(--gd)', icon: <DollarSign size={18} color="var(--gd)" /> },
          { label: 'Referred Buyers', val: `${buyers.length} · $${redemptionTotal.toFixed(2)}`, color: 'var(--gl)', icon: <Copy size={18} color="var(--gl)" /> },
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

      {/* Onboarded Experts Table */}
      <div className="table-wrap">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>
            Expert List <span style={{ fontWeight: 400, color: 'var(--mu)', fontSize: '0.82rem' }}>({total})</span>
          </div>
        </div>
        {total > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Expert</th>
                <th>Joined</th>
                <th>Lifetime Earnings</th>
              </tr>
            </thead>
            <tbody>
              {onboardedExperts.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} color="var(--teal)" />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--ch)' }}>{r.name || r.email || 'Expert'}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--mu)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</td>
                  <td style={{ fontWeight: 700, color: 'var(--teal)' }}>${((earningsByExpert[r.id] || 0) / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(26,184,160,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Users size={22} color="var(--teal)" />
            </div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, marginBottom: 4 }}>No experts onboarded yet</div>
            <div style={{ fontSize: '0.82rem', marginBottom: 16 }}>Share your coupon code with an expert signing up to start earning.</div>
          </div>
        )}
      </div>

      {/* Buyers who redeemed the code at checkout — one-time commissions */}
      <div className="table-wrap" style={{ marginTop: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>
            Referred Buyers <span style={{ fontWeight: 400, color: 'var(--mu)', fontSize: '0.82rem' }}>({buyers.length})</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 2 }}>
            Buyers who entered your code at checkout — 7.5% one-time on each purchase
          </div>
        </div>
        {buyers.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Purchases</th>
                <th>Last Purchase</th>
                <th>You Earned</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((b) => (
                <tr key={b.key}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: b.known ? 'rgba(255,155,81,0.1)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} color={b.known ? 'var(--gl)' : 'var(--mu)'} />
                      </div>
                      <span style={{ fontWeight: 600, color: b.known ? 'var(--ch)' : 'var(--mu)', fontStyle: b.known ? 'normal' : 'italic' }}>{b.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--mu)' }}>{b.count}</td>
                  <td style={{ color: 'var(--mu)' }}>{b.lastAt ? new Date(b.lastAt).toLocaleDateString() : '—'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--gl)' }}>${(b.earned / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,155,81,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Copy size={22} color="var(--gl)" />
            </div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, marginBottom: 4 }}>No coupon redemptions yet</div>
            <div style={{ fontSize: '0.82rem' }}>Buyers who use your code at checkout will appear here.</div>
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
          <strong style={{ color: 'var(--teal)' }}>Pro Tip:</strong> Share your coupon code <strong style={{ fontFamily: 'monospace' }}>{couponCode || '—'}</strong> with experts signing up — you earn a 7.5% lifetime commission on every sale they ever make. Buyers can also use it as a one-time checkout coupon (see the Earnings tab).
        </div>
      </div>
    </div>
  );
}
