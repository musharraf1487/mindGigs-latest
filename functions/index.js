/**
 * mindGigs — Firebase Cloud Functions
 *
 * Two functions:
 *   createCheckoutSession  — called by frontend, creates a Stripe Checkout session
 *   stripeWebhook          — called by Stripe after payment, source of truth for all money logic
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
const Stripe = require('stripe');
const { Resend } = require('resend');

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: 'us-central1' });

// ─── Commission rates ──────────────────────────────────────────────────────────
const TIER1_EXPERT_RATE    = 0.80;
const TIER2_EXPERT_RATE    = 0.70;
const TIER2_AFFILIATE_RATE = 0.05;

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
function generateCalendarLink(booking) {
  if (!booking || !booking.date || !booking.time) return null;

  // Reconstruct a real Date from the freeform "date"/"time" strings (no year on booking.date, so assume current year)
  const year = new Date().getFullYear();
  const start = new Date(`${booking.date}, ${year} ${booking.time}`);
  if (isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + 60 * 60 * 1000); // 60-minute session

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; // YYYYMMDDTHHmmssZ

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Session with ${booking.expertName || 'Expert'}`,
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

// ─── Helper: CORS headers ─────────────────────────────────────────────────────
function setCors(res) {
  const clientUrl = process.env.CLIENT_URL || 'https://mindgigs.com';
  res.set('Access-Control-Allow-Origin', clientUrl);
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── Helper: commission split ─────────────────────────────────────────────────
async function processCommissionSplit({ db, saleType, saleAmount, expertId, referralCode, bookingId, stripeSessionId }) {
  let affiliateId = null;
  let tier = 1;

  if (referralCode && expertId) {
    const codeSnap = await db.collection('users')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (!codeSnap.empty) {
      const codeOwner = codeSnap.docs[0];
      if (codeOwner.data().tier === 2 && codeOwner.data().referredBy === expertId) {
        affiliateId = codeOwner.id;
        tier = 2;
      }
    }
  }

  let expertAmount, affiliateAmount, platformAmount;
  if (tier === 2 && affiliateId) {
    expertAmount    = Math.round(saleAmount * TIER2_EXPERT_RATE);
    affiliateAmount = Math.round(saleAmount * TIER2_AFFILIATE_RATE);
    platformAmount  = saleAmount - expertAmount - affiliateAmount;
  } else {
    expertAmount    = Math.round(saleAmount * TIER1_EXPERT_RATE);
    affiliateAmount = 0;
    platformAmount  = saleAmount - expertAmount;
  }

  await db.collection('commissions').add({
    bookingId: bookingId || null,
    saleType,
    saleAmount,
    expertId: expertId || '',
    expertAmount,
    affiliateId: affiliateId || null,
    affiliateAmount,
    platformAmount,
    tier,
    status: 'pending',
    stripeSessionId,
    createdAt: new Date().toISOString(),
  });

  if (expertId) {
    await db.collection('users').doc(expertId).update({
      affiliateEarnings: FieldValue.increment(expertAmount),
      pendingPayout:     FieldValue.increment(expertAmount),
    });
  }

  if (affiliateId && affiliateAmount > 0) {
    await db.collection('users').doc(affiliateId).update({
      affiliateEarnings: FieldValue.increment(affiliateAmount),
      pendingPayout:     FieldValue.increment(affiliateAmount),
    });
  }

  return { expertAmount, affiliateAmount, platformAmount, tier };
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
 *   referralCode: string   — affiliate referral code for commission tracking
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

  try {
    const { saleType = 'booking', bookingId, amount, email, title, expertId, referralCode } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ error: 'amount and email are required' });
    }

    let sessionConfig;

    if (saleType === 'booking') {
      if (!bookingId) return res.status(400).json({ error: 'bookingId is required for booking payments' });

      const bookingSnap = await db.collection('bookings').doc(bookingId).get();
      if (!bookingSnap.exists) return res.status(404).json({ error: 'Booking not found' });
      const booking = bookingSnap.data();

      sessionConfig = {
        payment_method_types: ['card'],
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
          referralCode: booking.referralCode || referralCode || '',
        },
        success_url: `${clientUrl}?payment=success&bookingId=${bookingId}`,
        cancel_url:  `${clientUrl}?payment=cancelled`,
      };

    } else if (saleType === 'subscription') {
      if (!expertId || !title) return res.status(400).json({ error: 'expertId and title are required for subscription payments' });

      sessionConfig = {
        payment_method_types: ['card'],
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
          referralCode: referralCode || '',
        },
        success_url: `${clientUrl}?payment=success`,
        cancel_url:  `${clientUrl}?payment=cancelled`,
      };

    } else if (saleType === 'product') {
      if (!expertId || !title) return res.status(400).json({ error: 'expertId and title are required for product payments' });

      sessionConfig = {
        payment_method_types: ['card'],
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
          referralCode: referralCode || '',
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
 * Listens for: checkout.session.completed
 */
exports.stripeWebhook = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY'] }, async (req, res) => {
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

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  const { bookingId, saleType = 'booking', expertId, referralCode } = session.metadata || {};
  const saleAmount = session.amount_total;

  if (saleAmount == null) {
    console.error('[stripeWebhook] Missing amount_total on session', session.id);
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

      // ── 1d. Send Resend confirmation email ──────────────────────────────
      if (freshBookingData) {
        try {
          await sendConfirmationEmail({ ...freshBookingData, calendarLink: calendarLink || freshBookingData.calendarLink });
        } catch (err) {
          console.error('[Resend] Failed to send confirmation email:', err);
        }
      }
    }

    // ── 2. Calculate and write commission split (all types) ────────────────
    const { expertAmount, affiliateAmount, platformAmount, tier } = await processCommissionSplit({
      db,
      saleType,
      saleAmount,
      expertId,
      referralCode,
      bookingId: bookingId || null,
      stripeSessionId: session.id,
    });

    // ── 3. Mark booking commission as processed (booking type only) ────────
    if (saleType === 'booking' && bookingId) {
      await db.collection('bookings').doc(bookingId).update({
        commissionPaid: true,
        affiliateTier: tier,
      });
    }

    console.log(`[stripeWebhook] ${saleType} processed (session ${session.id}). Split — Expert: ${expertAmount}, Affiliate: ${affiliateAmount}, Platform: ${platformAmount}`);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripeWebhook] Error processing payment:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
});
