import React, { useState, useEffect } from 'react';
import { ProfIcon } from '../../../common/ProfIcon';
import { useAuth } from '../../../../context/AuthContext';
import { getExpertBookings, cancelBooking, confirmBookingPayment } from '../../../../services/bookingService';
import { isSessionJoinable } from '../../../../services/availabilityService';

export function Bookings({ user, expertData, notify }) {
  const { currentUser } = useAuth();
  // Start with empty state — real bookings load from Firestore
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Refresh "now" every minute so join-session window appears/disappears automatically
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // Fetch real bookings from Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;

    let cancelled = false;
    getExpertBookings(currentUser.uid)
      .then((real) => {
        if (cancelled) return;
        setBookings(real);
      })
      .catch((err) => { console.error('Failed to fetch bookings:', err); });

    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const handleCancel = async (booking) => {
    setActionLoading(booking.id || booking.client || 'cancel');
    try {
      if (booking.id && !booking.client) {
        // Real Firestore booking
        await cancelBooking(booking.id);
        setBookings(prev => prev.map(b =>
          b.id === booking.id ? { ...b, status: 'cancelled' } : b
        ));
        if (notify) notify('Booking cancelled successfully.');
      } else {
        // Mock booking — update locally
        setBookings(prev => prev.map(b =>
          (b === booking || b.client === booking.client) ? { ...b, status: 'cancelled' } : b
        ));
        if (notify) notify('Booking cancelled.');
      }
    } catch (err) {
      if (notify) notify('Failed to cancel booking.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = async (booking) => {
    setActionLoading(booking.id || booking.client || 'confirm');
    try {
      if (booking.id && !booking.client) {
        // Real Firestore booking
        await confirmBookingPayment(booking.id);
        setBookings(prev => prev.map(b =>
          b.id === booking.id ? { ...b, status: 'confirmed', paymentStatus: 'paid' } : b
        ));
        if (notify) notify('Booking confirmed and marked as paid!');
      } else {
        // Mock booking — update locally
        setBookings(prev => prev.map(b =>
          (b === booking || b.client === booking.client) ? { ...b, status: 'confirmed', paymentStatus: 'paid' } : b
        ));
        if (notify) notify('Booking confirmed!');
      }
    } catch (err) {
      if (notify) notify('Failed to confirm booking.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Helpers for both real & mock booking shapes
  const getClientName = (b) => b.clientName || b.client || 'Client';
  const getDate = (b) => {
    if (b.date && b.time) return `${b.date}, ${b.time}`;
    return b.date || '—';
  };
  const getType = (b) => b.sessionTitle || b.type || '1:1 Session';
  const getKey = (b, i) => b.id || `${b.client}-${i}`;
  const isActioning = (b) => actionLoading === (b.id || b.client || 'cancel');

  return (
    <>
      {/* ── Cancel Confirmation Modal ── */}
      {cancelTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setCancelTarget(null)}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: '32px 28px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 8 }}>Cancel Booking?</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: 6 }}>
              You are about to cancel the booking for:
            </p>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gd)', marginBottom: 4 }}>
              {getClientName(cancelTarget)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--sl)', marginBottom: 24 }}>
              {getDate(cancelTarget)} · {getType(cancelTarget)}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--mu)', marginBottom: 24, padding: '10px 14px', background: 'rgba(232,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(232,68,68,0.12)' }}>
              This action cannot be undone. The client will need to re-book.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-gh"
                style={{ flex: 1 }}
                onClick={() => setCancelTarget(null)}
              >Keep Booking</button>
              <button
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(232,68,68,0.25)', background: 'rgba(232,68,68,0.08)', color: '#e84444', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s', fontSize: '0.88rem' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(232,68,68,0.18)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(232,68,68,0.08)'}
                onClick={() => { handleCancel(cancelTarget); setCancelTarget(null); }}
              >Yes, Cancel It</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>All Bookings</h2>
        <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>Track and manage your upcoming and past client sessions.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`btn btn-sm ${filter === status ? 'btn-gr' : 'btn-gh'}`}
            style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}
          >
            {status}
            {status !== 'all' && (
              <span style={{ marginLeft: 6, fontSize: '0.65rem', opacity: 0.7 }}>
                ({bookings.filter(b => b.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filteredBookings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>Client</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>Payment</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking, i) => (
                  <tr key={getKey(booking, i)} style={{ borderBottom: i === filteredBookings.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.03)', opacity: isActioning(booking) ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--gd)', fontSize: '0.9rem' }}>{getClientName(booking)}</td>
                    <td style={{ padding: '16px 20px', fontSize: '0.82rem', color: 'var(--sl)' }}>
                      {booking.clientEmail && <div>{booking.clientEmail}</div>}
                      {booking.clientPhone && <div>{booking.clientPhone}</div>}
                      {!booking.clientEmail && !booking.clientPhone && '—'}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--sl)' }}>{getDate(booking)}</td>
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--sl)' }}>{getType(booking)}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`tag tag-${booking.status === 'confirmed' ? 'gr' : booking.status === 'completed' ? 'tl' : booking.status === 'cancelled' ? 'rd' : 'yl'}`} style={{ fontSize: '0.7rem' }}>
                        {booking.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`tag ${booking.paymentStatus === 'paid' ? 'tag-gr' : 'tag-yl'}`} style={{ fontSize: '0.7rem' }}>
                        {booking.paymentStatus || 'unpaid'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {booking.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-gr btn-sm"
                              style={{ padding: '5px 14px', fontSize: '.75rem', minWidth: 80 }}
                              onClick={() => handleConfirm(booking)}
                              disabled={isActioning(booking)}
                            >
                              {isActioning(booking) ? '...' : '✓ Confirm'}
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ padding: '5px 14px', fontSize: '.75rem', background: 'rgba(232,68,68,0.08)', color: '#e84444', border: '1px solid rgba(232,68,68,0.2)', borderRadius: 8, cursor: 'pointer', minWidth: 72 }}
                              onClick={() => setCancelTarget(booking)}
                              disabled={isActioning(booking)}
                            >
                              {isActioning(booking) ? '...' : '✕ Cancel'}
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <>
                            {isSessionJoinable(booking, now) && booking.dailyRoomUrl && (
                              <a href={booking.dailyRoomUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <button
                                  className="btn btn-sm"
                                  style={{ padding: '5px 14px', fontSize: '.75rem', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
                                >
                                  Join Session
                                </button>
                              </a>
                            )}
                            <button
                              className="btn btn-sm"
                              style={{ padding: '5px 14px', fontSize: '.75rem', background: 'rgba(232,68,68,0.08)', color: '#e84444', border: '1px solid rgba(232,68,68,0.2)', borderRadius: 8, cursor: 'pointer' }}
                              onClick={() => setCancelTarget(booking)}
                              disabled={isActioning(booking)}
                            >
                              {isActioning(booking) ? '...' : '✕ Cancel'}
                            </button>
                          </>
                        )}
                        {(booking.status === 'completed' || booking.status === 'cancelled') && (
                          <span style={{ fontSize: '.72rem', color: 'var(--mu)' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--mu)' }}>
            <ProfIcon icon="calendar" size={56} style={{ margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--gd)', marginBottom: '8px' }}>No bookings found</h3>
            <p style={{ fontSize: '0.85rem' }}>
              {filter !== 'all' ? `No ${filter} bookings.` : 'Your scheduled sessions will appear here.'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
