/**
 * purchaseService.js
 * Firestore reads for the `purchases` collection.
 * Docs are only ever written by the stripeWebhook Cloud Function.
 *
 * Purchase schema:
 * {
 *   id            : string  (Firestore doc ID)
 *   buyerId       : string | null
 *   buyerEmail    : string | null
 *   expertId      : string | null
 *   itemTitle     : string
 *   deliveryLink  : string | null
 *   price         : number  (in cents)
 *   stripeSessionId : string
 *   createdAt     : ISO string
 * }
 */

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const PURCHASES = 'purchases';

/**
 * Fetches all purchases made by a client (ordered newest first).
 */
export async function getClientPurchases(buyerId) {
  const q = query(
    collection(db, PURCHASES),
    where('buyerId', '==', buyerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetches all purchases of an expert's items (ordered newest first).
 */
export async function getExpertPurchases(expertId) {
  const q = query(
    collection(db, PURCHASES),
    where('expertId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
