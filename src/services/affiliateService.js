/**
 * affiliateService.js
 * Core engine for the two-tier affiliate program.
 *
 * Tier 1 — client books via expert's referral link directly:
 *   Expert: 80%  |  mindGigs: 20%
 *
 * Tier 2 — a 2nd-tier affiliate (who signed up via expert's link) refers a buyer:
 *   Expert: 70%  |  Affiliate: 5%  |  mindGigs: 25%
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const REFERRAL_KEY = 'mg_ref';

// ─── localStorage helpers ─────────────────────────────────────────────────────

export function captureReferralCode(code) {
  if (code) localStorage.setItem(REFERRAL_KEY, code);
}

export function getStoredReferralCode() {
  return localStorage.getItem(REFERRAL_KEY) || null;
}

export function clearReferralCode() {
  localStorage.removeItem(REFERRAL_KEY);
}

// ─── Code generation ──────────────────────────────────────────────────────────

export function generateReferralCode(user) {
  const base = user?.handle || user?.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  return base ? base.slice(0, 12) : (user?.uid || '').slice(0, 8);
}

// ─── Signup referral ──────────────────────────────────────────────────────────

/**
 * Called after a new user signs up via a referral link.
 * Looks up who owns the code, writes a referral doc, and tags the new user.
 */
export async function processSignupReferral(newUserId, newUserEmail, newUserRole, referralCode) {
  if (!referralCode || !newUserId) return;
  try {
    // Find the expert who owns this referral code
    const q = query(collection(db, 'users'), where('referralCode', '==', referralCode));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const expertDoc = snap.docs[0];
    const expertId = expertDoc.id;
    if (expertId === newUserId) return; // can't refer yourself

    // Write referral record
    await addDoc(collection(db, 'referrals'), {
      referralCode,
      expertId,
      referredUserId: newUserId,
      referredUserEmail: newUserEmail,
      referredRole: newUserRole,
      createdAt: new Date().toISOString(),
      status: 'active',
    });

    // Tag the new user with who referred them and set tier 2
    await updateDoc(doc(db, 'users', newUserId), {
      referredBy: expertId,
      tier: 2,
    });
  } catch (err) {
    console.error('[affiliateService] processSignupReferral error:', err);
  }
}

// ─── Commission calculation ───────────────────────────────────────────────────

/**
 * Called after a confirmed payment.
 * Determines tier, calculates split, writes commission doc,
 * and increments earnings on relevant user docs atomically.
 */
export async function processCommission({ bookingId, saleType = 'booking', saleAmount, expertId, referralCode }) {
  if (!bookingId || !saleAmount || !expertId) return;
  try {
    let affiliateId = null;
    let tier = 1;

    if (referralCode) {
      // Check if the buyer themselves was referred by someone (tier 2 chain)
      // Find who owns this referral code
      const codeQ = query(collection(db, 'users'), where('referralCode', '==', referralCode));
      const codeSnap = await getDocs(codeQ);

      if (!codeSnap.empty) {
        const codeOwner = codeSnap.docs[0];
        // If codeOwner is a tier-2 affiliate (i.e. they themselves were referred)
        if (codeOwner.data().tier === 2 && codeOwner.data().referredBy === expertId) {
          affiliateId = codeOwner.id;
          tier = 2;
        }
      }
    }

    // Calculate split (amounts in cents)
    let expertAmount, affiliateAmount, platformAmount;
    if (tier === 2 && affiliateId) {
      expertAmount = Math.round(saleAmount * 0.70);
      affiliateAmount = Math.round(saleAmount * 0.05);
      platformAmount = saleAmount - expertAmount - affiliateAmount;
    } else {
      expertAmount = Math.round(saleAmount * 0.80);
      affiliateAmount = 0;
      platformAmount = saleAmount - expertAmount;
    }

    // Write commission record
    await addDoc(collection(db, 'commissions'), {
      bookingId,
      saleType,
      saleAmount,
      expertId,
      expertAmount,
      affiliateId: affiliateId || null,
      affiliateAmount,
      platformAmount,
      tier,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Update expert earnings atomically
    await updateDoc(doc(db, 'users', expertId), {
      affiliateEarnings: increment(expertAmount),
      pendingPayout: increment(expertAmount),
    });

    // Update tier-2 affiliate earnings atomically
    if (affiliateId && affiliateAmount > 0) {
      await updateDoc(doc(db, 'users', affiliateId), {
        affiliateEarnings: increment(affiliateAmount),
        pendingPayout: increment(affiliateAmount),
      });
    }

    // Mark booking as commission processed
    await updateDoc(doc(db, 'bookings', bookingId), {
      commissionPaid: true,
      affiliateTier: tier,
    });
  } catch (err) {
    console.error('[affiliateService] processCommission error:', err);
  }
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function getExpertCommissions(expertId) {
  const q = query(
    collection(db, 'commissions'),
    where('expertId', '==', expertId),
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

export async function getExpertReferrals(expertId) {
  const q = query(
    collection(db, 'referrals'),
    where('expertId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getExpertAffiliateStats(expertId) {
  const [referrals, commissions] = await Promise.all([
    getExpertReferrals(expertId),
    getExpertCommissions(expertId),
  ]);

  const totalEarned = commissions.reduce((s, c) => s + (c.expertAmount || 0), 0);
  const pendingCount = commissions.filter(c => c.status === 'pending').length;

  return {
    referralCount: referrals.length,
    totalEarned,       // in cents
    pendingCount,
    referrals,
    commissions,
  };
}

export async function getAllCommissions() {
  const q = query(collection(db, 'commissions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
