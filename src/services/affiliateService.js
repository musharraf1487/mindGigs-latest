/**
 * affiliateService.js
 * Core engine for the 4-scenario commission model.
 *
 * Path A — expert profile-link referral (tracked via users.referredByExpertId):
 *   Same expert buys back:      expert 80% (70 sell + 10 referral) | mindGigs 20%
 *   Different expert:           selling expert 70% | referring expert 10% | mindGigs 20%
 *
 * Path B — dedicated affiliate coupon (tracked via users.affiliateId):
 *   expert 70% | affiliate 10% | mindGigs 20%
 *
 * No referral, no coupon:       expert 70% | mindGigs 30%
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
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateAffiliateCode() {
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

/**
 * Mints a unique 6-char coupon code for a new affiliate and writes it to the
 * affiliateCodes collection (doc ID == the code). A collision is rejected by
 * Firestore rules as an unauthorized "update" to an existing doc, so this
 * retries with a fresh code on failure.
 */
export async function createAffiliateCode(uid, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const code = generateAffiliateCode();
    try {
      await setDoc(doc(db, 'affiliateCodes', code), {
        code,
        affiliateId: uid,
        createdAt: new Date().toISOString(),
      });
      return code;
    } catch (err) {
      if (i === attempts - 1) throw err;
    }
  }
}

/** Returns the affiliateId that owns `code`, or null if the code doesn't exist. */
export async function lookupAffiliateCode(code) {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const snap = await getDoc(doc(db, 'affiliateCodes', trimmed));
  return snap.exists() ? (snap.data().affiliateId || null) : null;
}

// ─── Expert-side: buyers this expert referred via their profile link ──────────

export async function getExpertReferrals(expertId) {
  const q = query(
    collection(db, 'users'),
    where('referredByExpertId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Commissions where this expert was the selling expert (expertAmount). */
export async function getExpertCommissions(expertId) {
  const q = query(
    collection(db, 'commissions'),
    where('expertId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Commissions where this expert earned the scenario-3 referral bonus (referrerAmount). */
export async function getExpertReferralCommissions(expertId) {
  const q = query(
    collection(db, 'commissions'),
    where('referrerId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getExpertAffiliateStats(expertId) {
  const [referrals, sellingCommissions, referralCommissions] = await Promise.all([
    getExpertReferrals(expertId),
    getExpertCommissions(expertId),
    getExpertReferralCommissions(expertId),
  ]);

  const sellingEarnings = sellingCommissions.reduce((s, c) => s + (c.expertAmount || 0), 0);
  const referralEarnings = referralCommissions.reduce((s, c) => s + (c.referrerAmount || 0), 0);
  const pendingCount = [...sellingCommissions, ...referralCommissions].filter(c => c.status === 'pending').length;

  return {
    referralCount: referrals.length,
    sellingEarnings,   // cents, earned as the selling expert
    referralEarnings,  // cents, earned as the referring expert (scenario 3 bonus)
    totalEarned: sellingEarnings + referralEarnings,
    pendingCount,
    referrals,
    sellingCommissions,
    referralCommissions,
  };
}

// ─── Affiliate-side: buyers who used this affiliate's coupon ──────────────────

export async function getAffiliateReferredUsers(affiliateId) {
  const q = query(
    collection(db, 'users'),
    where('affiliateId', '==', affiliateId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAffiliateCommissions(affiliateId) {
  const q = query(
    collection(db, 'commissions'),
    where('affiliateId', '==', affiliateId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export async function getAllCommissions() {
  const q = query(collection(db, 'commissions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
