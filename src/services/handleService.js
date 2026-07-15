/**
 * handleService.js
 * Enforces unique usernames ("handles") across all users, backed by a
 * dedicated `handles/{handle}` registry collection (see firestore.rules —
 * a direct query-based uniqueness check isn't possible given the `users`
 * collection's per-role read rules).
 *
 * An expert's handle also doubles as their public vanity URL
 * (mindgigs.com/{handle}) and their referral/coupon code.
 */

import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export const RESERVED_HANDLES = new Set([
  // App.jsx page names — must never be shadowed by a user handle
  'home', 'landingboard', 'login', 'signup', 'onboarding', 'experts',
  'public-profile', 'booking', 'expert-dashboard', 'admin-dashboard',
  'affiliate-dashboard', 'client-dashboard',
  // General reserved words
  'admin', 'api', 'dashboard', 'assets', 'www', 'mindgigs', 'settings',
  'help', 'support', 'terms', 'privacy', 'pricing', 'blog', 'ref',
]);

export function normalizeHandle(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function validateHandleFormat(rawHandle) {
  const handle = normalizeHandle(rawHandle);
  if (handle.length < 3) return { valid: false, reason: 'Username must be at least 3 characters.' };
  if (handle.length > 30) return { valid: false, reason: 'Username must be 30 characters or fewer.' };
  if (!/^[a-z]/.test(handle)) return { valid: false, reason: 'Username must start with a letter.' };
  if (RESERVED_HANDLES.has(handle)) return { valid: false, reason: 'That username is reserved. Please choose another.' };
  return { valid: true, handle };
}

/** UX pre-check only — the real collision guard is claimHandle's atomic create. */
export async function isHandleAvailable(handle, currentUid) {
  const snap = await getDoc(doc(db, 'handles', handle));
  if (!snap.exists()) return true;
  return snap.data()?.uid === currentUid;
}

/**
 * Atomically claims a handle for a user: deletes their old handle doc (if
 * changed), creates the new one, and updates their users doc's `handle`
 * field — this is the ONLY code path that should ever write `handle` on a
 * users doc, so it can never diverge from the `handles/` registry.
 *
 * An expert's handle doubles as their coupon code directly — there is no
 * separate field to keep in sync.
 *
 * Throws if the new handle is already claimed by someone else (Firestore
 * rule denies the create), which callers should surface as "username taken."
 */
export async function claimHandle({ uid, role, oldHandle, newHandle }) {
  const { valid, reason, handle } = validateHandleFormat(newHandle);
  if (!valid) throw new Error(reason);

  const normalizedOld = oldHandle ? normalizeHandle(oldHandle) : null;
  if (normalizedOld === handle) return handle; // no-op, unchanged

  const batch = writeBatch(db);
  if (normalizedOld) {
    batch.delete(doc(db, 'handles', normalizedOld));
  }
  batch.set(doc(db, 'handles', handle), {
    uid,
    role,
    createdAt: new Date().toISOString(),
  });
  batch.update(doc(db, 'users', uid), { handle });

  try {
    await batch.commit();
  } catch (err) {
    throw new Error('That username is taken. Please choose another.');
  }
  return handle;
}
