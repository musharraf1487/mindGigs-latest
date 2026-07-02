import React, { useState, useEffect } from 'react';
import {
  DollarSign, Shield, Sliders, Mail, AlertTriangle, LogOut,
  X, Save, ChevronRight, Eye, Percent, Hash
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { usePlatformConfig } from '../../../../context/PlatformConfigContext';
import { savePlatformConfig } from '../../../../services/platformConfig';
import { db } from '../../../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const inputStyle = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid rgba(26,184,160,0.15)', borderRadius: '8px',
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

// ─── Email Template Editor Panel ─────────────────────────────────────────────
const TEMPLATE_VARIABLES = {
  'Welcome Email': ['{{name}}', '{{email}}', '{{role}}', '{{loginLink}}'],
  'Booking Confirmation': ['{{clientName}}', '{{expertName}}', '{{date}}', '{{time}}', '{{price}}', '{{sessionTitle}}'],
  'Payout Notification': ['{{name}}', '{{amount}}', '{{method}}', '{{date}}'],
  'Weekly Digest': ['{{name}}', '{{totalBookings}}', '{{revenue}}', '{{topExpert}}'],
};

const DEFAULT_TEMPLATES = {
  'Welcome Email': {
    subject: 'Welcome to mindGigs, {{name}}!',
    body: `Hi {{name}},\n\nWelcome to mindGigs! Your account has been successfully created as a {{role}}.\n\nYou can log in here: {{loginLink}}\n\nLet's get started!\n\nThe mindGigs Team`,
  },
  'Booking Confirmation': {
    subject: 'Your booking with {{expertName}} is confirmed',
    body: `Hi {{clientName}},\n\nYour session has been confirmed!\n\nExpert: {{expertName}}\nSession: {{sessionTitle}}\nDate: {{date}}\nTime: {{time}}\nAmount: {{price}}\n\nLooking forward to the session!\n\nThe mindGigs Team`,
  },
  'Payout Notification': {
    subject: 'Your payout of {{amount}} has been processed',
    body: `Hi {{name}},\n\nYour payout of {{amount}} has been processed via {{method}} on {{date}}.\n\nIt should arrive within 2–5 business days.\n\nThe mindGigs Team`,
  },
  'Weekly Digest': {
    subject: 'Your mindGigs weekly summary',
    body: `Hi {{name}},\n\nHere's your weekly summary:\n\nTotal Bookings: {{totalBookings}}\nRevenue: {{revenue}}\nTop Expert: {{topExpert}}\n\nKeep up the great work!\n\nThe mindGigs Team`,
  },
};

function EmailTemplateEditor({ templateName, onClose, notify }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const variables = TEMPLATE_VARIABLES[templateName] || [];

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'emailTemplates', templateName));
        if (snap.exists()) {
          const data = snap.data();
          setSubject(data.subject || '');
          setBody(data.body || '');
        } else {
          const def = DEFAULT_TEMPLATES[templateName] || { subject: '', body: '' };
          setSubject(def.subject);
          setBody(def.body);
        }
      } catch (e) {
        const def = DEFAULT_TEMPLATES[templateName] || { subject: '', body: '' };
        setSubject(def.subject);
        setBody(def.body);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [templateName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'emailTemplates', templateName), {
        subject,
        body,
        updatedAt: new Date().toISOString(),
      });
      notify('Template saved to Firestore!', 'success');
    } catch (e) {
      notify('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const insertVar = (v) => setBody(prev => prev + v);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start',
      justifyContent: 'flex-end', padding: 0,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '560px', height: '100vh', background: '#fff',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--gd)',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
              {templateName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              Email Template Editor
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.12)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--mu)' }}>Loading template...</div>
          ) : (
            <>
              {/* Subject */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Subject Line</label>
                <input
                  type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  style={inputStyle} placeholder="Email subject..."
                />
              </div>

              {/* Variables */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Available Variables</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {variables.map(v => (
                    <button key={v} onClick={() => insertVar(v)} style={{
                      padding: '4px 10px', fontSize: '0.75rem', fontFamily: 'monospace',
                      background: 'rgba(26,184,160,0.08)', color: 'var(--teal)',
                      border: '1px solid rgba(26,184,160,0.2)', borderRadius: 6,
                      cursor: 'pointer', fontWeight: 600,
                    }}>{v}</button>
                  ))}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--mu)', marginTop: 6 }}>
                  Click a variable to insert it at the end of the body
                </div>
              </div>

              {/* Body */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Email Body</label>
                <textarea
                  value={body} onChange={e => setBody(e.target.value)}
                  rows={16} placeholder="Email body..."
                  style={{
                    ...inputStyle, resize: 'vertical', fontFamily: 'monospace',
                    lineHeight: 1.6, fontSize: '0.82rem', minHeight: 280,
                  }}
                />
              </div>

              {/* Preview box */}
              <div style={{
                padding: '14px 16px', background: 'rgba(0,0,0,0.02)',
                borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)',
                fontSize: '0.78rem', color: 'var(--mu)',
              }}>
                <div style={{ fontWeight: 700, color: 'var(--gd)', marginBottom: 6 }}>
                  Preview note
                </div>
                Variables like <span style={{ fontFamily: 'monospace', color: 'var(--teal)' }}>{'{{name}}'}</span> will be
                replaced with real values when the email is sent via Firebase Cloud Functions (to be configured at deployment).
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', gap: 12, background: '#fff',
        }}>
          <button onClick={onClose} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-gr" style={{
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Component ─────────────────────────────────────────────────
export function Settings({ user, notify, logout, nav }) {
  const { currentUser, refreshUserData } = useAuth();
  const platformConfig = usePlatformConfig();

  // Commission fields
  const [commissionRate, setCommissionRate] = useState(platformConfig.commissionRate);
  const [affiliateRate, setAffiliateRate] = useState(platformConfig.affiliateRate);
  const [minPayout, setMinPayout] = useState(platformConfig.minPayout);
  const [commSaving, setCommSaving] = useState(false);

  // Features
  const [features, setFeatures] = useState(platformConfig.features);
  const [featuresSaving, setFeaturesSaving] = useState(false);

  // Admin profile
  const [adminName, setAdminName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password
  const [showPassPanel, setShowPassPanel] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passSaving, setPassSaving] = useState(false);

  // Email template editor
  const [editTemplate, setEditTemplate] = useState(null);

  const emailTemplates = ['Welcome Email', 'Booking Confirmation', 'Payout Notification', 'Weekly Digest'];

  // Sync state when Firestore config loads/changes
  useEffect(() => {
    setCommissionRate(platformConfig.commissionRate);
    setAffiliateRate(platformConfig.affiliateRate);
    setMinPayout(platformConfig.minPayout);
    setFeatures(platformConfig.features);
  }, [platformConfig]);

  // ── Commission Save ──────────────────────────────────────────────────────
  const handleSaveCommission = async () => {
    setCommSaving(true);
    try {
      await savePlatformConfig({ commissionRate: Number(commissionRate), affiliateRate: Number(affiliateRate), minPayout: Number(minPayout) });
      notify('Commission settings saved and applied platform-wide!', 'success');
    } catch (e) {
      notify('Failed to save commission settings', 'error');
    } finally { setCommSaving(false); }
  };

  const handleToggleFeature = async (featureName) => {
    const newVal = !features[featureName];
    const nextFeatures = { ...features, [featureName]: newVal };
    setFeatures(nextFeatures);
    try {
      await savePlatformConfig({ features: nextFeatures });
      notify(`${featureName} ${newVal ? 'enabled' : 'disabled'} platform-wide`, newVal ? 'success' : 'warn');
    } catch (e) {
      console.error("Feature toggle error:", e);
      setFeatures(features); // rollback
      notify('Failed to update feature flag', 'error');
    }
  };

  // ── Profile Save ─────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!currentUser) return notify('Demo mode: cannot save', 'warn');
    setProfileSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { name: adminName });
      await refreshUserData();
      notify('Profile updated!', 'success');
    } catch (e) {
      notify('Failed to update profile', 'error');
    } finally { setProfileSaving(false); }
  };

  // ── Password Change ──────────────────────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) return notify('Passwords do not match', 'error');
    if (passForm.newPass.length < 6) return notify('Min 6 characters', 'error');
    setPassSaving(true);
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, passForm.current);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, passForm.newPass);
      notify('Password updated!', 'success');
      setShowPassPanel(false);
      setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (e) {
      notify(e.message?.replace('Firebase: ', '') || 'Error', 'error');
    } finally { setPassSaving(false); }
  };

  return (
    <div>
      {/* Email Template Editor */}
      {editTemplate && (
        <EmailTemplateEditor
          templateName={editTemplate}
          onClose={() => setEditTemplate(null)}
          notify={notify}
        />
      )}

      {/* Password Panel */}
      {showPassPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowPassPanel(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 30, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color="var(--teal)" />
              </div>
              <h3 style={{ fontWeight: 700, color: 'var(--gd)', fontSize: '1.05rem' }}>Change Password</h3>
            </div>
            <form onSubmit={handlePasswordChange}>
              {[['Current Password', 'current'], ['New Password', 'newPass'], ['Confirm New Password', 'confirm']].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{label}</label>
                  <input className="input" type="password" value={passForm[key]}
                    onChange={e => setPassForm(p => ({ ...p, [key]: e.target.value }))}
                    style={inputStyle} required />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-gh" style={{ flex: 1 }} onClick={() => setShowPassPanel(false)}>Cancel</button>
                <button type="submit" className="btn btn-gr" style={{ flex: 1 }} disabled={passSaving}>
                  {passSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Platform Settings</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Manage configurations, policies, and your account</p>
      </div>

      {/* Commission & Fees */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '20px' }}>
          <DollarSign size={16} color="var(--teal)" /> Commission & Fees
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 18 }}>
          {[
            { label: 'Platform Commission (%)', value: commissionRate, set: setCommissionRate, icon: <Percent size={14} color="var(--teal)" /> },
            { label: 'Affiliate Base Rate (%)', value: affiliateRate, set: setAffiliateRate, icon: <Percent size={14} color="var(--teal)" /> },
            { label: 'Min. Payout Threshold ($)', value: minPayout, set: setMinPayout, icon: <Hash size={14} color="var(--teal)" /> },
          ].map(({ label, value, set, icon }) => (
            <div key={label}>
              <label style={labelStyle}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input type="number" value={value} onChange={e => set(e.target.value)}
                  min="0" max="100" style={{ ...inputStyle, paddingRight: 36 }} />
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>{icon}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(26,184,160,0.05)', borderRadius: 8, border: '1px solid rgba(26,184,160,0.12)', fontSize: '0.78rem', color: 'var(--teal)', marginBottom: 16 }}>
          Changes are applied platform-wide instantly via Firestore real-time sync.
        </div>
        <button onClick={handleSaveCommission} disabled={commSaving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          <Save size={14} /> {commSaving ? 'Saving...' : 'Save Commission Settings'}
        </button>
      </div>

      {/* Admin Account + Password in two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '18px' }}>
            <Shield size={16} color="var(--teal)" /> Admin Account
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Display Name</label>
            <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={user?.email || ''} disabled style={{ ...inputStyle, background: '#f5f5f5', cursor: 'not-allowed' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSaveProfile} disabled={profileSaving}
              style={{ flex: 1, padding: '9px 0', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              {profileSaving ? 'Saving...' : 'Update Profile'}
            </button>
            <button onClick={() => setShowPassPanel(true)}
              style={{ flex: 1, padding: '9px 0', background: 'rgba(26,184,160,0.08)', color: 'var(--teal)', border: '1px solid rgba(26,184,160,0.2)', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              Change Password
            </button>
          </div>
        </div>

        {/* Feature Toggles */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '16px' }}>
            <Sliders size={16} color="var(--teal)" /> Feature Toggles
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(features).map(([feature, enabled]) => (
              <div key={feature} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px',
                background: enabled ? 'rgba(26,184,160,0.04)' : '#f9f9f9',
                borderRadius: '8px',
                border: `1px solid ${enabled ? 'rgba(26,184,160,0.15)' : 'rgba(0,0,0,0.05)'}`,
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 500, color: enabled ? 'var(--gd)' : 'var(--mu)' }}>{feature}</span>
                <div onClick={() => handleToggleFeature(feature)} style={{
                  width: 38, height: 22, borderRadius: '100px', cursor: 'pointer',
                  background: enabled ? 'var(--teal)' : '#d4d4d4',
                  position: 'relative', transition: 'background 0.25s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 3, left: enabled ? 18 : 3,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--mu)', marginTop: 12 }}>
            Toggles save instantly to Firestore and affect all users in real-time.
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ ...cardStyle, border: '1px solid rgba(232,68,68,0.2)', background: 'rgba(232,68,68,0.015)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: '#e84444', marginBottom: '14px' }}>
          <AlertTriangle size={16} color="#e84444" /> Danger Zone
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--mu)', marginBottom: '16px' }}>Logging out will end your admin session.</p>
        <button onClick={() => { logout(); nav('home'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'rgba(232,68,68,0.08)', color: 'var(--rd)', border: '1px solid rgba(232,68,68,0.2)', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          <LogOut size={14} /> Log Out
        </button>
      </div>
    </div>
  );
}
