import React, { useState, useEffect } from 'react';
import { CheckCircle2, ArrowLeft, ArrowRight, ChevronRight, User, Calendar, Lock, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createBooking, getExpertBookings } from '../../services/bookingService';
import { initiatePayment } from '../../services/stripeService';
import { getStoredReferralCode } from '../../services/affiliateService';
import { getAvailableTimesForDay, getAvailableDaysInMonth, buildTakenSlotsMap } from '../../services/availabilityService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';


export function BookingFlow({ nav, notify, expert, session }) {
  const { currentUser, userData } = useAuth();

  // Use fallbacks to prevent crashes if data is missing, but prioritize passed props
  const expertName = expert?.name || 'Expert';
  const sessionTitle = session?.title || '60-min Strategy Deep Dive';
  const sessionPrice = session?.price || '$250';
  const sessionDuration = session?.duration || '60 min';
  const [step, setStep] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [email, setEmail] = useState(userData?.email || '');
  const [couponCode, setCouponCode] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [weeklySlots, setWeeklySlots] = useState(null);
  const [takenSlots, setTakenSlots] = useState({});

  // Pre-fill any coupon/referral code captured from a shared link, editable by the client
  useEffect(() => {
    setCouponCode(getStoredReferralCode() || '');
  }, []);

  // Fetch the expert's availability settings and already-booked slots
  useEffect(() => {
    const expertId = expert?.id || expert?.uid;
    if (!expertId || String(expertId).startsWith('showcase-')) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', expertId));
        if (!cancelled && snap.exists()) {
          setWeeklySlots(snap.data().availability?.weeklySlots || null);
        }
        const bookings = await getExpertBookings(expertId);
        if (!cancelled) setTakenSlots(buildTakenSlotsMap(bookings));
      } catch (err) {
        console.error('BookingFlow: failed to load availability', err);
      }
    })();
    return () => { cancelled = true; };
  }, [expert?.id, expert?.uid]);

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonthIndex = now.getMonth();
  const currentMonth = MONTH_NAMES[calMonthIndex];
  const todayDate = now.getDate();
  const daysInMonth = new Date(calYear, calMonthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonthIndex, 1).getDay();

  // Available days: respect expert's weeklySlots + already-booked slots
  const available = getAvailableDaysInMonth(todayDate, daysInMonth, calYear, calMonthIndex, currentMonth, weeklySlots, takenSlots);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Returns open time slots for a given calendar day
  const getTimesForDay = (day) =>
    getAvailableTimesForDay(day, calYear, calMonthIndex, currentMonth, weeklySlots, takenSlots);

  // Parse price string to cents for Stripe
  const parsePriceCents = (priceStr) => {
    const num = parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  // Handle the payment + booking creation
  const handlePayment = async () => {
    // Check authentication
    if (!currentUser) {
      notify('Please log in to book a session.', 'warn');
      nav('login', { role: 'client' });
      return;
    }

    if (!email) {
      notify('Please enter your email address.', 'warn');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create booking in Firestore
      const newBookingId = await createBooking({
        expertId: expert?.id || expert?.uid || 'unknown',
        clientId: currentUser.uid,
        expertName: expertName,
        clientName: userData?.name || currentUser.email || 'Client',
        date: `${currentMonth} ${selectedDay}`,
        time: selectedTime,
        sessionTitle: sessionTitle,
        price: parsePriceCents(sessionPrice),
        clientEmail: email,
        referralCode: (couponCode || '').trim() || null,
      });

      setBookingId(newBookingId);

      // 2. Redirect to Stripe Checkout
      // After payment, Stripe calls our webhook which confirms the booking
      // and writes the commission split — nothing else needed here.
      await initiatePayment(
        newBookingId,
        parsePriceCents(sessionPrice),
        email
      );
      // User is now being redirected to Stripe — execution stops here.
    } catch (error) {
      console.error('Booking/payment error:', error);
      notify(error?.message || 'Failed to create booking. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 2)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gmt)',
          padding: 24,
        }}
      >
        <div className="card" style={{ padding: 48, maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, animation: 'fl1 1s ease' }}>
            <CheckCircle2 size={64} color="var(--teal)" />
          </div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: '2rem', color: 'var(--gd)', marginBottom: 12 }}>
            Booking Confirmed!
          </h2>
          <p
            style={{
              fontSize: '.9rem',
              color: 'var(--sl)',
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            Your <strong>{sessionTitle}</strong> with <strong>{expertName}</strong> is confirmed for <strong>{currentMonth} {selectedDay}, {selectedTime}</strong>. A
            calendar invite and Zoom link have been sent to your email.
          </p>

          {/* Payment status badge */}
          <div style={{ marginBottom: 24 }}>
            <span className="tag tag-gr" style={{ fontSize: '.78rem', padding: '6px 16px' }}>
              ✓ Paid
            </span>
          </div>

          <button
            className="btn btn-gr btn-lg w-full"
            onClick={() => {
              notify('Calendar event added!');
              if (userData?.role === 'client') {
                nav('client-dashboard');
              } else {
                nav('home');
              }
            }}
          >
            {userData?.role === 'client' ? 'Go to Dashboard' : 'Add to Calendar'}
          </button>
          <button className="btn btn-gh w-full" style={{ marginTop: 10 }} onClick={() => nav('home')}>
            Back to Home
          </button>
        </div>
      </div>
    );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gmt)', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div
          style={{
            textAlign: 'center',
            marginBottom: 32,
            cursor: 'pointer',
          }}
          onClick={() => nav('public-profile')}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--fu)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gd)' }}>
            <ArrowLeft size={20} /> Back to {expertName}'s Profile
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
          {['Select Date & Time', 'Checkout'].map((s, i) => (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: i <= step ? 'pointer' : 'default',
              }}
              onClick={() => i < step && setStep(i)}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: i <= step ? 'var(--gb)' : 'rgba(255,155,81,.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--fu)',
                  fontSize: '.78rem',
                  fontWeight: 700,
                  color: i <= step ? '#fff' : 'var(--mu)',
                }}
              >
                {i + 1}
              </div>
              <span
                style={{
                  fontFamily: 'var(--fu)',
                  fontSize: '.8rem',
                  fontWeight: 600,
                  color: i === step ? 'var(--gd)' : 'var(--mu)',
                }}
              >
                {s}
              </span>
              {i < 1 && <span style={{ color: 'var(--mu)', margin: '0 4px', display: 'flex', alignItems: 'center' }}><ChevronRight size={14} /></span>}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="card" style={{ padding: 32 }}>
            <div
              style={{
                fontFamily: 'var(--fu)',
                fontWeight: 700,
                color: 'var(--gd)',
                marginBottom: 4,
              }}
            >
              {sessionTitle} with {expertName}
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--mu)', marginBottom: 24 }}>
              {sessionPrice} · Select your preferred date and time
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 16 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--fu)',
                    fontSize: '.65rem',
                    fontWeight: 700,
                    color: 'var(--mu)',
                    padding: '8px 0',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="cal-grid" style={{ marginBottom: 24 }}>
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((d) => (
                <button
                  key={d}
                  className={`cal-day ${d <= todayDate ? 'cal-past' : available.includes(d) ? 'available' : ''} ${selectedDay === d ? 'selected' : ''}`}
                  disabled={d <= todayDate || !available.includes(d)}
                  onClick={() => setSelectedDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            {selectedDay && (
              <>
                <div
                  style={{
                    fontFamily: 'var(--fu)',
                    fontSize: '.82rem',
                    fontWeight: 700,
                    color: 'var(--gd)',
                    marginBottom: 12,
                  }}
                >
                  Available slots for {currentMonth} {selectedDay}
                </div>
                <div className="time-slots">
                  {getTimesForDay(selectedDay).length > 0 ? (
                    getTimesForDay(selectedDay).map((t) => (
                      <button
                        key={t}
                        className={`time-slot ${selectedTime === t ? 'selected' : ''}`}
                        onClick={() => setSelectedTime(t)}
                      >
                        {t}
                      </button>
                    ))
                  ) : (
                    <p style={{ fontSize: '.82rem', color: 'var(--mu)', margin: 0 }}>
                      No open slots on this date. Please choose another day.
                    </p>
                  )}
                </div>
              </>
            )}

            <button
              className="btn btn-gr btn-lg w-full"
              style={{ marginTop: 24 }}
              onClick={() => {
                if (selectedDay && selectedTime) setStep(1);
                else notify('Please select a date and time.', 'warn');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>Continue to Checkout <ArrowRight size={16} /></div>
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="card" style={{ padding: 32 }}>
            <div
              style={{
                fontFamily: 'var(--fu)',
                fontWeight: 700,
                color: 'var(--gd)',
                marginBottom: 20,
              }}
            >
              Order Summary
            </div>
            <div
              style={{
                background: 'var(--gmt)',
                borderRadius: 'var(--rsm)',
                padding: 20,
                marginBottom: 24,
                border: '1px solid rgba(255,155,81,.12)',
              }}
            >
              <div style={{ display: 'flex', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(26, 184, 160, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '2px solid rgba(26, 184, 160, 0.2)',
                  }}
                >
                  <User size={24} color="var(--teal)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, color: 'var(--gd)' }}>
                    {expertName}
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--sl)', marginTop: 2 }}>
                    {sessionTitle}
                  </div>
                  <div
                    style={{
                      fontSize: '.78rem',
                      color: 'var(--gb)',
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} color="var(--teal)" /> {currentMonth} {selectedDay}, {selectedTime}</div>
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: 'auto',
                    fontFamily: 'var(--fu)',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: 'var(--gd)',
                  }}
                >
                  {sessionPrice}
                </div>
              </div>
            </div>
            <div className="field">
              <label className="label">Email Address</label>
              <input
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">Coupon Code (optional)</label>
              <input
                className="input"
                placeholder="Have a coupon code?"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">Note to Expert (optional)</label>
              <textarea
                className="textarea"
                placeholder="What do you want to focus on in this session?"
                style={{ minHeight: 70 }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div
              style={{
                borderTop: '1px solid rgba(255,155,81,.08)',
                paddingTop: 16,
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--fu)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--gd)',
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontFamily: 'var(--fu)',
                  fontWeight: 800,
                  fontSize: '1.3rem',
                  color: 'var(--gd)',
                }}
              >
                {sessionPrice}
              </span>
            </div>
            <button
              className="btn w-full btn-lg"
              style={{
                background: isProcessing ? '#8b85ff' : '#635bff',
                color: '#fff',
                fontFamily: 'var(--fu)',
                fontWeight: 700,
                fontSize: '1rem',
                opacity: isProcessing ? 0.8 : 1,
                cursor: isProcessing ? 'wait' : 'pointer',
              }}
              onClick={handlePayment}
              disabled={isProcessing}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isProcessing ? (
                  <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                ) : (
                  <><Lock size={16} /> Pay & Book</>
                )}
              </div>
            </button>
            <p style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--mu)', marginTop: 12 }}>
              Secured by Stripe · 256-bit encryption
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
