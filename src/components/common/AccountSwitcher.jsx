import React, { useState, useEffect, useRef } from 'react';
import { LogOut, UserPlus, ChevronDown, Check } from 'lucide-react';

const STORAGE_KEY = 'mindgigs_saved_accounts';

const ROLE_COLORS = {
  expert: { bg: 'rgba(26,184,160,0.12)', border: 'rgba(26,184,160,0.3)', text: 'var(--teal)', label: 'Expert' },
  client: { bg: 'rgba(255,178,122,0.12)', border: 'rgba(255,178,122,0.35)', text: 'var(--gb)', label: 'Client' },
  affiliate: { bg: 'rgba(26,184,160,0.12)', border: 'rgba(26,184,160,0.3)', text: 'var(--teal)', label: 'Affiliate' },
  admin: { bg: 'rgba(232,68,68,0.1)', border: 'rgba(232,68,68,0.25)', text: '#e84444', label: 'Admin' },
};

/* ── Helpers ── */
export function saveAccountToStorage(uid, name, email, role) {
  if (!uid || !role) return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const exists = stored.findIndex(a => a.uid === uid);
    const entry = { uid, name: name || email || 'User', email: email || '', role, savedAt: Date.now() };
    if (exists >= 0) {
      stored[exists] = entry; // refresh
    } else {
      stored.unshift(entry);
    }
    // Keep max 10 entries
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.slice(0, 10)));
  } catch (_) {}
}

export function removeAccountFromStorage(uid) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.filter(a => a.uid !== uid)));
  } catch (_) {}
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── Avatar Circle ── */
function Avatar({ name, role, size = 36, fontSize = '0.85rem' }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.expert;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: c.bg, border: `2px solid ${c.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, color: c.text, userSelect: 'none',
    }}>
      {getInitials(name)}
    </div>
  );
}

/* ── Main Component ── */
export function AccountSwitcher({ user, role, logout, nav }) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const dropRef = useRef(null);

  // Load same-role saved accounts
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      // Only show accounts that match the current portal role
      setAccounts(stored.filter(a => a.role === role));
    } catch (_) {}
  }, [role, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const c = ROLE_COLORS[role] || ROLE_COLORS.expert;
  const currentUid = user?.uid;

  const handleSwitchAccount = (account) => {
    if (account.uid === currentUid) { setOpen(false); return; }
    // Log out current user and redirect to login page for this role portal
    // The login page will receive the email as a hint
    logout();
    nav('login', { role, emailHint: account.email });
    setOpen(false);
  };

  const handleAddAccount = () => {
    logout();
    nav('login', { role });
    setOpen(false);
  };

  const handleRemoveAccount = (e, uid) => {
    e.stopPropagation();
    removeAccountFromStorage(uid);
    setAccounts(prev => prev.filter(a => a.uid !== uid));
  };

  const handleLogout = () => {
    logout();
    nav('home');
    setOpen(false);
  };

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px',
          borderRadius: 40, border: `1.5px solid ${open ? c.border : 'rgba(0,0,0,0.08)'}`,
          background: open ? c.bg : '#fff', cursor: 'pointer', transition: 'all 0.18s',
          boxShadow: open ? `0 0 0 3px ${c.bg}` : 'none',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.borderColor = c.border; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
      >
        <Avatar name={user?.name} role={role} size={32} fontSize="0.8rem" />
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gd)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.name || user?.email || 'Account'}
        </span>
        <ChevronDown size={14} color="var(--mu)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', flexShrink: 0 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 9000,
          background: '#fff', borderRadius: 14, minWidth: 280,
          boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden',
          animation: 'fadeSlideDown 0.15s ease',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.015)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              {c.label} Accounts
            </div>
            {/* Current account */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={user?.name} role={role} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gd)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'Current User'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email || '—'}
                </div>
              </div>
              <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, flexShrink: 0 }}>
                Active
              </span>
            </div>
          </div>

          {/* Saved accounts (same role, not current) */}
          {accounts.filter(a => a.uid !== currentUid).length > 0 && (
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '8px 18px 4px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Switch To
              </div>
              {accounts.filter(a => a.uid !== currentUid).map(account => (
                <div
                  key={account.uid}
                  onClick={() => handleSwitchAccount(account)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 18px', cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar name={account.name} role={account.role} size={34} fontSize="0.78rem" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {account.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {account.email}
                    </div>
                  </div>
                  <button
                    onClick={e => handleRemoveAccount(e, account.uid)}
                    title="Remove from list"
                    style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--mu)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(232,68,68,0.12)'; e.currentTarget.style.color = '#e84444'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--mu)'; }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Add account */}
          <div style={{ padding: '6px 10px' }}>
            <button
              onClick={handleAddAccount}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 8px', borderRadius: 8, border: 'none', background: 'transparent',
                cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(26,184,160,0.08)', border: '1.5px dashed rgba(26,184,160,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserPlus size={15} color="var(--teal)" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Add {c.label} Account</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--mu)' }}>Sign in with another {c.label.toLowerCase()} account</div>
              </div>
            </button>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '4px 0' }} />

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 8px', borderRadius: 8, border: 'none', background: 'transparent',
                cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(232,68,68,0.06)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(232,68,68,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={15} color="#e84444" />
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e84444' }}>Sign Out</div>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
