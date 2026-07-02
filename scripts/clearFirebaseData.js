/**
 * MindGigs – Firebase Cleanup Script
 * ====================================
 * Deletes ALL documents from:
 *   - users       (test / mock accounts)
 *   - bookings    (test bookings)
 *   - reviews     (test reviews)
 *   - payoutRequests (test payout requests)
 *
 * Usage (run from project root):
 *   node scripts/clearFirebaseData.js
 *
 * Prerequisites:
 *   npm install firebase-admin  (or use the project's functions/node_modules)
 *
 * ⚠️  THIS IS IRREVERSIBLE — back up Firestore first if needed.
 */

const admin = require('firebase-admin');
const path  = require('path');

// ── Load service account key ─────────────────────────────────────────────────
// Download from Firebase Console → Project Settings → Service Accounts
// Save it as scripts/serviceAccountKey.json  (already in .gitignore)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Collections to wipe ──────────────────────────────────────────────────────
const COLLECTIONS_TO_WIPE = [
  'users',
  'bookings',
  'reviews',
  'payoutRequests',
];

// ── Helper: delete all docs in a collection (in batches of 500) ──────────────
async function deleteCollection(collectionName) {
  const colRef = db.collection(collectionName);
  let deleted = 0;

  while (true) {
    const snap = await colRef.limit(500).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;
    console.log(`  [${collectionName}] Deleted ${deleted} documents so far…`);
  }

  console.log(`  ✅ [${collectionName}] Done — ${deleted} total documents deleted.`);
  return deleted;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔥 MindGigs Firebase Cleanup\n');
  console.log('⚠️  This will permanently delete ALL data from the following collections:');
  COLLECTIONS_TO_WIPE.forEach(c => console.log(`     - ${c}`));
  console.log('\nStarting in 3 seconds… Press Ctrl+C to abort.\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  let totalDeleted = 0;
  for (const col of COLLECTIONS_TO_WIPE) {
    console.log(`\n📂 Wiping collection: ${col}`);
    const count = await deleteCollection(col);
    totalDeleted += count;
  }

  console.log(`\n✅ Cleanup complete! Total documents deleted: ${totalDeleted}`);
  console.log('   The platform database is now empty and ready for real users.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
