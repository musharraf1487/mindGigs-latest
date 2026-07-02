import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../../config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from 'firebase/auth';
import { AlertCircle, Trash2, Key, Shield, User as UserIcon } from 'lucide-react';

export function Settings({ user, notify, logout, nav }) {
  const { currentUser, refreshUserData } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || ''); // We will make email read-only for now to simplify
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);

  // Password Change State
  const [showPassModal, setShowPassModal] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ password: '', confirmText: '' });

  // Update effect if user changes
  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setBio(user?.bio || '');
  }, [user]);

  const handleSaveProfile = async () => {
    if (!currentUser) {
      notify('Cannot update profile in demo mode', 'warn');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name,
        bio,
      });
      await refreshUserData();
      notify('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      notify('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) {
      return notify('New passwords do not match', 'error');
    }
    if (passForm.newPass.length < 6) {
      return notify('Password must be at least 6 characters', 'error');
    }
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, passForm.current);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, passForm.newPass);
      notify('Password updated successfully!');
      setShowPassModal(false);
      setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      console.error(err);
      notify(err.message?.replace('Firebase: ', '') || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteForm.confirmText !== 'DELETE') {
      return notify('Please type DELETE to confirm', 'error');
    }
    setLoading(true);
    try {
      // 1. Re-auth
      const cred = EmailAuthProvider.credential(currentUser.email, deleteForm.password);
      await reauthenticateWithCredential(currentUser, cred);
      // 2. Delete Firestore doc
      await deleteDoc(doc(db, 'users', currentUser.uid));
      // 3. Delete Auth user
      await deleteUser(currentUser);
      // 4. Logout and redirect (will happen automatically, but just in case)
      logout();
      nav('home');
      notify('Account deleted permanently.', 'success');
    } catch (err) {
      console.error(err);
      notify(err.message?.replace('Firebase: ', '') || 'Failed to delete account', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Account Settings</h2>
        <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Manage your profile, security, and notification preferences.</p>
      </div>

      {/* Profile Settings */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserIcon size={20} color="var(--teal)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--gd)' }}>Profile Information</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <div className="grid-2" style={{ gap: '24px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>Full Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%' }}
                placeholder="Your name"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>Email Address <span style={{ color: 'var(--mu)', fontWeight: 400, fontSize: '0.75rem' }}>(Cannot be changed)</span></label>
              <input
                type="email"
                className="input"
                value={email}
                disabled
                style={{ width: '100%', background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>Bio</label>
            <textarea
              className="input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="4"
              style={{ width: '100%', resize: 'vertical', minHeight: '100px' }}
              placeholder="Tell us about yourself..."
            />
          </div>

          <button className="btn btn-gr" style={{ padding: '10px 24px' }} onClick={handleSaveProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} color="var(--teal)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--gd)' }}>Security</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--gd)', marginBottom: '4px' }}>Password</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--mu)' }}>Update your password to keep your account secure.</div>
            </div>
            <button className="btn btn-gh btn-sm" onClick={() => setShowPassModal(true)}>Update Password</button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: 'rgba(232, 68, 68, 0.2)', backgroundColor: 'rgba(232, 68, 68, 0.015)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(232, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={20} color="#e84444" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#e84444' }}>Danger Zone</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--gd)', marginBottom: '4px' }}>Delete Account</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--mu)' }}>Permanently erase all your data, offers, products, and bookings.</div>
            </div>
            <button className="btn btn-sm" style={{ padding: '8px 16px', background: 'rgba(232,68,68,0.08)', color: '#e84444', border: '1px solid rgba(232,68,68,0.2)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowDeleteModal(true)}>
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showPassModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && setShowPassModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', padding: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={18} color="var(--teal)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gd)' }}>Change Password</h3>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Current Password</label>
                <input className="input" type="password" value={passForm.current} onChange={e => setPassForm(p => ({ ...p, current: e.target.value }))} required style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>New Password</label>
                <input className="input" type="password" value={passForm.newPass} onChange={e => setPassForm(p => ({ ...p, newPass: e.target.value }))} required style={{ width: '100%' }} minLength={6} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Confirm New Password</label>
                <input className="input" type="password" value={passForm.confirm} onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))} required style={{ width: '100%' }} minLength={6} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowPassModal(false)} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-gr" style={{ flex: 1 }} disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', padding: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(232,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={18} color="#e84444" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gd)' }}>Delete Account</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: 20 }}>
              This action <strong style={{ color: '#e84444' }}>cannot be undone</strong>. All your data, offers, products, and bookings will be permanently removed.
            </p>
            <form onSubmit={handleDeleteAccount}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Current Password</label>
                <input className="input" type="password" value={deleteForm.password} onChange={e => setDeleteForm(p => ({ ...p, password: e.target.value }))} required style={{ width: '100%' }} placeholder="Verify it's you" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Type <span style={{ color: '#e84444', background: 'rgba(232,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>DELETE</span> to confirm</label>
                <input className="input" type="text" value={deleteForm.confirmText} onChange={e => setDeleteForm(p => ({ ...p, confirmText: e.target.value }))} required style={{ width: '100%', borderColor: deleteForm.confirmText === 'DELETE' ? '#e84444' : undefined }} placeholder="DELETE" />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn" style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(232,68,68,0.25)', background: 'rgba(232,68,68,0.08)', color: '#e84444', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(232,68,68,0.18)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(232,68,68,0.08)'} disabled={loading || deleteForm.confirmText !== 'DELETE'}>
                  {loading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
