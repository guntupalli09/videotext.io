/**
 * Analytics Sprint 3 — manual/on-demand Stripe-vs-Postgres reconciliation run.
 *
 * Read-only against Stripe (subscriptions.list only). The only Postgres
 * write is this run's own row in MrrReconciliationRun (skipped entirely in
 * --dry-run mode). Safe to run at any time, independent of the
 * STRIPE_RECONCILIATION_ENABLED flag (that flag only gates the *scheduled*
 * job in index.ts; this script is always available for an on-demand check).
 *
 * Usage (from server/):
 *   npx tsx src/scripts/stripe-reconciliation-report.ts --dry-run
 *   npx tsx src/scripts/stripe-reconciliation-report.ts
 */

import 'dotenv/config'
import Stripe from 'stripe'
import { prisma } from '../db'
import { runReconciliation } from '../services/stripeReconciliation'

const DRY_RUN = process.argv.includes('--dry-run')
const API_VERSION = '2026-01-28.clover' // matches server/src/services/stripe.ts exactly

async function main(): Promise<void> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY not set — cannot run reconciliation.')
    process.exitCode = 1
    return
  }
  const stripe = new Stripe(stripeSecretKey, { apiVersion: API_VERSION as Stripe.LatestApiVersion })

  console.log(DRY_RUN ? '🚧  DRY RUN — result will NOT be persisted\n' : '🔎  Running Stripe reconciliation...\n')

  const result = await runReconciliation(stripe, { persist: !DRY_RUN })

  console.log(JSON.stringify(result, null, 2))
  console.log(`\nSeverity: ${result.severity}`)
  if (result.severity === 'critical') {
    console.log('⚠️  CRITICAL — see notes above.')
  }
}

main()
  .catch((err) => {
    console.error('Reconciliation report failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
