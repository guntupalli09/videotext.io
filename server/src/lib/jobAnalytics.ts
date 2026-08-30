/**
 * Phase 2 analytics: persistent Job records for dashboard/usage.
 * All writes are fire-and-forget; failures are logged and do not block main flow.
 */

import { prisma } from '../db'
import { getLogger } from './logger'

const log = getLogger('api').child({ module: 'job-analytics' })

export interface InsertJobParams {
  id: string
  userId: string
  toolType: string
  planAtRun?: string
  fileSizeBytes?: number
  /** Anonymous-access token mirrored from the Bull job (JobData.jobToken). */
  jobToken?: string
  /** Where the request originated — server-set only, never a client-supplied value. */
  source?: 'web' | 'api' | 'zapier'
  /** ApiKey.id that authenticated the request, when applicable. */
  apiKeyId?: string
}

export async function insertJobRecord(params: InsertJobParams): Promise<void> {
  // userId is NOT NULL in the Job table — skip anonymous jobs rather than failing silently
  if (!params.userId) return
  try {
    await prisma.job.create({
      data: {
        id: params.id,
        userId: params.userId,
        toolType: params.toolType,
        status: 'queued',
        fileSizeBytes: params.fileSizeBytes != null ? BigInt(params.fileSizeBytes) : null,
        planAtRun: params.planAtRun ?? null,
        jobToken: params.jobToken ?? null,
        source: params.source ?? 'web',
        apiKeyId: params.apiKeyId ?? null,
      },
    })
  } catch (err) {
    log.warn({ err, jobId: params.id, msg: 'job_analytics_insert_failed' })
  }
}

export async function updateJobStarted(jobId: string): Promise<void> {
  try {
    await prisma.job.updateMany({
      where: {
        id: jobId,
        status: { in: ['queued', 'processing'] },
      },
      data: { status: 'processing', startedAt: new Date() },
    })
  } catch (err) {
    log.warn({ err, jobId, msg: 'job_analytics_update_started_failed' })
  }
}

export async function updateJobCompleted(
  jobId: string,
  processingMs: number,
  resultFilename?: string
): Promise<void> {
  try {
    await prisma.job.updateMany({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        processingMs,
        ...(resultFilename ? { resultFilename } : {}),
      },
    })
  } catch (err) {
    log.warn({ err, jobId, msg: 'job_analytics_update_completed_failed' })
  }
}

/** Looks up the Job row that owns a given output filename (for download ownership checks). */
export async function findJobByResultFilename(filename: string): Promise<{
  id: string
  userId: string
  jobToken: string | null
} | null> {
  const row = await prisma.job.findFirst({
    where: { resultFilename: filename },
    select: { id: true, userId: true, jobToken: true },
  })
  return row
}

export async function updateJobFailed(
  jobId: string,
  failureReason: string | undefined
): Promise<void> {
  try {
    await prisma.job.updateMany({
      where: {
        id: jobId,
        status: { not: 'completed' },
      },
      data: {
        status: 'failed',
        failureReason: failureReason ?? null,
        completedAt: new Date(),
      },
    })
  } catch (err) {
    log.warn({ err, jobId, msg: 'job_analytics_update_failed_failed' })
  }
}

/**
 * Whisper pricing: $0.006 per minute (billed per second).
 * Returns cost in micro-dollars (1 USD = 1,000,000).
 * $0.006/min = $0.0001/sec = 100 micro-dollars per second.
 */
export function calcWhisperCostMicros(videoDurationSec: number): number {
  return Math.ceil(videoDurationSec * 100)
}

/**
 * Store video duration and AI cost on the Job record (fire-and-forget).
 * Called from videoProcessor right after transcription finishes.
 */
export async function updateJobDurationAndCosts(
  jobId: string,
  videoDurationSec: number,
  whisperCostMicros: number,
  totalAiCostMicros?: number
): Promise<void> {
  try {
    await prisma.job.updateMany({
      where: { id: jobId },
      data: {
        videoDurationSec: Math.round(videoDurationSec),
        whisperCostMicros,
        totalAiCostMicros: totalAiCostMicros ?? whisperCostMicros,
      },
    })
  } catch (err) {
    log.warn({ err, jobId, msg: 'job_analytics_update_costs_failed' })
  }
}
