/**
 * referralService.js
 * Referral-link capture: `https://mindgigs.com/?ref=CODE`
 *
 * An affiliate (expert or client) shares a link carrying their coupon code.
 * A visitor who arrives on it gets that code stored locally and pre-filled into
 * the signup form's referral field, so they never have to type it — the same
 * attribution that used to depend on the visitor remembering a 6-char code.
 *
 * The stored code is consumed by SignupPage and resolved server-side by the
 * normal signup path (resolveCouponCode), so a link and a hand-typed code end
 * up in exactly the same place. Nothing here decides commissions.
 *
 * `?ref=` is a query param rather than a path segment on purpose: it composes
 * with the vanity URLs App.jsx already routes on, so an expert can share
 * `mindgigs.com/their-handle?ref=their-handle` and both the profile page and
 * the referral attribution work.
 *
 * Persistence: localStorage with a 30-day window — the classic affiliate-cookie
 * behaviour. Someone can click a link today and sign up next week and the
 * referrer still gets credit. sessionStorage would drop it the moment the tab
 * closes, which loses most real-world referrals.
 */

const STORAGE_KEY = 'mindgigs_referral';
const WINDOW_DAYS = 30;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const REFERRAL_WINDOW_DAYS = WINDOW_DAYS;

function siteOrigin() {
  return typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://mindgigs.com';
}

/** Builds the shareable link for a coupon code (expert handle or 6-char code). */
export function buildReferralLink(code) {
  if (!code) return null;
  return `${siteOrigin()}/?ref=${encodeURIComponent(code)}`;
}

/**
 * An expert's vanity URL with their own handle attached as the referral code —
 * one link that both shows their profile and pre-fills their code at signup.
 * An expert's handle IS their coupon, so the two are always the same value.
 */
export function buildProfileReferralLink(handle) {
  if (!handle) return null;
  return `${siteOrigin()}/${handle}?ref=${encodeURIComponent(handle)}`;
}

/**
 * Reads `?ref=` off the current URL and stores it, then returns the code.
 * Returns null when the URL carries no referral.
 *
 * The caller is responsible for stripping the param from the address bar —
 * App.jsx does that alongside its existing ?payment= cleanup, so a shared or
 * bookmarked URL doesn't keep re-applying a referral the visitor already used.
 *
 * First link wins: if a code is already stored and still inside its window, a
 * later link does NOT overwrite it. Otherwise the last affiliate to get a click
 * would silently steal an earlier one's attribution.
 */
export function captureReferralFromUrl() {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('ref');
  const code = raw ? raw.trim() : '';
  if (!code) return null;

  const existing = getStoredReferralCode();
  if (existing) return existing;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, capturedAt: Date.now() }));
  } catch (_) {
    // Private mode / storage disabled — the code is still returned so the
    // current page load can use it; it just won't survive a reload.
  }
  return code;
}

/** The stored referral code, or null if absent, malformed, or past its window. */
export function getStoredReferralCode() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored?.code || !stored?.capturedAt) return null;
    if (Date.now() - stored.capturedAt > WINDOW_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored.code;
  } catch (_) {
    return null;
  }
}

/** Clears the stored referral — called once it has been used at signup. */
export function clearStoredReferralCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}
