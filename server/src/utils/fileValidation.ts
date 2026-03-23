import { fromFile as fileTypeFromFile } from 'file-type'
import { detectSubtitleFormatFromContent } from './subtitleDetector'
import { getLogger } from '../lib/logger'
const validationLog = getLogger('api')

const ALLOWED_MIME_TYPES = [
  // Video
  'video/mp4',
  'video/quicktime',       // .mov
  'video/x-msvideo',      // .avi
  'video/webm',
  'video/x-matroska',     // .mkv
  'video/mpeg',           // .mpeg / .mpg
  'video/ogg',            // .ogv
  'video/3gpp',           // .3gp
  'video/3gpp2',          // .3g2
  'video/x-flv',          // .flv
  'video/x-ms-wmv',       // .wmv
  'video/mp2t',           // .ts
  'video/x-m4v',          // .m4v
  // Audio
  'audio/mpeg',           // .mp3
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',            // .m4a / .aac in mp4
  'audio/x-m4a',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/x-aac',
]

const ALLOWED_VIDEO_EXT = [
  '.mp4', '.mov', '.avi', '.webm', '.mkv',
  '.mpeg', '.mpg', '.ogv', '.3gp', '.3g2',
  '.flv', '.wmv', '.ts', '.m4v',
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac',
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export function validateFileSize(size: number): string | null {
  if (size > MAX_FILE_SIZE) {
    return 'File exceeds 100MB. Upgrade for larger files.'
  }
  return null
}

/** If originalFilename is provided and has .mp4/.mov/.avi/.webm, allow when magic-byte detection fails (e.g. some AVI variants). */
function hasAllowedVideoExtension(originalFilename: string): boolean {
  const lower = originalFilename.toLowerCase()
  return ALLOWED_VIDEO_EXT.some((ext) => lower.endsWith(ext))
}

export async function validateFileType(filePath: string, originalFilename?: string): Promise<string | null> {
  try {
    const fileType = await fileTypeFromFile(filePath)
    validationLog.debug({ msg: '[fileValidation] detected fileType', fileType })

    if (!fileType) {
      if (originalFilename && hasAllowedVideoExtension(originalFilename)) {
        return null
      }
      return 'Please upload a supported video or audio file (MP4, MOV, MKV, AVI, WebM, MP3, WAV, etc.)'
    }

    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      if (originalFilename && hasAllowedVideoExtension(originalFilename)) {
        return null
      }
      return 'Please upload a supported video or audio file (MP4, MOV, MKV, AVI, WebM, MP3, WAV, etc.)'
    }

    return null
  } catch (error) {
    validationLog.error({ msg: 'File type validation error', error: String(error) })
    if (originalFilename && hasAllowedVideoExtension(originalFilename)) {
      return null
    }
    return 'Please upload a supported video or audio file (MP4, MOV, MKV, AVI, WebM, MP3, WAV, etc.)'
  }
}

export type SubtitleValidationResult =
  | { error: null; format: 'srt' | 'vtt'; detectedFormat: 'srt' | 'vtt' }
  | { error: string; detectedFormat: 'srt' | 'vtt' | 'unknown' }

const UNSUPPORTED_SUBTITLE_MESSAGE =
  'Unsupported subtitle format. Upload a valid SRT or VTT file.'

/**
 * Validate subtitle file by content only. Ignores filename/extension.
 * Uses subtitleDetector to read first N KB and detect SRT vs VTT.
 */
export async function validateSubtitleFile(filePath: string): Promise<SubtitleValidationResult> {
  try {
    const { detectedFormat, normalizedFormat } = detectSubtitleFormatFromContent(filePath)

    if (normalizedFormat === null || detectedFormat === 'unknown') {
      return { error: UNSUPPORTED_SUBTITLE_MESSAGE, detectedFormat: 'unknown' }
    }

    return { error: null, format: normalizedFormat, detectedFormat }
  } catch (error) {
    validationLog.error({ msg: 'Subtitle validation error', error: String(error) })
    return {
      error: 'Please upload a valid SRT or VTT subtitle file.',
      detectedFormat: 'unknown',
    }
  }
}
