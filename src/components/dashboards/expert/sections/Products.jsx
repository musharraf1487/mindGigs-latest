import React, { useState, useEffect } from 'react';
import { ProfIcon } from '../../../common/ProfIcon';
import { useAuth } from '../../../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';

const ICONS = ['package', 'file', 'chart', 'bot', 'palette', 'dollar'];
const ICON_LABELS = { package: 'Template', file: 'Document', chart: 'Spreadsheet', bot: 'AI Tool', palette: 'Design', dollar: 'Finance' };

const EMPTY_PRODUCT = {
  title: '',
  price: '',
  description: '',
  icon: 'package',
  category: 'Template',
  fileUrl: null,
  fileName: null,
  sales: 0,
  views: 0,
  revenue: '$0',
  active: true,
};

/* ── UPLOAD / EDIT MODAL ── */
function ProductModal({ product, onSave, onClose, onDelete }) {
  const isNew = !product;
  const [form, setForm] = useState(product || EMPTY_PRODUCT);
  const [dragging, setDragging] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = (file) => {
    if (!file) return;
    set('fileName', file.name);
    set('fileUrl', URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price.trim()) return;
    // Auto-compute revenue for new products based on price × sales
    const price = parseFloat(form.price.replace(/[^0-9.]/g, '')) || 0;
    const rev = (price * (form.sales || 0)).toFixed(0);
    onSave({ ...form, revenue: `$${rev}` });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>{isNew ? '+ Upload New Product' : 'Edit Product'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginTop: 2 }}>
              {isNew ? 'Add a template, guide, or digital tool for sale.' : 'Update your product details.'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl)', fontWeight: 700 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          {/* Icon / Category */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>Product Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => { set('icon', ic); set('category', ICON_LABELS[ic]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.8rem', fontWeight: 600,
                    borderColor: form.icon === ic ? 'var(--teal)' : 'rgba(0,0,0,0.1)',
                    background: form.icon === ic ? 'rgba(26,184,160,0.08)' : '#fff',
                    color: form.icon === ic ? 'var(--teal)' : 'var(--sl)',
                  }}>
                  <ProfIcon icon={ic} size={14} style={{ pointerEvents: 'none' }} />
                  {ICON_LABELS[ic]}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Product Title <span style={{ color: '#e84444' }}>*</span></label>
            <input className="input" type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Pitch Deck Template" required style={{ width: '100%' }} />
          </div>

          {/* Price */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Price <span style={{ color: '#e84444' }}>*</span></label>
            <input className="input" type="text" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. $79" required style={{ width: '100%' }} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this product help clients with?" style={{ width: '100%', resize: 'vertical', minHeight: 80 }} />
          </div>

          {/* File Upload Zone */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>Product File {isNew && <span style={{ color: 'var(--mu)', fontWeight: 400 }}>(optional for now)</span>}</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragging ? 'var(--teal)' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(26,184,160,0.04)' : 'rgba(0,0,0,0.01)',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('product-file-input').click()}
            >
              <input id="product-file-input" type="file" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} accept=".pdf,.zip,.xlsx,.pptx,.docx,.csv,.png,.jpg" />
              {form.fileName ? (
                <div>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📁</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--teal)' }}>{form.fileName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 4 }}>Click to replace</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>☁️</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Drag & drop or click to upload</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 4 }}>PDF, ZIP, XLSX, PPTX, DOCX, CSV (max 50MB)</div>
                </div>
              )}
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gd)' }}>Listed for Sale</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: 2 }}>Visible to buyers in the marketplace</div>
            </div>
            <div onClick={() => set('active', !form.active)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', position: 'relative', background: form.active ? 'var(--teal)' : 'rgba(0,0,0,0.15)' }}>
              <div style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-gh" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-gr" style={{ flex: 2 }}>{isNew ? '🚀 Publish Product' : 'Save Changes'}</button>
          </div>

          {/* Delete (edit mode only) */}
          {!isNew && onDelete && (
            <>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '20px 0 16px' }} />
              <button
                type="button"
                onClick={onDelete}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(232,68,68,0.25)',
                  background: 'rgba(232,68,68,0.06)', color: '#e84444', fontWeight: 700, cursor: 'pointer',
                  fontSize: '0.85rem', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(232,68,68,0.14)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(232,68,68,0.06)'}
              >
                🗑️ Delete Product
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

/* ── STATS MODAL ── */
function StatsModal({ product, onClose }) {
  const price = parseFloat((product.price || '0').replace(/[^0-9.]/g, '')) || 0;
  const sales = product.sales || 0;
  const views = product.views || Math.floor(Math.random() * 400 + 80);
  const revenue = price * sales;
  const convRate = views > 0 ? ((sales / views) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'Total Sales', val: sales, icon: '🛒', color: 'var(--gb)' },
    { label: 'Total Revenue', val: `$${revenue.toLocaleString()}`, icon: '💰', color: 'var(--teal)' },
    { label: 'Page Views', val: views, icon: '👁️', color: 'var(--gd)' },
    { label: 'Conversion Rate', val: `${convRate}%`, icon: '📈', color: '#8b5cf6' },
  ];

  const monthlyData = [
    { month: 'Dec', sales: Math.floor(sales * 0.08) },
    { month: 'Jan', sales: Math.floor(sales * 0.14) },
    { month: 'Feb', sales: Math.floor(sales * 0.18) },
    { month: 'Mar', sales: Math.floor(sales * 0.22) },
    { month: 'Apr', sales: Math.floor(sales * 0.16) },
    { month: 'May', sales: Math.floor(sales * 0.22) },
  ];
  const maxSales = Math.max(...monthlyData.map(d => d.sales), 1);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(26,184,160,0.06), rgba(84,119,146,0.04))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ProfIcon icon={product.icon || 'package'} size={24} style={{ pointerEvents: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gd)' }}>{product.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginTop: 2 }}>Product Analytics</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.07)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl)', fontWeight: 700 }}>×</button>
        </div>

        <div style={{ padding: 28 }}>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: 12, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.val}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--mu)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mini Bar Chart */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 16 }}>Monthly Sales Trend</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
              {monthlyData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)' }}>{d.sales}</div>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    height: `${Math.max((d.sales / maxSales) * 72, 4)}px`,
                    background: i === monthlyData.length - 1 ? 'var(--teal)' : 'rgba(26,184,160,0.25)',
                    transition: 'height 0.4s ease',
                  }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--mu)' }}>{d.month}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra info row */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, padding: '14px 18px', borderRadius: 10, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Price</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gb)' }}>{product.price?.includes('$') ? product.price : `$${product.price}`}</div>
            </div>
            <div style={{ flex: 1, padding: '14px 18px', borderRadius: 10, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
              <span className={`tag ${product.active !== false ? 'tag-gr' : 'tag-gh'}`} style={{ fontSize: '0.7rem' }}>
                {product.active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ flex: 1, padding: '14px 18px', borderRadius: 10, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--mu)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Avg per Month</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gd)' }}>{Math.round(sales / 6)} sales</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN COMPONENT ── */
export function Products({ user, expertData, notify }) {
  const { currentUser, refreshUserData } = useAuth();

  const buildInitial = (list) => (list || []).map(p => ({
    ...p,
    id: p.id || Math.random().toString(36).slice(2),
    views: p.views ?? Math.floor(Math.random() * 400 + 80),
    sales: p.sales ?? 0,
    revenue: `$${((parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || 0) * (p.sales || 0)).toFixed(0)}`,
    active: p.active ?? true,
  }));

  const [products, setProducts] = useState(() => buildInitial(user?.productsList || expertData?.productsList));
  const [showUpload, setShowUpload] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [statsProduct, setStatsProduct] = useState(null);

  // Keep local list in sync whenever the underlying user profile changes
  useEffect(() => {
    setProducts(buildInitial(user?.productsList || expertData?.productsList));
  }, [user, expertData]);

  const saveToFirestore = async (updatedProducts) => {
    if (!currentUser) return;
    const productsList = updatedProducts.map(({ id, views, revenue, ...rest }) => rest);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { productsList });
      refreshUserData();
    } catch (err) {
      console.error('Failed to save products to Firestore:', err);
      notify && notify('Failed to save changes to database.', 'error');
    }
  };

  const handleUpload = (form) => {
    const newProduct = { ...form, id: Date.now().toString(36), sales: 0, views: 0, revenue: '$0' };
    const updated = [newProduct, ...products];
    setProducts(updated);
    saveToFirestore(updated);
    setShowUpload(false);
    notify && notify('Product published successfully! 🚀');
  };

  const handleEdit = (form) => {
    const updated = products.map(p => p.id === editProduct.id ? { ...form, id: p.id } : p);
    setProducts(updated);
    saveToFirestore(updated);
    setEditProduct(null);
    notify && notify('Product updated!');
  };

  const handleDelete = () => {
    const updated = products.filter(p => p.id !== editProduct.id);
    setProducts(updated);
    saveToFirestore(updated);
    setEditProduct(null);
    notify && notify('Product deleted.');
  };

  return (
    <>
      {showUpload && <ProductModal product={null} onSave={handleUpload} onClose={() => setShowUpload(false)} />}
      {editProduct && <ProductModal product={editProduct} onSave={handleEdit} onClose={() => setEditProduct(null)} onDelete={handleDelete} />}
      {statsProduct && <StatsModal product={statsProduct} onClose={() => setStatsProduct(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Digital Products</h2>
          <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Sell templates, guides, and tools to your audience.</p>
        </div>
        <button className="btn btn-gr" onClick={() => setShowUpload(true)}>+ Upload Product</button>
      </div>

      {/* Product Grid */}
      {products.length > 0 ? (
        <div className="grid-3" style={{ gap: '24px' }}>
          {products.map(product => (
            <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
            >
              {/* Thumbnail */}
              <div style={{ height: 130, background: 'linear-gradient(135deg, rgba(26,184,160,0.07), rgba(84,119,146,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <ProfIcon icon={product.icon || 'package'} size={48} style={{ pointerEvents: 'none' }} />
                {product.active === false && (
                  <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.65rem', background: 'rgba(0,0,0,0.08)', color: 'var(--sl)', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>Inactive</span>
                )}
                {product.fileName && (
                  <span style={{ position: 'absolute', bottom: 10, left: 10, fontSize: '0.65rem', background: 'rgba(26,184,160,0.15)', color: 'var(--teal)', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>📁 File attached</span>
                )}
              </div>

              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--gd)', lineHeight: 1.4, flex: 1 }}>{product.title}</h3>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--gb)', marginLeft: 8, whiteSpace: 'nowrap' }}>
                    {product.price?.includes('$') ? product.price : `$${product.price}`}
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--sl)', marginBottom: 14, lineHeight: 1.5, flex: 1 }}>
                  {product.description || 'Pre-configured digital asset for your clients.'}
                </p>

                {/* Sales stat */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,0,0,0.025)', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sales</span>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--gd)', fontSize: '0.95rem' }}>{product.sales}</div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-sm btn-gh"
                    style={{ flex: 1 }}
                    onClick={() => setEditProduct(product)}
                  >✏️ Edit</button>
                  <button
                    className="btn btn-sm btn-gh"
                    style={{ flex: 1 }}
                    onClick={() => setStatsProduct(product)}
                  >📊 Stats</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--mu)', background: '#fff', borderRadius: 12, border: '2px dashed rgba(0,0,0,0.07)' }}>
          <ProfIcon icon="package" size={64} style={{ margin: '0 auto 20px' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--gd)', marginBottom: 8 }}>No products yet</h3>
          <p style={{ maxWidth: '300px', margin: '0 auto 24px' }}>Upload your first digital product to start earning passive income.</p>
          <button className="btn btn-gr" onClick={() => setShowUpload(true)}>+ Upload Product</button>
        </div>
      )}
    </>
  );
}
