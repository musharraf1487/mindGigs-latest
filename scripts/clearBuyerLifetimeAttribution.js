/**
 * MindGigs – Clear Buyer Lifetime Attribution
 * ===========================================
 * Policy cleanup for the "lifetime is for onboarding sellers only" rule.
 *
 * `referredByExpertId` ties a user to a referring expert for life — every
 * purchase they ever make pays that expert a Person B commission
 * (processCommissionSplit reads it as the coupon-less fallback). That reward is
 * now reserved for onboarding an EXPERT: whoever brings in a plain buyer earns
 * only when their coupon is used at checkout, one sale at a time.
 *
 * AuthContext stopped writing the field for buyer signups, but accounts created
 * before that still carry it. This clears those, and ONLY those:
 *
 *   role == 'expert'  →  left alone (still valid lifetime attribution)
 *   role != 'expert'  →  referredByExpertId set to null
 *
 * Set to null rather than deleted, matching what a fresh signup writes for a
 * user with no attribution.
 *
 * This rewrites who gets paid on future sales. Run --dry-run first.
 *
 * Usage:
 *   node scripts/clearBuyerLifetimeAttribution.js --dry-run
 *   node scripts/clearBuyerLifetimeAttribution.js
 *
 * Prerequisites:
 *   - scripts/serviceAccountKey.json (Firebase Console → Service Accounts)
 */

import { createRequire } from 'module';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`  Clear buyer lifetime attribution${DRY_RUN ? '  [DRY RUN — no writes]' : '  [LIVE]'}`);
  console.log(`${'='.repeat(64)}\n`);

  const snap = await db.collection('users').get();

  let cleared = 0;
  let keptExpert = 0;

  for (const d of snap.docs) {
    const u = d.data();
    if (!u.referredByExpertId) continue;

    if (u.role === 'expert') {
      console.log(`  [keep]   ${u.email || d.id}  (expert — lifetime attribution still valid)`);
      keptExpert++;
      continue;
    }

    console.log(`  [clear]  ${u.email || d.id}  role=${u.role}  was → ${u.referredByExpertId}`);
    if (!DRY_RUN) {
      await d.ref.update({
        referredByExpertId: null,
        // Audit trail — this was a deliberate policy change, not data loss.
        lifetimeAttributionClearedAt: new Date().toISOString(),
      });
    }
    cleared++;
  }

  console.log(`\n${'-'.repeat(64)}`);
  console.log(`  buyers cleared          : ${cleared}`);
  console.log(`  experts left untouched  : ${keptExpert}`);
  console.log(`${'-'.repeat(64)}\n`);

  if (DRY_RUN) console.log('DRY RUN — nothing was written. Re-run without --dry-run to apply.\n');
  else console.log('Done. Buyers now earn their referrer money only via checkout coupons.\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌  Failed:', err.message);
  process.exit(1);
});
