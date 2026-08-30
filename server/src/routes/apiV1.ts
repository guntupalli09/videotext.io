/**
 * Stable external API facade (private / beta) — see docs/API_PRIVATE_BETA.md.
 *
 * Every route here is a thin wrapper: authentication resolves to the same
 * VideoText User the web app uses, entitlement is the same DB-authoritative
 * subscriptionGuard/limits logic, and job creation goes through the exact
 * same runTranscriptionIntake() pipeline as the web app's POST /api/upload.
 * There is no second transcription pipeline and no duplicated quota logic
 * here — only request/response translation and API-key-specific concerns
 * (auth, Pro gating, rate limiting, pagination).
 */
import express, { Request, Response, NextFunction } from 'express'
import { prisma } from '../db'
import { getUser } from '../models/User'
import type { User } from '../models/User'
import { resolveApiKeyDetailed, type ApiKeyClientType } from '../models/ApiKey'
import { enforceSubscriptionState, hasPaidAccess } from '../utils/subscriptionGuard'
import { getPlanLimits, getJobPriority } from '../utils/limits'
import { sendApiError } from '../utils/apiErrors'
import { apiKeyRateLimitMiddleware } from '../utils/apiKeyRateLimit'
import { runTranscriptionIntake, type JobSource } from '../services/transcriptionIntake'
import { encodeCursor, decodeCursor, toExternalTranscription, type StableJobRow } from '../services/apiV1Format'
import { upload } from './upload'
import { getLogger } from '../lib/logger'

const log = getLogger('api').child({ module: 'api-v1' })
const router = express.Router()

// ---------------------------------------------------------------------------
// Authentication + Pro gating
// ---------------------------------------------------------------------------

interface ApiV1Auth {
  user: User
  apiKeyId: string
  clientType: ApiKeyClientType
}

declare global {
  namespace Express {
    interface Request {
      apiV1Auth?: ApiV1Auth
    }
  }
}

function extractBearerKey(req: Request): string | undefined {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || undefined
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined
  return apiKeyHeader?.trim() || undefined
}

/**
 * Resolves the API key, loads the real VideoText User (DB-authoritative —
 * never trusts a plan encoded on the key), and enforces the Pro-only gate
 * using the same subscriptionGuard logic every other plan-gated route uses.
 */
async function requireApiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawKey = extractBearerKey(req)
  if (!rawKey) {
    sendApiError(res, 'INVALID_API_KEY', 'Missing API key. Send Authorization: Bearer vt_live_...', { req })
    return
  }

  let resolved
  try {
    resolved = await resolveApiKeyDetailed(rawKey)
  } catch (err) {
    log.error({ msg: 'api_key_resolve_failed', error: err instanceof Error ? err.message : String(err) })
    sendApiError(res, 'INTERNAL_ERROR', 'Failed to authenticate request.', { req })
    return
  }

  if (resolved.status === 'not_found') {
    sendApiError(res, 'INVALID_API_KEY', 'Invalid API key.', { req })
    return
  }
  if (resolved.status === 'revoked') {
    sendApiError(res, 'API_KEY_REVOKED', 'This API key has been revoked.', { req })
    return
  }

  const user = await getUser(resolved.key.userId)
  if (!user) {
    // Orphaned key (user deleted after key creation) — treat as invalid, not a 500.
    sendApiError(res, 'INVALID_API_KEY', 'Invalid API key.', { req })
    return
  }
  await enforceSubscriptionState(user)

  // hasPaidAccess() covers pro/agency/founding_workflow; 'business' (the
  // founder-account plan value) is added explicitly since it has no Stripe
  // subscriptionId for hasPaidAccess to key off — see utils/founderAccount.ts.
  if (!hasPaidAccess(user) && user.plan !== 'business') {
    sendApiError(
      res,
      'UPGRADE_REQUIRED',
      'The VideoText API is a Pro feature. Upgrade your plan to use API keys.',
      { req }
    )
    return
  }

  req.apiV1Auth = { user, apiKeyId: resolved.key.id, clientType: resolved.key.clientType }
  req.apiKeyRecord = { id: resolved.key.id, clientType: resolved.key.clientType }
  next()
}

router.use(requireApiKeyAuth, apiKeyRateLimitMiddleware)

/** Server-derived job source — never taken from client request data (see transcriptionIntake JobSource). */
function sourceFromClientType(clientType: ApiKeyClientType): JobSource {
  return clientType === 'zapier' ? 'zapier' : 'api'
}

// ---------------------------------------------------------------------------
// POST /api/v1/transcriptions
// ---------------------------------------------------------------------------

router.post('/transcriptions', upload.single('file'), async (req: Request, res: Response) => {
  const auth = req.apiV1Auth!
  const result = await runTranscriptionIntake(req, {
    source: sourceFromClientType(auth.clientType),
    apiKeyId: auth.apiKeyId,
  })

  if (!result.ok) {
    sendApiError(res, result.code, result.message, {
      req,
      httpStatus: result.httpStatus,
      ...(result.retryAfterSeconds ? { headers: { 'Retry-After': String(result.retryAfterSeconds) } } : {}),
    })
    return
  }

  res.status(202).json({
    id: result.jobId,
    status: 'queued',
    created_at: new Date().toISOString(),
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/transcriptions/:id  and  GET /api/v1/transcriptions
// ---------------------------------------------------------------------------

router.get('/transcriptions/:id', async (req: Request, res: Response) => {
  const auth = req.apiV1Auth!
  const row = await prisma.job.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      userId: true,
      status: true,
      toolType: true,
      resultFilename: true,
      jobToken: true,
      videoDurationSec: true,
      createdAt: true,
      completedAt: true,
      failureReason: true,
    },
  })

  if (!row) {
    sendApiError(res, 'TRANSCRIPTION_NOT_FOUND', 'No transcription found with that id.', { req })
    return
  }
  // Ownership enforced here — an API key only ever sees its own user's jobs.
  if (row.userId !== auth.user.id) {
    sendApiError(res, 'TRANSCRIPTION_NOT_FOUND', 'No transcription found with that id.', { req })
    return
  }

  res.json(toExternalTranscription(row))
})

const DEFAULT_LIST_LIMIT = 25
const MAX_LIST_LIMIT = 100

/**
 * GET /api/v1/transcriptions?status=&since=&limit=&cursor=
 *
 * Backed entirely by the durable Prisma Job table (never Bull), scoped to
 * the authenticated user, with deterministic keyset pagination so equal-
 * timestamp jobs are never skipped or re-emitted across pages — required
 * for a Zapier polling trigger to dedupe correctly.
 *
 * Ordering/cursor field: completedAt when status=completed (or when a
 * caller filters by `since`, which is completedAt-based), else createdAt —
 * both are always non-null for their respective query shapes, and both are
 * paired with `id` as a tiebreaker for a fully deterministic order.
 */
router.get('/transcriptions', async (req: Request, res: Response) => {
  const auth = req.apiV1Auth!
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const sinceRaw = typeof req.query.since === 'string' ? req.query.since : undefined
  const cursorRaw = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : NaN
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIST_LIMIT) : DEFAULT_LIST_LIMIT

  let since: Date | undefined
  if (sinceRaw) {
    since = new Date(sinceRaw)
    if (Number.isNaN(since.getTime())) {
      sendApiError(res, 'VALIDATION_ERROR', 'since must be an ISO 8601 timestamp.', { req })
      return
    }
  }

  const useCompletedAt = status === 'completed' || since !== undefined
  const sortField = useCompletedAt ? 'completedAt' : 'createdAt'

  let cursor: { sortValue: Date; id: string } | null = null
  if (cursorRaw) {
    cursor = decodeCursor(cursorRaw)
    if (!cursor) {
      sendApiError(res, 'VALIDATION_ERROR', 'Invalid cursor.', { req })
      return
    }
  }

  const where: Record<string, unknown> = { userId: auth.user.id }
  if (status) where.status = status
  if (since) where[sortField] = { gte: since }
  if (cursor) {
    where.OR = [
      { [sortField]: { gt: cursor.sortValue } },
      { [sortField]: cursor.sortValue, id: { gt: cursor.id } },
    ]
  }
  // Rows without the sort field (e.g. createdAt-sorted list, or a not-yet-completed
  // job when sorting by completedAt) would break a NOT NULL keyset comparison.
  if (useCompletedAt) where.completedAt = { ...(where.completedAt as object | undefined), not: null }

  const rows = await prisma.job.findMany({
    where,
    orderBy: [{ [sortField]: 'asc' }, { id: 'asc' }],
    take: limit + 1,
    select: {
      id: true,
      userId: true,
      status: true,
      toolType: true,
      resultFilename: true,
      jobToken: true,
      videoDurationSec: true,
      createdAt: true,
      completedAt: true,
      failureReason: true,
    },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  const nextCursor = hasMore && last ? encodeCursor((last as any)[sortField] as Date, last.id) : null

  res.json({
    data: page.map((row) => toExternalTranscription(row)),
    pagination: { limit, next_cursor: nextCursor, has_more: hasMore },
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/me
// ---------------------------------------------------------------------------

router.get('/me', async (req: Request, res: Response) => {
  const auth = req.apiV1Auth!
  const user = auth.user
  const limits = user.limits ?? getPlanLimits(user.plan)
  const usage = user.usageThisMonth

  res.json({
    id: user.id,
    email: user.email,
    plan: user.plan,
    usage: {
      minutes_used_this_month: usage?.totalMinutes ?? 0,
      minutes_limit_per_month: limits.minutesPerMonth,
      imports_today: usage?.importCountToday ?? 0,
      video_count_this_month: usage?.videoCount ?? 0,
      max_video_duration_minutes: limits.maxVideoDuration,
      max_file_size_bytes: limits.maxFileSize,
      max_concurrent_jobs: limits.maxConcurrentJobs,
      queue_priority: getJobPriority(user.plan),
    },
  })
})

export default router
