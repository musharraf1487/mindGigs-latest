import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';

const EMPTY_OFFER = {
  title: '',
  price: '',
  duration: '',
  desc: '',
  category: 'Session',
  active: true,
};

function OfferModal({ offer, onSave, onClose }) {
  const [form, setForm] = useState(offer || EMPTY_OFFER);
  const isNew = !offer;

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price.trim()) return;
    onSave(form);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px', borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>
              {isNew ? '+ Create New Offer' : 'Edit Offer'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginTop: 2 }}>
              {isNew ? 'Add a new session, subscription, or product.' : 'Update your offer details below.'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--sl)', fontWeight: 700,
            }}
          >×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
          {/* Category */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>
              Offer Type
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Session', 'Subscription', 'Product'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  style={{
                    padding: '7px 18px', borderRadius: 20, border: '1.5px solid',
                    borderColor: form.category === cat ? 'var(--teal)' : 'rgba(0,0,0,0.1)',
                    background: form.category === cat ? 'rgba(26,184,160,0.08)' : '#fff',
                    color: form.category === cat ? 'var(--teal)' : 'var(--sl)',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{cat}</button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
              Title <span style={{ color: '#e84444' }}>*</span>
            </label>
            <input
              className="input"
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder={form.category === 'Session' ? 'e.g. 60-min Strategy Deep Dive' : form.category === 'Subscription' ? 'e.g. Monthly Mentorship Club' : 'e.g. Pitch Deck Template'}
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* Price + Duration (row) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
                Price <span style={{ color: '#e84444' }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder={form.category === 'Subscription' ? '$199/mo' : '$250'}
                required
                style={{ width: '100%' }}
              />
            </div>
            {form.category === 'Session' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
                  Duration
                </label>
                <input
                  className="input"
                  type="text"
                  value={form.duration}
                  onChange={e => set('duration', e.target.value)}
                  placeholder="e.g. 60 min"
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              className="input"
              rows={3}
              value={form.desc}
              onChange={e => set('desc', e.target.value)}
              placeholder="Describe what clients get from this offer..."
              style={{ width: '100%', resize: 'vertical', minHeight: 80 }}
            />
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Active Listing</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 2 }}>Visible to clients when enabled</div>
            </div>
            <div
              onClick={() => set('active', !form.active)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', position: 'relative',
                background: form.active ? 'var(--teal)' : 'rgba(0,0,0,0.15)',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: form.active ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-gh"
              style={{ flex: 1 }}
            >Cancel</button>
            <button
              type="submit"
              className="btn btn-gr"
              style={{ flex: 2 }}
            >{isNew ? 'Create Offer' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ offer, onConfirm, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px',
        padding: '32px 28px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Trash2 size={48} color="#e84444" /></div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 8 }}>
          Delete Offer?
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: 28 }}>
          Are you sure you want to delete <strong>"{offer.title}"</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-gh" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn"
            style={{ flex: 1, background: 'rgba(232,68,68,0.1)', color: '#e84444', border: '1px solid rgba(232,68,68,0.2)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', padding: '10px', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(232,68,68,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(232,68,68,0.1)'}
            onClick={onConfirm}
          >Delete</button>
        </div>
      </div>
    </div>
  );
}

export function Offers({ user, notify }) {
  const { currentUser, refreshUserData } = useAuth();

  const buildInitialOffers = (u) => {
    const sessionOffers = (u?.sessionsList || []).map((o, i) => ({ ...o, category: 'Session', id: o.id || `session-${i}` }));
    const subscriptionOffers = (u?.subscriptionsList || []).map((o, i) => ({ ...o, category: 'Subscription', id: o.id || `subscription-${i}` }));
    const productOffers = (u?.productsList || []).map((o, i) => ({ ...o, category: 'Product', id: o.id || `product-${i}` }));
    return [...sessionOffers, ...subscriptionOffers, ...productOffers];
  };

  const [offers, setOffers] = useState(() => buildInitialOffers(user));
  const [showCreate, setShowCreate] = useState(false);
  const [editOffer, setEditOffer] = useState(null);   // { index, offer }
  const [deleteOffer, setDeleteOffer] = useState(null); // { index, offer }

  // Keep local list in sync whenever the underlying user profile changes
  // (e.g. after onboarding, or after a save made from this component).
  useEffect(() => {
    setOffers(buildInitialOffers(user));
  }, [user]);

  const saveToFirestore = async (updatedOffers) => {
    if (!currentUser) return;
    const strip = (o) => {
      const { id, category, ...rest } = o;
      return rest;
    };
    const sessionsList = updatedOffers.filter(o => o.category === 'Session').map(strip);
    const subscriptionsList = updatedOffers.filter(o => o.category === 'Subscription').map(strip);
    const productsList = updatedOffers.filter(o => o.category === 'Product').map(strip);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { sessionsList, subscriptionsList, productsList });
      refreshUserData();
    } catch (err) {
      console.error('Failed to save offers to Firestore:', err);
      notify && notify('Failed to save changes to database.', 'error');
    }
  };

  const handleCreate = (form) => {
    const newOffer = { ...form, id: Date.now().toString(36) };
    const updated = [newOffer, ...offers];
    setOffers(updated);
    saveToFirestore(updated);
    setShowCreate(false);
    notify && notify('Offer created successfully!', 'success');
  };

  const handleEdit = (form) => {
    const updated = offers.map(o => o.id === editOffer.offer.id ? { ...form, id: o.id } : o);
    setOffers(updated);
    saveToFirestore(updated);
    setEditOffer(null);
    notify && notify('Offer updated successfully!');
  };

  const handleDelete = () => {
    const updated = offers.filter(o => o.id !== deleteOffer.offer.id);
    setOffers(updated);
    saveToFirestore(updated);
    setDeleteOffer(null);
    notify && notify('Offer deleted.');
  };

  return (
    <>
      {/* Modals */}
      {showCreate && (
        <OfferModal
          offer={null}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editOffer && (
        <OfferModal
          offer={editOffer.offer}
          onSave={handleEdit}
          onClose={() => setEditOffer(null)}
        />
      )}
      {deleteOffer && (
        <DeleteConfirmModal
          offer={deleteOffer.offer}
          onConfirm={handleDelete}
          onClose={() => setDeleteOffer(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>My Offers</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Manage your sessions, subscriptions, and digital products.</p>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="grid-3" style={{ gap: '20px' }}>
        {offers.length > 0 ? (
          offers.map((offer) => (
            <div key={offer.id} className="card" style={{ display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ padding: '24px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="tag" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--sl)', fontSize: '0.65rem' }}>{offer.category}</span>
                  {!offer.active && <span className="tag tag-gh" style={{ fontSize: '0.65rem' }}>Inactive</span>}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--gd)', marginBottom: '8px', lineHeight: 1.4 }}>
                  {offer.title}
                </h3>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gb)', marginBottom: '12px' }}>
                  {offer.price?.includes('$') ? offer.price : `$${offer.price}`}
                </div>
                {offer.duration && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--sl)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🕒 {offer.duration}
                  </div>
                )}
                <p style={{ fontSize: '0.82rem', color: 'var(--mu)', lineHeight: 1.5 }}>
                  {offer.desc || 'No description provided.'}
                </p>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.01)' }}>
                <button
                  className="btn btn-sm btn-gh"
                  style={{ flex: 1 }}
                  onClick={() => setEditOffer({ offer })}
                >✏️ Edit</button>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, background: 'rgba(232,68,68,0.08)', color: '#e84444', border: '1px solid rgba(232,68,68,0.15)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.8rem' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(232,68,68,0.18)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(232,68,68,0.08)'}
                  onClick={() => setDeleteOffer({ offer })}
                >🗑️ Delete</button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '100px 20px', textAlign: 'center', color: 'var(--mu)', background: '#fff', borderRadius: '12px', border: '2px dashed rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>💼</div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--gd)', marginBottom: '8px' }}>No offers yet</h3>
            <p style={{ maxWidth: '300px', margin: '0 auto 24px' }}>Create your first session or product to start earning.</p>
            <button className="btn btn-gr" onClick={() => setShowCreate(true)}>Create My First Offer</button>
          </div>
        )}
      </div>
    </>
  );
}
