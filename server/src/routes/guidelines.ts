import express, { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { prisma } from '../db'
import { guidelineQueue } from '../workers/guidelineProcessor'
import type { CaptionCue, CaptionFormat, ParsedRule } from '../services/guidelineEnforcer'
import { insertJobRecord } from '../lib/jobAnalytics'
import { pushLogEntry } from '../lib/logRing'
import multer from 'multer'
import { PDFParse, VerbosityLevel } from 'pdf-parse'
import mammoth from 'mammoth'
import { extractRulesFromGuideText } from '../services/guidelineRuleExtractor'
import Redis from 'ioredis'
import type { PlanType } from '../models/User'

const router = express.Router()

const guideUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB is enough for most style guides
})

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const gateRedis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
})

function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 1000))
}

function todayUTCString(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function guidelineDailyKey(userId: string): string {
  return `guidelines:daily:${userId}:${todayUTCString()}`
}

async function checkAndRecordGuidelineDaily(userId: string, limit: number): Promise<boolean> {
  const key = guidelineDailyKey(userId)
  const ttl = secondsUntilMidnightUTC()
  try {
    const pipeline = gateRedis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, ttl)
    const results = await pipeline.exec()
    const count = (results?.[0]?.[1] as number) ?? 1
    return count <= limit
  } catch {
    // fail-open; do not block formatting if Redis is unavailable
    return true
  }
}

function estimateTranscriptMinutes(text: string): number {
  // Conservative: ~150 words/minute
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return words / 150
}

function getPlanFromRequest(req: Request): PlanType {
  const auth = getAuthFromRequest(req)
  if (auth?.plan) return auth.plan
  const apiKeyPlan = (req as unknown as { apiKeyUser?: { plan?: PlanType } }).apiKeyUser?.plan
  return apiKeyPlan || 'free'
}

function validateRules(body: unknown): ParsedRule[] | null {
  if (!body || typeof body !== 'object') return null
  const rules = (body as { rules?: unknown }).rules
  if (!Array.isArray(rules) || rules.length === 0) return null
  const out: ParsedRule[] = []
  for (const r of rules) {
    if (!r || typeof r !== 'object') return null
    const o = r as Record<string, unknown>
    if (
      typeof o.id !== 'string' ||
      typeof o.category !== 'string' ||
      typeof o.label !== 'string' ||
      typeof o.currentValue !== 'string'
    ) {
      return null
    }
    out.push({
      id: o.id,
      category: o.category,
      label: o.label,
      currentValue: o.currentValue,
    })
  }
  return out
}

function validateCaptionPayload(body: unknown): { format: CaptionFormat; cues: CaptionCue[] } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const f = b.inputFormat
  if (f !== 'srt' && f !== 'vtt') return null
  const cues = b.cues
  if (!Array.isArray(cues) || cues.length === 0) return null
  const out: CaptionCue[] = []
  for (const c of cues) {
    if (!c || typeof c !== 'object') return null
    const o = c as Record<string, unknown>
    if (
      typeof o.index !== 'number' ||
      typeof o.startTime !== 'string' ||
      typeof o.endTime !== 'string' ||
      typeof o.text !== 'string'
    ) {
      return null
    }
    out.push({ index: o.index, startTime: o.startTime, endTime: o.endTime, text: o.text })
  }
  return { format: f, cues: out }
}

router.post('/format', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const plan = getPlanFromRequest(req)

    const transcriptText =
      typeof req.body?.transcriptText === 'string' ? req.body.transcriptText : ''
    const trimmed = transcriptText.trim()
    if (!trimmed) {
      return res.status(400).json({ error: 'transcriptText must be a non-empty string' })
    }

    // Plan gating: free users get limited daily runs + transcript size cap.
    if (plan === 'free') {
      const allowed = await checkAndRecordGuidelineDaily(userId, 3)
      if (!allowed) {
        return res.status(429).json({ error: 'Free plan limit reached: 3 guideline formats per day. Upgrade to Pro for unlimited.' })
      }
      const mins = estimateTranscriptMinutes(trimmed)
      if (mins > 30) {
        return res.status(400).json({ error: 'Free plan supports up to ~30 minutes of transcript text per run. Upgrade to Pro for longer transcripts.' })
      }
    }

    const rules = validateRules(req.body)
    if (!rules) {
      return res.status(400).json({
        error: 'rules must be a non-empty array; each item needs id, category, label, currentValue strings',
      })
    }

    const presetIdRaw = req.body?.presetId
    const presetId = typeof presetIdRaw === 'string' && presetIdRaw.length > 0 ? presetIdRaw : null

    const job = await prisma.formattingJob.create({
      data: {
        userId,
        inputText: trimmed,
        status: 'queued',
        stage: 'queued',
        appliedRules: rules as unknown as Prisma.InputJsonValue,
        presetId,
      },
    })

    // Mirror into the persistent Job table so the Founder Dashboard counts it like other tools.
    // Fire-and-forget by design (jobAnalytics.ts handles its own errors).
    void insertJobRecord({
      id: job.id,
      userId,
      toolType: 'guideline-formatting',
    })

    const caption = validateCaptionPayload(req.body)

    await guidelineQueue.add(
      caption
        ? {
            formattingJobId: job.id,
            transcriptText: trimmed,
            rules,
            userId,
            inputFormat: caption.format,
            cues: caption.cues,
          }
        : {
            formattingJobId: job.id,
            transcriptText: trimmed,
            rules,
            userId,
          },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    )

    // Surface in Command Centre log viewer (Redis log ring).
    pushLogEntry({
      ts: new Date().toISOString(),
      level: 'info',
      service: 'api',
      msg: 'guideline_format_enqueued',
      jobId: job.id,
      module: 'guidelines',
    })

    return res.status(200).json({ jobId: job.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return res.status(500).json({ error: msg })
  }
})

router.post('/parse-guide', guideUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'Missing file' })
    }

    const name = (file.originalname || '').toLowerCase()
    let text = ''

    if (name.endsWith('.txt') || file.mimetype.startsWith('text/')) {
      text = file.buffer.toString('utf-8')
    } else if (name.endsWith('.pdf') || file.mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: file.buffer, verbosity: VerbosityLevel.ERRORS })
      const tr = await parser.getText()
      text = typeof tr === 'string' ? tr : (tr as { text?: string }).text || ''
    } else if (
      name.endsWith('.docx') ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer })
      text = result.value || ''
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload PDF, DOCX, or TXT.' })
    }

    const cleaned = text.replace(/\u0000/g, '').trim()
    if (!cleaned) {
      return res.status(400).json({ error: 'Could not extract any text from this file.' })
    }

    const rules = await extractRulesFromGuideText(cleaned)
    if (!rules.length) {
      return res.status(400).json({ error: 'Could not extract rules from this guide. Try a different file or use a preset.' })
    }

    pushLogEntry({
      ts: new Date().toISOString(),
      level: 'info',
      service: 'api',
      msg: 'guideline_custom_guide_parsed',
      module: 'guidelines',
    })

    return res.status(200).json({ rules })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return res.status(500).json({ error: msg })
  }
})

router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const jobId = typeof req.params.jobId === 'string' ? req.params.jobId.trim() : ''
    if (!jobId) {
      return res.status(400).json({ error: 'Invalid job id' })
    }

    const row = await prisma.formattingJob.findFirst({
      where: { id: jobId, userId },
    })

    if (!row) {
      return res.status(404).json({ error: 'Job not found' })
    }

    return res.status(200).json({
      status: row.status,
      stage: row.stage,
      outputText: row.outputText,
      diffData: row.diffData,
      flaggedSegments: row.flaggedSegments,
      appliedRules: row.appliedRules,
      validationReport: row.validationReport,
      createdAt: row.createdAt.toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return res.status(500).json({ error: msg })
  }
})

export default router
