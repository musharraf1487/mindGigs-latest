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

// ─── Commission rates — 8 scenarios ────────────────────────────────────────────
// Two people can earn a cut of a sale beyond the seller:
//   Person A — the affiliate who onboarded the SELLER at signup (users.onboardedByAffiliateId).
//              Lifetime: applies to every sale this seller ever makes.
//   Person B — resolved from THIS transaction's coupon code (expert handle or
//              affiliate code), or failing that, the BUYER's own signup-time
//              expert referral (users.referredByExpertId). One-time (this sale only).
// See resolveCouponCode() and processCommissionSplit() below for the full matrix
// (1 Direct / 2 Self-referral / 3 Cross-expert referral / 4 Own coupon /
//  5 Expert coupon / 6 Affiliate coupon / 7 Onboarding lifetime / 8 Dual commission).
//
// Experts don't have a separate generated coupon code — their `handle` doubles
// as their coupon. Affiliates have no public profile; they get a system-generated
// 6-char code in the `affiliateCodes` collection.

// ─── Helper: resolve a checkout-time coupon code to its owner ─────────────────
// Checks affiliateCodes (uppercase match) first, then falls back to an expert's
// handle (lowercase match). Mirrors the client-side version in affiliateService.js.
async function resolveCouponCode(code) {
  if (!code) return null;
  const normalized = String(code).trim();
  if (!normalized) return null;

  const affSnap = await db.collection('affiliateCodes').doc(normalized.toUpperCase()).get();
  if (affSnap.exists) {
    const d = affSnap.data();
    return { ownerId: d.ownerId, ownerRole: 'affiliate' };
  }

  // onboardingComplete filter kept in sync with the client-side version — a
  // coupon should never resolve to an expert whose profile isn't public yet.
  const expSnap = await db.collection('users')
    .where('handle', '==', normalized.toLowerCase())
    .where('role', '==', 'expert')
    .where('onboardingComplete', '==', true)
    .limit(1).get();
  if (!expSnap.empty) {
    return { ownerId: expSnap.docs[0].id, ownerRole: 'expert' };
  }
  return null;
}

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
// The apex domain and `www.` are both served live (no canonical redirect
// between them at the host), so hardcoding a single Access-Control-Allow-Origin
// silently CORS-blocks every fetch from whichever one isn't configured —
// showing up client-side as a bare "Failed to fetch" with no useful detail.
// Reflect the request's actual origin when it's a recognized mindgigs.com
// variant, otherwise fall back to the configured CLIENT_URL.
function setCors(res, req) {
  const configured = process.env.CLIENT_URL || 'https://mindgigs.com';
  const apex = configured.replace(/^https:\/\/www\./, 'https://');
  const allowedOrigins = new Set([apex, apex.replace('https://', 'https://www.')]);
  const requestOrigin = req?.headers?.origin;
  const allowOrigin = requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : configured;
  res.set('Access-Control-Allow-Origin', allowOrigin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── Helper: commission split ─────────────────────────────────────────────────
// Person A — the affiliate who onboarded the seller (lifetime, every sale).
// Person B — resolved from this transaction's coupon, or the buyer's own
//            signup-time expert referral if no coupon was used (one-time).
// See functions/index.js commit history / plan doc for the full 8-scenario matrix.
async function processCommissionSplit(bookingId, sellerId, saleAmount, buyerUid, saleType, couponCode) {
  const sellerDoc = await db.collection('users').doc(sellerId).get();
  const seller = sellerDoc.data() || {};
  const personAId = seller.onboardedByAffiliateId || null;

  let buyer = {};
  if (buyerUid) {
    const buyerDoc = await db.collection('users').doc(buyerUid).get();
    buyer = buyerDoc.data() || {};
  }
  const referredByExpertId = buyer.referredByExpertId || null;

  // Resolve Person B — coupon wins over the buyer's lifetime referral.
  let personBId = null;
  let personBRole = null;
  if (couponCode) {
    const resolved = await resolveCouponCode(couponCode);
    if (resolved) {
      personBId = resolved.ownerId;
      personBRole = resolved.ownerRole;
    }
  } else if (referredByExpertId) {
    personBId = referredByExpertId;
    personBRole = 'expert';
  }

  // Determine scenario
  let scenario;
  if (personAId && personBId) scenario = 8;
  else if (personAId) scenario = 7;
  else if (personBId === sellerId) scenario = couponCode ? 4 : 2;
  else if (personBId && personBRole === 'expert') scenario = couponCode ? 5 : 3;
  else if (personBId && personBRole === 'affiliate') scenario = 6;
  else scenario = 1;

  // Calculate split
  const seventy = Math.round(saleAmount * 0.70);
  const sevenHalf = Math.round(saleAmount * 0.075);

  let sellerAmount = seventy;
  let sellerAffiliateBonus = 0;
  let personAAmount = 0;
  let personBAmount = 0;

  if (scenario === 8) {
    personAAmount = sevenHalf;
    personBAmount = sevenHalf;
  } else if (scenario === 7) {
    personAAmount = sevenHalf;
  } else if (scenario === 2 || scenario === 4) {
    sellerAffiliateBonus = sevenHalf;
  } else if ([3, 5, 6].includes(scenario)) {
    personBAmount = sevenHalf;
  }
  // Platform always gets the remainder rather than a computed percentage, so
  // the independent Math.round() calls above can never lose or gain a cent.
  const platformAmount = saleAmount - sellerAmount - sellerAffiliateBonus - personAAmount - personBAmount;

  // Write commission record
  await db.collection('commissions').add({
    bookingId: bookingId || null,
    saleType,
    saleAmount,
    scenario,
    sellerId,
    sellerAmount: sellerAmount + sellerAffiliateBonus,
    personAId,
    personAAmount,
    personBId: (personBId !== sellerId) ? personBId : null,
    personBAmount: (personBId !== sellerId) ? personBAmount : 0,
    platformAmount,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  // Seller: 70% → sellingEarnings, self-coupon/self-referral bonus → affiliateEarnings
  const sellerUpdates = {
    sellingEarnings: FieldValue.increment(sellerAmount),
    pendingPayout: FieldValue.increment(sellerAmount + sellerAffiliateBonus),
  };
  if (sellerAffiliateBonus > 0) {
    sellerUpdates.affiliateEarnings = FieldValue.increment(sellerAffiliateBonus);
  }
  await db.collection('users').doc(sellerId).update(sellerUpdates);

  // Person A — affiliateEarnings only, never sellingEarnings
  if (personAId && personAAmount > 0) {
    const inc = (personAId === personBId) ? personAAmount + personBAmount : personAAmount;
    await db.collection('users').doc(personAId).update({
      affiliateEarnings: FieldValue.increment(inc),
      pendingPayout: FieldValue.increment(inc),
    });
  }

  // Person B — affiliateEarnings only (skip if same as A or the seller, both handled above)
  if (personBId && personBAmount > 0 && personBId !== personAId && personBId !== sellerId) {
    await db.collection('users').doc(personBId).update({
      affiliateEarnings: FieldValue.increment(personBAmount),
      pendingPayout: FieldValue.increment(personBAmount),
    });
  }

  // Platform earnings ledger — the fast aggregate the admin dashboard reads,
  // so it never needs to sum every commission doc on load.
  const totalAffiliatePaid = personAAmount + ((personBId !== sellerId) ? personBAmount : 0) + sellerAffiliateBonus;
  await db.collection('platformStats').doc('earnings').set({
    totalRevenue: FieldValue.increment(saleAmount),
    totalPlatformEarnings: FieldValue.increment(platformAmount),
    totalSellerPayouts: FieldValue.increment(sellerAmount),
    totalAffiliatePayouts: FieldValue.increment(totalAffiliatePaid),
    totalTransactions: FieldValue.increment(1),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  if (bookingId) {
    await db.collection('bookings').doc(bookingId).update({
      commissionPaid: true,
      commissionScenario: scenario,
    });
  }

  return { scenario, sellerAmount: sellerAmount + sellerAffiliateBonus, personAAmount, personBAmount, platformAmount };
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
  setCors(res, req);
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
  const BANK_TRANSFER_MIN_CENTS = 100000; // $1000 — below this, card only
  const bankTransferOptions = {
    payment_method_types: ['card', 'customer_balance'],
    payment_method_options: {
      customer_balance: {
        funding_type: 'bank_transfer',
        bank_transfer: { type: 'us_bank_transfer' },
      },
    },
    // Adaptive Pricing (auto-converts the displayed price to the buyer's local
    // currency) is incompatible with bank transfer, which needs a fixed USD
    // amount for the virtual account — Stripe silently drops customer_balance
    // from payment_method_types on any session where adaptive pricing is on.
    adaptive_pricing: { enabled: false },
  };

  try {
    const { saleType = 'booking', bookingId, amount, email, title, expertId, deliveryLink, buyerId, couponCode } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ error: 'amount and email are required' });
    }

    const isBankTransferEligible = saleType !== 'subscription' && amount >= BANK_TRANSFER_MIN_CENTS;
    const paymentMethodConfig = isBankTransferEligible ? bankTransferOptions : { payment_method_types: ['card'] };

    // customer_balance (bank transfer) needs funding instructions attached to
    // a real Customer at session-creation time — customer_creation: 'always'
    // only creates the Customer after checkout completes, which is too late.
    // So for bank-transfer-eligible sessions, create the Customer up front and
    // reference it by ID instead of customer_email.
    const customerParam = isBankTransferEligible
      ? { customer: (await stripe.customers.create({ email })).id }
      : { customer_email: email };

    let sessionConfig;

    if (saleType === 'booking') {
      if (!bookingId) return res.status(400).json({ error: 'bookingId is required for booking payments' });

      const bookingSnap = await db.collection('bookings').doc(bookingId).get();
      if (!bookingSnap.exists) return res.status(404).json({ error: 'Booking not found' });
      const booking = bookingSnap.data();

      sessionConfig = {
        ...paymentMethodConfig,
        mode: 'payment',
        ...customerParam,
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
          // Coupon is entered and saved on the booking doc itself (BookingFlow),
          // not re-sent by the client here — this is the source of truth the
          // webhook reads from, same as every other field derived from `booking`.
          couponCode: booking.couponCode || '',
        },
        success_url: `${clientUrl}?payment=success&bookingId=${bookingId}`,
        cancel_url:  `${clientUrl}?payment=cancelled`,
      };

    } else if (saleType === 'subscription') {
      if (!expertId || !title) return res.status(400).json({ error: 'expertId and title are required for subscription payments' });

      sessionConfig = {
        ...paymentMethodConfig,
        mode: 'subscription',
        ...customerParam,
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
          itemTitle: title,
          buyerId: buyerId || '',
          couponCode: couponCode || '',
        },
        success_url: `${clientUrl}?payment=success`,
        cancel_url:  `${clientUrl}?payment=cancelled`,
      };

    } else if (saleType === 'product') {
      if (!expertId || !title) return res.status(400).json({ error: 'expertId and title are required for product payments' });

      sessionConfig = {
        ...paymentMethodConfig,
        mode: 'payment',
        ...customerParam,
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
          couponCode: couponCode || '',
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
  const { bookingId, saleType = 'booking', expertId, itemTitle, deliveryLink, buyerId, couponCode } = session.metadata || {};
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

    // ── 1f. Record subscription sign-up (subscription type only) ──
    if (saleType === 'subscription') {
      const buyerEmail = session.customer_details?.email || session.customer_email || null;

      let expertName = null;
      try {
        if (expertId) {
          const expertSnap = await db.collection('users').doc(expertId).get();
          expertName = expertSnap.exists ? (expertSnap.data().name || null) : null;
        }
      } catch (err) {
        console.error('[Subscriptions] Failed to look up expert name:', err);
      }

      try {
        await db.collection('subscriptions').add({
          buyerId: buyerId || null,
          buyerEmail,
          expertId: expertId || null,
          expertName,
          itemTitle: itemTitle || 'Subscription',
          price: saleAmount,
          status: 'active',
          stripeSessionId: session.id,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          createdAt: new Date().toISOString(),
        });
        console.log(`[Subscriptions] Recorded subscription "${itemTitle || 'Subscription'}" (session ${session.id})`);
      } catch (err) {
        console.error('[Subscriptions] Failed to record subscription:', err);
      }
    }

    // ── 2. Calculate and write commission split (all types) ────────────────
    // Buyer identity comes from the booking's clientId (already fetched above)
    // for bookings, or from the buyerId metadata for subscriptions/products.
    const buyerUid = saleType === 'booking' ? (confirmedBookingData?.clientId || null) : (buyerId || null);

    const { scenario, sellerAmount, personAAmount, personBAmount, platformAmount } =
      await processCommissionSplit(bookingId || null, expertId, saleAmount, buyerUid, saleType, couponCode || null);

    console.log(`[stripeWebhook] ${saleType} processed (session ${session.id}). Scenario ${scenario} — Seller: ${sellerAmount}, Person A: ${personAAmount}, Person B: ${personBAmount}, Platform: ${platformAmount}`);
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
  setCors(res, req);
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

// ─── confirmFreeSale ────────────────────────────────────────────────────────────
/**
 * Grants access to a zero-priced digital product/book/custom offering without
 * going through Stripe. Mirrors the "product" branch of stripeWebhook (record
 * purchase + send delivery email) but skips payment and commission entirely
 * since nothing was charged.
 *
 * Request body: { expertId, title, email, deliveryLink, buyerId }
 */
exports.confirmFreeSale = onRequest({ secrets: ['CLIENT_URL', 'RESEND_API_KEY'] }, async (req, res) => {
  setCors(res, req);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { expertId, title, email, deliveryLink, buyerId } = req.body || {};
  if (!expertId || !title) return res.status(400).json({ error: 'expertId and title are required' });

  try {
    await db.collection('purchases').add({
      buyerId: buyerId || null,
      buyerEmail: email || null,
      expertId,
      itemTitle: title,
      deliveryLink: deliveryLink || null,
      price: 0,
      stripeSessionId: null,
      createdAt: new Date().toISOString(),
    });
    console.log(`[confirmFreeSale] Recorded free purchase of "${title}" for ${email || buyerId || 'unknown buyer'}`);

    try {
      await sendPurchaseConfirmationEmail({ buyerEmail: email, itemTitle: title, deliveryLink, expertId, price: 0 });
    } catch (err) {
      console.error('[confirmFreeSale] Failed to send confirmation email:', err);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[confirmFreeSale] Error:', err);
    return res.status(500).json({ error: 'Failed to record free purchase.' });
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
  setCors(res, req);
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
