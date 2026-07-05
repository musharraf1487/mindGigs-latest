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
        privacy: 'public',
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
exports.stripeWebhook = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] }, async (req, res) => {
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
