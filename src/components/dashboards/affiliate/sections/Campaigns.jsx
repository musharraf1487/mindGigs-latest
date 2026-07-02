import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../config/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Plus, Megaphone, MousePointerClick, TrendingUp } from 'lucide-react';

const EMPTY_CAMPAIGN = { name: '', type: 'Email', status: 'active', clicks: 0, conversions: 0, roi: '0%' };

function CampaignModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'Email' });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 30, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,184,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={18} color="var(--teal)" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)' }}>New Campaign</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Campaign Name *</label>
            <input className="input" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. LinkedIn Expert Outreach Q2" required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Campaign Type</label>
            <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%' }}>
              <option>Email</option>
              <option>LinkedIn</option>
              <option>Twitter / X</option>
              <option>WhatsApp</option>
              <option>Instagram</option>
              <option>Content / Blog</option>
              <option>Other</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-gh" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-gr" style={{ flex: 2 }}>Create Campaign</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Campaigns({ user, affiliateData, notify }) {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState(affiliateData?.campaigns || []);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load real campaigns from Firestore
  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    async function fetch() {
      try {
        const q = query(
          collection(db, 'campaigns'),
          where('affiliateId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetch();
  }, [currentUser]);

  const handleCreate = async (form) => {
    const newCampaign = {
      ...EMPTY_CAMPAIGN,
      name: form.name,
      type: form.type,
      affiliateId: currentUser?.uid || 'mock',
      createdAt: new Date().toISOString(),
    };
    // Optimistic update
    const tempId = Date.now().toString();
    setCampaigns(prev => [{ ...newCampaign, id: tempId }, ...prev]);
    setShowNew(false);
    notify('Campaign created!', 'success');

    // Save to Firestore if real user
    if (currentUser) {
      try {
        const docRef = await addDoc(collection(db, 'campaigns'), newCampaign);
        setCampaigns(prev => prev.map(c => c.id === tempId ? { ...c, id: docRef.id } : c));
      } catch (e) {
        console.error(e);
        notify('Campaign saved locally — Firestore sync failed', 'warn');
      }
    }
  };

  const handleToggle = async (campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
    notify(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'}`, 'success');
    if (campaign.id && currentUser) {
      try { await updateDoc(doc(db, 'campaigns', campaign.id), { status: newStatus }); }
      catch (e) { console.error(e); }
    }
  };

  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const avgRoi = campaigns.length ? Math.round(campaigns.reduce((s, c) => s + parseFloat(c.roi || '0'), 0) / campaigns.length) : 0;

  return (
    <div>
      {showNew && <CampaignModal onSave={handleCreate} onClose={() => setShowNew(false)} />}

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>Marketing Campaigns</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Track and manage your marketing campaigns</p>
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--teal)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Clicks', val: totalClicks.toLocaleString(), color: 'var(--teal)', icon: <MousePointerClick size={18} color="var(--teal)" /> },
          { label: 'Total Conversions', val: totalConversions, color: 'var(--gb)', icon: <TrendingUp size={18} color="var(--gb)" /> },
          { label: 'Avg ROI', val: `${avgRoi}%`, color: 'var(--gd)', icon: <Megaphone size={18} color="var(--gd)" /> },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div className="stat-label">{s.label}</div>
              {s.icon}
            </div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: s.color, opacity: 0.25 }} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>All Campaigns</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--mu)' }}>{campaigns.length} total</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)' }}>Loading campaigns...</div>
        ) : campaigns.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Type</th>
                <th>Status</th>
                <th>Clicks</th>
                <th>Conversions</th>
                <th>Conv. Rate</th>
                <th>ROI</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const convRate = (c.clicks || 0) > 0 ? (((c.conversions || 0) / c.clicks) * 100).toFixed(1) + '%' : '0%';
                const isActive = c.status === 'active';
                return (
                  <tr key={c.id || i}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--sl)' }}>{c.type || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600,
                        background: isActive ? 'rgba(26,184,160,0.1)' : 'rgba(0,0,0,0.05)',
                        color: isActive ? 'var(--teal)' : 'var(--mu)',
                      }}>
                        {isActive ? '●' : '⏸'} {c.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--teal)' }}>{(c.clicks || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: 'var(--gb)' }}>{c.conversions || 0}</td>
                    <td style={{ color: 'var(--sl)' }}>{convRate}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gd)', fontFamily: 'var(--fu)' }}>{c.roi || '0%'}</td>
                    <td>
                      <button onClick={() => handleToggle(c)} style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        background: isActive ? 'rgba(0,0,0,0.04)' : 'rgba(26,184,160,0.08)',
                        color: isActive ? 'var(--mu)' : 'var(--teal)',
                        border: isActive ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(26,184,160,0.18)',
                      }}>{isActive ? 'Pause' : 'Resume'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(26,184,160,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Megaphone size={22} color="var(--teal)" />
            </div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, marginBottom: 6 }}>No campaigns yet</div>
            <div style={{ fontSize: '0.82rem', marginBottom: 16 }}>Create your first campaign to start tracking referral performance.</div>
            <button onClick={() => setShowNew(true)} className="btn btn-gr btn-sm">+ Create Campaign</button>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 18px', background: 'rgba(26,184,160,0.05)', borderRadius: '10px', border: '1.5px solid rgba(26,184,160,0.12)', fontSize: '0.82rem', color: 'var(--sl)' }}>
        <strong style={{ color: 'var(--teal)' }}>Pro Tip:</strong> Email outreach and LinkedIn campaigns have the highest ROI. Try A/B testing different messages to optimize conversions.
      </div>
    </div>
  );
}
