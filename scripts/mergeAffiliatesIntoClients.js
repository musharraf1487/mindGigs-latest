/**
 * MindGigs – Merge Affiliates Into Clients
 * ========================================
 * One-off migration for the affiliate/client merge. The standalone `affiliate`
 * login role is gone — every client account now carries referral capability, so
 * nobody has to switch logins to see their commissions.
 *
 * What it does:
 *   1. users where role == 'affiliate'  →  role: 'client'
 *   2. any client missing `couponCode`  →  mint one into affiliateCodes/{CODE}
 *   3. any client missing `affiliateEarnings` → 0
 *   4. any client missing `pendingPayout`     → 0
 *
 * Note on affiliateCodes: the doc keeps `ownerRole: 'affiliate'`. That field is
 * a CODE TYPE ("non-expert coupon"), not the owner's user role — the scenario
 * matrix in functions/index.js and the create rule in firestore.rules both key
 * off that literal. Do not "fix" it to 'client'.
 *
 * This must run with the Admin SDK: firestore.rules forbids any client-side
 * write that changes `role` (users/{uid} update requires role to be unchanged).
 *
 * Usage:
 *   node scripts/mergeAffiliatesIntoClients.js --dry-run   # report only, no writes
 *   node scripts/mergeAffiliatesIntoClients.js             # apply
 *
 * Prerequisites:
 *   - scripts/serviceAccountKey.json downloaded from Firebase Console
 *     (Project Settings → Service Accounts → Generate new private key)
 */

// Modular entrypoints, not the `admin` default export — the default export is
// undefined under ESM in firebase-admin v14 (which is why scripts/createAdmin.js
// no longer runs and scripts/createAdmin.cjs exists alongside it).
import { createRequire } from 'module';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRandomCode() {
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

/**
 * Mints a unique 6-char coupon code. Mirrors createAffiliateCoupon() in
 * src/services/affiliateService.js: a generated code must collide with neither
 * an existing affiliateCodes doc nor an expert's handle (handles are themselves
 * valid coupons, and an ambiguous lookup resolves affiliateCodes first, which
 * would silently shadow that expert's coupon).
 */
async function mintCouponCode(uid, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const code = generateRandomCode();

    const handleSnap = await db.collection('handles').doc(code.toLowerCase()).get();
    if (handleSnap.exists) continue; // collides with an expert handle — retry

    const codeSnap = await db.collection('affiliateCodes').doc(code).get();
    if (codeSnap.exists) continue; // collides with an existing code — retry

    if (!DRY_RUN) {
      await db.collection('affiliateCodes').doc(code).set({
        code,
        ownerId: uid,
        ownerRole: 'affiliate', // code type, not user role — see header
        createdAt: new Date().toISOString(),
      });
    }
    return code;
  }
  throw new Error(`Could not generate a unique coupon code for ${uid} after ${attempts} attempts.`);
}

async function main() {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`  Merge affiliates into clients${DRY_RUN ? '  [DRY RUN — no writes]' : '  [LIVE]'}`);
  console.log(`${'='.repeat(64)}\n`);

  const stats = {
    rolesFlipped: 0,
    codesMinted: 0,
    earningsInit: 0,
    payoutInit: 0,
    untouched: 0,
    failed: 0,
  };

  // ── 1. Flip every affiliate to client ────────────────────────────────────
  const affiliateSnap = await db.collection('users').where('role', '==', 'affiliate').get();
  console.log(`Found ${affiliateSnap.size} user(s) with role == 'affiliate'\n`);

  for (const d of affiliateSnap.docs) {
    const u = d.data();
    console.log(`  [role]  ${d.id}  ${u.email || '(no email)'}  affiliate → client`);
    if (!DRY_RUN) {
      await d.ref.update({
        role: 'client',
        // Audit trail — lets us find migrated accounts later and tells the
        // admin Users list why a client already had earnings on day one.
        migratedFromAffiliateAt: new Date().toISOString(),
      });
    }
    stats.rolesFlipped++;
  }

  // ── 2-4. Backfill every client with referral fields ──────────────────────
  // Re-queried AFTER the flips above so migrated accounts are included in the
  // same pass (in --dry-run they aren't yet role:'client', so they're merged in
  // explicitly below to keep the dry-run report honest).
  const clientSnap = await db.collection('users').where('role', '==', 'client').get();

  const byId = new Map();
  for (const d of clientSnap.docs) byId.set(d.id, d);
  if (DRY_RUN) for (const d of affiliateSnap.docs) byId.set(d.id, d);

  console.log(`\nBackfilling referral fields across ${byId.size} client account(s)\n`);

  for (const [uid, d] of byId) {
    const u = d.data();
    const updates = {};
    const changed = [];

    if (!u.couponCode) {
      try {
        const code = await mintCouponCode(uid);
        updates.couponCode = code;
        changed.push(`couponCode=${code}`);
        stats.codesMinted++;
      } catch (err) {
        console.error(`  [FAIL]  ${uid}  ${err.message}`);
        stats.failed++;
        continue;
      }
    }

    if (typeof u.affiliateEarnings !== 'number') {
      updates.affiliateEarnings = 0;
      changed.push('affiliateEarnings=0');
      stats.earningsInit++;
    }

    if (typeof u.pendingPayout !== 'number') {
      updates.pendingPayout = 0;
      changed.push('pendingPayout=0');
      stats.payoutInit++;
    }

    if (changed.length === 0) {
      stats.untouched++;
      continue;
    }

    console.log(`  [fill]  ${uid}  ${u.email || '(no email)'}  ${changed.join('  ')}`);
    if (!DRY_RUN) await d.ref.update(updates);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'-'.repeat(64)}`);
  console.log('  Summary');
  console.log(`${'-'.repeat(64)}`);
  console.log(`  affiliate → client role flips : ${stats.rolesFlipped}`);
  console.log(`  coupon codes minted           : ${stats.codesMinted}`);
  console.log(`  affiliateEarnings initialised : ${stats.earningsInit}`);
  console.log(`  pendingPayout initialised     : ${stats.payoutInit}`);
  console.log(`  already complete (skipped)    : ${stats.untouched}`);
  console.log(`  failed                        : ${stats.failed}`);
  console.log(`${'-'.repeat(64)}\n`);

  if (DRY_RUN) {
    console.log('DRY RUN — nothing was written. Re-run without --dry-run to apply.\n');
  } else {
    console.log('Done. Migrated users can now sign in through the Client portal.\n');
  }

  process.exit(stats.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌  Failed:', err.message);
  process.exit(1);
});
