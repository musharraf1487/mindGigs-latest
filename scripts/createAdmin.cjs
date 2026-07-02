const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running.');
    process.exit(1);
  }

  console.log(`\nCreating admin account for: ${email}\n`);

  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: name });
    console.log(`Auth user created — UID: ${userRecord.uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(email);
      console.log(`Auth user already exists — UID: ${userRecord.uid}`);
    } else {
      throw err;
    }
  }

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
  console.log(`Firestore users/${userRecord.uid} written with role: 'admin'`);
  console.log('\nDone. Log in via the Administrator portal on the site.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
