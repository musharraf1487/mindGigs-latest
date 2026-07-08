import React, { useState, useEffect } from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';

const CTA_TYPES = [
  { id: 'book', label: 'Book Now' },
  { id: 'contact', label: 'Contact Me' },
  { id: 'custom', label: 'Custom Link' },
];

const EMPTY_OFFERING = {
  title: '',
  type: '',
  price: '',
  desc: '',
  ctaType: 'contact',
  ctaLabel: '',
  link: '',
  active: true,
};

function OfferingModal({ offering, onSave, onClose, onDelete }) {
  const isNew = !offering;
  const [form, setForm] = useState(offering || EMPTY_OFFERING);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>{isNew ? '+ List a Custom Offering' : 'Edit Offering'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginTop: 2 }}>
              {isNew ? "Pitch any idea that doesn't fit sessions, subscriptions, or products." : 'Update your offering details.'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl)', fontWeight: 700 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Title <span style={{ color: '#e84444' }}>*</span></label>
            <input className="input" type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Custom Workshop for Your Team" required style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
                Category <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input className="input" type="text" value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="e.g. Workshop" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
                Price <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input className="input" type="text" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="e.g. $500 or leave blank" style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Description</label>
            <textarea className="input" rows={3} value={form.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Describe what this offering includes..." style={{ width: '100%', resize: 'vertical', minHeight: 80 }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>What should the button say?</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CTA_TYPES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set('ctaType', c.id)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                    borderColor: form.ctaType === c.id ? 'var(--teal)' : 'rgba(0,0,0,0.1)',
                    background: form.ctaType === c.id ? 'rgba(26,184,160,0.08)' : '#fff',
                    color: form.ctaType === c.id ? 'var(--teal)' : 'var(--sl)',
                  }}
                >{c.label}</button>
              ))}
            </div>
          </div>

          {form.ctaType === 'book' && (
            <p style={{ fontSize: '0.78rem', color: 'var(--mu)', marginBottom: 20, lineHeight: 1.5 }}>
              Clicking "Book Now" sends the client into your booking flow with this title and price pre-filled.
            </p>
          )}

          {form.ctaType === 'contact' && (
            <p style={{ fontSize: '0.78rem', color: 'var(--mu)', marginBottom: 20, lineHeight: 1.5 }}>
              Clicking "Contact Me" prompts the client to reach out to you directly to discuss details.
            </p>
          )}

          {form.ctaType === 'custom' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Button Label</label>
                <input className="input" type="text" value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="e.g. Apply Now" style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Link</label>
                <input className="input" type="url" value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://..." style={{ width: '100%' }} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Active Listing</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 2 }}>Visible on your public profile</div>
            </div>
            <div onClick={() => set('active', !form.active)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', position: 'relative', background: form.active ? 'var(--teal)' : 'rgba(0,0,0,0.15)' }}>
              <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-gr" style={{ flex: 2 }}>{isNew ? 'List Offering' : 'Save Changes'}</button>
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
                <Trash2 size={14} /> Delete Offering
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

const ctaDisplayLabel = (o) => {
  if (o.ctaType === 'book') return 'Book Now';
  if (o.ctaType === 'custom') return o.ctaLabel || 'Learn More';
  return 'Contact Me';
};

export function CustomOfferings({ user, expertData, notify }) {
  const { currentUser, refreshUserData } = useAuth();

  const buildInitial = (list) => (list || []).map((o) => ({ ...o, id: o.id || Math.random().toString(36).slice(2), active: o.active ?? true }));

  const [offerings, setOfferings] = useState(() => buildInitial(user?.customOfferingsList || expertData?.customOfferingsList));
  const [showCreate, setShowCreate] = useState(false);
  const [editOffering, setEditOffering] = useState(null);

  useEffect(() => {
    setOfferings(buildInitial(user?.customOfferingsList || expertData?.customOfferingsList));
  }, [user, expertData]);

  const saveToFirestore = async (updated) => {
    if (!currentUser) return;
    const customOfferingsList = updated.map(({ id, ...rest }) => rest);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { customOfferingsList });
      refreshUserData();
    } catch (err) {
      console.error('Failed to save custom offerings to Firestore:', err);
      notify && notify('Failed to save changes to database.', 'error');
    }
  };

  const handleCreate = (form) => {
    const newOffering = { ...form, id: Date.now().toString(36) };
    const updated = [newOffering, ...offerings];
    setOfferings(updated);
    saveToFirestore(updated);
    setShowCreate(false);
    notify && notify('Offering listed successfully!');
  };

  const handleEdit = (form) => {
    const updated = offerings.map((o) => (o.id === editOffering.id ? { ...form, id: o.id } : o));
    setOfferings(updated);
    saveToFirestore(updated);
    setEditOffering(null);
    notify && notify('Offering updated!');
  };

  const handleDelete = () => {
    const updated = offerings.filter((o) => o.id !== editOffering.id);
    setOfferings(updated);
    saveToFirestore(updated);
    setEditOffering(null);
    notify && notify('Offering deleted.');
  };

  return (
    <>
      {showCreate && <OfferingModal offering={null} onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editOffering && <OfferingModal offering={editOffering} onSave={handleEdit} onClose={() => setEditOffering(null)} onDelete={handleDelete} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Custom Offerings</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>List any idea that doesn't fit sessions, subscriptions, or products — with your own price and call to action.</p>
        </div>
        <button className="btn btn-gr" onClick={() => setShowCreate(true)}>+ List an Idea</button>
      </div>

      {offerings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {offerings.map((o) => (
            <div
              key={o.id}
              className="card"
              style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gd)' }}>{o.title}</h3>
                  {o.type && <span className="tag tag-tl" style={{ fontSize: '0.65rem' }}>{o.type}</span>}
                  {!o.active && <span className="tag tag-gh" style={{ fontSize: '0.65rem' }}>Inactive</span>}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--sl)', lineHeight: 1.5 }}>{o.desc || 'No description provided.'}</p>
                <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 8 }}>Button: <strong style={{ color: 'var(--teal)' }}>{ctaDisplayLabel(o)}</strong></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, minWidth: 120 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gb)' }}>{o.price ? (o.price.includes('$') ? o.price : `$${o.price}`) : 'Custom'}</div>
                <button className="btn btn-sm btn-gh" onClick={() => setEditOffering(o)}>✏️ Edit</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--mu)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Sparkles size={48} color="var(--teal)" /></div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--gd)', marginBottom: 8 }}>No custom offerings yet</h3>
          <p style={{ maxWidth: 360, margin: '0 auto 24px' }}>Have an idea that doesn't fit a session, subscription, or product? List it here with your own title, price, and call to action.</p>
          <button className="btn btn-gr" onClick={() => setShowCreate(true)}>+ List an Idea</button>
        </div>
      )}
    </>
  );
}
