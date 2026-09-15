/**
 * Backfill email/plan onto PostHog persons for accounts that predate the
 * server-side identify fix (5ce518c).
 *
 * WHY THIS IS SEPARATE FROM THE ALIAS BACKFILL
 * backfillGuestJobAliases.ts linked identities: it told PostHog that a guest id
 * and an account id are one person. Aliasing does NOT set properties, so those
 * persons are stitched but still carry no email. This script sets the email and
 * plan, which is the other half of making an account findable.
 *
 * WHY THOSE ACCOUNTS ARE STILL MISSING AN EMAIL
 * identifyAuthenticatedUser() only runs when an account authenticates. A user
 * who signed up before the fix deployed and has not logged in since has never
 * had it run for them. This backfills what that login would have set.
 *
 * RISK PROFILE — LOWER THAN THE ALIAS BACKFILL, AND DELIBERATELY SO
 * This sets person properties; it does not merge identities. Re-running writes
 * the same values again, so it is idempotent, and a wrong value can be
 * corrected by writing the right one. That is NOT true of alias, which has no
 * documented reversal. It is still dry-run by default: the properties are real
 * user data and the output should be read before it is sent.
 *
 * SCOPE
 *   default   accounts whose guest jobs were aliased, read from the alias
 *             backfill's state file — the ~510 from that run
 *   --all     every account with an email, which also covers users who never
 *             had a guest job
 *
 * USAGE
 *   npx tsx scripts/backfillUserIdentities.ts                  # dry run
 *   npx tsx scripts/backfillUserIdentities.ts --all            # dry run, wider
 *   npx tsx scripts/backfillUserIdentities.ts --apply
 *
 * ENV
 *   DATABASE_URL   required (Prisma)
 *   POSTHOG_KEY    required for --apply (project write key)
 *   POSTHOG_HOST   ingestion host; for Cloud US use https://us.i.posthog.com
 */

import fs from 'fs'
import path from 'path'

// Prisma and posthog-node are imported lazily so the pure selector below stays
// importable by tests without a full dependency install, and so a dry run never
// constructs the write client.

export type UserIdentity = { user_id: string; email: string; plan?: string | null }

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ALL = args.includes('--all')
const LIMIT = Number(argValue('--limit') ?? '0') || 0
const ALIAS_STATE_PATH =
  argValue('--alias-state') ?? path.join(process.cwd(), '.backfill-guest-aliases.state')
const STATE_PATH =
  argValue('--state') ?? path.join(process.cwd(), '.backfill-user-identities.state')

function argValue(flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i > -1 ? args[i + 1] : undefined
}

// ── selection (pure, unit-tested) ───────────────────────────────────────────

export type IdentitySelection = {
  updates: UserIdentity[]
  skippedNoEmail: number
  skippedDone: number
}

/**
 * Decide which accounts get an identify call.
 *
 * An account with no usable email is skipped: writing an empty email would
 * overwrite nothing useful and make the person look identified when it is not.
 */
export function selectIdentityUpdates(
  users: UserIdentity[],
  done: Set<string>,
): IdentitySelection {
  const updates: UserIdentity[] = []
  let skippedNoEmail = 0
  let skippedDone = 0

  for (const u of users) {
    if (!u.email || !u.email.trim()) {
      skippedNoEmail++
      continue
    }
    if (done.has(u.user_id)) {
      skippedDone++
      continue
    }
    updates.push({ user_id: u.user_id, email: u.email.trim(), plan: u.plan ?? null })
  }
  return { updates, skippedNoEmail, skippedDone }
}

// ── sources ─────────────────────────────────────────────────────────────────

function loadAliasedJobIds(): string[] {
  try {
    return fs.readFileSync(ALIAS_STATE_PATH, 'utf8').split('\n').filter(Boolean)
  } catch {
    throw new Error(
      `Alias state file not found at ${ALIAS_STATE_PATH}. ` +
        'Run backfillGuestJobAliases.ts first, pass --alias-state <path>, or use --all.',
    )
  }
}

async function loadUsers(): Promise<UserIdentity[]> {
  const { prisma } = await import('../src/db')

  if (ALL) {
    const rows = await prisma.user.findMany({ select: { id: true, email: true, plan: true } })
    return rows.map((r) => ({ user_id: r.id, email: r.email, plan: r.plan }))
  }

  const jobIds = loadAliasedJobIds()
  const userIds = new Set<string>()
  const CHUNK = 500
  for (let i = 0; i < jobIds.length; i += CHUNK) {
    const jobs = await prisma.job.findMany({
      where: { id: { in: jobIds.slice(i, i + CHUNK) } },
      select: { userId: true },
    })
    for (const j of jobs) {
      if (j.userId && !j.userId.startsWith('guest_')) userIds.add(j.userId)
    }
  }

  const ids = [...userIds]
  const users: UserIdentity[] = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const rows = await prisma.user.findMany({
      where: { id: { in: ids.slice(i, i + CHUNK) } },
      select: { id: true, email: true, plan: true },
    })
    for (const r of rows) users.push({ user_id: r.id, email: r.email, plan: r.plan })
  }
  return users
}

// ── resumability ────────────────────────────────────────────────────────────

function loadDone(): Set<string> {
  try {
    return new Set(fs.readFileSync(STATE_PATH, 'utf8').split('\n').filter(Boolean))
  } catch {
    return new Set()
  }
}

function markDone(userId: string): void {
  fs.appendFileSync(STATE_PATH, `${userId}\n`, 'utf8')
}

// ── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[identities] mode: ${APPLY ? 'APPLY (writes to PostHog)' : 'DRY RUN (no writes)'}`)
  console.log(`[identities] scope: ${ALL ? 'ALL accounts with an email' : 'accounts from the alias backfill'}`)

  const users = await loadUsers()
  console.log(`[identities] accounts found: ${users.length}`)

  const { updates, skippedNoEmail, skippedDone } = selectIdentityUpdates(users, loadDone())
  const planned = LIMIT > 0 ? updates.slice(0, LIMIT) : updates

  console.log(`[identities] skipped — no email:        ${skippedNoEmail}`)
  console.log(`[identities] skipped — already written: ${skippedDone}`)
  console.log(`[identities] TO IDENTIFY: ${planned.length}${LIMIT > 0 ? ` (capped by --limit ${LIMIT})` : ''}`)

  if (planned.length === 0) {
    console.log('[identities] nothing to do.')
    return
  }

  console.log('\n[identities] planned (user_id -> email, plan):')
  for (const u of planned) {
    console.log(`  ${u.user_id}  ->  ${u.email}  [${u.plan ?? 'unknown'}]`)
  }

  if (!APPLY) {
    const out = path.join(process.cwd(), 'backfill-user-identities.preview.json')
    fs.writeFileSync(out, JSON.stringify(planned, null, 2), 'utf8')
    console.log(`\n[identities] DRY RUN — nothing written. Preview saved to ${out}`)
    console.log('[identities] re-run with --apply to set these properties.')
    return
  }

  const posthogKey = process.env.POSTHOG_KEY
  if (!posthogKey) throw new Error('POSTHOG_KEY is required for --apply.')
  const { PostHog } = await import('posthog-node')
  const client = new PostHog(posthogKey, {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
  })

  let applied = 0
  for (const u of planned) {
    try {
      client.identify({
        distinctId: u.user_id,
        properties: { email: u.email, ...(u.plan && { plan: u.plan }) },
      })
      markDone(u.user_id)
      applied++
      if (applied % 100 === 0) {
        await client.flush()
        console.log(`[identities] applied ${applied}/${planned.length}`)
      }
    } catch (err) {
      console.error(`[identities] FAILED ${u.user_id}:`, err)
    }
  }
  await client.flush()
  await client.shutdown()
  console.log(`[identities] done. applied ${applied}/${planned.length}`)
  console.log('[identities] property updates are asynchronous; allow a few minutes before verifying.')
}

// Run only when invoked directly, so tests can import the selector. An env-var
// guard would not work: ESM hoists imports, so a test setting the var before
// its import statement still runs after this module has executed.
const invokedDirectly =
  !!process.argv[1] && path.resolve(process.argv[1]).endsWith('backfillUserIdentities.ts')

if (invokedDirectly) {
  main()
    .catch((err) => {
      console.error('[identities] fatal:', err instanceof Error ? err.message : err)
      process.exitCode = 1
    })
    .finally(() => {
      void import('../src/db').then((m) => m.prisma.$disconnect()).catch(() => {})
    })
}
