import 'dotenv/config'
import Queue from 'bull'
import type { Prisma } from '@prisma/client'
import { createRedisClient } from '../utils/redis'
import { prisma } from '../db'
import { enforceGuideline, enforceGuidelineCaptions, type CaptionCue, type CaptionFormat, type ParsedRule } from '../services/guidelineEnforcer'
import { computeTranscriptDiff } from '../services/diffEngine'
import { getLogger } from '../lib/logger'
import { updateJobCompleted, updateJobFailed, updateJobStarted } from '../lib/jobAnalytics'
import { pushLogEntry } from '../lib/logRing'
// Note: server has numeric-time subtitle utilities, but this formatting job runs on pasted text.
// We preserve original timestamp strings and serialize captions on the client.

const log = getLogger('worker')

/** Same Redis / lock pattern as file-processing in videoProcessor.ts */
const QUEUE_SETTINGS = {
  createClient: createRedisClient,
  settings: {
    lockDuration: 600000,
    lockRenewTime: 15000,
    maxStalledCount: 3,
    stalledInterval: 30000,
  },
}

export interface GuidelineJobPayload {
  formattingJobId: string
  transcriptText: string
  rules: ParsedRule[]
  userId: string
  inputFormat?: CaptionFormat
  cues?: CaptionCue[]
}

export const guidelineQueue = new Queue<GuidelineJobPayload>('guideline-formatting', QUEUE_SETTINGS)

let guidelineWorkerStarted = false

async function handleGuidelineJob(job: Queue.Job<GuidelineJobPayload>): Promise<void> {
  const { formattingJobId, transcriptText, rules, inputFormat, cues } = job.data
  const started = Date.now()

  try {
    // Dashboard-visible Job status
    void updateJobStarted(formattingJobId)

    pushLogEntry({
      ts: new Date().toISOString(),
      level: 'info',
      service: 'worker',
      msg: 'guideline_format_started',
      jobId: formattingJobId,
      module: 'guidelineProcessor',
    })

    await prisma.formattingJob.update({
      where: { id: formattingJobId },
      data: { status: 'processing' },
    })

    let outputText: string
    let flaggedSegments: unknown[]
    let appliedRules: string[]

    if (inputFormat && cues && cues.length > 0) {
      const result = await enforceGuidelineCaptions(inputFormat, cues, rules)
      // We preserve timing metadata and serialize SRT/VTT on the client. Store plain cue text so UI can render outputText.
      outputText = result.cues.map((c) => c.text).join('\n\n')
      flaggedSegments = result.flaggedSegments
      appliedRules = result.appliedRules
    } else {
      const result = await enforceGuideline(transcriptText, rules)
      outputText = result.outputText
      flaggedSegments = result.flaggedSegments
      appliedRules = result.appliedRules
    }

    const diffSegments = computeTranscriptDiff(transcriptText, outputText)

    await prisma.formattingJob.update({
      where: { id: formattingJobId },
      data: {
        status: 'completed',
        outputText,
        diffData: diffSegments as unknown as Prisma.InputJsonValue,
        flaggedSegments: flaggedSegments as unknown as Prisma.InputJsonValue,
        appliedRules: appliedRules as unknown as Prisma.InputJsonValue,
      },
    })

    void updateJobCompleted(formattingJobId, Math.max(0, Date.now() - started))
    pushLogEntry({
      ts: new Date().toISOString(),
      level: 'info',
      service: 'worker',
      msg: 'guideline_format_completed',
      jobId: formattingJobId,
      module: 'guidelineProcessor',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try {
      await prisma.formattingJob.update({
        where: { id: formattingJobId },
        data: {
          status: 'failed',
          failureReason: msg.slice(0, 4000),
        },
      })
    } catch (e) {
      log.warn({ msg: 'Failed to mark FormattingJob as failed', id: formattingJobId, error: String(e) })
    }

    void updateJobFailed(formattingJobId, msg)
    pushLogEntry({
      ts: new Date().toISOString(),
      level: 'error',
      service: 'worker',
      msg: 'guideline_format_failed',
      jobId: formattingJobId,
      module: 'guidelineProcessor',
      extra: msg.slice(0, 300),
    })
    throw err
  }
}

/** Register Bull processor (idempotent). Call from API worker startup and standalone worker entry. */
export function startGuidelineWorker(): void {
  if (guidelineWorkerStarted) return
  guidelineWorkerStarted = true
  guidelineQueue.process(1, handleGuidelineJob)
  log.info({ msg: 'guideline-formatting queue processor started', concurrency: 1 })
}

if (require.main === module) {
  startGuidelineWorker()
  log.info({ msg: 'guidelineProcessor standalone: queue worker running' })
}
