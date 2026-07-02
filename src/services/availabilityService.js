import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const ALL_TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
  '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
];

export const DEFAULT_WORKDAY_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM',
  '2:00 PM', '3:00 PM', '4:00 PM',
];

export async function saveWeeklyAvailability(expertId, weeklySlots) {
  await updateDoc(doc(db, 'users', expertId), {
    'availability.weeklySlots': weeklySlots,
  });
}

export async function getExpertAvailability(expertId) {
  const snap = await getDoc(doc(db, 'users', expertId));
  if (!snap.exists()) return null;
  return snap.data().availability || null;
}

/**
 * Given a bookings array (already fetched), build a map of
 * dateStr → Set of booked time strings for non-cancelled bookings.
 */
export function buildTakenSlotsMap(bookings) {
  const taken = {};
  bookings
    .filter(b => b.status !== 'cancelled')
    .forEach(b => {
      if (b.date && b.time) {
        if (!taken[b.date]) taken[b.date] = new Set();
        taken[b.date].add(b.time);
      }
    });
  return taken;
}

/**
 * Returns available time slots for a given date, factoring in the
 * expert's weeklySlots and already-booked slots.
 *
 * @param {number} dayOfMonth  Day number (1-31)
 * @param {number} year
 * @param {number} monthIndex  0-indexed month
 * @param {string} monthName   e.g. 'Jul'
 * @param {object|null} weeklySlots  expert.availability.weeklySlots
 * @param {object} takenSlots  { dateStr: Set<string> }
 */
export function getAvailableTimesForDay(dayOfMonth, year, monthIndex, monthName, weeklySlots, takenSlots) {
  const dow = new Date(year, monthIndex, dayOfMonth).getDay(); // 0=Sun
  const dateStr = `${monthName} ${dayOfMonth}`;
  const booked = takenSlots[dateStr] || new Set();

  let slots;
  if (weeklySlots && weeklySlots[String(dow)] !== undefined) {
    slots = weeklySlots[String(dow)] || [];
  } else {
    // Fallback: Mon-Fri 9-5 when no availability configured
    slots = (dow !== 0 && dow !== 6) ? DEFAULT_WORKDAY_SLOTS : [];
  }

  return slots.filter(t => !booked.has(t));
}

/**
 * Returns the set of available day-of-month numbers for the current month
 * (only future days that have at least one open slot).
 */
export function getAvailableDaysInMonth(todayDate, daysInMonth, year, monthIndex, monthName, weeklySlots, takenSlots) {
  const result = [];
  for (let d = todayDate + 1; d <= daysInMonth; d++) {
    const times = getAvailableTimesForDay(d, year, monthIndex, monthName, weeklySlots, takenSlots);
    if (times.length > 0) result.push(d);
  }
  return result;
}

/**
 * Parses a booking's stored date + time strings into a JS Date.
 * Returns null if unparseable.
 */
export function parseSessionDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const year = new Date().getFullYear();
  const dt = new Date(`${dateStr}, ${year} ${timeStr}`);
  if (isNaN(dt.getTime())) return null;
  // Handle year-end: if session is >30 days in the past, assume next year
  if (Date.now() - dt.getTime() > 30 * 24 * 60 * 60 * 1000) {
    return new Date(`${dateStr}, ${year + 1} ${timeStr}`);
  }
  return dt;
}

/**
 * Returns true if the "Join Session" button should be shown.
 * Window: 15 minutes before start → 90 minutes after start.
 */
export function isSessionJoinable(booking, currentTime = Date.now()) {
  if (booking.status !== 'confirmed' || !booking.dailyRoomUrl) return false;
  const sessionTime = parseSessionDateTime(booking.date, booking.time);
  if (!sessionTime) return false;
  const openAt  = sessionTime.getTime() - 15 * 60 * 1000;
  const closeAt = sessionTime.getTime() + 90 * 60 * 1000;
  return currentTime >= openAt && currentTime <= closeAt;
}
