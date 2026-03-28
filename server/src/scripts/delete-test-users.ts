/**
 * One-time cleanup: delete founder/test accounts from the DB and cancel
 * their Stripe subscriptions so no future charges occur.
 *
 * Usage (from server/):
 *   npx tsx src/scripts/delete-test-users.ts
 *   npx tsx src/scripts/delete-test-users.ts --dry-run   ← preview only
 *
 * The script:
 *   1. Looks up each email in the DB
 *   2. Cancels any active Stripe subscription immediately
 *   3. Deletes all rows referencing that userId (Jobs, TranscriptShares,
 *      SubscriptionSnapshots, UserMetrics)
 *   4. Nullifies userId on Feedback / EventLog / FeedbackEvent (optional FKs)
 *   5. Deletes the User row
 */

import 'dotenv/config'
import Stripe from 'stripe'
import { prisma } from '../db'

const DRY_RUN = process.argv.includes('--dry-run')

const EMAILS_TO_DELETE = [
  'santhosh.guntupalli09@gmail.com',
  'rachakatlavishnupriya@gmail.com',
  'vishnupriyarachakatla07@gmail.com',
  'gvksg999@gmail.com',
  'vishnrach2000@gmail.com',
  'santhosh.guntupalli09@outlook.com',
  'santoshgfall2022@gmail.com',
]

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  console.error('❌  STRIPE_SECRET_KEY not set — cannot cancel subscriptions.')
  process.exit(1)
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

async function cancelStripeSubscription(subscriptionId: string, email: string): Promise<void> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    if (sub.status === 'canceled') {
      console.log(`   ✓ Stripe sub ${subscriptionId} already canceled`)
      return
    }
    if (DRY_RUN) {
      console.log(`   [dry-run] Would cancel Stripe sub ${subscriptionId} (status: ${sub.status})`)
      return
    }
    await stripe.subscriptions.cancel(subscriptionId)
    console.log(`   ✓ Canceled Stripe subscription ${subscriptionId}`)
  } catch (err) {
    console.warn(`   ⚠️  Could not cancel sub ${subscriptionId} for ${email}: ${(err as Error).message}`)
  }
}

async function cancelStripeSubsByEmail(email: string): Promise<void> {
  try {
    const customers = await stripe.customers.list({ email, limit: 10 })
    for (const customer of customers.data) {
      if (customer.deleted) continue
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 10,
      })
      for (const sub of subs.data) {
        if (sub.status === 'canceled') continue
        if (DRY_RUN) {
          console.log(`   [dry-run] Would cancel Stripe sub ${sub.id} (status: ${sub.status}) via customer lookup`)
          continue
        }
        await stripe.subscriptions.cancel(sub.id)
        console.log(`   ✓ Canceled Stripe sub ${sub.id} found via email lookup`)
      }
    }
  } catch (err) {
    console.warn(`   ⚠️  Stripe email lookup failed for ${email}: ${(err as Error).message}`)
  }
}

async function deleteUser(email: string): Promise<void> {
  console.log(`\n🔍  Processing: ${email}`)

  const users = await prisma.user.findMany({
    where: { email: email.trim().toLowerCase() },
  })

  if (users.length === 0) {
    console.log(`   ℹ️  Not found in DB — skipping`)
    return
  }

  for (const user of users) {
    console.log(`   Found user ${user.id} (plan: ${user.plan})`)

    // 1. Cancel Stripe subscription via stored sub ID
    if (user.subscriptionId) {
      await cancelStripeSubscription(user.subscriptionId, email)
    }

    // 2. Also cancel any Stripe subs found by email (catches edge cases)
    await cancelStripeSubsByEmail(email)

    if (DRY_RUN) {
      const jobCount = await prisma.job.count({ where: { userId: user.id } })
      const shareCount = await prisma.transcriptShare.count({ where: { userId: user.id } })
      const snapshotCount = await prisma.subscriptionSnapshot.count({ where: { userId: user.id } })
      console.log(`   [dry-run] Would delete: ${jobCount} jobs, ${shareCount} shares, ${snapshotCount} snapshots, user record`)
      continue
    }

    // 3. Delete child records
    const [jobs, shares, snapshots, metrics] = await Promise.all([
      prisma.job.deleteMany({ where: { userId: user.id } }),
      prisma.transcriptShare.deleteMany({ where: { userId: user.id } }),
      prisma.subscriptionSnapshot.deleteMany({ where: { userId: user.id } }),
      prisma.userMetrics.deleteMany({ where: { userId: user.id } }),
    ])
    console.log(`   ✓ Deleted ${jobs.count} jobs, ${shares.count} shares, ${snapshots.count} subscription snapshots, ${metrics.count} user metrics`)

    // 4. Nullify optional userId FK on audit tables (don't delete — preserve history)
    await Promise.all([
      prisma.feedback.updateMany({ where: { userId: user.id }, data: { userId: null } }),
      prisma.eventLog.updateMany({ where: { userId: user.id }, data: { userId: null } }),
      prisma.feedbackEvent.updateMany({ where: { userId: user.id }, data: { userId: null } }),
    ])
    console.log(`   ✓ Nullified userId on feedback/event rows`)

    // 5. Delete the user
    await prisma.user.delete({ where: { id: user.id } })
    console.log(`   ✓ Deleted user ${user.id} (${email})`)
  }
}

async function main() {
  console.log(DRY_RUN ? '🚧  DRY RUN — no changes will be made\n' : '🗑️   Deleting test users...\n')

  for (const email of EMAILS_TO_DELETE) {
    await deleteUser(email)
  }

  console.log('\n✅  Done.')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  prisma.$disconnect()
  process.exit(1)
})
