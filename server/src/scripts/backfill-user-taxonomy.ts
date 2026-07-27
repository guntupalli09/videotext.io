/**
 * Analytics Sprint 2 — backfill known non-default user classifications.
 *
 * The migration itself (20260727130000_add_user_taxonomy) already backfills
 * every existing row to the safe defaults (userClass='registered',
 * includeInBusinessMetrics=true) via ADD COLUMN ... DEFAULT. This script
 * only needs to touch the handful of rows that are NOT a normal registered
 * user: demo accounts (email pattern already used elsewhere in this
 * codebase, e.g. index.ts, upgradeRescueCron.ts, videoProcessor.ts), the
 * founder account (server/src/utils/founderAccount.ts — the one existing
 * source of truth for that email, reused here rather than re-hardcoded),
 * and the known internal/test accounts already identified by
 * server/src/utils/knownTestAccounts.ts (shared with delete-test-users.ts,
 * not duplicated).
 *
 * Nothing reads these columns yet (see schema.prisma comment) -- this is a
 * pure classification backfill with no behavior change to any existing
 * route, query, or dashboard.
 *
 * Usage (from server/):
 *   npx tsx src/scripts/backfill-user-taxonomy.ts --dry-run   <- preview only
 *   npx tsx src/scripts/backfill-user-taxonomy.ts             <- apply
 */

import 'dotenv/config'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { getFounderAccountEmail } from '../utils/founderAccount'
import { KNOWN_TEST_EMAILS } from '../utils/knownTestAccounts'

const DRY_RUN = process.argv.includes('--dry-run')

interface Classification {
  label: string
  where: Prisma.UserWhereInput
  data: {
    userClass: string
    isFounder?: boolean
    isInternal?: boolean
    isDemo?: boolean
    includeInBusinessMetrics: boolean
  }
}

async function main(): Promise<void> {
  console.log(DRY_RUN ? '🚧  DRY RUN — no changes will be made\n' : '🏷️   Backfilling user taxonomy...\n')

  const founderEmail = getFounderAccountEmail()
  // Exclude the founder's own email from the generic "internal" list in case
  // of accidental overlap -- founder is its own distinct classification.
  const internalEmails = KNOWN_TEST_EMAILS.map((e) => e.trim().toLowerCase()).filter(
    (e) => e !== founderEmail
  )

  const classifications: Classification[] = [
    {
      label: 'demo accounts (email LIKE demo-user-%)',
      where: { email: { startsWith: 'demo-user-', mode: 'insensitive' } },
      data: { userClass: 'demo', isDemo: true, includeInBusinessMetrics: false },
    },
    {
      label: `founder account (${founderEmail})`,
      where: { email: { equals: founderEmail, mode: 'insensitive' } },
      data: { userClass: 'founder', isFounder: true, includeInBusinessMetrics: false },
    },
    {
      label: `known internal/test accounts (${internalEmails.length} candidate emails from delete-test-users.ts)`,
      where: { email: { in: internalEmails, mode: 'insensitive' } },
      data: { userClass: 'internal', isInternal: true, includeInBusinessMetrics: false },
    },
  ]

  let totalMatched = 0
  let totalUpdated = 0

  for (const c of classifications) {
    const matches = await prisma.user.findMany({
      where: c.where,
      select: { id: true, email: true, plan: true, userClass: true },
    })
    totalMatched += matches.length
    console.log(`\n${c.label}: ${matches.length} matching row(s)`)
    for (const m of matches) {
      console.log(`   - ${m.email} (id=${m.id}, plan=${m.plan}, current userClass=${m.userClass})`)
    }

    if (matches.length === 0) continue

    if (DRY_RUN) {
      console.log(`   [dry-run] Would set: ${JSON.stringify(c.data)}`)
      continue
    }

    const result = await prisma.user.updateMany({ where: c.where, data: c.data })
    totalUpdated += result.count
    console.log(`   ✓ Updated ${result.count} row(s)`)
  }

  console.log(`\n${DRY_RUN ? '[dry-run] Would match' : 'Matched'} ${totalMatched} row(s) total across all classifications.`)
  if (!DRY_RUN) {
    console.log(`Updated ${totalUpdated} row(s) total.`)
  }

  // Sanity check: report the resulting distribution so the operator can
  // visually confirm nothing unexpected changed.
  const distribution = await prisma.user.groupBy({
    by: ['userClass', 'includeInBusinessMetrics'],
    _count: true,
  })
  console.log('\nCurrent userClass distribution (after this run, including any prior state):')
  for (const row of distribution) {
    console.log(`   ${row.userClass} / includeInBusinessMetrics=${row.includeInBusinessMetrics}: ${row._count}`)
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
