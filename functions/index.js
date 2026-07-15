/**
 * mindGigs — Firebase Cloud Functions
 *
 * Functions:
 *   createCheckoutSession  — called by frontend, creates a Stripe Checkout session
 *   stripeWebhook          — called by Stripe after payment, source of truth for all money logic
 *   confirmFreeBooking     — called by frontend, confirms a free "Book a Call" booking (no payment)
 *   adminDeleteUser        — called by the Admin Dashboard, permanently removes a user profile
 *
 * Environment variables (set via Firebase CLI):
 *   STRIPE_SECRET_KEY      — your Stripe secret key (sk_live_...)
 *   STRIPE_WEBHOOK_SECRET  — from Stripe Dashboard > Webhooks > signing secret
 *   CLIENT_URL             — your frontend URL e.g. https://mindgigs.com
 */

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const Stripe = require('stripe');
const { Resend } = require('resend');

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: 'us-central1' });

// ─── Commission rates — 4 scenarios, computed from the buyer's user doc ───────
// 1. No referral, no coupon:                    expert 70% · platform 30%
// 2. Buyer referred by THIS expert's profile link: expert 80% (70 sell + 10 referral) · platform 20%
// 3. Buyer referred by a DIFFERENT expert's link:  expert 70% · referring expert 10% · platform 20%
// 4. Buyer has an affiliateId (coupon used):        expert 70% · affiliate 10% · platform 20%
// Priority when a buyer has both a referral and a coupon: affiliateId (coupon) wins.

// ─── Helper: Daily.co room creation ──────────────────────────────────────────
async function createDailyRoom(bookingId, dateStr, timeStr) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    console.warn('[Daily.co] DAILY_API_KEY not set — skipping room creation');
    return null;
  }

  // Parse session start time; add 90-minute window as expiry
  const year = new Date().getFullYear();
  const sessionStart = new Date(`${dateStr}, ${year} ${timeStr}`);
  const validDate = !isNaN(sessionStart.getTime());
  const exp = validDate
    ? Math.floor((sessionStart.getTime() + 90 * 60 * 1000) / 1000)
    : Math.floor(Date.now() / 1000 + 4 * 60 * 60); // fallback: 4 h from now

  // Daily.co room names: lowercase alphanumeric + hyphens, max 40 chars
  const roomName = `mg-${bookingId.replace(/[^a-z0-9]/gi, '').slice(0, 34).toLowerCase()}`;

  try {
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: { exp, enable_prejoin_ui: true },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[Daily.co] Room creation failed:', res.status, body);
      return null;
    }

    return res.json();
  } catch (err) {
    console.error('[Daily.co] fetch error:', err);
    return null;
  }
}

// ─── Helper: Google Calendar link generation ──────────────────────────────────
// `titleOverride` lets the expert's version of the link show the client's name
// instead of the expert's own name (which is what the client's link shows).
function generateCalendarLink(booking, titleOverride) {
  if (!booking || !booking.date || !booking.time) return null;

  // Reconstruct a real Date from the freeform "date"/"time" strings (no year on booking.date, so assume current year)
  const year = new Date().getFullYear();
  const start = new Date(`${booking.date}, ${year} ${booking.time}`);
  if (isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + 60 * 60 * 1000); // 60-minute session

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; // YYYYMMDDTHHmmssZ

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titleOverride || `Session with ${booking.expertName || 'Expert'}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Join your session: ${booking.dailyRoomUrl || ''}`,
    location: 'Online (Google Meet)',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── Helper: Resend confirmation email ────────────────────────────────────────
async function sendConfirmationEmail(booking) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY not set — skipping confirmation email');
    return;
  }
  if (!booking || !booking.clientEmail) {
    console.warn('[Resend] Booking has no clientEmail — skipping confirmation email');
    return;
  }
  if (!booking.dailyRoomUrl) {
    console.warn('[sendConfirmationEmail] No dailyRoomUrl on booking — skipping email to avoid broken Join Session link.');
    return;
  }

  const resend = new Resend(apiKey);
  const expertName = booking.expertName || 'Expert';
  const sessionTitle = booking.sessionTitle || 'Session';
  const date = booking.date || '';
  const time = booking.time || '';
  const dailyRoomUrl = booking.dailyRoomUrl || '#';
  const calendarLink = booking.calendarLink || '#';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1ab8a0;padding:32px 40px;">
      <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">mindGigs</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Expert Sessions</div>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">Your session is confirmed</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 32px;">Here are your session details. Keep this email handy.</p>

      <!-- Session details box -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:32px;">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:13px;color:#6b7280;">Expert</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${expertName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:13px;color:#6b7280;">Session</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${sessionTitle}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:13px;color:#6b7280;">Date</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${date}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;">
          <span style="font-size:13px;color:#6b7280;">Time</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${time}</span>
        </div>
      </div>

      <!-- Join button -->
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${dailyRoomUrl}"
           style="display:inline-block;background:#1ab8a0;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Join Session
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#9ca3af;margin:0 0 32px;">
        This link activates 15 minutes before your session
      </p>

      <!-- Calendar button -->
      <div style="text-align:center;margin-bottom:40px;">
        <a href="${calendarLink}"
           style="display:inline-block;background:#ffffff;color:#1ab8a0;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;border:2px solid #1ab8a0;">
          Add to Google Calendar
        </a>
      </div>

      <!-- Footer note -->
      <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
        <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
          If you need to reschedule or have questions, contact us at
          <a href="mailto:support@mindgigs.com" style="color:#1ab8a0;">support@mindgigs.com</a>
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;

  await resend.emails.send({
    from: 'bookings@mindgigs.com',
    to: booking.clientEmail,
    subject: `Your session with ${expertName} is confirmed`,
    html,
  });

  console.log(`[Resend] Confirmation email sent to ${booking.clientEmail}`);
}

// ─── Helper: Resend new-booking notification email (to the expert) ───────────
async function sendExpertNotificationEmail(booking, expertEmail, expertCalendarLink) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY not set — skipping expert notification email');
    return;
  }
  if (!expertEmail) {
    console.warn('[sendExpertNotificationEmail] No expertEmail — skipping expert notification email');
    return;
  }
  if (!booking.dailyRoomUrl) {
    console.warn('[sendExpertNotificationEmail] No dailyRoomUrl on booking — skipping email to avoid broken Join Session link.');
    return;
  }

  const resend = new Resend(apiKey);
  const clientName = booking.clientName || 'A client';
  const sessionTitle = booking.sessionTitle || 'Session';
  const date = booking.date || '';
  const time = booking.time || '';
  const dailyRoomUrl = booking.dailyRoomUrl || '#';
  const calendarLink = expertCalendarLink || '#';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1ab8a0;padding:32px 40px;">
      <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">mindGigs</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Expert Sessions</div>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">You have a new booking!</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 32px;">${clientName} just booked a session with you. Here are the details.</p>

      <!-- Session details box -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:32px;">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:13px;color:#6b7280;">Client</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${clientName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:13px;color:#6b7280;">Session</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${sessionTitle}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:13px;color:#6b7280;">Date</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${date}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;">
          <span style="font-size:13px;color:#6b7280;">Time</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${time}</span>
        </div>
      </div>

      <!-- Join button -->
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${dailyRoomUrl}"
           style="display:inline-block;background:#1ab8a0;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Join Session
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#9ca3af;margin:0 0 32px;">
        This link activates 15 minutes before the session
      </p>

      <!-- Calendar button -->
      <div style="text-align:center;margin-bottom:40px;">
        <a href="${calendarLink}"
           style="display:inline-block;background:#ffffff;color:#1ab8a0;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;border:2px solid #1ab8a0;">
          Add to Google Calendar
        </a>
      </div>

      <!-- Footer note -->
      <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
        <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
          Manage this booking any time from your
          <a href="https://mindgigs.com" style="color:#1ab8a0;">mindGigs dashboard</a>.
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;

  await resend.emails.send({
    from: 'bookings@mindgigs.com',
    to: expertEmail,
    subject: `New booking: ${clientName} booked ${sessionTitle}`,
    html,
  });

  console.log(`[Resend] Expert notification email sent to ${expertEmail}`);
}

// ─── Helper: Resend purchase confirmation email (books / digital products) ───
async function sendPurchaseConfirmationEmail({ buyerEmail, itemTitle, deliveryLink, expertId, price }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY not set — skipping purchase confirmation email');
    return;
  }
  if (!buyerEmail) {
    console.warn('[sendPurchaseConfirmationEmail] No buyerEmail on purchase — skipping confirmation email');
    return;
  }
  if (!deliveryLink) {
    console.warn('[sendPurchaseConfirmationEmail] No deliveryLink on purchase — skipping email to avoid a broken download link');
    return;
  }

  let expertName = 'the expert';
  try {
    if (expertId) {
      const expertSnap = await db.collection('users').doc(expertId).get();
      if (expertSnap.exists && expertSnap.data().name) expertName = expertSnap.data().name;
    }
  } catch (err) {
    console.error('[sendPurchaseConfirmationEmail] Failed to look up expert name:', err);
  }

  const resend = new Resend(apiKey);
  const title = itemTitle || 'Your purchase';
  const priceLabel = typeof price === 'number' ? `$${(price / 100).toFixed(2)}` : null;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1ab8a0;padding:32px 40px;">
      <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">mindGigs</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Expert Sessions</div>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">Your purchase is confirmed</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 32px;">Thanks for your purchase. Your download is ready below.</p>

      <!-- Purchase details box -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:32px;">
        <div style="display:flex;justify-content:space-between;padding:10px 0;${priceLabel ? 'border-bottom:1px solid #e5e7eb;' : ''}">
          <span style="font-size:13px;color:#6b7280;">Item</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${title}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:13px;color:#6b7280;">Seller</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${expertName}</span>
        </div>
        ${priceLabel ? `<div style="display:flex;justify-content:space-between;padding:10px 0;">
          <span style="font-size:13px;color:#6b7280;">Price</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${priceLabel}</span>
        </div>` : ''}
      </div>

      <!-- Download button -->
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${deliveryLink}"
           style="display:inline-block;background:#1ab8a0;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Download Now
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#9ca3af;margin:0 0 32px;">
        Save this email — this link is your permanent access to your purchase.
      </p>

      <!-- Footer note -->
      <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
        <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
          If your download link isn't working, contact us at
          <a href="mailto:support@mindgigs.com" style="color:#1ab8a0;">support@mindgigs.com</a>
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;

  await resend.emails.send({
    from: 'bookings@mindgigs.com',
    to: buyerEmail,
    subject: `Your purchase: ${title} is ready`,
    html,
  });

  console.log(`[Resend] Purchase confirmation email sent to ${buyerEmail}`);
}

// ─── Helper: CORS headers ─────────────────────────────────────────────────────
function setCors(res) {
  const clientUrl = process.env.CLIENT_URL || 'https://mindgigs.com';
  res.set('Access-Control-Allow-Origin', clientUrl);
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── Helper: commission split ─────────────────────────────────────────────────
async function processCommissionSplit(bookingId, expertId, saleAmount, buyerUid) {
  let scenario = 1;
  let referrerId = null;
  let affiliateId = null;

  if (buyerUid) {
    const buyerSnap = await db.collection('users').doc(buyerUid).get();
    if (buyerSnap.exists) {
      const buyer = buyerSnap.data();
      if (buyer.affiliateId) {
        // Scenario 4 — dedicated affiliate coupon takes priority over any referral
        scenario = 4;
        affiliateId = buyer.affiliateId;
      } else if (buyer.referredByExpertId) {
        if (buyer.referredByExpertId === expertId) {
          scenario = 2; // buying from the same expert who referred them
        } else {
          scenario = 3; // buying from a different expert
          referrerId = buyer.referredByExpertId;
        }
      }
    }
  }

  let expertAmount, referrerAmount = 0, affiliateAmount = 0;
  if (scenario === 2) {
    expertAmount = Math.round(saleAmount * 0.80);
  } else if (scenario === 3) {
    expertAmount = Math.round(saleAmount * 0.70);
    referrerAmount = Math.round(saleAmount * 0.10);
  } else if (scenario === 4) {
    expertAmount = Math.round(saleAmount * 0.70);
    affiliateAmount = Math.round(saleAmount * 0.10);
  } else {
    expertAmount = Math.round(saleAmount * 0.70); // scenario 1
  }
  // Platform always gets the remainder rather than a computed percentage,
  // so the three independent Math.round() calls above can never lose or
  // gain a cent off the total.
  const platformAmount = saleAmount - expertAmount - referrerAmount - affiliateAmount;

  await db.collection('commissions').add({
    bookingId: bookingId || null,
    buyerId: buyerUid || null,
    saleAmount,
    scenario,
    expertId: expertId || '',
    expertAmount,
    referrerId: referrerId || null,
    referrerAmount,
    affiliateId: affiliateId || null,
    affiliateAmount,
    platformAmount,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  const writes = [];
  if (expertId && expertAmount > 0) {
    writes.push(db.collection('users').doc(expertId).update({
      affiliateEarnings: FieldValue.increment(expertAmount),
      pendingPayout:     FieldValue.increment(expertAmount),
    }));
  }
  if (referrerId && referrerAmount > 0) {
    writes.push(db.collection('users').doc(referrerId).update({
      affiliateEarnings: FieldValue.increment(referrerAmount),
      pendingPayout:     FieldValue.increment(referrerAmount),
    }));
  }
  if (affiliateId && affiliateAmount > 0) {
    writes.push(db.collection('users').doc(affiliateId).update({
      affiliateEarnings: FieldValue.increment(affiliateAmount),
      pendingPayout:     FieldValue.increment(affiliateAmount),
    }));
  }
  await Promise.all(writes);

  return { scenario, expertAmount, referrerAmount, affiliateAmount, platformAmount };
}

// ─── 1. createCheckoutSession ─────────────────────────────────────────────────
/**
 * Called by the frontend when a client clicks "Pay", "Subscribe", or "Buy Now".
 * Creates a Stripe Checkout session and returns the hosted URL.
 *
 * Request body:
 *   saleType    : 'booking' | 'subscription' | 'product'  (default: 'booking')
 *   amount      : number   — price in cents (required for all)
 *   email       : string   — customer email (required for all)
 *   bookingId   : string   — Firestore booking doc ID (required for 'booking')
 *   title       : string   — product/subscription name (required for 'subscription'/'product')
 *   expertId    : string   — expert uid (required for 'subscription'/'product')
 *   buyerId     : string   — buyer uid, used by the webhook to look up their
 *                            referral/affiliate status for commission splitting
 *
 * Response: { url } — Stripe Checkout URL
 */
exports.createCheckoutSession = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'CLIENT_URL'] }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Payment system is not configured. Please contact support.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const clientUrl = process.env.CLIENT_URL || 'https://mindgigs.com';

  // US bank transfer (via customer_balance) settles 1-2 business days after
  // checkout — Stripe issues the buyer a virtual account/routing number and
  // fires checkout.session.async_payment_succeeded once funds land. Only
  // valid for mode: 'payment' — Checkout doesn't support delayed payment
  // methods like this in mode: 'subscription' (bank transfer can't
  // auto-renew), so subscriptions stay card-only regardless of amount.
  // customer_creation: 'always' is required so the funding instructions
  // have a Customer to attach to.
  const BANK_TRANSFER_MIN_CENTS = 100000; // $1000 — below this, card only
  const bankTransferOptions = {
    payment_method_types: ['card', 'customer_balance'],
    payment_method_options: {
      customer_balance: {
        funding_type: 'bank_transfer',
        bank_transfer: { type: 'us_bank_transfer' },
      },
    },
    customer_creation: 'always',
  };

  try {
    const { saleType = 'booking', bookingId, amount, email, title, expertId, deliveryLink, buyerId } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ error: 'amount and email are required' });
    }

    const paymentMethodConfig = (saleType !== 'subscription' && amount >= BANK_TRANSFER_MIN_CENTS)
      ? bankTransferOptions
      : { payment_method_types: ['card'] };

    let sessionConfig;

    if (saleType === 'booking') {
      if (!bookingId) return res.status(400).json({ error: 'bookingId is required for booking payments' });

      const bookingSnap = await db.collection('bookings').doc(bookingId).get();
      if (!bookingSnap.exists) return res.status(404).json({ error: 'Booking not found' });
      const booking = bookingSnap.data();

      sessionConfig = {
        ...paymentMethodConfig,
        mode: 'payment',
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.sessionTitle || 'Expert Session',
              description: `with ${booking.expertName || 'Expert'} on ${booking.date || ''} at ${booking.time || ''}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        metadata: {
          bookingId,
          saleType: 'booking',
          expertId: booking.expertId || expertId || '',
        },
        success_url: `${clientUrl}?payment=success&bookingId=${bookingId}`,
        cancel_url:  `${clientUrl}?payment=cancelled`,
      };

    } else if (saleType === 'subscription') {
      if (!expertId || !title) return res.status(400).json({ error: 'expertId and title are required for subscription payments' });

      sessionConfig = {
        ...paymentMethodConfig,
        mode: 'subscription',
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: title },
            unit_amount: amount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        metadata: {
          saleType: 'subscription',
          expertId,
          buyerId: buyerId || '',
        },
        success_url: `${clientUrl}?payment=success`,
        cancel_url:  `${clientUrl}?payment=cancelled`,
      };

    } else if (saleType === 'product') {
      if (!expertId || !title) return res.status(400).json({ error: 'expertId and title are required for product payments' });

      sessionConfig = {
        ...paymentMethodConfig,
        mode: 'payment',
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: title },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        metadata: {
          saleType: 'product',
          expertId,
          itemTitle: title,
          deliveryLink: deliveryLink || '',
          buyerId: buyerId || '',
        },
        success_url: `${clientUrl}?payment=success`,
        cancel_url:  `${clientUrl}?payment=cancelled`,
      };

    } else {
      return res.status(400).json({ error: `Unknown saleType: ${saleType}` });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[createCheckoutSession]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─── 2. stripeWebhook ─────────────────────────────────────────────────────────
/**
 * Stripe calls this URL after a payment event.
 * This is the ONLY place that confirms bookings and writes commission splits.
 * Handles: booking payments, subscription sign-ups, and digital product purchases.
 *
 * Listens for: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed
 *
 * Card payments settle synchronously, so `checkout.session.completed` arrives
 * with payment_status: 'paid' and fulfillment runs immediately. Bank transfer
 * (customer_balance) is a delayed payment method — `completed` fires first
 * with payment_status: 'unpaid' while Stripe waits for funds to actually
 * arrive (1-2 business days), then a separate async_payment_succeeded (or
 * _failed) event follows. Fulfillment must wait for the "paid" signal,
 * whichever event carries it.
 */
exports.stripeWebhook = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'DAILY_API_KEY'] }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripeWebhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return res.status(503).send('Webhook not configured');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripeWebhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const relevantEvents = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
  ];
  if (!relevantEvents.includes(event.type)) {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  const { bookingId, saleType = 'booking', expertId, itemTitle, deliveryLink, buyerId } = session.metadata || {};
  const saleAmount = session.amount_total;

  if (saleAmount == null) {
    console.error('[stripeWebhook] Missing amount_total on session', session.id);
    return res.status(200).json({ received: true });
  }

  // Bank transfer chose but funds haven't landed yet — record the pending
  // state (booking type only; product/subscription have no pre-existing doc
  // to update at this point) and stop. Fulfillment runs once payment_status
  // flips to 'paid' via async_payment_succeeded below.
  if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
    if (saleType === 'booking' && bookingId) {
      await db.collection('bookings').doc(bookingId).update({
        paymentStatus: 'pending_bank_transfer',
        stripeSessionId: session.id,
      });
      console.log(`[stripeWebhook] Booking ${bookingId} awaiting bank transfer settlement.`);
    }
    return res.status(200).json({ received: true });
  }

  // Bank transfer failed to settle — release the hold so the client can retry.
  if (event.type === 'checkout.session.async_payment_failed') {
    if (saleType === 'booking' && bookingId) {
      await db.collection('bookings').doc(bookingId).update({
        paymentStatus: 'failed',
        stripeSessionId: session.id,
      });
      console.log(`[stripeWebhook] Booking ${bookingId} bank transfer failed.`);
    } else {
      console.log(`[stripeWebhook] ${saleType} bank transfer failed for session ${session.id}.`);
    }
    return res.status(200).json({ received: true });
  }

  try {
    // ── 1. Confirm booking (booking type only) ─────────────────────────────
    let confirmedBookingData = null;
    if (saleType === 'booking' && bookingId) {
      const bookingSnap = await db.collection('bookings').doc(bookingId).get();
      if (bookingSnap.exists) confirmedBookingData = bookingSnap.data();

      await db.collection('bookings').doc(bookingId).update({
        status: 'confirmed',
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent || null,
      });

      // ── 1a. Create Daily.co video room ────────────────────────────────────
      if (confirmedBookingData) {
        const room = await createDailyRoom(bookingId, confirmedBookingData.date, confirmedBookingData.time);
        if (room && room.url) {
          await db.collection('bookings').doc(bookingId).update({
            dailyRoomUrl: room.url,
            dailyRoomName: room.name || '',
          });
          console.log(`[Daily.co] Room created: ${room.url}`);
        }
      }

      // ── 1b. Re-fetch the booking (now includes dailyRoomUrl) for calendar + email ──
      let freshBookingData = null;
      try {
        const freshSnap = await db.collection('bookings').doc(bookingId).get();
        if (freshSnap.exists) freshBookingData = freshSnap.data();
      } catch (err) {
        console.error('[stripeWebhook] Failed to re-fetch booking for calendar/email:', err);
      }

      // ── 1c. Generate Google Calendar link ───────────────────────────────
      let calendarLink = null;
      if (freshBookingData) {
        try {
          calendarLink = generateCalendarLink(freshBookingData);
          if (calendarLink) {
            await db.collection('bookings').doc(bookingId).update({ calendarLink });
            console.log(`[Calendar] Link generated for booking ${bookingId}`);
          }
        } catch (err) {
          console.error('[Calendar] Failed to generate calendar link:', err);
        }
      }

      // ── 1d. Send Resend confirmation email (to the client) ──────────────
      if (freshBookingData) {
        try {
          await sendConfirmationEmail({ ...freshBookingData, calendarLink: calendarLink || freshBookingData.calendarLink });
        } catch (err) {
          console.error('[Resend] Failed to send confirmation email:', err);
        }
      }

      // ── 1e. Send Resend notification email (to the expert) ──────────────
      if (freshBookingData && freshBookingData.expertId) {
        try {
          const expertSnap = await db.collection('users').doc(freshBookingData.expertId).get();
          const expertEmail = expertSnap.exists ? expertSnap.data().email : null;
          const expertCalendarLink = generateCalendarLink(freshBookingData, `Session with ${freshBookingData.clientName || 'Client'}`);
          await sendExpertNotificationEmail(freshBookingData, expertEmail, expertCalendarLink);
        } catch (err) {
          console.error('[Resend] Failed to send expert notification email:', err);
        }
      }
    }

    // ── 1e. Record digital product/book purchase + send delivery email (product type only) ──
    if (saleType === 'product') {
      const buyerEmail = session.customer_details?.email || session.customer_email || null;

      try {
        await db.collection('purchases').add({
          buyerId: buyerId || null,
          buyerEmail,
          expertId: expertId || null,
          itemTitle: itemTitle || 'Digital Item',
          deliveryLink: deliveryLink || null,
          price: saleAmount,
          stripeSessionId: session.id,
          createdAt: new Date().toISOString(),
        });
        console.log(`[Purchases] Recorded purchase of "${itemTitle || 'item'}" (session ${session.id})`);
      } catch (err) {
        console.error('[Purchases] Failed to record purchase:', err);
      }

      try {
        await sendPurchaseConfirmationEmail({ buyerEmail, itemTitle, deliveryLink, expertId, price: saleAmount });
      } catch (err) {
        console.error('[Resend] Failed to send purchase confirmation email:', err);
      }
    }

    // ── 2. Calculate and write commission split (all types) ────────────────
    // Buyer identity comes from the booking's clientId (already fetched above)
    // for bookings, or from the buyerId metadata for subscriptions/products.
    const buyerUid = saleType === 'booking' ? (confirmedBookingData?.clientId || null) : (buyerId || null);

    const { scenario, expertAmount, referrerAmount, affiliateAmount, platformAmount } =
      await processCommissionSplit(bookingId || null, expertId, saleAmount, buyerUid);

    // ── 3. Mark booking commission as processed (booking type only) ────────
    if (saleType === 'booking' && bookingId) {
      await db.collection('bookings').doc(bookingId).update({
        commissionPaid: true,
        scenario,
      });
    }

    console.log(`[stripeWebhook] ${saleType} processed (session ${session.id}). Scenario ${scenario} — Expert: ${expertAmount}, Referrer: ${referrerAmount}, Affiliate: ${affiliateAmount}, Platform: ${platformAmount}`);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripeWebhook] Error processing payment:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
});

// ─── confirmFreeBooking ────────────────────────────────────────────────────────
/**
 * Confirms a free "Book a Call" booking — no payment is involved. Called by
 * the frontend immediately after the booking doc is created, this creates
 * the Daily.co room, generates the Google Calendar link, and sends the
 * confirmation email, mirroring what stripeWebhook does for paid bookings
 * (minus payment/commission handling, since nothing was charged).
 *
 * Request body: { bookingId }
 */
exports.confirmFreeBooking = onRequest({ secrets: ['CLIENT_URL', 'RESEND_API_KEY', 'DAILY_API_KEY'] }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });

  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) return res.status(404).json({ error: 'Booking not found' });

    await bookingRef.update({
      status: 'confirmed',
      paymentStatus: 'free',
      confirmedAt: new Date().toISOString(),
    });

    const booking = bookingSnap.data();
    const room = await createDailyRoom(bookingId, booking.date, booking.time);
    if (room && room.url) {
      await bookingRef.update({ dailyRoomUrl: room.url, dailyRoomName: room.name || '' });
      console.log(`[Daily.co] Room created for free booking: ${room.url}`);
    }

    const freshSnap = await bookingRef.get();
    const freshBooking = freshSnap.data();

    let calendarLink = null;
    try {
      calendarLink = generateCalendarLink(freshBooking);
      if (calendarLink) await bookingRef.update({ calendarLink });
    } catch (err) {
      console.error('[confirmFreeBooking] Failed to generate calendar link:', err);
    }

    try {
      await sendConfirmationEmail({ ...freshBooking, calendarLink: calendarLink || freshBooking.calendarLink });
    } catch (err) {
      console.error('[confirmFreeBooking] Failed to send confirmation email:', err);
    }

    if (freshBooking.expertId) {
      try {
        const expertSnap = await db.collection('users').doc(freshBooking.expertId).get();
        const expertEmail = expertSnap.exists ? expertSnap.data().email : null;
        const expertCalendarLink = generateCalendarLink(freshBooking, `Session with ${freshBooking.clientName || 'Client'}`);
        await sendExpertNotificationEmail(freshBooking, expertEmail, expertCalendarLink);
      } catch (err) {
        console.error('[confirmFreeBooking] Failed to send expert notification email:', err);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[confirmFreeBooking] Error:', err);
    return res.status(500).json({ error: 'Failed to confirm booking.' });
  }
});

// ─── adminDeleteUser ───────────────────────────────────────────────────────────
/**
 * Called by the Admin Dashboard to permanently remove a user profile from the
 * platform. Firestore security rules can't grant this on their own — deleting
 * the underlying Firebase Auth account requires the Admin SDK — so this runs
 * server-side with two checks before touching anything:
 *   1. The request carries a valid Firebase ID token (caller is signed in).
 *   2. That caller's own Firestore user doc has role === 'admin'.
 *
 * Request body: { targetUid }
 * Headers:      Authorization: Bearer <Firebase ID token>
 *
 * Response: { success, deletedUid, name }
 */
exports.adminDeleteUser = onRequest({ secrets: ['CLIENT_URL'] }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Missing Authorization token' });

  let callerUid;
  try {
    callerUid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  const callerSnap = await db.collection('users').doc(callerUid).get();
  if (!callerSnap.exists || callerSnap.data().role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { targetUid } = req.body || {};
  if (!targetUid) return res.status(400).json({ error: 'targetUid is required' });
  if (targetUid === callerUid) {
    return res.status(400).json({ error: 'Cannot delete your own admin account.' });
  }

  try {
    const targetSnap = await db.collection('users').doc(targetUid).get();
    const targetData = targetSnap.exists ? targetSnap.data() : null;

    const writes = [db.collection('users').doc(targetUid).delete()];
    if (targetData?.handle) {
      writes.push(db.collection('handles').doc(targetData.handle).delete());
    }
    await Promise.all(writes);

    try {
      await getAuth().deleteUser(targetUid);
    } catch (err) {
      // Auth record may not exist (e.g. doc created manually) — Firestore
      // removal above already succeeded, so this alone isn't fatal.
      if (err.code !== 'auth/user-not-found') {
        console.error('[adminDeleteUser] Failed to delete Auth account:', err);
      }
    }

    console.log(`[adminDeleteUser] ${callerUid} deleted profile ${targetUid} (${targetData?.name || 'unknown'})`);
    return res.status(200).json({ success: true, deletedUid: targetUid, name: targetData?.name || null });
  } catch (err) {
    console.error('[adminDeleteUser] Error:', err);
    return res.status(500).json({ error: 'Failed to delete user profile.' });
  }
});
