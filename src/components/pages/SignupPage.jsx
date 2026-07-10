import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { claimHandle, normalizeHandle } from '../../services/handleService';

function AuthShell({ children, nav }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cr)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(25, 181, 166, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div
          style={{ textAlign: 'center', marginBottom: 32, cursor: 'pointer' }}
          onClick={() => nav('landingboard')}
        >
          <span
            style={{
              fontFamily: 'var(--fb)',
              fontWeight: 800,
              fontSize: '1.4rem',
              color: '#0F172A',
              letterSpacing: '-0.04em',
            }}
          >
            mind<span style={{ color: 'var(--teal)' }}>G</span>igs
          </span>
        </div>
        <div className="card" style={{ padding: 40 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Per-role config ────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  expert: {
    badge: 'Get Started Free',
    title: 'Create Your Expert Profile',
    sub: 'Join thousands of experts monetizing their knowledge on mindGigs.',
    showHandle: true,
    btnLabel: 'Create Expert Account →',
    successMsg: "Account created! Let's set up your profile.",
    redirect: 'onboarding',
  },
  client: {
    badge: 'Join as a Buyer',
    title: 'Create Your Buyer Account',
    sub: 'Book sessions, buy digital products, and subscribe to top experts.',
    showHandle: false,
    btnLabel: 'Create Buyer Account →',
    successMsg: 'Welcome! Your buyer account is ready.',
    redirect: 'client-dashboard',
  },
  affiliate: {
    badge: 'Affiliate Program',
    title: 'Join as an Affiliate',
    sub: 'Get your own coupon code and earn a 10% lifetime commission on every sale it brings in.',
    showHandle: true,
    btnLabel: 'Join Affiliate Program →',
    successMsg: 'Affiliate account created! Welcome to the program.',
    redirect: 'affiliate-dashboard',
  },
};
// ──────────────────────────────────────────────────────────────────────────────

export function SignupPage({ nav, notify, role = 'expert', expertId = null }) {
  const { signup, loginWithGoogle, currentUser, userData, refreshUserData } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  // Post-Google handle setup for roles that need a handle but skip onboarding
  const [needsHandleSetup, setNeedsHandleSetup] = useState(false);

  // Admin has no self-service signup — there is exactly one admin account,
  // provisioned out-of-band. Bounce away from this route entirely rather than
  // silently falling back to the expert config, in case it's ever reached
  // (e.g. via manipulated browser history state).
  useEffect(() => {
    if (role === 'admin') {
      notify('Admin access is invite-only and cannot be created here.', 'warn');
      nav('landingboard');
    }
  }, [role]);
  const [pendingHandle, setPendingHandle] = useState('');
  const [savingHandle, setSavingHandle] = useState(false);

  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.expert;

  const handleSignup = async () => {
    if (!agreed) return notify('Please agree to terms first.', 'warn');
    if (!name || !email || !pass) return notify('Please fill all fields', 'warn');
    if (cfg.showHandle && !username) return notify('Please enter a username', 'warn');

    setLoading(true);
    try {
      await signup(email, pass, role, {
        name,
        handle: username || normalizeHandle(name),
        onboardingComplete: role !== 'expert',
      }, { expertId, couponCode });
      notify(cfg.successMsg);
      nav(cfg.redirect);
    } catch (err) {
      console.error('Signup Error:', err);
      notify(err.message?.replace('Firebase: ', '') || 'Failed to create account.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (needsHandleSetup) {
    return (
      <AuthShell nav={nav}>
        <div className="slabel">One More Step</div>
        <h2 className="stitle" style={{ fontSize: '1.6rem' }}>Choose Your Affiliate Handle</h2>
        <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginBottom: 24 }}>
          This is your public referral URL that you share with others.
        </p>
        <div className="field">
          <label className="label">Your Handle</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '.85rem', color: 'var(--mu)' }}>
              mindgigs.com/
            </span>
            <input
              className="input"
              style={{ paddingLeft: 120 }}
              placeholder="yourname"
              value={pendingHandle}
              onChange={(e) => setPendingHandle(normalizeHandle(e.target.value))}
            />
          </div>
        </div>
        <button
          className="btn btn-gr w-full btn-lg"
          disabled={savingHandle || !pendingHandle}
          onClick={async () => {
            if (!pendingHandle) return notify('Please enter a handle', 'warn');
            setSavingHandle(true);
            try {
              const uid = currentUser?.uid;
              if (uid) {
                // One-time: this step is completing signup, so the affiliate's
                // referral code is also set to match the handle they just chose.
                await claimHandle({
                  uid,
                  role: 'affiliate',
                  oldHandle: userData?.handle || null,
                  newHandle: pendingHandle,
                  syncReferralCode: true,
                });
                await refreshUserData?.();
              }
              notify(cfg.successMsg);
              nav(cfg.redirect);
            } catch (err) {
              notify(err.message || 'Failed to save handle: Unknown error', 'error');
            } finally {
              setSavingHandle(false);
            }
          }}
        >
          {savingHandle ? 'Saving...' : 'Complete Setup →'}
        </button>
      </AuthShell>
    );
  }

  if (role === 'admin') return null;

  return (
    <AuthShell nav={nav}>
      <div className="slabel">{cfg.badge}</div>
      <h2 className="stitle" style={{ fontSize: '1.8rem' }}>
        {cfg.title}
      </h2>
      <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginBottom: 24 }}>
        {cfg.sub}
      </p>

      {expertId && (
        <div style={{ fontSize: '.8rem', color: 'var(--teal)', background: 'rgba(25,181,166,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
          You're signing up via a referral link — you'll be linked to this expert automatically.
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }}>
        <div className="field">
          <label className="label">Full Name</label>
        <input
          className="input"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {cfg.showHandle && (
        <div className="field">
          <label className="label">Username</label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '.85rem',
                color: 'var(--mu)',
              }}
            >
              mindgigs.com/
            </span>
            <input
              className="input w-full"
              style={{ paddingLeft: 120 }}
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(normalizeHandle(e.target.value))}
            />
          </div>
        </div>
      )}

      <div className="field">
        <label className="label">Email Address</label>
        <input
          className="input"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          placeholder="Min 8 characters"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label">Have a Coupon Code? (Optional)</label>
        <input
          className="input"
          placeholder="e.g. MGX7K2"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
        />
      </div>

      <label className="checkbox-row" style={{ marginBottom: 20 }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>
          I agree to the <a href="#" style={{ color: 'var(--gb)' }}>Terms of Service</a> and{' '}
          <a href="#" style={{ color: 'var(--gb)' }}>Privacy Policy</a>
        </span>
      </label>
        <button
          className="btn btn-gr w-full btn-lg"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : cfg.btnLabel}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ height: 1, flex: 1, background: 'rgba(37,52,63,0.1)' }} />
        <span style={{ fontSize: '.75rem', color: 'var(--sl)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Or sign up with
        </span>
        <div style={{ height: 1, flex: 1, background: 'rgba(37,52,63,0.1)' }} />
      </div>

      <button
        className="btn"
        style={{
          width: '100%',
          background: 'var(--surface-color)',
          color: 'var(--text-main)',
          border: '1px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '12px',
          borderRadius: '8px',
          fontWeight: 600,
          marginBottom: 8,
          boxShadow: 'var(--sc)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'var(--bg-color)';
          e.currentTarget.style.borderColor = '#19b5a6';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'var(--surface-color)';
          e.currentTarget.style.borderColor = 'var(--card-border)';
        }}
        onClick={async () => {
          if (!agreed) return notify('Please agree to terms first.', 'warn');
          setLoading(true);
          try {
            await loginWithGoogle(role || 'expert', { expertId, couponCode });
            // Affiliates need to choose a public handle before going to dashboard
            if (role === 'affiliate') {
              setNeedsHandleSetup(true);
            } else {
              notify(cfg.successMsg);
              nav(cfg.redirect);
            }
          } catch (err) {
            console.error('Google Signup Error:', err);
            notify(err.message?.replace('Firebase: ', '') || 'Failed to sign up with Google.', 'error');
          } finally {
            setLoading(false);
          }
        }}
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 20, height: 20 }} />
        Sign up with Google
      </button>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.82rem', color: 'var(--mu)' }}>
        Already have an account?{' '}
        <span
          style={{ color: 'var(--gb)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => nav('login', { role })}
        >
          Log In →
        </span>
      </p>
    </AuthShell>
  );
}
