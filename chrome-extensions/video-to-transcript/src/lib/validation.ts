/**
 * Client-side pre-flight. Advisory only.
 *
 * Every check here also exists on the server (server/src/utils/fileValidation.ts
 * for types, server/src/services/transcriptionIntake.ts for size and duration
 * against server/src/utils/limits.ts). Running them locally saves the user a
 * doomed multi-gigabyte upload; it does NOT decide anything. Limits come from
 * the live GET /api/usage/current response for the signed-in account, never
 * from constants baked into the extension, so they can never drift from the
 * user's real plan.
 */

/** Accepted video extensions — ALLOWED_VIDEO_EXT in server/src/utils/fileValidation.ts. */
export const VIDEO_EXTENSIONS = [
  '.mp4', '.mov', '.avi', '.webm', '.mkv',
  '.mpeg', '.mpg', '.ogv', '.3gp', '.3g2',
  '.flv', '.wmv', '.ts', '.m4v',
] as const

/** Accepted audio extensions — same source. */
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'] as const

export const ACCEPTED_EXTENSIONS: readonly string[] = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS]

/** `accept` attribute for the file input. */
export const FILE_INPUT_ACCEPT = [...ACCEPTED_EXTENSIONS, 'video/*', 'audio/*'].join(',')

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export function isAudioFile(file: File): boolean {
  if (file.type && file.type.startsWith('audio/')) return true
  return (AUDIO_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))
}

export function isAcceptedFile(file: File): boolean {
  if ((ACCEPTED_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))) return true
  // Some systems report a correct MIME type with an unusual extension.
  return Boolean(file.type) && (file.type.startsWith('video/') || file.type.startsWith('audio/'))
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export interface PlanLimitsForPreflight {
  /** Bytes. From usage.limits.maxFileSize. */
  maxFileSize?: number
  /** Minutes. From usage.limits.maxVideoDuration. */
  maxVideoDuration?: number
}

export interface PreflightResult {
  allowed: boolean
  reason?: string
}

/**
 * Read a media file's duration locally using an <video>/<audio> element with
 * preload="metadata" — the same technique as
 * client/src/lib/uploadPreflight.ts::getVideoDurationSeconds. Returns null when
 * the browser cannot decode the container; the server then decides via ffprobe.
 */
export function readMediaDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const element = document.createElement(isAudioFile(file) ? 'audio' : 'video')
    element.preload = 'metadata'

    const finish = (value: number | null) => {
      element.removeEventListener('loadedmetadata', onLoaded)
      element.removeEventListener('error', onError)
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const onLoaded = () => finish(Number.isFinite(element.duration) ? element.duration : null)
    const onError = () => finish(null)
    // Never block the UI on a container the browser is slow to parse.
    const timer = setTimeout(() => finish(null), 8000)

    element.addEventListener('loadedmetadata', onLoaded)
    element.addEventListener('error', onError)
    element.src = url
  })
}

/**
 * Size + type + duration pre-flight against the signed-in account's live plan
 * limits. Mirrors client/src/lib/uploadPreflight.ts::checkVideoPreflight,
 * including its "allow when duration is unreadable" behaviour.
 */
export async function preflight(
  file: File,
  limits: PlanLimitsForPreflight
): Promise<PreflightResult> {
  if (!isAcceptedFile(file)) {
    return {
      allowed: false,
      reason: `${file.name || 'That file'} isn't a supported media file. Upload MP4, MOV, MKV, AVI, WebM, MP3, WAV, M4A, FLAC or AAC.`,
    }
  }

  if (limits.maxFileSize != null && file.size > limits.maxFileSize) {
    return {
      allowed: false,
      reason: `This file is ${formatBytes(file.size)}. Your plan allows up to ${formatBytes(limits.maxFileSize)} per file.`,
    }
  }

  if (limits.maxVideoDuration != null) {
    const seconds = await readMediaDurationSeconds(file)
    if (seconds != null && seconds / 60 > limits.maxVideoDuration) {
      return {
        allowed: false,
        reason: `This file is ${formatDuration(seconds)} long. Your plan allows up to ${limits.maxVideoDuration} minutes per file.`,
      }
    }
  }

  return { allowed: true }
}
