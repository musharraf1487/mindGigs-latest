import React, { useState, useEffect } from 'react';
import { Trash2, Users, Check, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { usePlatformConfig } from '../../../../context/PlatformConfigContext';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getExpertBookings } from '../../../../services/bookingService';
import { ReorderArrows } from '../../../common/ReorderArrows';
import { formatOfferPrice } from '../../../../utils/price';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

const EMPTY_SUB = {
  title: '',
  desc: '',
  price: '',
  subscribers: 0,
  active: true,
  imageUrl: null,
  benefits: ['', '', ''], // Start with 3 empty benefits
};

function SubImageThumb({ imageUrl, size = 64 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        overflow: 'hidden',
        flexShrink: 0,
        background: imageUrl ? '#fff' : 'linear-gradient(135deg, var(--gd), var(--teal))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.16)',
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <RefreshCw size={size * 0.4} color="#fff" opacity={0.85} />
      )}
    </div>
  );
}

function SubModal({ sub, onSave, onClose, onDelete, notify }) {
  const { currentUser } = useAuth();
  const isNew = !sub;
  const [form, setForm] = useState(sub || EMPTY_SUB);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(sub?.imageUrl || null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageFile = (file) => {
    if (!file || !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      notify && notify('Please upload a PNG or JPEG image.', 'warn');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const removeImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    setForm(p => ({ ...p, imageUrl: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price.trim()) return;
    setUploading(true);
    try {
      let imageUrl = form.imageUrl || null;
      if (imageFile && currentUser) {
        const imageRef = ref(storage, `subscriptions/${currentUser.uid}/${Date.now()}-${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }
      onSave({ ...form, imageUrl });
    } catch (err) {
      console.error('Failed to upload subscription image:', err);
      notify && notify('Failed to upload image. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const updateBenefit = (idx, val) => {
    const newBenefits = [...form.benefits];
    newBenefits[idx] = val;
    setForm(p => ({ ...p, benefits: newBenefits }));
  };

  const addBenefit = () => {
    setForm(p => ({ ...p, benefits: [...p.benefits, ''] }));
  };

  const removeBenefit = (idx) => {
    setForm(p => ({ ...p, benefits: p.benefits.filter((_, i) => i !== idx) }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>{isNew ? 'Create Subscription Plan' : 'Edit Subscription Plan'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginTop: 2 }}>Define the recurring plan details.</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl)', fontWeight: 700 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>
              Plan Image <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(PNG or JPG, optional)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleImageDrop}
              onClick={() => document.getElementById('sub-image-input').click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                border: `2px dashed ${dragging ? 'var(--teal)' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                background: dragging ? 'rgba(26,184,160,0.04)' : 'rgba(0,0,0,0.01)',
              }}
            >
              <input
                id="sub-image-input"
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: 'none' }}
                onChange={(e) => handleImageFile(e.target.files[0])}
              />
              <div style={{ position: 'relative' }}>
                <SubImageThumb imageUrl={imagePreview} />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '1px solid rgba(0,0,0,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={12} color="var(--sl)" />
                  </button>
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>
                  {imagePreview ? 'Change plan image' : 'Upload plan image'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 4 }}>
                  Drag & drop or click to browse · shown on your public profile
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Plan Title *</label>
            <input className="input" type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. VIP Inner Circle" required style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Description</label>
            <textarea className="input" rows={3} value={form.desc || ''} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="What is this membership plan for?" style={{ width: '100%', resize: 'vertical', minHeight: 80 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Monthly Price *</label>
            <input className="input" type="text" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. $199/mo" required style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Included Benefits</label>
            {form.benefits.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input className="input" type="text" value={b} onChange={e => updateBenefit(i, e.target.value)} placeholder="e.g. Weekly Q&A calls" style={{ flex: 1 }} />
                <button type="button" onClick={() => removeBenefit(i)} style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', cursor: 'pointer', color: 'var(--mu)', fontSize: '1.2rem' }}>×</button>
              </div>
            ))}
            <button type="button" onClick={addBenefit} style={{ fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>+ Add Benefit</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Active Plan</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 2 }}>Allow new subscribers to join</div>
            </div>
            <div onClick={() => setForm(p => ({ ...p, active: !p.active }))} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', position: 'relative', background: form.active ? 'var(--teal)' : 'rgba(0,0,0,0.15)' }}>
              <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-gr" style={{ flex: 2 }} disabled={uploading}>{uploading ? 'Uploading...' : isNew ? 'Create Plan' : 'Save Changes'}</button>
          </div>

          {!isNew && onDelete && (
            <>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '20px 0 16px' }} />
              <button
                type="button"
                onClick={onDelete}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(232,68,68,0.25)', background: 'rgba(232,68,68,0.06)', color: '#e84444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(232,68,68,0.14)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(232,68,68,0.06)'}
              >
                <Trash2 size={14} /> Delete Plan
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export function Subscriptions({ user, expertData, notify }) {
  const { currentUser, refreshUserData } = useAuth();
  const { features } = usePlatformConfig();

  // Feature flag check
  if (features['Subscriptions'] === false) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(232,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={24} color="#e84444" />
        </div>
        <h3 style={{ fontFamily: 'var(--fu)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 8 }}>Subscriptions Disabled</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>The Subscriptions feature has been temporarily disabled by the platform administrator.</p>
      </div>
    );
  }

  // Use local state initialized from expertData or the user document
  const [plans, setPlans] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  // Recent subscribers list (combines mock data with real bookings)
  const [subscribers, setSubscribers] = useState(expertData?.subscriptions || []);
  const [loadingSubs, setLoadingSubs] = useState(true);

  // Initialize plans from the active user profile or fallback to mock
  useEffect(() => {
    if (user?.subscriptionsList) {
      setPlans(user.subscriptionsList);
    } else if (expertData?.subscriptionsList) {
      setPlans(expertData.subscriptionsList);
    }
  }, [user, expertData]);

  // Fetch real subscribers (bookings that contain 'month' or 'subscription' in title)
  useEffect(() => {
    if (!currentUser) {
      setLoadingSubs(false);
      return;
    }
    async function fetchSubs() {
      try {
        const bookings = await getExpertBookings(currentUser.uid);
        // Filter out bookings that are subscriptions
        const subBookings = bookings.filter(b =>
          (b.sessionTitle || '').toLowerCase().includes('month') ||
          (b.sessionTitle || '').toLowerCase().includes('subscription') ||
          (b.type || '').toLowerCase() === 'subscription'
        );

        if (subBookings.length > 0) {
          // Map bookings to the expected shape for the table
          const realSubs = subBookings.map(b => ({
            name: b.clientName || 'Client',
            plan: b.sessionTitle || 'Subscription Plan',
            since: b.date || new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: b.status === 'confirmed' ? 'active' : b.status === 'cancelled' ? 'cancelled' : 'pending'
          }));
          setSubscribers(realSubs);
        }
      } catch (err) {
        console.error('Failed to fetch subscribers:', err);
      } finally {
        setLoadingSubs(false);
      }
    }
    fetchSubs();
  }, [currentUser]);

  // Helper to save to Firestore if real user
  const saveToFirestore = async (newPlans) => {
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          subscriptionsList: newPlans
        });
        refreshUserData(); // Keep AuthContext data in sync
      } catch (err) {
        console.error('Failed to save to Firestore:', err);
        notify && notify('Failed to save changes to database.', 'error');
      }
    }
  };

  const handleCreate = (form) => {
    // Give it a fake ID if needed, or just append
    const newPlan = { ...form, id: Date.now().toString(), subscribers: 0 };
    const updatedPlans = [...plans, newPlan];
    setPlans(updatedPlans);
    saveToFirestore(updatedPlans);
    setShowCreate(false);
    notify && notify('Subscription plan created!');
  };

  const handleEdit = (form) => {
    // If plans don't have IDs, fallback to comparing by title
    const updatedPlans = plans.map(p =>
      (p.id ? p.id === editPlan.id : p.title === editPlan.title) ? { ...form, id: p.id || form.id } : p
    );
    setPlans(updatedPlans);
    saveToFirestore(updatedPlans);
    setEditPlan(null);
    notify && notify('Plan updated successfully!');
  };

  const handleDelete = () => {
    const updatedPlans = plans.filter(p =>
      p.id ? p.id !== editPlan.id : p.title !== editPlan.title
    );
    setPlans(updatedPlans);
    saveToFirestore(updatedPlans);
    setEditPlan(null);
    notify && notify('Subscription plan deleted.');
  };

  const handleMove = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= plans.length) return;
    const updated = [...plans];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setPlans(updated);
    saveToFirestore(updated);
  };

  return (
    <>
      {showCreate && <SubModal sub={null} onSave={handleCreate} onClose={() => setShowCreate(false)} notify={notify} />}
      {editPlan && <SubModal sub={editPlan} onSave={handleEdit} onClose={() => setEditPlan(null)} onDelete={handleDelete} notify={notify} />}

      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Membership Plans</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Manage your recurring revenue streams and subscriber community.</p>
        </div>
        {plans.length > 0 && (
          <button className="btn btn-gr" onClick={() => setShowCreate(true)}>+ Create Plan</button>
        )}
      </div>

      {plans.length > 0 ? (
        <div className="grid-2" style={{ gap: '24px', marginBottom: '40px' }}>
          {plans.map((sub, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.01)', display: 'flex', gap: 16 }}>
                <SubImageThumb imageUrl={sub.imageUrl} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', gap: 8 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--gd)' }}>{sub.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <ReorderArrows
                        onMoveUp={() => handleMove(i, -1)}
                        onMoveDown={() => handleMove(i, 1)}
                        disableUp={i === 0}
                        disableDown={i === plans.length - 1}
                      />
                      <span className={`tag tag-${sub.active ? 'gr' : 'gh'}`} style={{ fontSize: '0.7rem' }}>
                        {sub.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--gb)' }}>
                    {formatOfferPrice(sub.price)}
                  </div>
                </div>
              </div>
              <div style={{ padding: '24px', flex: 1 }}>
                {sub.desc && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--sl)', marginBottom: '20px', lineHeight: 1.5 }}>{sub.desc}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px', background: 'var(--gmt)', borderRadius: '8px' }}>
                  <Users size={24} color="var(--gd)" />
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--gd)' }}>{sub.subscribers || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--sl)' }}>Active Members</div>
                  </div>
                </div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--gd)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Included Benefits:</h4>
                <ul style={{ fontSize: '0.85rem', color: 'var(--sl)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(sub.benefits || []).filter(b => b.trim() !== '').map((benefit, j) => (
                    <li key={j} style={{ display: 'flex', gap: '10px' }}>
                      <span style={{ color: 'var(--gb)', flexShrink: 0, display: 'flex', alignItems: 'center' }}><Check size={14} /></span> {benefit}
                    </li>
                  ))}
                  {(!sub.benefits || sub.benefits.filter(b => b.trim() !== '').length === 0) && (
                    <li style={{ color: 'var(--mu)', fontStyle: 'italic' }}>No benefits listed</li>
                  )}
                </ul>
                <button className="btn btn-gh w-full" onClick={() => setEditPlan(sub)}>Edit Plan Details</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--mu)', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><RefreshCw size={48} color="var(--teal)" /></div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--gd)', marginBottom: '8px' }}>No subscriptions offered</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto 24px' }}>Create a recurring membership plan to build a stable income and community.</p>
          <button className="btn btn-gr" onClick={() => setShowCreate(true)}>Create Subscription Plan</button>
        </div>
      )}

      {/* Subscriber List */}
      <div className="card">
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--gd)' }}>Recent Subscribers</h3>
        </div>

        {loadingSubs ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--mu)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading subscribers...</div>
          </div>
        ) : subscribers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Member</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Plan</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Joined</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--mu)', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s, i) => (
                  <tr key={i} style={{ borderBottom: i === subscribers.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.03)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--gd)', fontSize: '0.9rem' }}>{s.name}</td>
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--sl)' }}>{s.plan}</td>
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--sl)' }}>{s.since}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`tag tag-${s.status === 'active' ? 'gr' : s.status === 'cancelled' ? 'rd' : 'yl'}`} style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--mu)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</div>
            <p style={{ fontSize: '0.9rem' }}>No subscribers yet. Keep promoting your plans!</p>
          </div>
        )}
      </div>
    </>
  );
}
