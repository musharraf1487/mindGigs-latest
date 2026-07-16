/**
 * affiliateService.js
 * Core engine for the 8-scenario commission model.
 *
 * Two code types:
 *   Experts   — no separate coupon code. Their `handle` (public vanity URL)
 *               doubles as their coupon.
 *   Affiliates — no public profile. A system-generated 6-char code lives in
 *               the `affiliateCodes` collection.
 *
 * Two earnings buckets on every user doc, never mixed:
 *   sellingEarnings   — this user's cut as the SELLER.
 *   affiliateEarnings — this user's cut for bringing in a sale (Person A/B),
 *                       never touched by their own direct sales.
 *
 * The actual split math lives server-side in functions/index.js
 * (processCommissionSplit / resolveCouponCode) — this file only mints/looks up
 * codes and reads back the resulting commissions for the dashboards.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { isHandleAvailable } from './handleService';

// Shared scenario labels — used by expert/affiliate/admin dashboards so the
// same commission doc always reads the same way everywhere.
export const SCENARIO_LABELS = {
  1: 'Direct',
  2: 'Self-referral',
  3: 'Expert referral',
  4: 'Own coupon',
  5: 'Expert coupon',
  6: 'Affiliate coupon',
  7: 'Onboarding lifetime',
  8: 'Dual commission',
};

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRandomCode() {
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

/**
 * Mints a unique 6-char coupon code for a new affiliate and writes it to the
 * affiliateCodes collection (doc ID == the code). Also checked against the
 * `handles/` registry so a generated code can never collide with an existing
 * expert's handle (which is itself a valid coupon) — an ambiguous checkout
 * lookup would always resolve the affiliateCodes match first, silently
 * shadowing that expert's coupon.
 *
 * A same-code collision on affiliateCodes itself is rejected by Firestore
 * rules as an unauthorized "update" to an existing doc (no update rule
 * exists there), so that half of the race is retried safely by construction.
 */
export async function createAffiliateCoupon(uid, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const code = generateRandomCode();
    const handleAvailable = await isHandleAvailable(code.toLowerCase(), null);
    if (!handleAvailable) continue; // collides with an existing expert handle — retry
    try {
      await setDoc(doc(db, 'affiliateCodes', code), {
        code,
        ownerId: uid,
        ownerRole: 'affiliate',
        createdAt: new Date().toISOString(),
      });
      return code;
    } catch (err) {
      if (i === attempts - 1) throw err;
    }
  }
  throw new Error('Could not generate a unique coupon code. Please try again.');
}

/**
 * Resolves a checkout/signup-time coupon code to its owner. Checks
 * affiliateCodes (uppercase match) first, then falls back to an expert's
 * handle (lowercase match). Mirrors the Admin SDK version in functions/index.js.
 * Returns { ownerId, ownerRole: 'affiliate' | 'expert' } or null.
 */
export async function resolveCouponCode(code) {
  if (!code) return null;
  const normalized = String(code).trim();
  if (!normalized) return null;

  const affSnap = await getDoc(doc(db, 'affiliateCodes', normalized.toUpperCase()));
  if (affSnap.exists()) {
    const d = affSnap.data();
    return { ownerId: d.ownerId, ownerRole: 'affiliate' };
  }

  // onboardingComplete must be filtered here, not just checked after the
  // fact — Firestore Security Rules validate a *query* is provably safe from
  // its own where() clauses alone (it won't run the query and then discard
  // results the rules would deny). The public-read rule for users/{uid} only
  // allows role=='expert' && onboardingComplete==true, so without this exact
  // filter Firestore rejects the whole query with permission-denied, even
  // for documents that would otherwise match.
  const q = query(
    collection(db, 'users'),
    where('handle', '==', normalized.toLowerCase()),
    where('role', '==', 'expert'),
    where('onboardingComplete', '==', true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return { ownerId: snap.docs[0].id, ownerRole: 'expert' };
  }
  return null;
}

// ─── Expert-side ────────────────────────────────────────────────────────────

/** Buyers who signed up via this expert's public profile link (lifetime). */
export async function getExpertReferrals(expertId) {
  const q = query(
    collection(db, 'users'),
    where('referredByExpertId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Commissions where this user was the seller (sellerAmount / sellingEarnings). */
export async function getSellerCommissions(sellerId) {
  const q = query(
    collection(db, 'commissions'),
    where('sellerId', '==', sellerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Affiliate-role earnings (Person A = lifetime onboarding, Person B = one-time coupon) ──

/** Commissions where this user earned the lifetime "onboarded this seller" bonus. */
export async function getPersonACommissions(uid) {
  const q = query(
    collection(db, 'commissions'),
    where('personAId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Commissions where this user's coupon (or profile link) brought a one-time sale. */
export async function getPersonBCommissions(uid) {
  const q = query(
    collection(db, 'commissions'),
    where('personBId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Combined affiliate-role commission history (both Person A and Person B roles), newest first. */
export async function getAffiliateRoleCommissions(uid) {
  const [asA, asB] = await Promise.all([getPersonACommissions(uid), getPersonBCommissions(uid)]);
  return [...asA, ...asB].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Experts this affiliate onboarded at signup (lifetime commission source). */
export async function getOnboardedExperts(affiliateId) {
  const q = query(
    collection(db, 'users'),
    where('onboardedByAffiliateId', '==', affiliateId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export async function getAllCommissions() {
  const q = query(collection(db, 'commissions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
