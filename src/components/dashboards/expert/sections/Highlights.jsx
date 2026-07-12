import React, { useState, useEffect } from 'react';
import { Trash2, Award, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ReorderArrows } from '../../../common/ReorderArrows';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

const EMPTY_HIGHLIGHT = {
  title: '',
  link: '',
  imageUrl: null,
  active: true,
};

function HighlightImageThumb({ imageUrl, size = 64 }) {
  return (
    <div
      style={{
        width: size,
        aspectRatio: '1/1',
        borderRadius: 10,
        overflow: 'hidden',
        flexShrink: 0,
        background: imageUrl ? '#fff' : 'linear-gradient(135deg, var(--gd), var(--gb))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.16)',
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Award size={size * 0.4} color="#fff" opacity={0.85} />
      )}
    </div>
  );
}

function HighlightModal({ highlight, onSave, onClose, onDelete, notify }) {
  const { currentUser } = useAuth();
  const isNew = !highlight;
  const [form, setForm] = useState(highlight || EMPTY_HIGHLIGHT);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(highlight?.imageUrl || null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = (file) => {
    if (!file || !ACCEPTED_TYPES.includes(file.type)) {
      notify && notify('Please upload a PNG or JPEG image.', 'warn');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const removeImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    set('imageUrl', null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setUploading(true);
    try {
      let imageUrl = form.imageUrl || null;
      if (imageFile && currentUser) {
        const storageRef = ref(storage, `highlights/${currentUser.uid}/${Date.now()}-${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      onSave({ ...form, imageUrl });
    } catch (err) {
      console.error('Failed to upload highlight image:', err);
      notify && notify('Failed to upload image. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>{isNew ? '+ Add Highlight' : 'Edit Highlight'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginTop: 2 }}>
              {isNew ? 'Showcase an achievement, award, or press mention.' : 'Update this highlight.'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl)', fontWeight: 700 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>
              Image <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(PNG or JPG, optional)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('highlight-image-input').click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                border: `2px dashed ${dragging ? 'var(--teal)' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                background: dragging ? 'rgba(26,184,160,0.04)' : 'rgba(0,0,0,0.01)',
              }}
            >
              <input
                id="highlight-image-input"
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <div style={{ position: 'relative' }}>
                <HighlightImageThumb imageUrl={imagePreview} />
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
                  {imagePreview ? 'Change image' : 'Upload image'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 4 }}>
                  Drag & drop or click to browse · square looks best
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Title <span style={{ color: '#e84444' }}>*</span></label>
            <input className="input" type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Featured in Forbes 30 Under 30" required style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
              Link <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input className="input" type="url" value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://..." style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Listed</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 2 }}>Visible on your public profile</div>
            </div>
            <div onClick={() => set('active', !form.active)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', position: 'relative', background: form.active ? 'var(--teal)' : 'rgba(0,0,0,0.15)' }}>
              <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-gr" style={{ flex: 2 }} disabled={uploading}>
              {uploading ? 'Uploading...' : isNew ? 'Add Highlight' : 'Save Changes'}
            </button>
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
                <Trash2 size={14} /> Remove Highlight
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export function Highlights({ user, expertData, notify }) {
  const { currentUser, refreshUserData } = useAuth();

  const buildInitial = (list) => (list || []).map((h) => ({ ...h, id: h.id || Math.random().toString(36).slice(2), active: h.active ?? true }));

  const [highlights, setHighlights] = useState(() => buildInitial(user?.highlightsList || expertData?.highlightsList));
  const [showCreate, setShowCreate] = useState(false);
  const [editHighlight, setEditHighlight] = useState(null);

  useEffect(() => {
    setHighlights(buildInitial(user?.highlightsList || expertData?.highlightsList));
  }, [user, expertData]);

  const saveToFirestore = async (updated) => {
    if (!currentUser) return;
    const highlightsList = updated.map(({ id, ...rest }) => rest);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { highlightsList });
      refreshUserData();
    } catch (err) {
      console.error('Failed to save highlights to Firestore:', err);
      notify && notify('Failed to save changes to database.', 'error');
    }
  };

  const handleCreate = (form) => {
    const newHighlight = { ...form, id: Date.now().toString(36) };
    const updated = [newHighlight, ...highlights];
    setHighlights(updated);
    saveToFirestore(updated);
    setShowCreate(false);
    notify && notify('Highlight added successfully!');
  };

  const handleEdit = (form) => {
    const updated = highlights.map((h) => (h.id === editHighlight.id ? { ...form, id: h.id } : h));
    setHighlights(updated);
    saveToFirestore(updated);
    setEditHighlight(null);
    notify && notify('Highlight updated!');
  };

  const handleDelete = () => {
    const updated = highlights.filter((h) => h.id !== editHighlight.id);
    setHighlights(updated);
    saveToFirestore(updated);
    setEditHighlight(null);
    notify && notify('Highlight removed.');
  };

  const handleMove = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= highlights.length) return;
    const updated = [...highlights];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setHighlights(updated);
    saveToFirestore(updated);
  };

  return (
    <>
      {showCreate && <HighlightModal highlight={null} onSave={handleCreate} onClose={() => setShowCreate(false)} notify={notify} />}
      {editHighlight && <HighlightModal highlight={editHighlight} onSave={handleEdit} onClose={() => setEditHighlight(null)} onDelete={handleDelete} notify={notify} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Highlights & Achievements</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Showcase awards, press mentions, and other achievements.</p>
        </div>
        <button className="btn btn-gr" onClick={() => setShowCreate(true)}>+ Add Highlight</button>
      </div>

      {highlights.length > 0 ? (
        <div className="grid-3" style={{ gap: 24 }}>
          {highlights.map((highlight, i) => (
            <div key={highlight.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ height: 150, background: highlight.imageUrl ? '#eef1f4' : 'linear-gradient(135deg, rgba(26,184,160,0.07), rgba(84,119,146,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {highlight.imageUrl ? (
                  <img src={highlight.imageUrl} alt={highlight.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Award size={40} color="var(--teal)" />
                )}
                {!highlight.active && (
                  <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.65rem', background: 'rgba(0,0,0,0.08)', color: 'var(--sl)', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>Inactive</span>
                )}
              </div>
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gd)', lineHeight: 1.4, marginBottom: 8 }}>{highlight.title}</h3>
                {highlight.link && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--teal)', marginBottom: 16, lineHeight: 1.5, flex: 1, wordBreak: 'break-all' }}>
                    {highlight.link}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto' }}>
                  <ReorderArrows
                    onMoveUp={() => handleMove(i, -1)}
                    onMoveDown={() => handleMove(i, 1)}
                    disableUp={i === 0}
                    disableDown={i === highlights.length - 1}
                  />
                  <button className="btn btn-sm btn-gh" style={{ flex: 1 }} onClick={() => setEditHighlight(highlight)}>✏️ Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--mu)', background: '#fff', borderRadius: 12, border: '2px dashed rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Award size={64} color="var(--teal)" /></div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--gd)', marginBottom: 8 }}>No highlights yet</h3>
          <p style={{ maxWidth: 320, margin: '0 auto 24px' }}>Add an award, press mention, or achievement to showcase on your profile.</p>
          <button className="btn btn-gr" onClick={() => setShowCreate(true)}>+ Add Highlight</button>
        </div>
      )}
    </>
  );
}
