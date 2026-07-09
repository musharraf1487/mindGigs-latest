/**
 * stripeService.js
 * Calls the Firebase Cloud Function to create a Stripe Checkout session.
 * The Cloud Function returns a hosted Stripe URL — the user is redirected there.
 * After payment, Stripe calls our webhook which confirms the booking and
 * writes the commission split. The frontend handles nothing else.
 */

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || '';

/**
 * Initiates a real Stripe payment for a booking.
 * @param {string} bookingId  Firestore booking doc ID
 * @param {number} amount     Amount in cents
 * @param {string} email      Customer email
 */
export async function initiatePayment(bookingId, amount, email) {
  if (!FUNCTIONS_URL) {
    console.warn('[Stripe] VITE_FUNCTIONS_URL not set — cannot process real payments.');
    throw new Error('Payment system is not configured. Please contact support.');
  }

  const response = await fetch(`${FUNCTIONS_URL}/createCheckoutSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, amount, email }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Payment request failed (${response.status})`);
  }

  const data = await response.json();

  if (data.url) {
    // Redirect user to Stripe-hosted checkout page
    window.location.href = data.url;
    return { redirecting: true };
  }

  throw new Error('No checkout URL returned from payment service.');
}

/**
 * Initiates a Stripe subscription checkout for a monthly plan.
 * @param {string} expertId   Expert's Firestore uid
 * @param {string} title      Subscription name shown in Stripe checkout
 * @param {number} amount     Monthly amount in cents
 * @param {string} email      Customer email
 * @param {string|null} referralCode  Stored referral code for commission tracking
 */
export async function initiateSubscriptionPayment(expertId, title, amount, email, referralCode) {
  if (!FUNCTIONS_URL) {
    throw new Error('Payment system is not configured. Please contact support.');
  }

  const response = await fetch(`${FUNCTIONS_URL}/createCheckoutSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saleType: 'subscription', expertId, title, amount, email, referralCode: referralCode || null }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Payment request failed (${response.status})`);
  }

  const data = await response.json();
  if (data.url) {
    window.location.href = data.url;
    return { redirecting: true };
  }

  throw new Error('No checkout URL returned from payment service.');
}

/**
 * Initiates a one-time Stripe checkout for a digital product purchase.
 * @param {string} expertId   Expert's Firestore uid
 * @param {string} title      Product name shown in Stripe checkout
 * @param {number} amount     Price in cents
 * @param {string} email      Customer email
 * @param {string|null} referralCode  Stored referral code for commission tracking
 * @param {string|null} deliveryLink  Link emailed to the buyer after purchase (books/digital products)
 * @param {string|null} buyerId       Firestore uid of the buyer, so the purchase can be tied to their account
 */
export async function initiateProductPayment(expertId, title, amount, email, referralCode, deliveryLink, buyerId) {
  if (!FUNCTIONS_URL) {
    throw new Error('Payment system is not configured. Please contact support.');
  }

  const response = await fetch(`${FUNCTIONS_URL}/createCheckoutSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saleType: 'product', expertId, title, amount, email, referralCode: referralCode || null, deliveryLink: deliveryLink || null, buyerId: buyerId || null }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Payment request failed (${response.status})`);
  }

  const data = await response.json();
  if (data.url) {
    window.location.href = data.url;
    return { redirecting: true };
  }

  throw new Error('No checkout URL returned from payment service.');
}
