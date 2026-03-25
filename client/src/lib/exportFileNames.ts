/**
 * Browser-side download filenames — same conventions as server (see server/src/utils/exportFileNames.ts).
 */

export function exportFileStem(originalName: string | undefined, fallback: string): string {
  if (!originalName?.trim()) {
    const f = fallback.replace(/\.[^.]+$/, '')
    return (f || 'video').slice(0, 100)
  }
  const base = originalName.replace(/^.*[\\/]/, '').replace(/\0/g, '')
  const lastDot = base.lastIndexOf('.')
  const stem = lastDot > 0 ? base.slice(0, lastDot) : base
  const cleaned = stem.replace(/[^\w\u00C0-\u024F\-_.\s]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 100)
  return cleaned || fallback.replace(/\.[^.]+$/, '') || 'video'
}

export function langCodeForFile(lang: string | undefined | null): string {
  if (lang == null || typeof lang !== 'string' || !lang.trim()) return 'auto'
  const t = lang.trim().toLowerCase()
  const cleaned = t.replace(/[^a-z0-9-]/g, '').slice(0, 12)
  return cleaned || 'auto'
}

export function targetLangFileSlug(targetLang: string): string {
  return targetLang.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'unknown'
}

function safeStemSegment(s: string, max = 80): string {
  return s.replace(/[^\w\u00C0-\u024F\-_.\s]/g, '_').replace(/_+/g, '_').trim().slice(0, max) || 'video'
}

export function joinExportFilename(stem: string, descriptor: string, ext: string): string {
  const e = ext.startsWith('.') ? ext : `.${ext}`
  return `${safeStemSegment(stem)}_${descriptor}${e}`
}

export function transcriptExportName(
  fileName: string | undefined,
  kind: 'json' | 'csv' | 'notion' | 'text',
  originalLangCode: string | undefined
): string {
  const stem = exportFileStem(fileName, 'video')
  const lang = langCodeForFile(originalLangCode)
  const ext = kind === 'json' || kind === 'notion' ? 'json' : kind === 'csv' ? 'csv' : 'txt'
  const label = kind === 'notion' ? 'transcript_notion_export' : `transcript_export_original_${lang}`
  return joinExportFilename(stem, label, `.${ext}`)
}
