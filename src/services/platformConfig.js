/**
 * platformConfig.js
 * Reads and writes the global platform configuration document.
 *
 * Firestore path: config/platform
 *
 * Schema:
 * {
 *   commissionRate  : number   (e.g. 20 = 20%)
 *   affiliateRate   : number   (e.g. 15 = 15%)
 *   minPayout       : number   (e.g. 50 = $50)
 *   features: {
 *     'Affiliate Program'     : boolean,
 *     'Digital Products'      : boolean,
 *     'Subscriptions'         : boolean,
 *     'Expert Verification'   : boolean,
 *     'Public Marketplace'    : boolean,
 *   }
 * }
 */

import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const CONFIG_REF = () => doc(db, 'config', 'platform');

export const DEFAULT_CONFIG = {
  commissionRate: 20,
  affiliateRate: 15,
  minPayout: 50,
  features: {
    'Affiliate Program': true,
    'Digital Products': true,
    'Subscriptions': true,
    'Expert Verification': true,
    'Public Marketplace': true,
  },
};

/** Fetch config once */
export async function getPlatformConfig() {
  const snap = await getDoc(CONFIG_REF());
  if (!snap.exists()) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...snap.data() };
}

/** Save full config (merge) */
export async function savePlatformConfig(updates) {
  await setDoc(CONFIG_REF(), updates, { merge: true });
}

/** Subscribe to live config changes */
export function subscribePlatformConfig(callback) {
  return onSnapshot(CONFIG_REF(), (snap) => {
    if (snap.exists()) {
      callback({ ...DEFAULT_CONFIG, ...snap.data() });
    } else {
      callback(DEFAULT_CONFIG);
    }
  });
}
