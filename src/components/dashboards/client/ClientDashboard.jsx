import React, { useState, useEffect } from 'react';

import { Home, Calendar, RefreshCw, Package, Settings as SettingsIcon, LogOut, User, Search, Star, AlertTriangle, CheckCircle, Check } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getClientBookings, cancelBooking } from '../../../services/bookingService';
import { getClientPurchases } from '../../../services/purchaseService';
import { isSessionJoinable } from '../../../services/availabilityService';
import { submitReview, hasReviewedBooking } from '../../../services/reviewService';
import { formatOfferPrice } from '../../../utils/price';
import { AccountSwitcher } from '../../common/AccountSwitcher';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const STATUS_COLORS = {
    upcoming: { bg: 'rgba(191,201,209,0.1)', color: '#1ab8a0' },
    completed: { bg: 'rgba(255,178,122,0.12)', color: 'var(--gb)' },
    cancelled: { bg: 'rgba(232,68,68,0.08)', color: 'var(--rd)' },
    active: { bg: 'rgba(255,178,122,0.12)', color: 'var(--gb)' },
};

function StatusBadge({ status }) {
    const s = STATUS_COLORS[status] || STATUS_COLORS.completed;
    return (
        <span
            style={{
                background: s.bg,
                color: s.color,
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: '.7rem',
                fontFamily: 'var(--fu)',
                fontWeight: 700,
                textTransform: 'capitalize',
            }}
        >
            {status}
        </span>
    );
}

function StatCard({ label, val, ch, color }) {
    const chColor =
        color === 'gr' ? 'var(--gl)' : color === 'tl' ? 'var(--teal)' : 'var(--gb)';
    return (
        <div className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-val">{val}</div>
            <div className="stat-change" style={{ color: chColor }}>
                {ch}
            </div>
        </div>
    );
}

import { ProfIcon } from '../../common/ProfIcon';

/* ── SECTIONS ── */

function Overview({ nav, realBookings, totalSpent }) {
    const upcoming = realBookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
    const completed = realBookings.filter(b => b.status === 'completed').length;

    const stats = [
        { label: 'Sessions Booked', val: String(realBookings.length), ch: 'All time', color: 'gr' },
        { label: 'Upcoming Sessions', val: String(upcoming.length), ch: 'Confirmed & pending', color: 'tl' },
        { label: 'Completed Sessions', val: String(completed), ch: 'Successfully done', color: 'gd' },
        { label: 'Total Spent', val: `$${totalSpent.toFixed(2)}`, ch: 'Lifetime value', color: 'gr' },
    ];

    return (
        <div>
            <div className="grid-4" style={{ gap: 16, marginBottom: 28 }}>
                {stats.map((s) => (
                    <StatCard key={s.label} {...s} />
                ))}
            </div>

            <div className="card" style={{ padding: 24 }}>
                <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ProfIcon icon="calendar" size={16} /> Upcoming Sessions
                </div>
                {upcoming.length > 0 ? upcoming.slice(0, 5).map((b, i) => (
                    <div key={b.id || i} style={{ padding: '12px 0', borderBottom: i < upcoming.slice(0,5).length - 1 ? '1px solid rgba(255,155,81,0.06)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div>
                            <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, fontSize: '.85rem', color: 'var(--gd)', marginBottom: 3 }}>{b.expertName || b.expert}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--mu)' }}>{b.sessionTitle || b.type}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '.75rem', fontFamily: 'var(--fu)', fontWeight: 600, color: 'var(--gb)' }}>{b.date}{b.time ? `, ${b.time}` : ''}</div>
                            <StatusBadge status={b.status === 'confirmed' ? 'upcoming' : b.status} />
                        </div>
                    </div>
                )) : (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--mu)', fontSize: '.85rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📅</div>
                        <div style={{ fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>No upcoming sessions</div>
                        <p style={{ fontSize: '.85rem', marginBottom: 20 }}>Browse experts and book your first session.</p>
                        <button className="btn btn-gr btn-sm" onClick={() => nav('experts')}>Find an Expert →</button>
                    </div>
                )}
                {upcoming.length > 0 && (
                    <button className="btn btn-gh btn-sm" style={{ marginTop: 16, width: '100%' }} onClick={() => nav('experts')}>Book New Session →</button>
                )}
            </div>
        </div>
    );
}

function MyBookings({ nav, notify, realBookings, onCancelBooking, currentUser }) {
    const allBookings = realBookings;
    const [cancelTarget, setCancelTarget] = React.useState(null);
    const [now, setNow] = React.useState(Date.now());

    React.useEffect(() => {
        const iv = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(iv);
    }, []);
    const [reviewTarget, setReviewTarget] = React.useState(null);
    const [reviewRating, setReviewRating] = React.useState(5);
    const [reviewText, setReviewText] = React.useState('');
    const [reviewSubmitting, setReviewSubmitting] = React.useState(false);
    const [reviewedBookings, setReviewedBookings] = React.useState(new Set());

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!reviewText.trim()) return notify('Please write a review.', 'warn');
        setReviewSubmitting(true);
        try {
            await submitReview({
                expertId: reviewTarget.expertId || reviewTarget.expert || '',
                clientId: currentUser?.uid || 'mock',
                clientName: currentUser?.displayName || 'Client',
                bookingId: reviewTarget.id || '',
                rating: reviewRating,
                text: reviewText.trim(),
            });
            setReviewedBookings(prev => new Set([...prev, reviewTarget.id || reviewTarget.expert]));
            notify('Review submitted successfully!', 'success');
            setReviewTarget(null);
            setReviewText('');
            setReviewRating(5);
        } catch (err) {
            console.error(err);
            notify('Failed to submit review. Please try again.', 'error');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const alreadyReviewed = (b) => reviewedBookings.has(b.id || b.expert);

    const getExpert = (b) => b.expertName || b.expert || 'Expert';
    const getType = (b) => b.sessionTitle || b.type || '1:1 Session';
    const getDate = (b) => {
        if (b.date && b.time) return `${b.date}, ${b.time}`;
        return b.date || '—';
    };
    const getStatus = (b) => {
        if (b.status === 'confirmed') return 'upcoming';
        return b.status || 'pending';
    };

    return (
        <div>
            {/* Review Modal */}
            {reviewTarget && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={e => e.target === e.currentTarget && setReviewTarget(null)}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: '32px 28px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 4 }}>Leave a Review</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--mu)', marginBottom: 20 }}>
                            {reviewTarget.expertName || reviewTarget.expert} · {reviewTarget.sessionTitle || reviewTarget.type}
                        </div>
                        <form onSubmit={handleSubmitReview}>
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 10 }}>Your Rating</div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} type="button" onClick={() => setReviewRating(star)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', padding: '0 2px', transition: 'transform 0.1s', lineHeight: 1 }}
                                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            <span style={{ color: star <= reviewRating ? '#f59e0b' : '#d1d5db' }}>★</span>
                                        </button>
                                    ))}
                                    <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--mu)' }}>
                                        {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
                                    </span>
                                </div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>Your Review</label>
                                <textarea
                                    className="input" rows={4}
                                    value={reviewText} onChange={e => setReviewText(e.target.value)}
                                    placeholder="Share your experience with this expert..."
                                    style={{ width: '100%', resize: 'vertical', minHeight: 100 }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" className="btn btn-gh" style={{ flex: 1 }} onClick={() => setReviewTarget(null)}>Cancel</button>
                                <button type="submit" className="btn btn-gr" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={reviewSubmitting}>
                                    {reviewSubmitting ? 'Submitting...' : <><Star size={14} /> Submit Review</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {cancelTarget && (

                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={e => e.target === e.currentTarget && setCancelTarget(null)}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: '32px 28px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><AlertTriangle size={48} color="#e84444" /></div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 8 }}>Cancel Booking?</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: 6 }}>You are about to cancel your session with:</p>
                        <div style={{ fontWeight: 700, color: 'var(--gd)', marginBottom: 4 }}>{getExpert(cancelTarget)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--sl)', marginBottom: 20 }}>{getDate(cancelTarget)} · {getType(cancelTarget)}</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--mu)', marginBottom: 24, padding: '10px 14px', background: 'rgba(232,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(232,68,68,0.12)' }}>
                            This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-gh" style={{ flex: 1 }} onClick={() => setCancelTarget(null)}>Keep It</button>
                            <button style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(232,68,68,0.25)', background: 'rgba(232,68,68,0.08)', color: '#e84444', fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => { onCancelBooking(cancelTarget); setCancelTarget(null); }}>
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Expert</th>
                            <th>Session Type</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allBookings.map((b, i) => (
                            <tr key={b.id || i}>
                                <td>
                                    <span style={{ fontFamily: 'var(--fu)', fontWeight: 600, color: 'var(--gd)' }}>
                                        {getExpert(b)}
                                    </span>
                                </td>
                                <td>{getType(b)}</td>
                                <td style={{ fontFamily: 'var(--fu)', fontSize: '.82rem' }}>{getDate(b)}</td>
                                <td>
                                    <StatusBadge status={getStatus(b)} />
                                </td>
                                <td>
                                    <span className={`tag ${b.paymentStatus === 'paid' ? 'tag-gr' : b.paymentStatus === 'failed' ? 'tag-rd' : 'tag-yl'}`} style={{ fontSize: '0.65rem' }}>
                                        {b.paymentStatus === 'pending_bank_transfer' ? 'Awaiting Bank Transfer' : (b.paymentStatus || (b.status === 'completed' ? 'paid' : 'unpaid'))}
                                    </span>
                                </td>
                                <td>
                                    {(b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'pending') ? (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {isSessionJoinable(b, now) && b.dailyRoomUrl && (
                                                <a href={b.dailyRoomUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ fontSize: '.7rem', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 'var(--rsm)', fontWeight: 700 }}
                                                    >
                                                        Join Session
                                                    </button>
                                                </a>
                                            )}
                                            <button
                                                className="btn btn-sm"
                                                style={{
                                                    fontSize: '.7rem',
                                                    background: 'var(--rd-lt)',
                                                    color: 'var(--rd)',
                                                    borderRadius: 'var(--rsm)',
                                                }}
                                                onClick={() => setCancelTarget(b)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : b.status === 'completed' ? (
                                        alreadyReviewed(b) ? (
                                            <span style={{ fontSize: '.72rem', color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Reviewed</span>
                                        ) : (
                                        <button
                                            className="btn btn-gh btn-sm"
                                            style={{ fontSize: '.7rem', display: 'flex', alignItems: 'center', gap: 4 }}
                                            onClick={() => { setReviewTarget(b); setReviewRating(5); setReviewText(''); }}
                                        >
                                            <Star size={12} /> Leave Review
                                        </button>
                                        )
                                    ) : (
                                        <span style={{ fontSize: '.72rem', color: 'var(--mu)' }}>—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Subscriptions({ notify, nav }) {
    const [subs, setSubs] = React.useState([]);
    const [cancelTarget, setCancelTarget] = React.useState(null);

    const handleConfirmCancel = () => {
        setSubs(prev => prev.filter(s => s !== cancelTarget));
        notify('Subscription cancelled.');
        setCancelTarget(null);
    };

    return (
        <div>
            {/* Cancel Confirmation Modal */}
            {cancelTarget && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={e => e.target === e.currentTarget && setCancelTarget(null)}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: '32px 28px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 8 }}>Cancel Subscription?</div>
                        <div style={{ fontWeight: 700, color: 'var(--gd)', marginBottom: 4 }}>{cancelTarget.plan}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--sl)', marginBottom: 16 }}>by {cancelTarget.expert} · {formatOfferPrice(cancelTarget.price)}</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--mu)', marginBottom: 24, padding: '10px 14px', background: 'rgba(232,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(232,68,68,0.12)' }}>
                            You will lose access at the end of your billing period.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-gh" style={{ flex: 1 }} onClick={() => setCancelTarget(null)}>Keep It</button>
                            <button style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(232,68,68,0.25)', background: 'rgba(232,68,68,0.08)', color: '#e84444', fontWeight: 700, cursor: 'pointer' }}
                                onClick={handleConfirmCancel}>
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', fontSize: '1.05rem' }}>Active Subscriptions</div>
                <div style={{ fontSize: '.8rem', color: 'var(--mu)', marginTop: 3 }}>Manage your recurring memberships</div>
            </div>

            {subs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                    {subs.map((s, i) => (
                        <div key={i} className="card" style={{ padding: 24, borderLeft: '3px solid var(--gb)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                                <div>
                                    <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '1rem', color: 'var(--gd)', marginBottom: 4 }}>{s.plan}</div>
                                    <div style={{ fontSize: '.8rem', color: 'var(--mu)', marginBottom: 12 }}>by {s.expert}</div>
                                    <div style={{ display: 'flex', gap: 20, fontSize: '.78rem', color: 'var(--sl)' }}>
                                        <span>📅 Since {s.since}</span>
                                        <span>🔄 Renews {s.renewal}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontFamily: 'var(--fu)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gd)', marginBottom: 8 }}>{formatOfferPrice(s.price)}</div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <StatusBadge status={s.status} />
                                        <button
                                            style={{ padding: '4px 12px', borderRadius: 20, border: '1.5px solid var(--rd)', background: 'transparent', color: 'var(--rd)', fontSize: '.7rem', fontFamily: 'var(--fu)', fontWeight: 600, cursor: 'pointer' }}
                                            onClick={() => setCancelTarget(s)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--mu)', marginBottom: 32 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔄</div>
                    <div style={{ fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>No active subscriptions</div>
                    <p style={{ fontSize: '.85rem', marginBottom: 20 }}>Browse expert memberships to get started.</p>
                    <button className="btn btn-gr btn-sm" onClick={() => nav('experts')}>Explore Experts →</button>
                </div>
            )}

            <div style={{ background: 'var(--gmt)', border: '1.5px dashed rgba(255,155,81,0.25)', borderRadius: 'var(--rmd)', padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>🔍</div>
                <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, color: 'var(--gd)', marginBottom: 6, fontSize: '.9rem' }}>Discover More Communities</div>
                <p style={{ fontSize: '.8rem', color: 'var(--mu)', marginBottom: 16 }}>Browse expert memberships and WhatsApp groups to join.</p>
                <button className="btn btn-gr btn-sm" onClick={() => nav('experts')}>Explore Subscriptions →</button>
            </div>
        </div>
    );
}

function Purchases({ notify }) {
    const { currentUser } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPurchases() {
            if (!currentUser?.uid) {
                setLoading(false);
                return;
            }
            try {
                const data = await getClientPurchases(currentUser.uid);
                setPurchases(data);
            } catch (err) {
                console.error('Failed to fetch purchases:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchPurchases();
    }, [currentUser]);

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', fontSize: '1.05rem' }}>My Purchases</div>
                <div style={{ fontSize: '.8rem', color: 'var(--mu)', marginTop: 3 }}>Digital products you own</div>
            </div>
            {purchases.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {purchases.map((p) => (
                        <div key={p.id} className="card" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', fontSize: '0.92rem' }}>{p.itemTitle}</div>
                                <div style={{ fontSize: '.78rem', color: 'var(--mu)', marginTop: 4 }}>
                                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''} · ${((p.price || 0) / 100).toFixed(2)}
                                </div>
                            </div>
                            {p.deliveryLink ? (
                                <a href={p.deliveryLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                    <button className="btn btn-gr btn-sm">Download →</button>
                                </a>
                            ) : (
                                <span style={{ fontSize: '.75rem', color: 'var(--mu)' }}>Check your email for access</span>
                            )}
                        </div>
                    ))}
                </div>
            ) : !loading ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--mu)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📦</div>
                    <div style={{ fontWeight: 600, color: 'var(--gd)', marginBottom: 6 }}>No purchases yet</div>
                    <p style={{ fontSize: '.85rem', marginBottom: 20 }}>Digital products purchased from experts will appear here.</p>
                    <button className="btn btn-gr btn-sm" onClick={() => notify('Browse expert profiles to find digital products.', 'info')}>Explore Products →</button>
                </div>
            ) : null}
        </div>
    );
}

function Settings({ notify, user }) {
    const { currentUser, refreshUserData } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [location, setLocation] = useState(user?.location || '');
    const [saving, setSaving] = useState(false);

    const [currPass, setCurrPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        setName(user?.name || '');
        setPhone(user?.phone || '');
        setLocation(user?.location || '');
    }, [user]);

    const handleSaveProfile = async () => {
        if (!currentUser) return notify('Not authenticated.', 'error');
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                name: name.trim(),
                phone: phone.trim() || null,
                location: location.trim() || null,
            });
            await refreshUserData();
            notify('Profile updated successfully!', 'success');
        } catch (err) {
            notify('Failed to update profile: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!currPass || !newPass || !confirmPass) return notify('Please fill in all password fields.', 'warn');
        if (newPass !== confirmPass) return notify('New passwords do not match.', 'error');
        if (newPass.length < 6) return notify('Password must be at least 6 characters.', 'error');
        setPassLoading(true);
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currPass);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPass);
            notify('Password updated successfully!', 'success');
            setCurrPass(''); setNewPass(''); setConfirmPass('');
        } catch (err) {
            notify(err.message?.replace('Firebase: ', '') || 'Failed to update password.', 'error');
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 560 }}>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)', fontSize: '1.05rem', marginBottom: 24 }}>
                Account Settings
            </div>

            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, color: 'var(--gd)', marginBottom: 20, fontSize: '.9rem' }}>
                    Profile Information
                </div>
                <div className="field">
                    <label className="label">Full Name</label>
                    <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="field">
                    <label className="label">Email Address</label>
                    <input className="input" type="email" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div className="field">
                    <label className="label">Phone Number</label>
                    <input className="input" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                </div>
                <div className="field">
                    <label className="label">Location</label>
                    <input className="input" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="New York, USA" />
                </div>
                <button className="btn btn-gr" disabled={saving} onClick={handleSaveProfile}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="card" style={{ padding: 28 }}>
                <div style={{ fontFamily: 'var(--fu)', fontWeight: 600, color: 'var(--gd)', marginBottom: 20, fontSize: '.9rem' }}>
                    Change Password
                </div>
                <div className="field">
                    <label className="label">Current Password</label>
                    <input className="input" type="password" value={currPass} onChange={(e) => setCurrPass(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="field">
                    <label className="label">New Password</label>
                    <input className="input" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="field">
                    <label className="label">Confirm New Password</label>
                    <input className="input" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="••••••••" />
                </div>
                <button className="btn btn-gh" disabled={passLoading} onClick={handlePasswordChange}>
                    {passLoading ? 'Updating...' : 'Update Password'}
                </button>
            </div>
        </div>
    );
}

/* ── MAIN DASHBOARD ── */
const NAV_ITEMS = [
    { key: 'overview', icon: <Home size={18} color="var(--teal)" />, label: 'Overview' },
    { key: 'bookings', icon: <Calendar size={18} color="var(--teal)" />, label: 'My Bookings' },
    { key: 'subscriptions', icon: <RefreshCw size={18} color="var(--teal)" />, label: 'Subscriptions' },
    { key: 'purchases', icon: <Package size={18} color="var(--teal)" />, label: 'Purchases' },
    { key: 'settings', icon: <SettingsIcon size={18} color="var(--teal)" />, label: 'Settings' },
];

export function ClientDashboard({ user, nav, logout, notify }) {
    const { currentUser } = useAuth();
    const [section, setSection] = useState('overview');
    const [totalSpent, setTotalSpent] = useState(0);
    const [realBookings, setRealBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);

    // Fetch real bookings from Firestore
    useEffect(() => {
        async function fetchBookings() {
            if (!currentUser?.uid) {
                setBookingsLoading(false);
                return;
            }
            try {
                const [bookings, purchases] = await Promise.all([
                    getClientBookings(currentUser.uid),
                    getClientPurchases(currentUser.uid),
                ]);
                setRealBookings(bookings);
                // Total spent = paid bookings + product purchases. Both are only
                // ever marked paid / created by stripeWebhook after Stripe
                // confirms payment — never by the "Book Now"/"Buy" click itself,
                // so an abandoned checkout never counts here.
                const bookingsSpent = bookings
                    .filter(b => b.paymentStatus === 'paid')
                    .reduce((sum, b) => sum + ((b.price || 0) / 100), 0);
                const purchasesSpent = purchases
                    .reduce((sum, p) => sum + ((p.price || 0) / 100), 0);
                setTotalSpent(bookingsSpent + purchasesSpent);
            } catch (err) {
                console.error('Failed to fetch bookings:', err);
            } finally {
                setBookingsLoading(false);
            }
        }
        fetchBookings();
    }, [currentUser]);

    const handleCancelBooking = async (booking) => {
        if (!booking.id) {
            notify('Cannot cancel this booking.', 'warn');
            return;
        }
        try {
            await cancelBooking(booking.id);
            setRealBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
            notify('Booking cancelled successfully');
        } catch (err) {
            notify('Failed to cancel booking', 'error');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cr)' }}>
            {/* ── SIDEBAR ── */}
            <aside
                className="sidebar"
                style={{
                    width: 240,
                    background: 'var(--gd)',
                    minHeight: '100vh',
                    position: 'sticky',
                    top: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        padding: '28px 24px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            fontFamily: 'var(--fu)',
                            fontWeight: 800,
                            fontSize: '1.15rem',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                        }}
                        onClick={() => nav('landingboard')}
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'var(--gl)',
                                display: 'inline-block',
                            }}
                        />
                        mindGigs
                    </div>
                    <div
                        style={{
                            fontSize: '.7rem',
                            color: 'rgba(255,255,255,0.35)',
                            marginTop: 4,
                            fontFamily: 'var(--fu)',
                        }}
                    >
                        Client Portal
                    </div>
                </div>

                {/* User info */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <div
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: 'rgba(255,178,122,0.2)',
                            border: '2px solid rgba(255,178,122,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                        }}
                    >
                        <User size={18} color="var(--teal)" />
                    </div>
                    <div>
                        <div
                            style={{
                                fontFamily: 'var(--fu)',
                                fontWeight: 700,
                                color: '#fff',
                                fontSize: '.85rem',
                            }}
                        >
                            {user.name}
                        </div>
                        <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,0.4)' }}>Client Account</div>
                    </div>
                </div>

                {/* Nav items */}
                <nav style={{ flex: 1, padding: '12px 0' }}>
                    {NAV_ITEMS.map((item) => (
                        <div
                            key={item.key}
                            onClick={() => setSection(item.key)}
                            style={{
                                padding: '11px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                cursor: 'pointer',
                                background:
                                    section === item.key
                                        ? 'rgba(245, 158, 11, 0.12)'
                                        : 'transparent',
                                borderLeft:
                                    section === item.key
                                        ? '3px solid var(--gb)'
                                        : '3px solid transparent',
                                transition: 'all 0.18s',
                                fontSize: '.85rem',
                                fontFamily: 'var(--fu)',
                                fontWeight: section === item.key ? 700 : 500,
                                color: section === item.key ? '#fff' : 'rgba(255,255,255,0.55)',
                            }}
                            onMouseEnter={(e) => {
                                if (section !== item.key)
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={(e) => {
                                if (section !== item.key)
                                    e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </nav>

                {/* Explore CTA */}
                <div style={{ padding: '16px 16px 8px' }}>
                    <button
                        className="btn btn-gr w-full btn-sm"
                        onClick={() => nav('experts')}
                        style={{ marginBottom: 8 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Search size={16} /> Find Experts</div>
                    </button>
                </div>

                {/* Logout */}
                <div style={{ padding: '8px 16px 24px' }}>
                    <button
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: 'var(--rsm)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.5)',
                            fontFamily: 'var(--fu)',
                            fontSize: '.78rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.18s',
                            textAlign: 'left',
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                        }}
                        onClick={logout}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(232,68,68,0.15)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    >
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            </aside>

            {/* ── MAIN ── */}
            <main style={{ flex: 1, padding: '32px 36px', maxWidth: 'calc(100% - 240px)' }}>
                {/* Top bar */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 28,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontFamily: 'var(--fu)',
                                fontWeight: 800,
                                color: 'var(--gd)',
                                fontSize: '1.4rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {React.cloneElement(NAV_ITEMS.find((n) => n.key === section)?.icon, { size: 24 })}
                            {NAV_ITEMS.find((n) => n.key === section)?.label}
                        </div>
                        <div style={{ fontSize: '.8rem', color: 'var(--mu)', marginTop: 4 }}>
                            Welcome back, {user.name}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: '0.82rem', color: '#666' }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <AccountSwitcher user={user} role="client" logout={logout} nav={nav} />
                    </div>
                </div>

                {/* Section content */}
                {section === 'overview' && <Overview nav={nav} realBookings={realBookings} totalSpent={totalSpent} />}
                {section === 'bookings' && <MyBookings nav={nav} notify={notify} realBookings={realBookings} onCancelBooking={handleCancelBooking} currentUser={currentUser} />}
                {section === 'subscriptions' && <Subscriptions notify={notify} nav={nav} />}
                {section === 'purchases' && <Purchases notify={notify} />}
                {section === 'settings' && <Settings notify={notify} user={user} />}
            </main>
        </div>
    );
}
