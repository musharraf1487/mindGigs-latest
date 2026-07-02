/**
 * MindGigs – Create Admin User
 * ============================
 * Creates a Firebase Auth account and Firestore user document with role: 'admin'.
 * Run this ONCE to seed your admin account, then keep the credentials safe.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword ADMIN_NAME="Your Name" \
 *     node scripts/createAdmin.js
 *
 * Prerequisites:
 *   - scripts/serviceAccountKey.json downloaded from Firebase Console
 *     (Project Settings → Service Accounts → Generate new private key)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import admin from 'firebase-admin';

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.error('❌  Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running.');
    process.exit(1);
  }

  console.log(`\nCreating admin account for: ${email}\n`);

  // Create Firebase Auth user
  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: name });
    console.log(`✅  Auth user created — UID: ${userRecord.uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(email);
      console.log(`ℹ️   Auth user already exists — UID: ${userRecord.uid}`);
    } else {
      throw err;
    }
  }

  // Write Firestore user doc with role: 'admin'
  const userDoc = {
    uid: userRecord.uid,
    email,
    role: 'admin',
    name,
    handle: '',
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
    referralCode: null,
    referredBy: null,
    tier: null,
    affiliateEarnings: 0,
    pendingPayout: 0,
  };

  await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
  console.log(`✅  Firestore users/${userRecord.uid} written with role: 'admin'`);
  console.log('\nDone. Log in via the Administrator portal on the site.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌  Failed:', err.message);
  process.exit(1);
});
