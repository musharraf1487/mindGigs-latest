import React, { useState, useEffect } from 'react';
import { Trash2, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';

const EMPTY_SESSION = {
  title: '',
  duration: '',
  price: '',
  desc: '',
  active: true,
};

function SessionModal({ session, onSave, onClose, onDelete }) {
  const isNew = !session;
  const [form, setForm] = useState(session || EMPTY_SESSION);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price.trim()) return;
    onSave(form);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>{isNew ? '+ Create 1:1 Session' : 'Edit Session'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginTop: 2 }}>
              {isNew ? 'Add a bookable time slot clients can purchase.' : 'Update your session details.'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl)', fontWeight: 700 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Session Title <span style={{ color: '#e84444' }}>*</span></label>
            <input className="input" type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 60-min Strategy Deep Dive" required style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Price <span style={{ color: '#e84444' }}>*</span></label>
              <input className="input" type="text" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="e.g. $250" required style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Duration</label>
              <input className="input" type="text" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 60 min" style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Description</label>
            <textarea className="input" rows={3} value={form.desc} onChange={(e) => set('desc', e.target.value)} placeholder="What will clients get out of this session?" style={{ width: '100%', resize: 'vertical', minHeight: 80 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Active Listing</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 2 }}>Visible to clients when enabled</div>
            </div>
            <div onClick={() => set('active', !form.active)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', position: 'relative', background: form.active ? 'var(--teal)' : 'rgba(0,0,0,0.15)' }}>
              <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-gr" style={{ flex: 2 }}>{isNew ? 'Create Session' : 'Save Changes'}</button>
          </div>

          {!isNew && onDelete && (
            <>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '20px 0 16px' }} />
              <button
                type="button"
                onClick={onDelete}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(232,68,68,0.25)', background: 'rgba(232,68,68,0.06)', color: '#e84444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(232,68,68,0.14)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(232,68,68,0.06)')}
              >
                <Trash2 size={14} /> Delete Session
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export function Sessions({ user, expertData, notify }) {
  const { currentUser, refreshUserData } = useAuth();

  const buildInitial = (list) => (list || []).map((s) => ({ ...s, id: s.id || Math.random().toString(36).slice(2), active: s.active ?? true }));

  const [sessions, setSessions] = useState(() => buildInitial(user?.sessionsList || expertData?.sessionsList));
  const [showCreate, setShowCreate] = useState(false);
  const [editSession, setEditSession] = useState(null);

  useEffect(() => {
    setSessions(buildInitial(user?.sessionsList || expertData?.sessionsList));
  }, [user, expertData]);

  const saveToFirestore = async (updated) => {
    if (!currentUser) return;
    const sessionsList = updated.map(({ id, ...rest }) => rest);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { sessionsList });
      refreshUserData();
    } catch (err) {
      console.error('Failed to save sessions to Firestore:', err);
      notify && notify('Failed to save changes to database.', 'error');
    }
  };

  const handleCreate = (form) => {
    const newSession = { ...form, id: Date.now().toString(36) };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    saveToFirestore(updated);
    setShowCreate(false);
    notify && notify('Session created successfully!');
  };

  const handleEdit = (form) => {
    const updated = sessions.map((s) => (s.id === editSession.id ? { ...form, id: s.id } : s));
    setSessions(updated);
    saveToFirestore(updated);
    setEditSession(null);
    notify && notify('Session updated!');
  };

  const handleDelete = () => {
    const updated = sessions.filter((s) => s.id !== editSession.id);
    setSessions(updated);
    saveToFirestore(updated);
    setEditSession(null);
    notify && notify('Session deleted.');
  };

  return (
    <>
      {showCreate && <SessionModal session={null} onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editSession && <SessionModal session={editSession} onSave={handleEdit} onClose={() => setEditSession(null)} onDelete={handleDelete} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>1:1 Sessions</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Manage the bookable time slots clients can purchase.</p>
        </div>
        <button className="btn btn-gr" onClick={() => setShowCreate(true)}>+ Create Session</button>
      </div>

      {sessions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gd)' }}>{s.title}</h3>
                  {!s.active && <span className="tag tag-gh" style={{ fontSize: '0.65rem' }}>Inactive</span>}
                </div>
                {s.duration && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} /> {s.duration}
                  </div>
                )}
                <p style={{ fontSize: '0.85rem', color: 'var(--sl)', lineHeight: 1.5 }}>{s.desc || 'No description provided.'}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, minWidth: 120 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gb)' }}>{s.price?.includes('$') ? s.price : `$${s.price}`}</div>
                <button className="btn btn-sm btn-gh" onClick={() => setEditSession(s)}>✏️ Edit</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--mu)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Calendar size={48} color="var(--teal)" /></div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--gd)', marginBottom: 8 }}>No sessions yet</h3>
          <p style={{ maxWidth: 320, margin: '0 auto 24px' }}>Create your first 1:1 session so clients can book time with you.</p>
          <button className="btn btn-gr" onClick={() => setShowCreate(true)}>Create My First Session</button>
        </div>
      )}
    </>
  );
}
