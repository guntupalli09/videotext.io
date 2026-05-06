import 'dotenv/config'
import Queue from 'bull'
import type { Prisma } from '@prisma/client'
import { createRedisClient } from '../utils/redis'
import { prisma } from '../db'
import { enforceGuideline, type ParsedRule } from '../services/guidelineEnforcer'
import { computeTranscriptDiff } from '../services/diffEngine'
import { getLogger } from '../lib/logger'

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
}

export const guidelineQueue = new Queue<GuidelineJobPayload>('guideline-formatting', QUEUE_SETTINGS)

let guidelineWorkerStarted = false

async function handleGuidelineJob(job: Queue.Job<GuidelineJobPayload>): Promise<void> {
  const { formattingJobId, transcriptText, rules } = job.data

  try {
    await prisma.formattingJob.update({
      where: { id: formattingJobId },
      data: { status: 'processing' },
    })

    const result = await enforceGuideline(transcriptText, rules)
    const diffSegments = computeTranscriptDiff(transcriptText, result.outputText)

    await prisma.formattingJob.update({
      where: { id: formattingJobId },
      data: {
        status: 'completed',
        outputText: result.outputText,
        diffData: diffSegments as unknown as Prisma.InputJsonValue,
        flaggedSegments: result.flaggedSegments as unknown as Prisma.InputJsonValue,
        appliedRules: result.appliedRules as unknown as Prisma.InputJsonValue,
      },
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
