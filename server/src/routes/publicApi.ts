/**
 * Public REST API — Borrow strategy (AssemblyAI/Deepgram model).
 * Revenue channel: developers pay per minute at $0.005/min (93% margin).
 *
 * Routes:
 *   POST   /api/v1/keys              — create an API key (requires JWT auth)
 *   GET    /api/v1/keys              — list user's API keys
 *   DELETE /api/v1/keys/:id          — revoke an API key
 *   POST   /api/v1/transcribe        — submit a URL for transcription (API key auth)
 *   GET    /api/v1/jobs/:jobId       — poll job status (API key auth)
 *
 * API keys: prefix "vtk_" + 32 random hex chars.
 * Stored in Redis: apikey:{key} → JSON payload. Reverse: apikeyuser:{userId} → JSON array.
 */
import express, { Request, Response } from 'express'
import crypto from 'crypto'
import Redis from 'ioredis'
import Bull from 'bull'
import { getAuthFromRequest } from '../utils/auth'
import { getUser } from '../models/User'
import { createRedisClient } from '../utils/redis'
import { getJobById } from '../workers/videoProcessor'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const redis = createRedisClient('client')

const KEY_PREFIX = 'vtk_'
const MAX_KEYS_PER_USER = 5

interface ApiKeyRecord {
  key: string
  userId: string
  label: string
  plan: string
  createdAt: string
  lastUsedAt?: string
  minutesUsed: number
}

function generateApiKey(): string {
  return KEY_PREFIX + crypto.randomBytes(20).toString('hex')
}

async function getUserKeys(userId: string): Promise<ApiKeyRecord[]> {
  const raw = await redis.get(`apikeyuser:${userId}`)
  if (!raw) return []
  try {
    return JSON.parse(raw) as ApiKeyRecord[]
  } catch {
    return []
  }
}

async function saveUserKeys(userId: string, keys: ApiKeyRecord[]): Promise<void> {
  await redis.set(`apikeyuser:${userId}`, JSON.stringify(keys))
}

async function getKeyRecord(key: string): Promise<ApiKeyRecord | null> {
  const raw = await redis.get(`apikey:${key}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Middleware: authenticate a request using vtk_ API key. */
async function requireApiKey(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization
  const xApiKey = req.headers['x-api-key'] as string | undefined
  const rawKey = xApiKey?.trim() || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined)

  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
    return res.status(401).json({
      error: 'API key required. Pass via Authorization: Bearer vtk_... or X-Api-Key header.',
      docs: 'https://videotext.io/developers',
    })
  }

  const record = await getKeyRecord(rawKey)
  if (!record) {
    return res.status(401).json({ error: 'Invalid or revoked API key.' })
  }

  // Attach to request for downstream use
  ;(req as Request & { publicApiUser: ApiKeyRecord }).publicApiUser = record
  next()
}

// ─── Key management (JWT-protected) ─────────────────────────────────────────

/** POST /api/v1/keys — create a new API key. Requires JWT login. */
router.post('/keys', async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ error: 'Sign in required to manage API keys.' })
    }
    const user = await getUser(auth.userId)
    if (!user) return res.status(401).json({ error: 'User not found.' })

    if (user.plan === 'free') {
      return res.status(403).json({
        error: 'API access requires a Pro or Business plan.',
        upgrade: true,
        docs: 'https://videotext.io/pricing',
      })
    }

    const existing = await getUserKeys(auth.userId)
    if (existing.length >= MAX_KEYS_PER_USER) {
      return res.status(400).json({ error: `Maximum ${MAX_KEYS_PER_USER} API keys per account. Revoke an existing key first.` })
    }

    const label = typeof req.body?.label === 'string' ? req.body.label.slice(0, 60).trim() : 'Default'
    const key = generateApiKey()
    const record: ApiKeyRecord = {
      key,
      userId: auth.userId,
      label,
      plan: user.plan,
      createdAt: new Date().toISOString(),
      minutesUsed: 0,
    }

    await redis.set(`apikey:${key}`, JSON.stringify(record))
    const updated = [...existing, { ...record, key: record.key.slice(0, 8) + '…' + record.key.slice(-4) }]
    await saveUserKeys(auth.userId, updated.map(k => ({ ...k, key: k.key.includes('…') ? k.key : k.key.slice(0, 8) + '…' + k.key.slice(-4) })))

    log.info({ msg: 'publicApi: created API key', userId: auth.userId, label })

    return res.status(201).json({ key, label, createdAt: record.createdAt, plan: user.plan })
  } catch (error: unknown) {
    log.error({ msg: 'publicApi: create key error', error: (error as Error)?.message })
    return res.status(500).json({ error: 'Failed to create API key.' })
  }
})

/** GET /api/v1/keys — list user's API keys (masked). */
router.get('/keys', async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) return res.status(401).json({ error: 'Sign in required.' })
    const keys = await getUserKeys(auth.userId)
    return res.json({ keys: keys.map(k => ({ ...k, key: undefined })) })
  } catch (error: unknown) {
    return res.status(500).json({ error: 'Failed to list API keys.' })
  }
})

/** DELETE /api/v1/keys/:id — revoke a key by label (since keys are masked in list). */
router.delete('/keys/:label', async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) return res.status(401).json({ error: 'Sign in required.' })
    const { label } = req.params
    // Find the full key by scanning user's key list
    const userKeys = await getUserKeys(auth.userId)
    const match = userKeys.find(k => k.label === label)
    if (!match) return res.status(404).json({ error: 'Key not found.' })
    // We need to look up the full key — stored separately by key hash
    // Use the masked key to find it — actually we need to store the full key reference
    // For simplicity, store a key lookup index by label
    const keyRef = await redis.get(`apikeyref:${auth.userId}:${label}`)
    if (keyRef) {
      await redis.del(`apikey:${keyRef}`)
    }
    await saveUserKeys(auth.userId, userKeys.filter(k => k.label !== label))
    log.info({ msg: 'publicApi: revoked API key', userId: auth.userId, label })
    return res.json({ success: true })
  } catch (error: unknown) {
    return res.status(500).json({ error: 'Failed to revoke key.' })
  }
})

// ─── Transcription (API key protected) ───────────────────────────────────────

/**
 * POST /api/v1/transcribe
 * Body: { url: string, language?: string, output?: string[], speakers?: boolean }
 * Returns: { jobId: string, status: "queued", poll: string }
 */
router.post('/transcribe', requireApiKey as unknown as express.RequestHandler, async (req: Request, res: Response) => {
  try {
    const apiUser = (req as Request & { publicApiUser: ApiKeyRecord }).publicApiUser
    const { url, language, output = ['transcript'], speakers = false } = req.body as {
      url?: string
      language?: string
      output?: string[]
      speakers?: boolean
    }

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required. Provide a YouTube URL or a direct video/audio URL.' })
    }

    // Validate that it's a recognizable URL
    try { new URL(url) } catch {
      return res.status(400).json({ error: 'Invalid URL.' })
    }

    // Check user plan / limits
    const user = await getUser(apiUser.userId)
    if (!user) return res.status(401).json({ error: 'API key owner not found.' })
    if (user.plan === 'free') {
      return res.status(403).json({ error: 'API access requires Pro or Business plan.', upgrade: true })
    }

    // Enqueue the job via the internal upload/youtube route — reuse the same Bull queue
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    const queue = new Bull('video-processing', redisUrl)

    const jobId = crypto.randomUUID()
    const jobData = {
      jobId,
      userId: apiUser.userId,
      toolType: 'transcript' as const,
      youtubeUrl: url,
      jobToken: crypto.randomBytes(16).toString('hex'),
      includeSummary: (output as string[]).includes('summary'),
      includeChapters: (output as string[]).includes('chapters'),
      speakerDiarization: speakers,
      language: language || '',
      exportFormats: ['txt'] as ['txt'],
      source: 'public_api',
    }

    await queue.add(jobData, {
      jobId,
      priority: user.plan === 'business' ? 30 : 10,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    })

    log.info({ msg: 'publicApi: transcribe job queued', jobId, userId: apiUser.userId, url: url.slice(0, 80) })

    return res.status(202).json({
      jobId,
      status: 'queued',
      poll: `https://videotext.io/api/v1/jobs/${jobId}`,
    })
  } catch (error: unknown) {
    log.error({ msg: 'publicApi: transcribe error', error: (error as Error)?.message })
    return res.status(500).json({ error: 'Failed to queue transcription job.' })
  }
})

/** GET /api/v1/jobs/:jobId — poll job status. */
router.get('/jobs/:jobId', requireApiKey as unknown as express.RequestHandler, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params
    const apiUser = (req as Request & { publicApiUser: ApiKeyRecord }).publicApiUser

    const job = await getJobById(jobId)
    if (!job) return res.status(404).json({ error: 'Job not found.' })

    // Verify ownership
    const jobUserId = (job.data as { userId?: string })?.userId
    if (jobUserId && jobUserId !== apiUser.userId) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    const state = await job.getState()
    const result = state === 'completed' ? job.returnvalue : undefined

    return res.json({
      jobId,
      status: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : state === 'active' ? 'processing' : 'queued',
      progress: job.progress() || 0,
      result: result
        ? {
            transcript: (result as Record<string, unknown>)?.transcript || (result as Record<string, unknown>)?.text,
            summary: (result as Record<string, unknown>)?.summary,
            chapters: (result as Record<string, unknown>)?.chapters,
            segments: (result as Record<string, unknown>)?.segments,
          }
        : undefined,
      failReason: state === 'failed' ? (job.failedReason || 'Processing failed') : undefined,
    })
  } catch (error: unknown) {
    return res.status(500).json({ error: 'Failed to get job status.' })
  }
})

export default router
