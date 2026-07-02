import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { saveAccountToStorage } from '../components/common/AccountSwitcher';
import {
  generateReferralCode,
  processSignupReferral,
  getStoredReferralCode,
  clearReferralCode,
} from '../services/affiliateService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, role = 'expert', additionalData = {}) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    const referralCode = role === 'expert' ? generateReferralCode({ ...additionalData, uid: user.uid }) : null;

    const userDoc = {
      uid: user.uid,
      email: user.email,
      role,
      name: additionalData.name || '',
      handle: additionalData.handle || '',
      onboardingComplete: role !== 'expert',
      createdAt: new Date().toISOString(),
      referralCode: referralCode || null,
      referredBy: null,
      tier: role === 'expert' ? 1 : null,
      affiliateEarnings: 0,
      pendingPayout: 0,
      ...additionalData,
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    // Process referral if user arrived via a referral link
    const storedCode = getStoredReferralCode();
    if (storedCode) {
      await processSignupReferral(user.uid, user.email, role, storedCode);
      clearReferralCode();
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

  async function loginWithGoogle(expectedRole) {
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
      const handle = user.displayName
        ? user.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000)
        : '';
      const referralCode = expectedRole === 'expert' ? generateReferralCode({ name: user.displayName, uid: user.uid }) : null;
      const userDoc = {
        uid: user.uid,
        email: user.email,
        role: expectedRole,
        name: user.displayName || '',
        handle,
        onboardingComplete: expectedRole !== 'expert',
        createdAt: new Date().toISOString(),
        image: user.photoURL || '',
        referralCode: referralCode || null,
        referredBy: null,
        tier: expectedRole === 'expert' ? 1 : null,
        affiliateEarnings: 0,
        pendingPayout: 0,
      };
      await setDoc(docRef, userDoc);

      const storedCode = getStoredReferralCode();
      if (storedCode) {
        await processSignupReferral(user.uid, user.email, expectedRole, storedCode);
        clearReferralCode();
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
