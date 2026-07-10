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
import { createAffiliateCode, lookupAffiliateCode } from '../services/affiliateService';
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
    const claimsHandle = ['expert', 'affiliate'].includes(role);
    const requestedHandle = additionalData.handle ? normalizeHandle(additionalData.handle) : '';

    // Pre-check before creating the Auth user, to avoid orphaned accounts on a doomed handle.
    if (claimsHandle && requestedHandle) {
      const { valid, reason } = validateHandleFormat(requestedHandle);
      if (!valid) throw new Error(reason);
      const available = await isHandleAvailable(requestedHandle, null);
      if (!available) throw new Error('That username is taken. Please choose another.');
    }

    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // Path B — resolve an entered affiliate coupon code, if any. A bad/typo'd
    // code never blocks signup, it just doesn't attach an affiliate.
    let resolvedAffiliateId = null;
    if (signupContext.couponCode) {
      try {
        resolvedAffiliateId = await lookupAffiliateCode(signupContext.couponCode);
      } catch (err) {
        console.error('Affiliate coupon lookup failed during signup:', err);
      }
    }

    // Dedicated affiliates get their own coupon code minted before the user
    // doc is written, so users.affiliateCode always points at an existing
    // affiliateCodes doc.
    let ownAffiliateCode = null;
    if (role === 'affiliate') {
      ownAffiliateCode = await createAffiliateCode(user.uid);
    }

    const userDoc = {
      uid: user.uid,
      email: user.email,
      role,
      name: additionalData.name || '',
      onboardingComplete: role !== 'expert',
      createdAt: new Date().toISOString(),
      // Path A — set once, for life, when this user signed up via an
      // expert's public profile link. Never set if they are that expert.
      referredByExpertId: (signupContext.expertId && signupContext.expertId !== user.uid) ? signupContext.expertId : null,
      // Path B — set once, for life, if a valid affiliate coupon was entered at signup.
      affiliateId: resolvedAffiliateId,
      // Only present on dedicated affiliate accounts — their own coupon.
      affiliateCode: role === 'affiliate' ? ownAffiliateCode : null,
      affiliateEarnings: 0,
      pendingPayout: 0,
      ...additionalData,
      // Never persist the raw, unclaimed handle here — claimHandle() below is
      // the only code path allowed to write `handle`, so users.handle can
      // never diverge from (or exist without) a matching handles/ registry doc.
      handle: '',
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    if (claimsHandle && requestedHandle) {
      try {
        const claimed = await claimHandle({ uid: user.uid, role, oldHandle: null, newHandle: requestedHandle, syncReferralCode: true });
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
      const claimsHandle = ['expert', 'affiliate'].includes(expectedRole);
      const fallbackHandle = user.displayName
        ? normalizeHandle(user.displayName) + Math.floor(Math.random() * 1000)
        : '';

      let resolvedAffiliateId = null;
      if (signupContext.couponCode) {
        try {
          resolvedAffiliateId = await lookupAffiliateCode(signupContext.couponCode);
        } catch (err) {
          console.error('Affiliate coupon lookup failed during Google signup:', err);
        }
      }

      let ownAffiliateCode = null;
      if (expectedRole === 'affiliate') {
        ownAffiliateCode = await createAffiliateCode(user.uid);
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
        referredByExpertId: (signupContext.expertId && signupContext.expertId !== user.uid) ? signupContext.expertId : null,
        affiliateId: resolvedAffiliateId,
        affiliateCode: expectedRole === 'affiliate' ? ownAffiliateCode : null,
        affiliateEarnings: 0,
        pendingPayout: 0,
      };
      await setDoc(docRef, userDoc);

      if (claimsHandle && fallbackHandle) {
        try {
          const claimed = await claimHandle({ uid: user.uid, role: expectedRole, oldHandle: null, newHandle: fallbackHandle, syncReferralCode: true });
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
    <AuthContext.Provider value={{ currentUser, userRole, userData, signup, login, loginWithGoogle, logout, refreshUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
