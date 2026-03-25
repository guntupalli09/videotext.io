import path from 'path'
import { sanitizeFilename } from './sanitizeFilename'

/**
 * User-facing download names: {video stem}_{what}_{language}.ext — self-explanatory, no guessing.
 */

/** Basename without extension, safe for filesystem (max 100 chars). */
export function exportFileStem(originalName: string | undefined, fallback: string): string {
  const safe = sanitizeFilename(originalName || fallback)
  let stem = path.basename(safe, path.extname(safe)).replace(/\s+/g, ' ').trim()
  if (!stem) stem = fallback.replace(/\.[^.]+$/, '') || 'video'
  return stem.slice(0, 100)
}

/** Whisper / UI language → short tag for filenames (en, zh, auto if unknown). */
export function langCodeForFile(lang: string | undefined | null): string {
  if (lang == null || typeof lang !== 'string' || !lang.trim()) return 'auto'
  const t = lang.trim().toLowerCase()
  const cleaned = t.replace(/[^a-z0-9-]/g, '').slice(0, 12)
  return cleaned || 'auto'
}

/** Target language display name (e.g. Spanish) → filename-safe slug. */
export function targetLangFileSlug(targetLang: string): string {
  return targetLang.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'unknown'
}

/** Collapse unsafe chars in stem segment (keeps readability). */
function safeStemSegment(s: string, max = 80): string {
  return s.replace(/[^\w\u00C0-\u024F\-_.\s]/g, '_').replace(/_+/g, '_').trim().slice(0, max) || 'video'
}

export function joinExportFilename(stem: string, descriptor: string, ext: string): string {
  const e = ext.startsWith('.') ? ext : `.${ext}`
  return `${safeStemSegment(stem)}_${descriptor}${e}`
}

export function transcriptOriginalFilename(originalName: string | undefined, whisperLang: string | undefined, ext: string): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), `transcript_original_${langCodeForFile(whisperLang)}`, ext)
}

export function transcriptBundleZipFilename(originalName: string | undefined, whisperLang: string | undefined): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), `transcript_bundle_original_${langCodeForFile(whisperLang)}`, '.zip')
}

export function subtitlesOriginalFilename(originalName: string | undefined, whisperLang: string | undefined, ext: string): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), `subtitles_original_${langCodeForFile(whisperLang)}`, ext)
}

export function subtitlesTranslatedFilename(originalName: string | undefined, targetSlug: string, ext: string): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), `subtitles_translated_${targetSlug}`, ext)
}

export function transcriptTranslatedTextFilename(originalName: string | undefined, targetSlug: string): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), `transcript_translated_${targetSlug}`, '.txt')
}

export function subtitlesMultilangZipFilename(originalName: string | undefined): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), 'subtitles_multilang', '.zip')
}

export function subtitlesFixedFilename(originalName: string | undefined, ext: string): string {
  return joinExportFilename(exportFileStem(originalName, 'subtitles'), 'subtitles_fixed', ext)
}

export function subtitlesConvertedFilename(originalName: string | undefined, targetFormat: string): string {
  const ext = targetFormat === 'txt' ? '.txt' : targetFormat === 'vtt' ? '.vtt' : '.srt'
  return joinExportFilename(exportFileStem(originalName, 'subtitles'), `subtitles_converted_${targetFormat}`, ext)
}

export function videoBurnedInFilename(originalName: string | undefined): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), 'video_with_subtitles_burned_in', '.mp4')
}

export function videoCompressedFilename(originalName: string | undefined): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), 'video_compressed', '.mp4')
}

export function audioExtractFilename(originalName: string | undefined): string {
  return joinExportFilename(exportFileStem(originalName, 'video'), 'audio_extract', '.m4a')
}
