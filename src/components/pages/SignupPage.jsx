import React, { useState, useEffect } from 'react';
import { Users, ShoppingCart, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { normalizeHandle } from '../../services/handleService';
import { resolveCouponCode } from '../../services/affiliateService';

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
  // Buyer + affiliate in one. Every client account ships with its own referral
  // code, so there is no separate affiliate signup (or login) any more.
  client: {
    badge: 'Join as a Buyer',
    title: 'Create Your Buyer Account',
    sub: 'Book sessions, buy digital products, and subscribe to top experts — and earn a 7.5% lifetime commission on every expert you bring to mindGigs with your own referral code.',
    showHandle: false,
    btnLabel: 'Create Buyer Account →',
    successMsg: 'Welcome! Your buyer account is ready.',
    redirect: 'client-dashboard',
  },
};
// ──────────────────────────────────────────────────────────────────────────────

// Shown when signup is reached without a role — the generic "Sign Up" / "Create
// one" entry points. Choosing here re-navigates with the role set, so the back
// button returns to this step instead of leaving the flow entirely.
//
// Admin isn't offered: there is exactly one admin account and it's provisioned
// out-of-band, never through self-service signup.
function RoleChooser({ nav, expertId }) {
  const roles = [
    {
      role: 'expert',
      icon: Users,
      title: 'Expert / Creator',
      sub: 'Sell sessions, products and subscriptions. Get your own public profile page.',
    },
    {
      role: 'client',
      icon: ShoppingCart,
      title: 'Client / Buyer',
      sub: 'Book sessions and buy from experts — plus a referral code to earn commissions.',
    },
  ];

  return (
    <>
      <div className="slabel">Create Your Account</div>
      <h2 className="stitle" style={{ fontSize: '1.8rem' }}>How do you want to join?</h2>
      <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginBottom: 24 }}>
        Pick the account that fits you. You only choose this once — signing in later is the same for everyone.
      </p>

      <div className="login-selector">
        {roles.map((o) => (
          <div
            key={o.role}
            className="login-option"
            style={{ padding: '14px 16px', gap: 12 }}
            onClick={() => nav('signup', expertId ? { role: o.role, expertId } : { role: o.role })}
          >
            <div className="lp-icon-box" style={{ width: 44, height: 44, borderRadius: 10 }}>
              <o.icon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="login-option-title" style={{ fontSize: '0.9rem' }}>{o.title}</div>
              <div className="login-option-sub" style={{ fontSize: '0.75rem' }}>{o.sub}</div>
            </div>
            <ChevronRight size={18} className="login-option-arrow" />
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: '.82rem', color: 'var(--mu)' }}>
        Already have an account?{' '}
        <span
          style={{ color: 'var(--gb)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => nav('login')}
        >
          Sign in →
        </span>
      </p>
    </>
  );
}

export function SignupPage({ nav, notify, role: requestedRole = null, expertId = null }) {
  const { signup, loginWithGoogle } = useAuth();
  // The affiliate portal was merged into the client one — an old link or stale
  // history entry asking for an affiliate signup lands on the buyer form,
  // which now grants the same referral code it used to.
  const role = requestedRole === 'affiliate' ? 'client' : requestedRole;
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  // null | 'checking' | 'valid' | 'invalid' — an invalid code blocks submit
  // until it's fixed or cleared, so no orphaned Auth account gets created on
  // a doomed coupon (mirrors the username availability pre-check below).
  const [couponStatus, setCouponStatus] = useState(null);

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

  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.expert;

  useEffect(() => {
    if (!couponCode.trim()) { setCouponStatus(null); return; }
    setCouponStatus('checking');
    const t = setTimeout(async () => {
      try {
        const resolved = await resolveCouponCode(couponCode);
        setCouponStatus(resolved ? 'valid' : 'invalid');
      } catch {
        setCouponStatus(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [couponCode]);

  // Clients are handed a referral code at account creation. Surface it right
  // away so the earning side of the account isn't something they only discover
  // by wandering into the Referrals tab.
  const announceReferralCode = (userDoc) => {
    if (!userDoc?.couponCode) return;
    notify(`Your referral code: ${userDoc.couponCode} — share it to earn 7.5% commission on every expert you bring to mindGigs.`, 'success');
  };

  const handleSignup = async () => {
    if (!agreed) return notify('Please agree to terms first.', 'warn');
    if (!name || !email || !pass) return notify('Please fill all fields', 'warn');
    if (cfg.showHandle && !username) return notify('Please enter a username', 'warn');
    if (couponStatus === 'invalid') return notify('That coupon code is invalid — fix it or clear it before continuing.', 'warn');
    if (couponStatus === 'checking') return notify('Still checking your coupon code — one moment.', 'warn');

    setLoading(true);
    try {
      const { userDoc } = await signup(email, pass, role, {
        name,
        phone: phone.trim() || null,
        handle: username || normalizeHandle(name),
        onboardingComplete: role !== 'expert',
      }, { expertId, couponCode: couponCode.trim() || null });
      notify(cfg.successMsg);
      announceReferralCode(userDoc);
      nav(cfg.redirect);
    } catch (err) {
      console.error('Signup Error:', err);
      notify(err.message?.replace('Firebase: ', '') || 'Failed to create account.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (role === 'admin') return null;

  // No role chosen yet — ask before showing any form. Placed after every hook
  // above so the hook order stays identical across both branches.
  if (!role) {
    return (
      <AuthShell nav={nav}>
        <RoleChooser nav={nav} expertId={expertId} />
      </AuthShell>
    );
  }

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
          marginBottom: 16,
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
            const { userDoc, isNewAccount } = await loginWithGoogle(role || 'expert', { expertId, couponCode: couponCode.trim() || null });
            notify(cfg.successMsg);
            // Existing users reaching this button are really just logging in —
            // don't re-announce a code they've had all along.
            if (isNewAccount) announceReferralCode(userDoc);
            nav(cfg.redirect);
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ height: 1, flex: 1, background: 'rgba(37,52,63,0.1)' }} />
        <span style={{ fontSize: '.75rem', color: 'var(--sl)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Or continue with email
        </span>
        <div style={{ height: 1, flex: 1, background: 'rgba(37,52,63,0.1)' }} />
      </div>

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
        <label className="label">Phone Number (Optional)</label>
        <input
          className="input"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
        <label className="label">Have a Referral Code? (Optional)</label>
        <input
          className="input"
          placeholder="e.g. an expert's username or a referral code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
        />
        {couponStatus === 'checking' && <div style={{ fontSize: '.75rem', color: 'var(--mu)', marginTop: 6 }}>Checking code…</div>}
        {couponStatus === 'valid' && <div style={{ fontSize: '.75rem', color: 'var(--teal)', marginTop: 6 }}>✓ Code applied</div>}
        {couponStatus === 'invalid' && <div style={{ fontSize: '.75rem', color: '#e84444', marginTop: 6 }}>Invalid code — fix it or clear the field to continue.</div>}
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
          disabled={loading || couponStatus === 'invalid' || couponStatus === 'checking'}
        >
          {loading ? 'Creating Account...' : cfg.btnLabel}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.82rem', color: 'var(--mu)' }}>
        Already have an account?{' '}
        <span
          style={{ color: 'var(--gb)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => nav('login')}
        >
          Log In →
        </span>
      </p>
    </AuthShell>
  );
}
