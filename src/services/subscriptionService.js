/**
 * subscriptionService.js
 * Firestore reads for the `subscriptions` collection.
 * Docs are only ever written by the stripeWebhook Cloud Function
 * (saleType === 'subscription').
 *
 * Subscription schema:
 * {
 *   id                   : string  (Firestore doc ID)
 *   buyerId              : string | null
 *   buyerEmail           : string | null
 *   expertId             : string | null
 *   expertName           : string | null
 *   itemTitle            : string  (plan name)
 *   price                : number  (in cents, per month)
 *   status               : 'active' | 'cancelled'
 *   stripeSessionId      : string
 *   stripeSubscriptionId : string | null
 *   createdAt            : ISO string
 * }
 */

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const SUBSCRIPTIONS = 'subscriptions';

/**
 * Fetches all subscriptions a client has signed up for (ordered newest first).
 */
export async function getClientSubscriptions(buyerId) {
  const q = query(
    collection(db, SUBSCRIPTIONS),
    where('buyerId', '==', buyerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetches all subscriptions to an expert's plans (ordered newest first).
 */
export async function getExpertSubscriptions(expertId) {
  const q = query(
    collection(db, SUBSCRIPTIONS),
    where('expertId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
