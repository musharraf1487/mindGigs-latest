import React from 'react';
import { Megaphone } from 'lucide-react';

// Campaign click/conversion/ROI tracking isn't wired up anywhere in the app
// yet (no tracking pixel or attribution code exists) — showing fabricated
// always-zero stats would contradict the accurate-money-tracking point of
// this whole commission rewrite, so this is a placeholder until real
// tracking is built.
export function Campaigns() {
  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Marketing Campaigns</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Track and manage your marketing campaigns</p>
      </div>

      <div className="table-wrap" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mu)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(26,184,160,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Megaphone size={26} color="var(--teal)" />
        </div>
        <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--gd)', marginBottom: 8 }}>Coming soon</div>
        <p style={{ maxWidth: 380, margin: '0 auto', fontSize: '0.85rem', lineHeight: 1.6 }}>
          Campaign click/conversion tracking is on the roadmap. In the meantime, share your coupon code directly from the
          Referrals tab to start earning.
        </p>
      </div>
    </div>
  );
}
