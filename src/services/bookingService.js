/**
 * bookingService.js
 * Firestore CRUD for the `bookings` collection.
 *
 * Booking schema:
 * {
 *   id            : string  (Firestore doc ID)
 *   expertId      : string
 *   clientId      : string
 *   expertName    : string
 *   clientName    : string
 *   date          : string  (e.g. "Mar 22")
 *   time          : string  (e.g. "10:00 AM")
 *   sessionTitle  : string
 *   price         : number  (in cents, e.g. 25000 = $250)
 *   status        : "pending" | "confirmed" | "cancelled"
 *   paymentStatus : "unpaid" | "paid"
 *   createdAt     : ISO string
 * }
 */

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const BOOKINGS = 'bookings';

// ─── CREATE ──────────────────────────────────────────────────────────────────

/**
 * Creates a new booking document with status "pending" / "unpaid".
 * Returns the newly created document ID.
 */
export async function createBooking({
  expertId,
  clientId,
  expertName,
  clientName,
  date,
  time,
  sessionTitle,
  price,           // number in cents
  clientEmail,
  referralCode,
}) {
  const docRef = await addDoc(collection(db, BOOKINGS), {
    expertId,
    clientId,
    expertName,
    clientName,
    date,
    time,
    sessionTitle,
    price,
    clientEmail,
    referralCode: referralCode || null,
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString(),
  });

  return docRef.id;
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a single booking by ID.
 * Returns null if not found.
 */
export async function getBooking(bookingId) {
  const snap = await getDoc(doc(db, BOOKINGS, bookingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Fetches all bookings for a client (ordered newest first).
 */
export async function getClientBookings(clientId) {
  const q = query(
    collection(db, BOOKINGS),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetches all bookings for an expert (ordered newest first).
 */
export async function getExpertBookings(expertId) {
  const q = query(
    collection(db, BOOKINGS),
    where('expertId', '==', expertId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Marks a booking as confirmed + paid.
 * Called after successful Stripe payment (also called by the webhook).
 */
export async function confirmBookingPayment(bookingId) {
  await updateDoc(doc(db, BOOKINGS, bookingId), {
    status: 'confirmed',
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
  });
}

/**
 * Cancels a booking.
 */
export async function cancelBooking(bookingId) {
  await updateDoc(doc(db, BOOKINGS, bookingId), {
    status: 'cancelled',
  });
}
