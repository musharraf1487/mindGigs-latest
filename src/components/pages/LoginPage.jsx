import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import {
  Users,
  ShoppingCart,
  Link as LinkIcon,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

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

export function LoginPage({ role, nav, onSwitchRole, notify, emailHint }) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = React.useState(emailHint || '');
  const [pass, setPass] = useState('');
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // If emailHint changes (new account switch), update the email field
  React.useEffect(() => {
    if (emailHint) setEmail(emailHint);
  }, [emailHint]);

  const roleConfig = {
    expert: { label: 'Expert Portal', color: 'var(--gb)', icon: Users, badge: 'role-expert' },
    admin: { label: 'Admin Portal', color: 'var(--gold)', icon: ShieldCheck, badge: 'role-admin' },
    affiliate: {
      label: 'Affiliate Portal',
      color: 'var(--teal)',
      icon: LinkIcon,
      badge: 'role-aff',
    },
    client: {
      label: 'Client / Buyer Portal',
      color: 'var(--gl)',
      icon: ShoppingCart,
      badge: 'role-client',
    },
  };
  const rc = roleConfig[role] || roleConfig.expert;

  const handleLogin = async () => {
    if (!email || !pass) return notify('Please enter email and password', 'error');

    // Check for demo credentials
    if (false) { // demo mode removed
      notify('Demo login successful!', 'success');
      return;
    }

    setLoading(true);
    try {
      await login(email, pass, role || 'expert');
    } catch (err) {
      console.error('Login Error:', err);
      notify(err.message?.replace('Firebase: ', '') || 'Invalid credentials. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div className="lp-icon-box" style={{ width: 44, height: 44 }}>
          <rc.icon size={20} />
        </div>
        <div>
          <div className="slabel" style={{ marginBottom: 0 }}>
            {rc.label}
          </div>
        </div>
        <button
          className="btn btn-gh btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={onSwitchRole}
        >
          Switch Role
        </button>
      </div>
      <h2 className="stitle" style={{ fontSize: '1.8rem' }}>
        {emailHint ? 'Add Account' : 'Welcome Back'}
      </h2>
      <p style={{ fontSize: '.875rem', color: 'var(--sl)', marginBottom: emailHint ? 16 : 24 }}>
        Sign in to your {rc.label.replace(' Portal', '').toLowerCase()} account to continue.
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
            await loginWithGoogle(role || 'expert');
          } catch (err) {
            console.error('Google Login Error:', err);
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
          <label className="label">Username</label>
        <input
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your username"
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
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.82rem', color: 'var(--mu)' }}>
        Don't have an account?{' '}
        <span
          style={{ color: 'var(--gb)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => nav('signup', { role: role || 'expert' })}
        >
          Create one →
        </span>
      </p>
    </AuthShell>
  );
}
