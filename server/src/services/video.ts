import path from 'path'
import fs from 'fs'
import { probeVideoDurationResult } from './ffmpeg'
import type { DurationProbeSource } from './ffmpeg'
import { getLogger } from '../lib/logger'
const videoLog = getLogger('worker')

export type ValidateVideoDurationResult = {
  valid: boolean
  duration?: number
  /** When true, duration is a reliable probe; when false, job may still proceed (limits applied post-hoc). */
  durationKnown?: boolean
  durationSource?: DurationProbeSource
  error?: string
}

/**
 * Validate video duration against plan max. For free plan, unknown duration
 * rejects the job (prevents unbounded processing). Paid plans allow unknown
 * duration since metering catches it post-hoc.
 */
export async function validateVideoDuration(
  videoPath: string,
  maxDurationMinutes = 15,
  plan?: string
): Promise<ValidateVideoDurationResult> {
  if (!fs.existsSync(videoPath)) {
    return {
      valid: false,
      error: `Video file not found: ${videoPath}`,
    }
  }

  const r = await probeVideoDurationResult(videoPath)
  if (!r.known) {
    if (plan === 'free') {
      videoLog.info({
        msg: 'video_duration_unknown_rejecting_free',
        videoPath,
        duration_source: r.source,
      })
      return {
        valid: false,
        durationKnown: false,
        durationSource: r.source,
        error: 'Could not determine video length. Please re-encode the file or try a different format.',
      }
    }
    videoLog.info({
      msg: 'video_duration_unknown_allowing_job',
      videoPath,
      duration_source: r.source,
    })
    return { valid: true, durationKnown: false, durationSource: r.source }
  }

  const maxDuration = maxDurationMinutes * 60
  if (r.seconds > maxDuration) {
    return {
      valid: false,
      duration: r.seconds,
      durationKnown: true,
      durationSource: r.source,
      error: `Video exceeds ${maxDurationMinutes} minutes (${Math.round(r.seconds / 60)} minutes). Upgrade for longer videos.`,
    }
  }
  return { valid: true, duration: r.seconds, durationKnown: true, durationSource: r.source }
}

/**
 * Best-effort seconds for metering / API after work: trim → known probe → segment max → re-probe paths.
 */
export async function resolveMeteringSeconds(args: {
  /** Probe / gate result: only `duration` + `durationKnown` affect resolution order. */
  durationCheck: { duration?: number; durationKnown?: boolean }
  trimmedStart?: number
  trimmedEnd?: number
  segments?: { end: number }[]
  videoPath?: string
  secondaryVideoPaths?: string[]
}): Promise<number> {
  if (args.trimmedStart !== undefined && args.trimmedEnd !== undefined) {
    return Math.max(0, args.trimmedEnd - args.trimmedStart)
  }
  if (args.durationCheck.durationKnown && args.durationCheck.duration != null && args.durationCheck.duration > 0) {
    return args.durationCheck.duration
  }
  if (args.segments && args.segments.length > 0) {
    const m = Math.max(...args.segments.map((s) => s.end))
    if (m > 0) return m
  }
  const paths = [args.videoPath, ...(args.secondaryVideoPaths ?? [])].filter(Boolean) as string[]
  for (const p of paths) {
    const r = await probeVideoDurationResult(p)
    if (r.known && r.seconds > 0) return r.seconds
  }
  return 0
}

/**
 * Generate output filename with suffix
 */
export function generateOutputFilename(originalName: string, suffix: string, extension?: string): string {
  const ext = extension || path.extname(originalName)
  const nameWithoutExt = path.basename(originalName, path.extname(originalName))
  return `${nameWithoutExt}${suffix}${ext}`
}

/** URL-based downloads are disabled. Rejects immediately. */
export async function downloadVideoFromURL(_url: string, _outputPath: string): Promise<string> {
  throw new Error('URL downloads are temporarily disabled.')
}
