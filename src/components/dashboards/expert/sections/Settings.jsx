import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, storage } from '../../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from 'firebase/auth';
import { AlertCircle, Trash2, Key, Shield, User as UserIcon, Link as LinkIcon, Camera } from 'lucide-react';
import { claimHandle, normalizeHandle, validateHandleFormat, isHandleAvailable } from '../../../../services/handleService';

const BIO_MAX_WORDS = 1000;

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function Settings({ user, notify, logout, nav }) {
  const { currentUser, refreshUserData } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || ''); // We will make email read-only for now to simplify
  const [bio, setBio] = useState(user?.bio || '');
  const [headline, setHeadline] = useState(user?.headline || '');
  const [tags, setTags] = useState((user?.tags || []).join(', '));
  const [linkedin, setLinkedin] = useState(user?.linkedin || '');
  const [twitter, setTwitter] = useState(user?.twitter || '');
  const [youtube, setYoutube] = useState(user?.youtube || '');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const handleAvatarChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Public profile URL / handle
  const [handle, setHandle] = useState(user?.handle || '');
  const [handleStatus, setHandleStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [savingHandle, setSavingHandle] = useState(false);

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
    setHeadline(user?.headline || '');
    setTags((user?.tags || []).join(', '));
    setLinkedin(user?.linkedin || '');
    setTwitter(user?.twitter || '');
    setYoutube(user?.youtube || '');
    setHandle(user?.handle || '');
  }, [user]);

  // Debounced availability check as the expert edits their handle
  useEffect(() => {
    if (!handle || handle === user?.handle) { setHandleStatus(null); return; }
    const { valid, reason } = validateHandleFormat(handle);
    if (!valid) { setHandleStatus('invalid'); return; }
    setHandleStatus('checking');
    const t = setTimeout(async () => {
      try {
        const available = await isHandleAvailable(normalizeHandle(handle), currentUser?.uid);
        setHandleStatus(available ? 'available' : 'taken');
      } catch {
        setHandleStatus(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [handle, user?.handle, currentUser?.uid]);

  const handleSaveHandle = async () => {
    if (!currentUser) return;
    setSavingHandle(true);
    try {
      const claimed = await claimHandle({
        uid: currentUser.uid,
        role: 'expert',
        oldHandle: user?.handle || null,
        newHandle: handle,
      });
      setHandle(claimed);
      setHandleStatus(null);
      await refreshUserData();
      notify('Public profile URL updated!');
    } catch (err) {
      notify(err.message || 'Failed to update username', 'error');
    } finally {
      setSavingHandle(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) {
      notify('Cannot update profile in demo mode', 'warn');
      return;
    }
    setLoading(true);
    try {
      let photoUrl = user?.image || null;
      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(storageRef, avatarFile);
        photoUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'users', currentUser.uid), {
        name,
        bio,
        headline,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        linkedin: linkedin || null,
        twitter: twitter || null,
        youtube: youtube || null,
        image: photoUrl,
      });
      setAvatarFile(null);
      setAvatarPreview('');
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '24px' }}>
            <div
              style={{ width: 72, height: 72, borderRadius: '50%', background: (avatarPreview || user?.image) ? `url(${avatarPreview || user.image}) top center/cover` : 'rgba(25, 181, 166, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, color: 'var(--teal)', fontWeight: 700, fontSize: '1.3rem' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {!(avatarPreview || user?.image) && (name?.charAt(0).toUpperCase() || <Camera size={24} />)}
            </div>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} />
            <div>
              <button type="button" className="btn btn-gh btn-sm" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview || user?.image ? 'Change Photo' : 'Upload Photo'}
              </button>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 6 }}>Shown on your public profile and expert cards.</div>
            </div>
          </div>

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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>Bio (max {BIO_MAX_WORDS} words)</label>
            <textarea
              className="input"
              value={bio}
              onChange={(e) => {
                const value = e.target.value;
                if (countWords(value) <= BIO_MAX_WORDS) setBio(value);
              }}
              rows="4"
              style={{ width: '100%', resize: 'vertical', minHeight: '100px' }}
              placeholder="Tell us about yourself..."
            />
            <span style={{ fontSize: '.72rem', color: countWords(bio) >= BIO_MAX_WORDS ? '#e84444' : 'var(--mu)', float: 'right' }}>{countWords(bio)}/{BIO_MAX_WORDS} words</span>
          </div>

          <div className="grid-2" style={{ gap: '24px', marginBottom: '24px', clear: 'both' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>Professional Headline</label>
              <input
                type="text"
                className="input"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                style={{ width: '100%' }}
                placeholder="e.g. CMO · SaaS Advisor · Author"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>Expertise Tags</label>
              <input
                type="text"
                className="input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                style={{ width: '100%' }}
                placeholder="e.g. Product Strategy, SaaS, Fundraising"
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '24px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>LinkedIn (optional)</label>
              <input
                type="text"
                className="input"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                style={{ width: '100%' }}
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>X (optional)</label>
              <input
                type="text"
                className="input"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                style={{ width: '100%' }}
                placeholder="https://x.com/yourhandle"
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '24px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>YouTube (optional)</label>
              <input
                type="text"
                className="input"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                style={{ width: '100%' }}
                placeholder="https://youtube.com/@yourchannel"
              />
            </div>
          </div>

          <button className="btn btn-gr" style={{ padding: '10px 24px' }} onClick={handleSaveProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Public Profile URL */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <LinkIcon size={20} color="var(--teal)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--gd)' }}>Public Profile URL</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--mu)', marginBottom: 16 }}>
            Share this link on social media or a business card — it shows your profile and also credits you as the referrer for anyone who signs up through it.
          </p>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gd)', marginBottom: '8px' }}>Username</label>
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '.85rem', color: 'var(--mu)' }}>
              mindgigs.com/
            </span>
            <input
              className="input"
              style={{ width: '100%', paddingLeft: 120 }}
              value={handle}
              onChange={(e) => setHandle(normalizeHandle(e.target.value))}
              placeholder="yourname"
            />
          </div>
          {handleStatus === 'checking' && <div style={{ fontSize: '0.78rem', color: 'var(--mu)', marginTop: 6 }}>Checking availability…</div>}
          {handleStatus === 'available' && <div style={{ fontSize: '0.78rem', color: 'var(--teal)', marginTop: 6 }}>✓ Available</div>}
          {handleStatus === 'taken' && <div style={{ fontSize: '0.78rem', color: '#e84444', marginTop: 6 }}>That username is taken.</div>}
          {handleStatus === 'invalid' && <div style={{ fontSize: '0.78rem', color: '#e84444', marginTop: 6 }}>Use 3-30 letters, numbers, or hyphens, starting with a letter.</div>}
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-gr"
              style={{ padding: '10px 24px' }}
              onClick={handleSaveHandle}
              disabled={savingHandle || !handle || handle === user?.handle || handleStatus === 'taken' || handleStatus === 'invalid' || handleStatus === 'checking'}
            >
              {savingHandle ? 'Saving...' : 'Save Username'}
            </button>
          </div>
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
