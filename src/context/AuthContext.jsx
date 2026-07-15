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

  async function signup(email, password, role = 'expert', additionalData = {}, signupContext = {}) {
    // Only experts claim a handle — it doubles as their public profile URL
    // and their coupon code. Affiliates have no public profile.
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
    // valid affiliate coupon at signup.
    const onboardedByAffiliateId = (role === 'expert' && resolvedCoupon?.ownerRole === 'affiliate')
      ? resolvedCoupon.ownerId
      : null;

    // referredByExpertId — set once, for life, from a coupon that resolved to
    // an expert's handle, or from the profile-link signup context if no
    // coupon was entered. The coupon wins if both are present. Never set if
    // the new user is that expert.
    const resolvedExpertId = resolvedCoupon?.ownerRole === 'expert' ? resolvedCoupon.ownerId : null;
    const linkExpertId = signupContext.expertId || null;
    const candidateExpertId = resolvedExpertId || linkExpertId;
    const referredByExpertId = (candidateExpertId && candidateExpertId !== user.uid) ? candidateExpertId : null;

    // Dedicated affiliates get their own coupon code minted before the user
    // doc is written, so users.couponCode always points at an existing
    // affiliateCodes doc.
    let ownCouponCode = null;
    if (role === 'affiliate') {
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
      ...(role === 'affiliate' ? { couponCode: ownCouponCode } : {}),
      ...(role === 'expert' || role === 'affiliate' ? { affiliateEarnings: 0, pendingPayout: 0 } : {}),
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
    return user;
  }

  async function login(email, password, expectedRole) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (expectedRole) {
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.role !== expectedRole) {
          await signOut(auth);
          throw new Error(`Access denied. This account belongs to the ${data.role} portal.`);
        }
        saveAccountToStorage(cred.user.uid, data.name, cred.user.email, data.role);
      }
    }
    return cred;
  }

  async function loginWithGoogle(expectedRole, signupContext = {}) {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const { user } = cred;
    const docRef = doc(db, 'users', user.uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.role !== expectedRole) {
        await signOut(auth);
        throw new Error(`This Google account is registered as a ${data.role}. Use the correct portal.`);
      }
      setUserRole(data.role);
      setUserData(data);
    } else {
      // Only experts claim a handle — affiliates have no public profile.
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
      const resolvedExpertId = resolvedCoupon?.ownerRole === 'expert' ? resolvedCoupon.ownerId : null;
      const linkExpertId = signupContext.expertId || null;
      const candidateExpertId = resolvedExpertId || linkExpertId;
      const referredByExpertId = (candidateExpertId && candidateExpertId !== user.uid) ? candidateExpertId : null;

      let ownCouponCode = null;
      if (expectedRole === 'affiliate') {
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
        ...(expectedRole === 'affiliate' ? { couponCode: ownCouponCode } : {}),
        ...(expectedRole === 'expert' || expectedRole === 'affiliate' ? { affiliateEarnings: 0, pendingPayout: 0 } : {}),
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
    }
    return cred;
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
        const data = snap.data();
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
