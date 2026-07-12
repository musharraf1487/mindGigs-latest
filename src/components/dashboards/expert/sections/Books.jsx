import React, { useState, useEffect } from 'react';
import { Trash2, BookOpen, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ReorderArrows } from '../../../common/ReorderArrows';
import { formatOfferPrice } from '../../../../utils/price';

const CTA_OPTIONS = ['Buy Now', 'Buy on Amazon'];
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

const EMPTY_BOOK = {
  title: '',
  author: '',
  tagline: '',
  format: 'Ebook',
  price: '',
  cta: 'Buy Now',
  link: '',
  deliveryLink: '',
  coverUrl: null,
  active: true,
};

function BookCoverThumb({ coverUrl, size = 64 }) {
  return (
    <div
      style={{
        width: size,
        aspectRatio: '2/3',
        borderRadius: 6,
        overflow: 'hidden',
        flexShrink: 0,
        background: coverUrl ? '#fff' : 'linear-gradient(135deg, var(--gd), var(--gb))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.16)',
      }}
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <BookOpen size={size * 0.34} color="#fff" opacity={0.85} />
      )}
    </div>
  );
}

function BookModal({ book, onSave, onClose, onDelete, notify }) {
  const { currentUser } = useAuth();
  const isNew = !book;
  const [form, setForm] = useState(book || EMPTY_BOOK);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(book?.coverUrl || null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = (file) => {
    if (!file || !ACCEPTED_TYPES.includes(file.type)) {
      notify && notify('Please upload a PNG or JPEG image.', 'warn');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const removeCover = (e) => {
    e.stopPropagation();
    setCoverFile(null);
    setCoverPreview(null);
    set('coverUrl', null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price.trim()) return;
    if (form.cta === 'Buy Now' && !form.deliveryLink.trim()) {
      notify && notify('Please add a delivery link — it\'s what gets emailed to buyers after purchase.', 'warn');
      return;
    }
    setUploading(true);
    try {
      let coverUrl = form.coverUrl || null;
      if (coverFile && currentUser) {
        const storageRef = ref(storage, `books/${currentUser.uid}/${Date.now()}-${coverFile.name}`);
        await uploadBytes(storageRef, coverFile);
        coverUrl = await getDownloadURL(storageRef);
      }
      onSave({ ...form, coverUrl });
    } catch (err) {
      console.error('Failed to upload cover image:', err);
      notify && notify('Failed to upload cover image. Please try again.', 'error');
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
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>{isNew ? '+ Add Book' : 'Edit Book'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginTop: 2 }}>
              {isNew ? 'List a book you\'ve published for sale.' : 'Update your book details.'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl)', fontWeight: 700 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>
              Cover Image <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(PNG or JPG, optional)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('book-cover-input').click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                border: `2px dashed ${dragging ? 'var(--teal)' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                background: dragging ? 'rgba(26,184,160,0.04)' : 'rgba(0,0,0,0.01)',
              }}
            >
              <input
                id="book-cover-input"
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <div style={{ position: 'relative' }}>
                <BookCoverThumb coverUrl={coverPreview} />
                {coverPreview && (
                  <button
                    type="button"
                    onClick={removeCover}
                    style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '1px solid rgba(0,0,0,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={12} color="var(--sl)" />
                  </button>
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>
                  {coverPreview ? 'Change cover image' : 'Upload cover image'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 4 }}>
                  Drag & drop or click to browse · portrait 2:3 looks best
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Book Title <span style={{ color: '#e84444' }}>*</span></label>
            <input className="input" type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. The Founder's Playbook" required style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
              Author <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(only if different from you)</span>
            </label>
            <input className="input" type="text" value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="Leave blank to use your profile name" style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Tagline</label>
            <input className="input" type="text" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="One-line description of the book" style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Price <span style={{ color: '#e84444' }}>*</span></label>
              <input className="input" type="text" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="e.g. $24" required style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Buy Button Label</label>
              <select className="select" value={form.cta} onChange={(e) => set('cta', e.target.value)} style={{ width: '100%' }}>
                {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {form.cta === 'Buy on Amazon' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Retailer Link</label>
              <input className="input" type="url" value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://amazon.com/..." style={{ width: '100%' }} />
            </div>
          )}

          {form.cta === 'Buy Now' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>
                Delivery Link <span style={{ color: '#e84444' }}>*</span> <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(PDF, Google Drive, Dropbox, etc.)</span>
              </label>
              <input className="input" type="url" value={form.deliveryLink} onChange={(e) => set('deliveryLink', e.target.value)} placeholder="https://drive.google.com/..." required style={{ width: '100%' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--mu)', marginTop: 6 }}>
                This is what gets emailed to buyers automatically right after purchase.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Listed for Sale</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 2 }}>Visible on your public profile</div>
            </div>
            <div onClick={() => set('active', !form.active)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', position: 'relative', background: form.active ? 'var(--teal)' : 'rgba(0,0,0,0.15)' }}>
              <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-gr" style={{ flex: 2 }} disabled={uploading}>
              {uploading ? 'Uploading...' : isNew ? 'Add Book' : 'Save Changes'}
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
                <Trash2 size={14} /> Remove Book
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export function Books({ user, expertData, notify }) {
  const { currentUser, refreshUserData } = useAuth();

  const buildInitial = (list) => (list || []).map((b) => ({ ...b, id: b.id || Math.random().toString(36).slice(2), active: b.active ?? true }));

  const [books, setBooks] = useState(() => buildInitial(user?.booksList || expertData?.booksList));
  const [showCreate, setShowCreate] = useState(false);
  const [editBook, setEditBook] = useState(null);

  useEffect(() => {
    setBooks(buildInitial(user?.booksList || expertData?.booksList));
  }, [user, expertData]);

  const saveToFirestore = async (updated) => {
    if (!currentUser) return;
    const booksList = updated.map(({ id, ...rest }) => rest);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { booksList });
      refreshUserData();
    } catch (err) {
      console.error('Failed to save books to Firestore:', err);
      notify && notify('Failed to save changes to database.', 'error');
    }
  };

  const handleCreate = (form) => {
    const newBook = { ...form, id: Date.now().toString(36) };
    const updated = [newBook, ...books];
    setBooks(updated);
    saveToFirestore(updated);
    setShowCreate(false);
    notify && notify('Book added successfully!');
  };

  const handleEdit = (form) => {
    const updated = books.map((b) => (b.id === editBook.id ? { ...form, id: b.id } : b));
    setBooks(updated);
    saveToFirestore(updated);
    setEditBook(null);
    notify && notify('Book updated!');
  };

  const handleDelete = () => {
    const updated = books.filter((b) => b.id !== editBook.id);
    setBooks(updated);
    saveToFirestore(updated);
    setEditBook(null);
    notify && notify('Book removed.');
  };

  const handleMove = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= books.length) return;
    const updated = [...books];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setBooks(updated);
    saveToFirestore(updated);
  };

  return (
    <>
      {showCreate && <BookModal book={null} onSave={handleCreate} onClose={() => setShowCreate(false)} notify={notify} />}
      {editBook && <BookModal book={editBook} onSave={handleEdit} onClose={() => setEditBook(null)} onDelete={handleDelete} notify={notify} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Books</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Showcase and sell books you've published.</p>
        </div>
        <button className="btn btn-gr" onClick={() => setShowCreate(true)}>+ Add Book</button>
      </div>

      {books.length > 0 ? (
        <div className="grid-3" style={{ gap: 24 }}>
          {books.map((book, i) => (
            <div key={book.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ height: 150, background: book.coverUrl ? '#eef1f4' : 'linear-gradient(135deg, rgba(26,184,160,0.07), rgba(84,119,146,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <BookOpen size={40} color="var(--teal)" />
                )}
                {!book.active && (
                  <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.65rem', background: 'rgba(0,0,0,0.08)', color: 'var(--sl)', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>Inactive</span>
                )}
                <span style={{ position: 'absolute', bottom: 10, left: 10, fontSize: '0.65rem', background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>{book.format}</span>
              </div>
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gd)', lineHeight: 1.4, flex: 1 }}>{book.title}</h3>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gb)', marginLeft: 8, whiteSpace: 'nowrap' }}>
                    {formatOfferPrice(book.price)}
                  </div>
                </div>
                {book.author && <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginBottom: 8 }}>by {book.author}</div>}
                <p style={{ fontSize: '0.8rem', color: 'var(--sl)', marginBottom: 16, lineHeight: 1.5, flex: 1 }}>
                  {book.tagline || 'No tagline provided.'}
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <ReorderArrows
                    onMoveUp={() => handleMove(i, -1)}
                    onMoveDown={() => handleMove(i, 1)}
                    disableUp={i === 0}
                    disableDown={i === books.length - 1}
                  />
                  <button className="btn btn-sm btn-gh" style={{ flex: 1 }} onClick={() => setEditBook(book)}>✏️ Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--mu)', background: '#fff', borderRadius: 12, border: '2px dashed rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><BookOpen size={64} color="var(--teal)" /></div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--gd)', marginBottom: 8 }}>No books yet</h3>
          <p style={{ maxWidth: 320, margin: '0 auto 24px' }}>Add a book you've published to sell it directly from your profile.</p>
          <button className="btn btn-gr" onClick={() => setShowCreate(true)}>+ Add Book</button>
        </div>
      )}
    </>
  );
}
