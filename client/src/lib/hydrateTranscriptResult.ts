/**
 * Helpers for turning a completed transcript job payload into on-screen text.
 *
 * Video to Transcript used to:
 *   1. Drop the result when the server returned requiresAuth (guest job not
 *      yet claimed by the logged-in account) and render an empty "ready" pane.
 *   2. Fall back to an unauthenticated fetch of downloadUrl, which the download
 *      API now rejects with 401 — so summary could appear while the transcript
 *      body stayed blank.
 */

export type TranscriptJobResultLike = {
  downloadUrl?: string
  fileName?: string
  fullText?: string
  segments?: { start: number; end: number; text: string; speaker?: string }[]
}

/** True when the job payload can populate the transcript pane without another refresh. */
export function jobPayloadHasTranscript(
  res: TranscriptJobResultLike | null | undefined,
): boolean {
  if (transcriptTextFromResult(res)) return true
  if (res?.downloadUrl && !isTranscriptDownloadZip(res.downloadUrl, res.fileName)) {
    return true
  }
  return false
}

/**
 * True when any core-tool job payload is ready to show (file, text, cues, or analyze findings).
 * Unlike jobPayloadHasTranscript, a ZIP downloadUrl counts — burn/compress results *are* the file.
 */
export function jobHasUsableResult(
  res:
    | (TranscriptJobResultLike & { issues?: unknown[] })
    | null
    | undefined,
): boolean {
  if (!res) return false
  if (typeof res.downloadUrl === 'string' && res.downloadUrl.trim()) return true
  if (transcriptTextFromResult(res)) return true
  if (Array.isArray(res.issues)) return true
  return false
}

export function transcriptTextFromResult(res: TranscriptJobResultLike | null | undefined): string {
  if (!res) return ''
  if (res.segments?.length) {
    return res.segments
      .map((s) => (s.text || '').trim())
      .filter(Boolean)
      .join('\n\n')
  }
  const fullText = typeof res.fullText === 'string' ? res.fullText.trim() : ''
  return fullText
}

export function isTranscriptDownloadZip(downloadUrl?: string, fileName?: string): boolean {
  const name = (fileName || downloadUrl || '').toLowerCase()
  return name.endsWith('.zip') || name.includes('.zip?')
}

export function looksLikeJsonErrorBody(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) return false
  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown; error?: unknown }
    return typeof parsed.message === 'string' || typeof parsed.error === 'string'
  } catch {
    return false
  }
}

export async function fetchTranscriptDownloadText(
  downloadUrl: string,
  fileName: string | undefined,
  fetchImpl: typeof fetch,
  authToken: string | null
): Promise<string> {
  if (!downloadUrl || isTranscriptDownloadZip(downloadUrl, fileName)) return ''
  const res = await fetchImpl(downloadUrl, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  })
  if (!res.ok) {
    throw new Error(`Failed to load transcript (${res.status})`)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/zip')) return ''
  const text = await res.text()
  if (!text.trim() || looksLikeJsonErrorBody(text)) return ''
  return text
}
