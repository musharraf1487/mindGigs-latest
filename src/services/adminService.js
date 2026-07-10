/**
 * adminService.js
 * Calls the Firebase Cloud Function that performs privileged admin actions
 * (Admin SDK operations Firestore security rules can't grant on their own,
 * like deleting another user's Firebase Auth account).
 */
import { auth } from '../config/firebase';

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || '';

/**
 * Permanently deletes a user's profile (Firestore doc, claimed handle, and
 * Firebase Auth account). Caller must be signed in as an admin.
 * @param {string} targetUid  uid of the profile to remove
 */
export async function adminDeleteUser(targetUid) {
  if (!FUNCTIONS_URL) {
    throw new Error('Admin tools are not configured. Please contact support.');
  }
  if (!auth.currentUser) {
    throw new Error('You must be logged in as an admin to do this.');
  }

  const idToken = await auth.currentUser.getIdToken();

  const response = await fetch(`${FUNCTIONS_URL}/adminDeleteUser`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ targetUid }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}
