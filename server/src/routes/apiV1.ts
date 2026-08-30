/**
 * Stable external API facade (private / beta) — see docs/API_PRIVATE_BETA.md.
 *
 * Every route here is a thin wrapper: authentication resolves to the same
 * VideoText User the web app uses, entitlement is the same DB-authoritative
 * subscriptionGuard/limits logic, and job creation goes through the exact
 * same production intake pipelines the web app's own upload routes use
 * (services/transcriptionIntake.ts, services/dualFileIntake.ts,
 * services/guidelineIntake.ts). There is no second processing pipeline and
 * no duplicated quota logic here — only request/response translation and
 * API-key-specific concerns (auth, Pro gating, rate limiting, pagination).
 *
 * Which internal operation each route runs is never taken from client
 * input — every route looks it up in services/apiOperations.ts
 * (PUBLIC_OPERATIONS) and forces it into the shared intake pipeline via
 * `forcedToolType`. A client sending `toolType=burn-subtitles` to
 * POST /api/v1/transcriptions cannot make burn-subtitles execute.
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
import { runTranscriptionIntake, type JobSource, type TranscriptionIntakeResult } from '../services/transcriptionIntake'
import { runFixSubtitlesDualIntake, runBurnSubtitlesIntake, type DualFileIntakeOptions } from '../services/dualFileIntake'
import { runGuidelineFormatIntake } from '../services/guidelineIntake'
import { PUBLIC_OPERATIONS, type PublicOperation } from '../services/apiOperations'
import {
  encodeCursor,
  decodeCursor,
  toExternalTranscription,
  toolTypesForOperation,
  type StableJobRow,
} from '../services/apiV1Format'
import { upload } from './upload'
import { getLogger } from '../lib/logger'

const log = getLogger('api').child({ module: 'api-v1' })
const router = express.Router()

// Reuses the exact same multer disk-storage config as the web app's
// POST /api/upload/dual — see routes/upload.ts's `upload` export.
const dualUpload = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'subtitles', maxCount: 1 },
])

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

function respondFromIntake(req: Request, res: Response, operation: PublicOperation, result: TranscriptionIntakeResult, extra?: Record<string, unknown>): void {
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
    operation,
    created_at: new Date().toISOString(),
    ...extra,
  })
}

// ---------------------------------------------------------------------------
// Single-file operations: transcriptions / subtitles / subtitle-translations
// / video-compressions — all go through the same runTranscriptionIntake()
// pipeline as POST /api/upload, just with a forced (never client-chosen)
// internal toolType.
// ---------------------------------------------------------------------------

function mountSingleFileOperation(path: string, operation: PublicOperation, extraFromBody?: (req: Request) => Record<string, unknown> | undefined) {
  const cfg = PUBLIC_OPERATIONS[operation]
  if (cfg.kind !== 'single-file') throw new Error(`apiV1: ${operation} is not a single-file operation`)

  router.post(path, upload.single('file'), async (req: Request, res: Response) => {
    const auth = req.apiV1Auth!
    const result = await runTranscriptionIntake(req, {
      source: sourceFromClientType(auth.clientType),
      apiKeyId: auth.apiKeyId,
      authenticatedUserId: auth.user.id,
      forcedToolType: cfg.internalToolType,
    })
    respondFromIntake(req, res, operation, result, extraFromBody?.(req))
  })
}

mountSingleFileOperation('/transcriptions', 'video_to_transcript')
mountSingleFileOperation('/subtitles', 'video_to_subtitles')
mountSingleFileOperation('/subtitle-translations', 'subtitle_translation', (req) => {
  // target_language is not persisted on the Job row today (no DB column — see
  // docs/API_PRIVATE_BETA.md), so it can only be echoed back at creation time,
  // from the value the request itself validated/used, not fabricated on GET.
  const targetLanguage = typeof req.body?.targetLanguage === 'string' ? req.body.targetLanguage : undefined
  return targetLanguage ? { target_language: targetLanguage } : undefined
})
mountSingleFileOperation('/video-compressions', 'video_compression')

// ---------------------------------------------------------------------------
// Dual-file operations: subtitle-fixes (subtitle required, video optional)
// and subtitle-burns (video + subtitle both required) — go through the same
// runFixSubtitlesDualIntake()/runBurnSubtitlesIntake() pipeline as
// POST /api/upload/dual.
// ---------------------------------------------------------------------------

function mountDualFileOperation(
  path: string,
  operation: PublicOperation,
  runner: (req: Request, opts: DualFileIntakeOptions) => Promise<TranscriptionIntakeResult>
) {
  router.post(path, dualUpload, async (req: Request, res: Response) => {
    const auth = req.apiV1Auth!
    const result = await runner(req, {
      source: sourceFromClientType(auth.clientType),
      apiKeyId: auth.apiKeyId,
      authenticatedUserId: auth.user.id,
    })
    respondFromIntake(req, res, operation, result)
  })
}

mountDualFileOperation('/subtitle-fixes', 'subtitle_fix', runFixSubtitlesDualIntake)
mountDualFileOperation('/subtitle-burns', 'subtitle_burn', runBurnSubtitlesIntake)

// ---------------------------------------------------------------------------
// Guideline formatting ("Make it Client Ready") — does NOT go through
// workers/videoProcessor.ts; reuses services/guidelineIntake.ts exactly as
// POST /api/guidelines/format does. See services/apiOperations.ts.
//
// Note: production's `rules` schema is only ever assembled client-side today
// (presets/custom-guide parsing live entirely in client/src/pages/GuidelineFormat.tsx —
// there is no server-side presetId->rules registry). This endpoint therefore
// requires the caller to already have a fully-formed `rules` array; it does
// not invent a preset-resolution feature that doesn't exist in production.
// ---------------------------------------------------------------------------

router.post('/guideline-formats', async (req: Request, res: Response) => {
  const auth = req.apiV1Auth!
  const result = await runGuidelineFormatIntake(req, {
    source: sourceFromClientType(auth.clientType),
    apiKeyId: auth.apiKeyId,
    authenticatedUserId: auth.user.id,
  })
  respondFromIntake(req, res, 'guideline_format', result)
})

router.get('/guideline-formats/:id', async (req: Request, res: Response) => {
  const auth = req.apiV1Auth!
  const row = await prisma.formattingJob.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      userId: true,
      status: true,
      outputText: true,
      failureReason: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!row || row.userId !== auth.user.id) {
    sendApiError(res, 'TRANSCRIPTION_NOT_FOUND', 'No guideline-format job found with that id.', { req })
    return
  }
  res.json({
    id: row.id,
    status: row.status,
    operation: 'guideline_format',
    filename: null,
    created_at: row.createdAt.toISOString(),
    completed_at: row.status === 'completed' || row.status === 'failed' ? row.updatedAt.toISOString() : null,
    failure_reason: row.failureReason,
    // Guideline formatting produces inline text, not a downloadable file —
    // there is no resultFilename/download_url for this operation in production.
    formatted_text: row.status === 'completed' ? row.outputText : null,
  })
})

// ---------------------------------------------------------------------------
// GET status/list for the six Job-table-backed operations. Scoped by
// toolTypesForOperation() so e.g. GET /api/v1/subtitle-burns/:id can never
// surface a different operation's job.
// ---------------------------------------------------------------------------

const JOB_SELECT = {
  id: true,
  userId: true,
  status: true,
  toolType: true,
  resultFilename: true,
  jobToken: true,
  videoDurationSec: true,
  fileSizeBytes: true,
  createdAt: true,
  completedAt: true,
  failureReason: true,
} as const

const DEFAULT_LIST_LIMIT = 25
const MAX_LIST_LIMIT = 100

function mountJobResource(path: string, operation: PublicOperation) {
  const toolTypes = toolTypesForOperation(operation)

  router.get(`${path}/:id`, async (req: Request, res: Response) => {
    const auth = req.apiV1Auth!
    const row = await prisma.job.findUnique({ where: { id: req.params.id }, select: JOB_SELECT })
    if (!row || row.userId !== auth.user.id || !toolTypes.includes(row.toolType)) {
      sendApiError(res, 'TRANSCRIPTION_NOT_FOUND', 'No job found with that id.', { req })
      return
    }
    res.json(toExternalTranscription(row as StableJobRow))
  })

  /**
   * GET <path>?status=&since=&limit=&cursor=
   *
   * Backed entirely by the durable Prisma Job table (never Bull), scoped to
   * the authenticated user and this operation's toolType(s), with
   * deterministic keyset pagination so equal-timestamp jobs are never
   * skipped or re-emitted across pages — required for a Zapier polling
   * trigger to dedupe correctly.
   */
  router.get(path, async (req: Request, res: Response) => {
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

    const where: Record<string, unknown> = { userId: auth.user.id, toolType: { in: toolTypes } }
    if (status) where.status = status
    if (since) where[sortField] = { gte: since }
    if (cursor) {
      where.OR = [
        { [sortField]: { gt: cursor.sortValue } },
        { [sortField]: cursor.sortValue, id: { gt: cursor.id } },
      ]
    }
    if (useCompletedAt) where.completedAt = { ...(where.completedAt as object | undefined), not: null }

    const rows = await prisma.job.findMany({
      where,
      orderBy: [{ [sortField]: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      select: JOB_SELECT,
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const last = page[page.length - 1]
    const nextCursor = hasMore && last ? encodeCursor((last as any)[sortField] as Date, last.id) : null

    res.json({
      data: page.map((row) => toExternalTranscription(row as StableJobRow)),
      pagination: { limit, next_cursor: nextCursor, has_more: hasMore },
    })
  })
}

mountJobResource('/transcriptions', 'video_to_transcript')
mountJobResource('/subtitles', 'video_to_subtitles')
mountJobResource('/subtitle-translations', 'subtitle_translation')
mountJobResource('/subtitle-fixes', 'subtitle_fix')
mountJobResource('/subtitle-burns', 'subtitle_burn')
mountJobResource('/video-compressions', 'video_compression')

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
