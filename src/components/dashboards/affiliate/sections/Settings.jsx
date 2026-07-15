import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../config/firebase';
import {
  collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from 'firebase/auth';
import { User, DollarSign, Bell, Shield, Trash2 } from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid rgba(26,184,160,0.18)', borderRadius: '8px',
  fontSize: '0.875rem', fontFamily: 'var(--fb)', background: '#fff',
  outline: 'none', color: 'var(--ch)',
};
const labelStyle = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700,
  color: 'var(--mu)', letterSpacing: '0.06em', textTransform: 'uppercase',
  marginBottom: '6px', fontFamily: 'var(--fu)',
};
const cardStyle = {
  background: '#fff', borderRadius: '12px', padding: '24px',
  border: '1px solid rgba(26,184,160,0.1)', marginBottom: '20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};
const sectionTitle = {
  fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem',
  color: 'var(--gd)', marginBottom: '18px',
  display: 'flex', alignItems: 'center', gap: 8,
};

export function Settings({ user, notify, logout, nav }) {
  const { currentUser, refreshUserData } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  // Password change
  const [showPassModal, setShowPassModal] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  // Payout info
  const [payoutMethod, setPayoutMethod] = useState('PayPal');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutSaving, setPayoutSaving] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({
    'Referral Approvals': true,
    'Campaign Performance': true,
    'Payout Reminders': true,
    'Marketing Tips': false,
  });

  // Deactivation
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user]);

  const handleSaveProfile = async () => {
    if (!currentUser) return notify('Demo mode: cannot save', 'warn');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { name });
      await refreshUserData();
      notify('Profile updated!', 'success');
    } catch (e) {
      notify('Failed to save profile', 'error');
    } finally { setSaving(false); }
  };

  const handleSavePayout = async () => {
    if (!currentUser) return notify('Demo mode: cannot save', 'warn');
    setPayoutSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        payoutMethod, payoutAccount,
      });
      notify('Payout info saved!', 'success');
    } catch (e) {
      notify('Failed to save payout info', 'error');
    } finally { setPayoutSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) return notify('Passwords do not match', 'error');
    if (passForm.newPass.length < 6) return notify('Min 6 characters', 'error');
    setPassLoading(true);
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, passForm.current);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, passForm.newPass);
      notify('Password updated!', 'success');
      setShowPassModal(false);
      setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (e) {
      notify(e.message?.replace('Firebase: ', '') || 'Error updating password', 'error');
    } finally { setPassLoading(false); }
  };

  const handleDeactivate = async (e) => {
    e.preventDefault();
    setDeactivateLoading(true);
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, deactivatePassword);
      await reauthenticateWithCredential(currentUser, cred);
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(currentUser);
      logout();
      nav('home');
    } catch (e) {
      notify(e.message?.replace('Firebase: ', '') || 'Failed to deactivate', 'error');
      setDeactivateLoading(false);
    }
  };

  const toggleNotif = (n) => {
    setNotifs(p => {
      const next = { ...p, [n]: !p[n] };
      notify(`${n} ${next[n] ? 'enabled' : 'disabled'}`, 'success');
      return next;
    });
  };

  return (
    <div>
      {/* Password Modal */}
      {showPassModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowPassModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 30, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color="var(--teal)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>Change Password</h3>
            </div>
            <form onSubmit={handlePasswordChange}>
              {[['Current Password', 'current'], ['New Password', 'newPass'], ['Confirm New Password', 'confirm']].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{label}</label>
                  <input className="input" type="password" value={passForm[key]}
                    onChange={e => setPassForm(p => ({ ...p, [key]: e.target.value }))}
                    style={inputStyle} required />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-gh" style={{ flex: 1 }} onClick={() => setShowPassModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-gr" style={{ flex: 1 }} disabled={passLoading}>
                  {passLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowDeactivateModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 30, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(232,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#e84444" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 8 }}>Deactivate Account?</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: 20 }}>
              This will <strong style={{ color: '#e84444' }}>permanently delete</strong> your affiliate account, referrals, campaigns, and earnings history.
            </p>
            <form onSubmit={handleDeactivate}>
              <div style={{ marginBottom: 20, textAlign: 'left' }}>
                <label style={labelStyle}>Enter your password to confirm</label>
                <input className="input" type="password" value={deactivatePassword}
                  onChange={e => setDeactivatePassword(e.target.value)}
                  style={inputStyle} required placeholder="Your current password" />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-gh" style={{ flex: 1 }} onClick={() => setShowDeactivateModal(false)}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(232,68,68,0.3)', background: 'rgba(232,68,68,0.08)', color: '#e84444', fontWeight: 700, cursor: 'pointer' }} disabled={deactivateLoading}>
                  {deactivateLoading ? 'Deleting...' : 'Yes, Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Settings</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Manage your account, payouts, and preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Account Info */}
        <div style={cardStyle}>
          <div style={sectionTitle}><User size={16} color="var(--teal)" /> Account Information</div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email Address</label>
            <input type="email" value={user?.email || ''} disabled style={{ ...inputStyle, background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Coupon Code</label>
            <input type="text" value={user?.couponCode || 'Not assigned yet'} disabled
              style={{ ...inputStyle, background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--mu)', marginTop: 6 }}>Assigned once at signup — affiliates have no public profile or username.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={handleSaveProfile} disabled={saving}
              style={{ padding: '9px 20px', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setShowPassModal(true)}
              style={{ padding: '9px 20px', background: 'rgba(26,184,160,0.08)', color: 'var(--teal)', border: '1px solid rgba(26,184,160,0.2)', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              Change Password
            </button>
          </div>
        </div>

        {/* Payout Info */}
        <div style={cardStyle}>
          <div style={sectionTitle}><DollarSign size={16} color="var(--teal)" /> Payout Information</div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Preferred Payout Method</label>
            <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)} style={inputStyle}>
              <option>PayPal</option>
              <option>Bank Transfer</option>
              <option>Stripe Connect</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Account / Email</label>
            <input type="text" value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)}
              placeholder="e.g. you@paypal.com or IBAN" style={inputStyle} />
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(26,184,160,0.05)', borderRadius: '8px', border: '1px solid rgba(26,184,160,0.12)', fontSize: '0.78rem', color: 'var(--teal)', marginBottom: 4 }}>
            Min. payout: <strong>$50</strong> · Processed every 2 weeks on Fridays
          </div>
          <button onClick={handleSavePayout} disabled={payoutSaving}
            style={{ marginTop: 14, padding: '9px 20px', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
            {payoutSaving ? 'Saving...' : 'Save Payout Info'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div style={cardStyle}>
        <div style={sectionTitle}><Bell size={16} color="var(--teal)" /> Notifications</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries(notifs).map(([name, on]) => (
            <div key={name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: on ? 'rgba(26,184,160,0.04)' : '#f9f9f9',
              borderRadius: '8px', border: `1px solid ${on ? 'rgba(26,184,160,0.15)' : 'rgba(0,0,0,0.05)'}`,
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: on ? 'var(--gd)' : 'var(--mu)' }}>{name}</span>
              <div onClick={() => toggleNotif(name)} style={{
                width: 38, height: 22, borderRadius: '100px', cursor: 'pointer',
                background: on ? 'var(--teal)' : '#d4d4d4', position: 'relative', transition: 'background 0.25s',
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: on ? 18 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ ...cardStyle, border: '1px solid rgba(232,68,68,0.2)', background: 'rgba(232,68,68,0.015)', marginBottom: 0 }}>
        <div style={{ ...sectionTitle, color: '#e84444' }}><Trash2 size={16} color="#e84444" /> Danger Zone</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--mu)', marginBottom: '16px' }}>Deactivating your account permanently removes all your data, campaigns, and commission history.</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { logout(); nav('home'); }}
            style={{ padding: '9px 18px', background: 'rgba(0,0,0,0.04)', color: 'var(--sl)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
            Log Out
          </button>
          <button onClick={() => setShowDeactivateModal(true)}
            style={{ padding: '9px 18px', background: 'rgba(232,68,68,0.07)', color: 'var(--rd)', border: '1px solid rgba(232,68,68,0.2)', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
}
