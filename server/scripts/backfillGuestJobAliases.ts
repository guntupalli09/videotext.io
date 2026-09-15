/**
 * Backfill PostHog aliases for guest jobs that were claimed before the
 * claim endpoint started stitching identities (fixed in 5ce518c).
 *
 * THE PROBLEM
 * A guest ran a job under `guest_<uuid>`, signed up, and claimed it.
 * POST /jobs/:id/claim rewrote Job.userId in Postgres and the Bull job data —
 * overwriting the guest id in both — but never told PostHog the two ids are the
 * same person. The guest's job_created still sits on an orphan anonymous
 * profile.
 *
 * WHY IT IS STILL RECONSTRUCTIBLE
 * The server destroyed the mapping, but PostHog kept half of it: job_created
 * carries BOTH properties.job_id and the guest distinct_id. Postgres carries
 * Job.id and the real userId. Joining on the job id rebuilds the pair exactly.
 *
 *   PostHog:  job_created  ->  (job_id, guest_distinct_id)
 *   Postgres: Job.id       ->  (job_id, userId)
 *   join on job_id, keep rows whose userId is NOT a guest_ id
 *
 * SAFETY
 * - Dry run by DEFAULT. Nothing is written without --apply.
 * - A PostHog merge has no documented reversal. Read the dry-run output before
 *   applying; the pairs it prints are exactly what --apply will write.
 * - Resumable: applied job ids are appended to a state file, so a re-run after
 *   an interruption does not re-alias.
 * - Only anonymous guest profiles are eligible. PostHog refuses to merge two
 *   ALREADY IDENTIFIED persons ("Refused to merge an already identified user").
 *   Verified 2026-09-14: all 1,453 guest profiles had is_identified = 0, so
 *   every candidate is an anonymous -> identified merge, which is allowed.
 *   Re-verify before a later run; a guest id that has since been identified
 *   would be silently refused at ingestion.
 *
 * USAGE
 *   # dry run (default) — prints the pairs, writes nothing
 *   npx tsx scripts/backfillGuestJobAliases.ts
 *
 *   # dry run against a mapping file instead of the PostHog API
 *   npx tsx scripts/backfillGuestJobAliases.ts --mapping guest-jobs.json
 *
 *   # write, after reading the dry-run output
 *   npx tsx scripts/backfillGuestJobAliases.ts --apply
 *
 * ENV
 *   DATABASE_URL                required (Prisma)
 *   POSTHOG_KEY                 required for --apply (project write key)
 *   POSTHOG_HOST                ingestion host for --apply.
 *                               Default https://app.posthog.com — for Cloud US
 *                               this should be https://us.i.posthog.com
 *   POSTHOG_API_HOST            query host for the HogQL read.
 *                               Default https://us.posthog.com. NOTE this is a
 *                               DIFFERENT host from POSTHOG_HOST: the query API
 *                               lives on us.posthog.com, ingestion on
 *                               us.i.posthog.com. Reusing one value 404s.
 *   POSTHOG_PERSONAL_API_KEY    required unless --mapping is given (HogQL read)
 *   POSTHOG_PROJECT_ID          required unless --mapping is given
 */

import fs from 'fs'
import path from 'path'

// posthog-node and Prisma are imported lazily, not at module scope: a DRY RUN
// must not need the write client, and the pure selector below has to be
// importable by tests without a full dependency install.

export type GuestJob = { job_id: string; guest_distinct_id: string }
export type AliasPair = { job_id: string; guest_distinct_id: string; user_id: string }

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const MAPPING_PATH = argValue('--mapping')
const LIMIT = Number(argValue('--limit') ?? '0') || 0
const STATE_PATH =
  argValue('--state') ?? path.join(process.cwd(), '.backfill-guest-aliases.state')
const LOOKBACK_DAYS = Number(argValue('--days') ?? '400')

function argValue(flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i > -1 ? args[i + 1] : undefined
}

/** Guest ids look like `guest_<uuid>`; a real id never does. */
function isGuestId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('guest_')
}

// ── source 1: PostHog job_created -> (job_id, guest distinct_id) ────────────

async function loadGuestJobsFromPostHog(): Promise<GuestJob[]> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  if (!key || !projectId) {
    throw new Error(
      'POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID are required unless --mapping is given.',
    )
  }
  // Deliberately NOT POSTHOG_HOST: that is the ingestion host, which does not
  // serve /api/projects/:id/query/.
  const host = (process.env.POSTHOG_API_HOST || 'https://us.posthog.com').replace(/\/$/, '')
  const query = `
    SELECT properties.job_id AS job_id, distinct_id AS guest_distinct_id
    FROM events
    WHERE timestamp >= now() - INTERVAL ${LOOKBACK_DAYS} DAY
      AND event = 'job_created'
      AND distinct_id LIKE 'guest_%'
      AND properties.job_id IS NOT NULL
  `
  const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const hint =
      res.status === 404
        ? ` (404 usually means POSTHOG_API_HOST points at the ingestion host; it should be the app host, e.g. https://us.posthog.com)`
        : ''
    throw new Error(`PostHog query failed (${res.status})${hint}: ${detail.slice(0, 300)}`)
  }
  const body = (await res.json()) as { results?: [string, string][] }
  return (body.results ?? [])
    .filter(([jobId, guestId]) => jobId && guestId)
    .map(([job_id, guest_distinct_id]) => ({ job_id, guest_distinct_id }))
}

/** Accepts the JSON array this script's dry run prints, or a job_id,guest_id CSV. */
function loadGuestJobsFromFile(file: string): GuestJob[] {
  const raw = fs.readFileSync(file, 'utf8').trim()
  if (raw.startsWith('[')) return JSON.parse(raw) as GuestJob[]
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('job_id'))
    .map((line) => {
      const [job_id, guest_distinct_id] = line.split(',').map((s) => s.trim())
      return { job_id, guest_distinct_id }
    })
    .filter((r) => r.job_id && r.guest_distinct_id)
}

// ── source 2: Postgres Job.id -> real userId ────────────────────────────────

async function resolveClaimedOwners(jobIds: string[]): Promise<Map<string, string>> {
  const { prisma } = await import('../src/db')
  const owners = new Map<string, string>()
  const CHUNK = 500
  for (let i = 0; i < jobIds.length; i += CHUNK) {
    const rows = await prisma.job.findMany({
      where: { id: { in: jobIds.slice(i, i + CHUNK) } },
      select: { id: true, userId: true },
    })
    for (const row of rows) {
      // A userId still shaped like a guest means the job was never claimed —
      // there is no account to merge it onto, so it is not a candidate.
      if (row.userId && !isGuestId(row.userId)) owners.set(row.id, row.userId)
    }
  }
  return owners
}

// ── resumability ────────────────────────────────────────────────────────────

function loadDone(): Set<string> {
  try {
    return new Set(fs.readFileSync(STATE_PATH, 'utf8').split('\n').filter(Boolean))
  } catch {
    return new Set()
  }
}

function markDone(jobId: string): void {
  fs.appendFileSync(STATE_PATH, `${jobId}\n`, 'utf8')
}

// ── selection (pure, unit-tested) ───────────────────────────────────────────

export type SelectionResult = {
  pairs: AliasPair[]
  /** No claimed owner, or an owner that is itself a guest id. */
  skippedUnclaimed: number
  skippedDone: number
}

/**
 * Decide which guest jobs get an alias. Pure so the rules can be tested without
 * Postgres or PostHog — this is the part that decides what gets written, and a
 * merge has no documented undo.
 *
 * A job is a candidate only if it was CLAIMED — owners holds a non-guest userId
 * for it — and it has not already been backfilled.
 *
 * There is no separate self-alias check: a userId equal to the guest distinct
 * id is guest-shaped by definition, so the guest-owner rule already covers it.
 * A dedicated branch for it was unreachable.
 */
export function selectAliasPairs(
  guestJobs: GuestJob[],
  owners: Map<string, string>,
  done: Set<string>,
): SelectionResult {
  const pairs: AliasPair[] = []
  let skippedUnclaimed = 0
  let skippedDone = 0

  for (const g of guestJobs) {
    const userId = owners.get(g.job_id)
    if (!userId || isGuestId(userId)) {
      skippedUnclaimed++
      continue
    }
    if (done.has(g.job_id)) {
      skippedDone++
      continue
    }
    pairs.push({ job_id: g.job_id, guest_distinct_id: g.guest_distinct_id, user_id: userId })
  }
  return { pairs, skippedUnclaimed, skippedDone }
}

// ── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[backfill] mode: ${APPLY ? 'APPLY (writes to PostHog)' : 'DRY RUN (no writes)'}`)

  const guestJobs = MAPPING_PATH
    ? loadGuestJobsFromFile(MAPPING_PATH)
    : await loadGuestJobsFromPostHog()
  console.log(`[backfill] guest jobs seen in PostHog: ${guestJobs.length}`)

  const owners = await resolveClaimedOwners(guestJobs.map((g) => g.job_id))
  console.log(`[backfill] of those, claimed by a real account: ${owners.size}`)

  const done = loadDone()
  const { pairs, skippedUnclaimed, skippedDone } = selectAliasPairs(
    guestJobs,
    owners,
    done,
  )

  const planned = LIMIT > 0 ? pairs.slice(0, LIMIT) : pairs

  console.log(`[backfill] skipped — never claimed:      ${skippedUnclaimed}`)
  console.log(`[backfill] skipped — already backfilled: ${skippedDone}`)
  console.log(`[backfill] TO ALIAS: ${planned.length}${LIMIT > 0 ? ` (capped by --limit ${LIMIT})` : ''}`)

  if (planned.length === 0) {
    console.log('[backfill] nothing to do.')
    return
  }

  console.log('\n[backfill] pairs (alias -> canonical):')
  for (const p of planned) {
    console.log(`  ${p.guest_distinct_id}  ->  ${p.user_id}   (job ${p.job_id})`)
  }

  if (!APPLY) {
    const out = path.join(process.cwd(), 'backfill-guest-aliases.preview.json')
    fs.writeFileSync(out, JSON.stringify(planned, null, 2), 'utf8')
    console.log(`\n[backfill] DRY RUN — nothing written. Preview saved to ${out}`)
    console.log('[backfill] re-run with --apply to write these aliases. There is no documented undo.')
    return
  }

  const posthogKey = process.env.POSTHOG_KEY
  if (!posthogKey) throw new Error('POSTHOG_KEY is required for --apply.')
  const { PostHog } = await import('posthog-node')
  const client = new PostHog(posthogKey, {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
  })

  let applied = 0
  for (const p of planned) {
    try {
      client.alias({ distinctId: p.user_id, alias: p.guest_distinct_id })
      markDone(p.job_id)
      applied++
      if (applied % 100 === 0) {
        await client.flush()
        console.log(`[backfill] applied ${applied}/${planned.length}`)
      }
    } catch (err) {
      console.error(`[backfill] FAILED ${p.guest_distinct_id} -> ${p.user_id}:`, err)
    }
  }
  await client.flush()
  await client.shutdown()
  console.log(`[backfill] done. applied ${applied}/${planned.length}`)
  console.log('[backfill] merges are asynchronous; allow a few minutes before verifying.')
}

// Run only when invoked directly. An env-var guard would not work: ESM hoists
// imports, so a test setting the var before its import statement still runs
// after this module has already executed.
const invokedDirectly =
  !!process.argv[1] && path.resolve(process.argv[1]).endsWith('backfillGuestJobAliases.ts')

if (invokedDirectly) {
  main()
    .catch((err) => {
    console.error('[backfill] fatal:', err instanceof Error ? err.message : err)
      process.exitCode = 1
    })
    .finally(() => {
      void import('../src/db').then((m) => m.prisma.$disconnect()).catch(() => {})
    })
}
