/**
 * reviewService.js
 * Firestore CRUD for the `reviews` collection.
 *
 * Review schema:
 * {
 *   id          : string  (Firestore doc ID)
 *   expertId    : string
 *   clientId    : string
 *   clientName  : string
 *   bookingId   : string
 *   rating      : number  (1-5)
 *   text        : string
 *   createdAt   : ISO string
 * }
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const REVIEWS = 'reviews';

/**
 * Submits a review for an expert after a completed session.
 * Returns the new review document ID.
 */
export async function submitReview({ expertId, clientId, clientName, bookingId, rating, text }) {
  const docRef = await addDoc(collection(db, REVIEWS), {
    expertId,
    clientId,
    clientName,
    bookingId,
    rating,
    text,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Fetches all reviews for a given expert, newest first.
 */
export async function getExpertReviews(expertId) {
  const q = query(
    collection(db, REVIEWS),
    where('expertId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Checks whether a client has already reviewed a specific booking.
 */
export async function hasReviewedBooking(bookingId, clientId) {
  const q = query(
    collection(db, REVIEWS),
    where('bookingId', '==', bookingId),
    where('clientId', '==', clientId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
