import express, { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { getEffectiveUserId } from '../utils/auth'
import { prisma } from '../db'
import { guidelineQueue } from '../workers/guidelineProcessor'
import type { ParsedRule } from '../services/guidelineEnforcer'
import { insertJobRecord } from '../lib/jobAnalytics'
import { pushLogEntry } from '../lib/logRing'

const router = express.Router()

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

router.post('/format', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const transcriptText =
      typeof req.body?.transcriptText === 'string' ? req.body.transcriptText : ''
    const trimmed = transcriptText.trim()
    if (!trimmed) {
      return res.status(400).json({ error: 'transcriptText must be a non-empty string' })
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

    await guidelineQueue.add(
      {
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
      outputText: row.outputText,
      diffData: row.diffData,
      flaggedSegments: row.flaggedSegments,
      appliedRules: row.appliedRules,
      createdAt: row.createdAt.toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return res.status(500).json({ error: msg })
  }
})

export default router
