import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { saveAccountToStorage } from '../components/common/AccountSwitcher';
import { createAffiliateCoupon, resolveCouponCode } from '../services/affiliateService';
import { claimHandle, validateHandleFormat, isHandleAvailable, normalizeHandle } from '../services/handleService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, requestedRole = 'expert', additionalData = {}, signupContext = {}) {
    // The standalone `affiliate` role was merged into `client` — every client
    // account carries referral capability now. Anything still asking for an
    // affiliate signup (stale history state, an old bookmark) becomes a client
    // rather than minting an account for a portal that no longer exists.
    const role = requestedRole === 'affiliate' ? 'client' : requestedRole;

    // Only experts claim a handle — it doubles as their public profile URL
    // and their coupon code. Clients have no public profile; their referral
    // code is the generated one minted below.
    const claimsHandle = role === 'expert';
    const requestedHandle = additionalData.handle ? normalizeHandle(additionalData.handle) : '';

    // Pre-check before creating the Auth user, to avoid orphaned accounts on a doomed handle.
    if (claimsHandle && requestedHandle) {
      const { valid, reason } = validateHandleFormat(requestedHandle);
      if (!valid) throw new Error(reason);
      const available = await isHandleAvailable(requestedHandle, null);
      if (!available) throw new Error('That username is taken. Please choose another.');
    }

    // Resolve an entered coupon code (expert handle or affiliate code) before
    // creating the Auth user too — an invalid code blocks signup rather than
    // silently failing after an account already exists.
    let resolvedCoupon = null;
    if (signupContext.couponCode) {
      resolvedCoupon = await resolveCouponCode(signupContext.couponCode);
      if (!resolvedCoupon) throw new Error('That coupon code was not recognized.');
    }

    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // Person A — set once, for life, only for a new EXPERT onboarded via a
    // valid affiliate coupon at signup. `ownerRole === 'affiliate'` is a CODE
    // TYPE ("generated non-expert coupon"), not the owner's user role — since
    // the merge those codes belong to client accounts.
    const onboardedByAffiliateId = (role === 'expert' && resolvedCoupon?.ownerRole === 'affiliate')
      ? resolvedCoupon.ownerId
      : null;

    // referredByExpertId — set once, for life, from a coupon that resolved to
    // an expert's handle, or from the profile-link signup context if no
    // coupon was entered. The coupon wins if both are present. Never set if
    // the new user is that expert.
    //
    // EXPERT SIGNUPS ONLY. Lifetime attribution is the reward for onboarding a
    // seller, never for bringing in a buyer — a buyer is not tied to whoever
    // referred them for the rest of their life. Whoever brings in a buyer
    // (client or expert alike) earns only when their coupon is used at
    // checkout, one sale at a time.
    const resolvedExpertId = resolvedCoupon?.ownerRole === 'expert' ? resolvedCoupon.ownerId : null;
    const linkExpertId = signupContext.expertId || null;
    const candidateExpertId = role === 'expert' ? (resolvedExpertId || linkExpertId) : null;
    const referredByExpertId = (candidateExpertId && candidateExpertId !== user.uid) ? candidateExpertId : null;

    // Every client gets a referral code minted before the user doc is written,
    // so users.couponCode always points at an existing affiliateCodes doc.
    // (Experts don't need one — their handle is already their coupon.)
    let ownCouponCode = null;
    if (role === 'client') {
      ownCouponCode = await createAffiliateCoupon(user.uid);
    }

    const userDoc = {
      uid: user.uid,
      email: user.email,
      role,
      name: additionalData.name || '',
      onboardingComplete: role !== 'expert',
      createdAt: new Date().toISOString(),
      referredByExpertId,
      ...(role === 'expert' ? { onboardedByAffiliateId, sellingEarnings: 0 } : {}),
      ...(role === 'client' ? { couponCode: ownCouponCode } : {}),
      ...(role === 'expert' || role === 'client' ? { affiliateEarnings: 0, pendingPayout: 0 } : {}),
      ...additionalData,
      // Never persist the raw, unclaimed handle here — claimHandle() below is
      // the only code path allowed to write `handle`, so users.handle can
      // never diverge from (or exist without) a matching handles/ registry doc.
      handle: '',
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    if (claimsHandle && requestedHandle) {
      try {
        const claimed = await claimHandle({ uid: user.uid, role, oldHandle: null, newHandle: requestedHandle });
        userDoc.handle = claimed;
      } catch (err) {
        console.error('Handle claim failed after signup:', err);
      }
    }

    setUserData(userDoc);
    setUserRole(role);
    saveAccountToStorage(user.uid, userDoc.name, user.email, role);
    return { user, userDoc };
  }

  // An account left on the retired `affiliate` role (missed by
  // scripts/mergeAffiliatesIntoClients.js, or created before it ran) is treated
  // as a client rather than bounced — the affiliate portal it points at no
  // longer exists, so rejecting the login would lock the user out entirely.
  function effectiveRole(role) {
    return role === 'affiliate' ? 'client' : role;
  }

  // `expectedRole` is optional and normally omitted — the login form is shared
  // by every kind of account and routes on whatever role the credentials turn
  // out to carry. Pass one only to pin a login to a specific role.
  async function login(email, password, expectedRole) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (snap.exists()) {
      const data = snap.data();
      if (expectedRole && effectiveRole(data.role) !== effectiveRole(expectedRole)) {
        await signOut(auth);
        throw new Error(`Access denied. This account belongs to the ${data.role} portal.`);
      }
      // Runs whether or not a role was expected, so the saved-accounts list in
      // AccountSwitcher stays populated on the shared login form too.
      saveAccountToStorage(cred.user.uid, data.name, cred.user.email, effectiveRole(data.role));
    }
    return cred;
  }

  async function loginWithGoogle(requestedRole, signupContext = {}) {
    const expectedRole = effectiveRole(requestedRole);
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const { user } = cred;
    const docRef = doc(db, 'users', user.uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (expectedRole && effectiveRole(data.role) !== expectedRole) {
        await signOut(auth);
        throw new Error(`This Google account is registered as a ${data.role}. Use the correct portal.`);
      }
      const normalized = { ...data, role: effectiveRole(data.role) };
      setUserRole(normalized.role);
      setUserData(normalized);
      saveAccountToStorage(user.uid, normalized.name, user.email, normalized.role);
      return { cred, userDoc: normalized, isNewAccount: false };
    } else {
      // Called from the shared login form (no role given) by someone with no
      // account yet. Creating one here would have to guess expert vs client, so
      // send them to signup — which asks — rather than silently picking.
      if (!expectedRole) {
        await signOut(auth);
        throw new Error('No mindGigs account found for that Google account. Please sign up first.');
      }
      // Only experts claim a handle — clients have no public profile.
      const claimsHandle = expectedRole === 'expert';
      const fallbackHandle = user.displayName
        ? normalizeHandle(user.displayName) + Math.floor(Math.random() * 1000)
        : '';

      // Google sign-in is a one-click flow with no separate "submit" step to
      // block, so (unlike signup()) a bad/typo'd coupon here doesn't abort —
      // it just doesn't attach anything, same resilience as the fallback
      // handle claim below.
      let resolvedCoupon = null;
      if (signupContext.couponCode) {
        try {
          resolvedCoupon = await resolveCouponCode(signupContext.couponCode);
        } catch (err) {
          console.error('Coupon lookup failed during Google signup:', err);
        }
      }

      const onboardedByAffiliateId = (expectedRole === 'expert' && resolvedCoupon?.ownerRole === 'affiliate')
        ? resolvedCoupon.ownerId
        : null;
      // Expert signups only — see the matching note in signup(). A buyer is
      // never tied to a referrer for life; that channel is checkout coupons.
      const resolvedExpertId = resolvedCoupon?.ownerRole === 'expert' ? resolvedCoupon.ownerId : null;
      const linkExpertId = signupContext.expertId || null;
      const candidateExpertId = expectedRole === 'expert' ? (resolvedExpertId || linkExpertId) : null;
      const referredByExpertId = (candidateExpertId && candidateExpertId !== user.uid) ? candidateExpertId : null;

      let ownCouponCode = null;
      if (expectedRole === 'client') {
        ownCouponCode = await createAffiliateCoupon(user.uid);
      }

      const userDoc = {
        uid: user.uid,
        email: user.email,
        role: expectedRole,
        name: user.displayName || '',
        // Never persist the raw, unclaimed fallback handle — claimHandle()
        // below is the only code path allowed to write `handle`.
        handle: '',
        onboardingComplete: expectedRole !== 'expert',
        createdAt: new Date().toISOString(),
        image: user.photoURL || '',
        referredByExpertId,
        ...(expectedRole === 'expert' ? { onboardedByAffiliateId, sellingEarnings: 0 } : {}),
        ...(expectedRole === 'client' ? { couponCode: ownCouponCode } : {}),
        ...(expectedRole === 'expert' || expectedRole === 'client' ? { affiliateEarnings: 0, pendingPayout: 0 } : {}),
      };
      await setDoc(docRef, userDoc);

      if (claimsHandle && fallbackHandle) {
        try {
          const claimed = await claimHandle({ uid: user.uid, role: expectedRole, oldHandle: null, newHandle: fallbackHandle });
          userDoc.handle = claimed;
        } catch (err) {
          console.error('Handle claim failed after Google signup:', err);
        }
      }

      setUserRole(expectedRole);
      setUserData(userDoc);
      saveAccountToStorage(user.uid, userDoc.name, user.email, expectedRole);
      return { cred, userDoc, isNewAccount: true };
    }
  }

  function logout() {
    setCurrentUser(null);
    setUserData(null);
    setUserRole(null);
    return signOut(auth).catch(() => {});
  }

  async function fetchUserData(uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        // Normalize a legacy `affiliate` doc to `client` for the whole app —
        // routing, dashboards and AccountSwitcher all switch on userData.role,
        // and there is no affiliate portal left for it to point at.
        const data = { ...snap.data(), role: effectiveRole(snap.data().role) };
        setUserRole(data.role);
        setUserData(data);
        saveAccountToStorage(uid, data.name, auth.currentUser?.email || data.email, data.role);
      } else {
        setUserRole(null);
        setUserData(null);
      }
    } catch {
      // silently handle — user will see login screen
    }
  }

  async function refreshUserData() {
    if (currentUser?.uid) await fetchUserData(currentUser.uid);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await fetchUserData(user.uid);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userData, authLoading: loading, signup, login, loginWithGoogle, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}
