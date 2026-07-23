import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Admin kill-switch for the referral/affiliate program.
 *
 * This used to guard the whole standalone AffiliateDashboard — flipping the
 * feature off locked that portal entirely. Now that referrals live inside the
 * client dashboard there's no whole-dashboard to lock: a client still needs
 * their bookings and purchases. So the gate moved down to the two sections
 * that actually surface commission data, and renders in place of their
 * contents instead of blocking the account.
 *
 * Usage:
 *   const { features } = usePlatformConfig();
 *   if (features['Affiliate Program'] === false) return <AffiliateProgramDisabled />;
 */
export function AffiliateProgramDisabled() {
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: 'rgba(232,68,68,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <AlertTriangle size={28} color="#e84444" />
      </div>
      <h2 style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--gd)', marginBottom: 10 }}>
        Referral Program Temporarily Unavailable
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--mu)', maxWidth: 420, margin: '0 auto' }}>
        The referral program has been temporarily disabled by the platform administrator.
        Your existing balance is safe — bookings and purchases are unaffected.
      </p>
    </div>
  );
}
