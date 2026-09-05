/**
 * One-time backfill: catch pricing-intent and upgrade-intent leads whose
 * event happened before Gmail SMTP was wired up (RESEND_API_KEY was
 * misconfigured, so pricingIntentRescueCron/upgradeRescueCron silently sent
 * nothing to anyone since inception). The recurring crons only look back
 * 10 minutes / 24h respectively — they will never retroactively catch these
 * leads on their own, so this runs the exact same logic once with a wider
 * window.
 *
 * Reuses runPricingIntentRescueCron/runUpgradeRescueCron unchanged (same
 * eligibility rules, same real-usage personalization, same per-user
 * cooldown lock) — nothing here is duplicated or re-implemented, so a lead
 * that was already emailed by a normal cron run is skipped automatically by
 * the existing lock check.
 *
 * Usage (from server/, inside the running container so DATABASE_URL/REDIS_URL
 * resolve the same as production):
 *   npx tsx src/scripts/backfill-intent-rescue-emails.ts --days=30 --dry-run   <- preview only
 *   npx tsx src/scripts/backfill-intent-rescue-emails.ts --days=30             <- actually send
 */

import 'dotenv/config'
import { runPricingIntentRescueCron } from '../jobs/pricingIntentRescueCron'
import { runUpgradeRescueCron } from '../jobs/upgradeRescueCron'

const DRY_RUN = process.argv.includes('--dry-run')
const daysArg = process.argv.find((a) => a.startsWith('--days='))
const DAYS = daysArg ? Number(daysArg.split('=')[1]) : 30

async function main(): Promise<void> {
  if (!Number.isFinite(DAYS) || DAYS <= 0) {
    console.error('Invalid --days value')
    process.exit(1)
  }

  console.log(DRY_RUN ? `DRY RUN — previewing ${DAYS}-day backfill, no emails will be sent\n` : `Sending ${DAYS}-day backfill for real\n`)

  const lookbackMs = DAYS * 24 * 60 * 60 * 1000

  console.log('--- Pricing intent rescue ---')
  await runPricingIntentRescueCron({ lookbackMs, dryRun: DRY_RUN })

  console.log('\n--- Upgrade rescue ---')
  await runUpgradeRescueCron({ minLookbackMs: lookbackMs, dryRun: DRY_RUN })

  console.log('\nDone. See the summary log lines above for eligible/sent/skipped counts.')
  process.exit(0)
}

main().catch((e) => {
  console.error('Backfill failed:', e)
  process.exit(1)
})
