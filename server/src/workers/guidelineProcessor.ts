import 'dotenv/config'
import Queue from 'bull'
import type { Prisma } from '@prisma/client'
import { createRedisClient } from '../utils/redis'
import { prisma } from '../db'
import { enforceGuideline, enforceGuidelineCaptions, type CaptionCue, type CaptionFormat, type ParsedRule } from '../services/guidelineEnforcer'
import { computeTranscriptDiff } from '../services/diffEngine'
import { getLogger, withJobContext } from '../lib/logger'
import { updateJobCompleted, updateJobFailed, updateJobStarted } from '../lib/jobAnalytics'
import { pushLogEntry } from '../lib/logRing'
import { buildValidationReport } from '../services/guidelineValidation'
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

function formatSrtTime(t: string): string {
  // Normalize HH:MM:SS.mmm or HH:MM:SS,mmm → SRT uses comma
  return t.replace('.', ',')
}
function formatVttTime(t: string): string {
  return t.replace(',', '.')
}
function cuesToSrt(cues: CaptionCue[]): string {
  const blocks: string[] = []
  cues.forEach((c, i) => {
    blocks.push(String(i + 1))
    blocks.push(`${formatSrtTime(c.startTime)} --> ${formatSrtTime(c.endTime)}`)
    blocks.push(c.text || '')
    blocks.push('')
  })
  return blocks.join('\n')
}
function cuesToVtt(cues: CaptionCue[]): string {
  const lines: string[] = ['WEBVTT', '']
  cues.forEach((c) => {
    lines.push(`${formatVttTime(c.startTime)} --> ${formatVttTime(c.endTime)}`)
    lines.push(c.text || '')
    lines.push('')
  })
  return lines.join('\n')
}

async function handleGuidelineJob(job: Queue.Job<GuidelineJobPayload>): Promise<void> {
  const { formattingJobId, transcriptText, rules, userId, inputFormat, cues } = job.data
  const started = Date.now()
  const jobLog = withJobContext(formattingJobId)

  try {
    // Dashboard-visible Job status
    void updateJobStarted(formattingJobId)

    jobLog.info({
      msg: 'guideline_format_started',
      userId,
      rulesCount: rules.length,
      captionMode: Boolean(inputFormat && cues && cues.length > 0),
      inputFormat: inputFormat ?? null,
    })
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

    // Stage: formatting
    await prisma.formattingJob.update({
      where: { id: formattingJobId },
      data: { stage: 'formatting' },
    })

    let outputText: string
    let flaggedSegments: unknown[]
    let appliedRules: string[]
    let captionMetaPreserved: boolean | undefined = undefined

    if (inputFormat && cues && cues.length > 0) {
      const result = await enforceGuidelineCaptions(inputFormat, cues, rules)
      outputText = inputFormat === 'vtt' ? cuesToVtt(result.cues) : cuesToSrt(result.cues)
      flaggedSegments = result.flaggedSegments
      appliedRules = result.appliedRules
      captionMetaPreserved = true
    } else {
      const result = await enforceGuideline(transcriptText, rules)
      outputText = result.outputText
      flaggedSegments = result.flaggedSegments
      appliedRules = result.appliedRules
    }

    const diffSegments = computeTranscriptDiff(transcriptText, outputText)

    // Stage: validating (build verification report)
    await prisma.formattingJob.update({
      where: { id: formattingJobId },
      data: { stage: 'validating' },
    })

    const report = buildValidationReport({
      inputText: transcriptText,
      outputText,
      flaggedCount: Array.isArray(flaggedSegments) ? flaggedSegments.length : 0,
      isCaptionMode: Boolean(inputFormat && cues && cues.length > 0),
      captionMetaPreserved,
    })

    await prisma.formattingJob.update({
      where: { id: formattingJobId },
      data: {
        status: 'completed',
        stage: 'completed',
        outputText,
        diffData: diffSegments as unknown as Prisma.InputJsonValue,
        flaggedSegments: flaggedSegments as unknown as Prisma.InputJsonValue,
        appliedRules: appliedRules as unknown as Prisma.InputJsonValue,
        validationReport: report as unknown as Prisma.InputJsonValue,
      },
    })

    void updateJobCompleted(formattingJobId, Math.max(0, Date.now() - started))
    const flaggedN = Array.isArray(flaggedSegments) ? flaggedSegments.length : 0
    jobLog.info({
      msg: 'guideline_format_completed',
      durationMs: Date.now() - started,
      flaggedCount: flaggedN,
      appliedRulesCount: appliedRules.length,
    })
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
          stage: 'failed',
          failureReason: msg.slice(0, 4000),
        },
      })
    } catch (e) {
      log.warn({ msg: 'Failed to mark FormattingJob as failed', id: formattingJobId, error: String(e) })
    }

    void updateJobFailed(formattingJobId, msg)
    jobLog.error({
      msg: 'guideline_format_failed',
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    })
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
