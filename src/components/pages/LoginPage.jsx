import React, { useState } from 'react';
import { Users, ShoppingCart, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
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
        <div className="card" style={{ padding: 40 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// One shared login form for every kind of account. There is no portal to pick
// and no expected role to match — whoever the credentials belong to is who you
// are, and App.jsx routes to the right dashboard from the role on the account.
// Picking a role is a SIGNUP-time question only (see SignupPage's chooser).
export function LoginPage({ nav, notify, emailHint }) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = React.useState(emailHint || '');
  const [pass, setPass] = useState('');
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);
  // Set when a sign-in attempt looks like "this person has no account yet".
  // { email, certain } — `certain` is true only when we actually know no
  // account exists (the Google path checks Firestore directly). On the email
  // path Firebase's enumeration protection collapses "no such user" and "wrong
  // password" into one error code, so we can't claim to know which it was.
  const [noAccount, setNoAccount] = useState(null);

  // If emailHint changes (new account switch), update the email field
  React.useEffect(() => {
    if (emailHint) setEmail(emailHint);
  }, [emailHint]);

  const handleLogin = async () => {
    if (!email || !pass) return notify('Please enter email and password', 'error');

    setLoading(true);
    try {
      // No expected role — any valid account signs in here.
      await login(email, pass);
    } catch (err) {
      console.error('Login Error:', err);
      // 'auth/user-not-found' is definitive, but only surfaces on projects with
      // email enumeration protection turned off. With it on (the default),
      // Firebase returns 'auth/invalid-credential' for a missing account AND a
      // wrong password alike — so offer account creation without asserting
      // which one it was.
      if (err.code === 'auth/user-not-found') {
        setNoAccount({ email, certain: true });
        return;
      }
      if (err.code === 'auth/invalid-credential') {
        setNoAccount({ email, certain: false });
        return;
      }
      notify(err.message?.replace('Firebase: ', '') || 'Invalid credentials. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Carries the email across so they don't retype what they just typed.
  const startSignup = (chosenRole) => nav('signup', { role: chosenRole, emailHint: noAccount?.email || email });

  // Sign-in didn't find an account — ask what kind of profile to create rather
  // than dead-ending on an error toast.
  if (noAccount)
    return (
      <AuthShell nav={nav}>
        <div className="slabel">{noAccount.certain ? 'No Account Found' : "Can't Sign In"}</div>
        <h2 className="stitle" style={{ fontSize: '1.8rem' }}>
          {noAccount.certain ? 'Create your account' : 'Create an account?'}
        </h2>
        <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginBottom: 8 }}>
          {noAccount.certain
            ? <>There's no mindGigs account for <strong>{noAccount.email}</strong> yet. Pick the kind of profile you'd like to create.</>
            : <>We couldn't sign you in as <strong>{noAccount.email}</strong>. Either the password is wrong, or there's no account on that email yet.</>}
        </p>
        {!noAccount.certain && (
          <p style={{ fontSize: '.8rem', color: 'var(--mu)', marginBottom: 24 }}>
            If you meant to sign in, go back and try again — or reset your password.
          </p>
        )}

        <div className="login-selector" style={{ marginTop: noAccount.certain ? 24 : 0 }}>
          {[
            { role: 'expert', icon: Users, title: 'Expert / Creator', sub: 'Sell sessions, products and subscriptions. Get your own public profile page.' },
            { role: 'client', icon: ShoppingCart, title: 'Client / Buyer', sub: 'Book sessions and buy from experts — plus a referral code to earn commissions.' },
          ].map((o) => (
            <div
              key={o.role}
              className="login-option"
              style={{ padding: '14px 16px', gap: 12 }}
              onClick={() => startSignup(o.role)}
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
          <span
            style={{ color: 'var(--gb)', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => { setNoAccount(null); setPass(''); }}
          >
            ← Back to sign in
          </span>
          {!noAccount.certain && (
            <>
              {'  ·  '}
              <span
                style={{ color: 'var(--gb)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setForgotEmail(noAccount.email); setNoAccount(null); setForgot(true); }}
              >
                Reset password
              </span>
            </>
          )}
        </p>
      </AuthShell>
    );

  if (forgot)
    return (
      <AuthShell nav={nav}>
        <div className="slabel">Password Reset</div>
        <h2 className="stitle" style={{ fontSize: '1.8rem' }}>
          Forgot Password
        </h2>
        <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginBottom: 24 }}>
          We'll send a reset link to your email.
        </p>
        <div className="field">
          <label className="label">Email Address</label>
          <input
            className="input"
            placeholder="your@email.com"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />
        </div>
        <button
          className="btn btn-gr w-full"
          style={{ marginTop: 8 }}
          disabled={loading}
          onClick={async () => {
            if (!forgotEmail) return notify('Please enter your email address.', 'warn');
            setLoading(true);
            try {
              await sendPasswordResetEmail(auth, forgotEmail);
              notify('Reset link sent! Check your email.');
              setForgot(false);
              setForgotEmail('');
            } catch (err) {
              notify(err.message?.replace('Firebase: ', '') || 'Failed to send reset email.', 'error');
            } finally {
              setLoading(false);
            }
          }}
        >
          Send Reset Link
        </button>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '.82rem', color: 'var(--mu)' }}>
          <span
            style={{ color: 'var(--gb)', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setForgot(false)}
          >
            ← Back to Login
          </span>
        </p>
      </AuthShell>
    );

  return (
    <AuthShell nav={nav}>
      <div className="slabel">Sign In</div>
      <h2 className="stitle" style={{ fontSize: '1.8rem' }}>
        {emailHint ? 'Add Account' : 'Welcome Back'}
      </h2>
      <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginBottom: emailHint ? 16 : 24 }}>
        Sign in to your mindGigs account to continue.
      </p>

      {/* Account-switching hint banner */}
      {emailHint && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(26,184,160,0.07)', border: '1px solid rgba(26,184,160,0.2)',
        }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26,184,160,0.12)', border: '1.5px solid rgba(26,184,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--teal)', flexShrink: 0 }}>
            {emailHint[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--teal)' }}>Signing in as</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gd)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emailHint}</div>
          </div>
          <button onClick={() => setEmail('')} style={{ fontSize: '0.72rem', color: 'var(--mu)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }} title="Clear email hint">✕</button>
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
          setLoading(true);
          try {
            // No expected role — signing in only, never creating an account.
            // AuthContext rejects a Google identity with no user doc; we catch
            // that below and ask which kind of profile they want instead.
            await loginWithGoogle();
          } catch (err) {
            console.error('Google Login Error:', err);
            // Unambiguous here: AuthContext checked Firestore and found nothing.
            if (err.code === 'mindgigs/no-account') {
              setNoAccount({ email: err.email || '', certain: true });
              return;
            }
            notify(err.message?.replace('Firebase: ', '') || 'Failed to sign in with Google.', 'error');
          } finally {
            setLoading(false);
          }
        }}
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 20, height: 20 }} />
        Sign in with Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
        <div style={{ height: 1, flex: 1, background: 'rgba(37,52,63,0.1)' }} />
        <span style={{ fontSize: '.75rem', color: 'var(--sl)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Or continue with email
        </span>
        <div style={{ height: 1, flex: 1, background: 'rgba(37,52,63,0.1)' }} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <div className="field">
          <label className="label">Email Address</label>
        <input
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
      </div>
      <div className="field">
        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div style={{ textAlign: 'right', marginBottom: 20 }}>
        <span
          style={{
            fontSize: '.8rem',
            color: 'var(--gb)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          onClick={() => setForgot(true)}
        >
          Forgot Password?
        </span>
      </div>
        <button
          className="btn btn-gr w-full btn-lg"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In →'}
        </button>
      </form>
      {/* No role passed — signup asks which kind of account to create. */}
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.82rem', color: 'var(--mu)' }}>
        Don't have an account?{' '}
        <span
          style={{ color: 'var(--gb)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => nav('signup')}
        >
          Create one →
        </span>
      </p>
    </AuthShell>
  );
}
