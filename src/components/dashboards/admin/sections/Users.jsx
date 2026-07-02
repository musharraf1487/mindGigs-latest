import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { Users as UsersIcon, User, Link, Shield, Mail, Plus, Search, UserCheck, UserX, RefreshCw } from 'lucide-react';

function InviteModal({ onClose, notify }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('expert');

  const handleSend = (e) => {
    e.preventDefault();
    if (!email) return;
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const signupLink = `${window.location.origin}/?signup=true&role=${role}`;
    const subject = encodeURIComponent(`You're invited to join mindGigs as a ${roleLabel}!`);
    const body = encodeURIComponent(
      `Hi there,\n\nYou've been personally invited to join mindGigs as a ${roleLabel}.\n\nmindGigs is a professional platform for knowledge experts to monetize their skills, offer 1:1 sessions, subscriptions, and digital products.\n\nSign up here: ${signupLink}\n\nBest,\nThe mindGigs Team`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    notify(`Invite email draft opened for ${email}`, 'success');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 30, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={18} color="var(--teal)" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>Invite User</h3>
        </div>
        <form onSubmit={handleSend}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Email Address *</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com" required
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid rgba(26,184,160,0.18)', borderRadius: '8px', fontSize: '0.875rem' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Invite As</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid rgba(26,184,160,0.18)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--ch)', background: '#fff' }}>
              <option value="expert">Expert / Creator</option>
              <option value="client">Client / Buyer</option>
              <option value="affiliate">Affiliate Partner</option>
            </select>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(26,184,160,0.05)', borderRadius: 8, border: '1px solid rgba(26,184,160,0.12)', fontSize: '0.78rem', color: 'var(--teal)', marginBottom: 20 }}>
            This will open your email client with a pre-filled invite message and a direct signup link.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-gh" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-gr" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Mail size={14} /> Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Users({ user, adminData, notify }) {
  const [liveUsers, setLiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [suspending, setSuspending] = useState(null);

  // Real-time Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const users = snap.docs.map(d => ({
        id: d.id,
        name: d.data().name || 'Unknown',
        email: d.data().email || '',
        role: d.data().role || 'client',
        status: d.data().status || 'active',
        joined: d.data().createdAt ? new Date(d.data().createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        ...d.data(),
      }));
      setLiveUsers(users);
      setLoading(false);
    }, (err) => {
      console.error('Users listener error:', err);
      // Fall back to mock data if permission error
      setLiveUsers(adminData?.users || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const allUsers = liveUsers.length > 0 ? liveUsers : (adminData?.users || []);

  const filteredUsers = allUsers.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const roleCounts = allUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const handleSuspend = async (u) => {
    const newStatus = u.status === 'suspended' ? 'active' : 'suspended';
    setSuspending(u.id);
    try {
      await updateDoc(doc(db, 'users', u.id), { status: newStatus });
      notify(`${u.name} has been ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`, newStatus === 'suspended' ? 'warn' : 'success');
    } catch (e) {
      notify('Failed to update user status', 'error');
    } finally {
      setSuspending(null);
    }
  };

  const roleIcon = (role) => {
    if (role === 'expert') return <User size={14} color="var(--gb)" />;
    if (role === 'affiliate') return <Link size={14} color="var(--teal)" />;
    if (role === 'admin') return <Shield size={14} color="var(--gd)" />;
    return <User size={14} color="var(--mu)" />;
  };

  const roleColor = { expert: 'var(--gb)', affiliate: 'var(--teal)', admin: 'var(--gd)', client: 'var(--mu)' };
  const roleBg = { expert: 'rgba(255,155,81,0.08)', affiliate: 'rgba(26,184,160,0.08)', admin: 'rgba(37,52,63,0.08)', client: 'rgba(0,0,0,0.04)' };

  return (
    <div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} notify={notify} />}

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>User Management</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Manage platform users, permissions, and status</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          <Plus size={14} /> Invite User
        </button>
      </div>

      {/* Role summary pills */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { role: 'expert', label: 'Experts', count: roleCounts.expert || 0, color: 'var(--gb)', icon: <User size={12} color="var(--gb)" /> },
          { role: 'affiliate', label: 'Affiliates', count: roleCounts.affiliate || 0, color: 'var(--teal)', icon: <Link size={12} color="var(--teal)" /> },
          { role: 'client', label: 'Clients', count: roleCounts.client || 0, color: 'var(--mu)', icon: <UsersIcon size={12} color="var(--mu)" /> },
        ].map(({ role, label, count, color, icon }) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fff', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {icon}
            <span style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '1rem', color: 'var(--gd)' }}>{count}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fff', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <UsersIcon size={12} color="var(--gd)" />
          <span style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '1rem', color: 'var(--gd)' }}>{allUsers.length}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--mu)' }}>Total</span>
          {loading && <RefreshCw size={10} color="var(--mu)" style={{ animation: 'spin 1s linear infinite' }} />}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} color="var(--mu)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search by name or email…" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 34px', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'var(--fb)', background: '#fff', outline: 'none', color: 'var(--ch)' }} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--ch)' }}>
          <option value="all">All Roles</option>
          <option value="expert">Experts</option>
          <option value="affiliate">Affiliates</option>
          <option value="client">Clients</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--ch)' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="table-wrap">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>
            Users <span style={{ fontWeight: 400, color: 'var(--mu)', fontSize: '0.82rem' }}>({filteredUsers.length})</span>
          </div>
          {loading && <span style={{ fontSize: '0.75rem', color: 'var(--mu)' }}>Syncing...</span>}
        </div>
        {filteredUsers.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr key={u.id || i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: roleBg[u.role] || 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {roleIcon(u.role)}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--ch)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--mu)', fontSize: '0.82rem' }}>{u.email}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--fu)', textTransform: 'capitalize', background: roleBg[u.role], color: roleColor[u.role] }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: u.status === 'suspended' ? 'rgba(232,68,68,0.08)' : 'rgba(26,184,160,0.08)', color: u.status === 'suspended' ? '#e84444' : 'var(--teal)' }}>
                      {u.status === 'suspended' ? <UserX size={10} /> : <UserCheck size={10} />} {u.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--mu)', fontSize: '0.82rem' }}>{u.joined}</td>
                  <td>
                    <button
                      disabled={suspending === u.id}
                      onClick={() => handleSuspend(u)}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        background: u.status === 'suspended' ? 'rgba(26,184,160,0.08)' : 'rgba(232,68,68,0.07)',
                        color: u.status === 'suspended' ? 'var(--teal)' : '#e84444',
                        border: u.status === 'suspended' ? '1px solid rgba(26,184,160,0.18)' : '1px solid rgba(232,68,68,0.15)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      {suspending === u.id ? '...' : u.status === 'suspended'
                        ? <><UserCheck size={11} /> Reactivate</>
                        : <><UserX size={11} /> Suspend</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <UsersIcon size={48} color="rgba(0,0,0,0.1)" />
            </div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600 }}>No users found</div>
            <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try adjusting your filters</div>
          </div>
        )}
      </div>
    </div>
  );
}
