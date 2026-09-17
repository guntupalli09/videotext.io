/**
 * Dependency-free download-failure vocabulary.
 *
 * Kept apart from downloadResult.ts so the classification and copy can be
 * unit tested without pulling in apiBase/analytics and their browser globals.
 */

/** The job finished but no usable download URL reached the client yet. */
export class DownloadNotReadyError extends Error {
  constructor() {
    super('Download is not ready yet')
    this.name = 'DownloadNotReadyError'
  }
}

/** A download request that reached the API and came back non-2xx. */
export class DownloadHttpError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Download failed (${status})`)
    this.name = 'DownloadHttpError'
    this.status = status
  }
}

/** True when a result carries no usable download URL. */
export function isBlankDownloadUrl(downloadUrl: string | null | undefined): boolean {
  return !downloadUrl || !downloadUrl.trim()
}

export type DownloadFailureReason = 'http_error' | 'missing_url' | 'network_error'

/** Buckets a thrown download error for the result_download_failed event. */
export function downloadFailureReason(err: unknown): DownloadFailureReason {
  if (err instanceof DownloadHttpError) return 'http_error'
  if (err instanceof DownloadNotReadyError) return 'missing_url'
  return 'network_error'
}

/** User-facing message for a failed download — specific enough to act on. */
export function downloadErrorMessage(err: unknown): string {
  if (err instanceof DownloadNotReadyError) return 'Download is not ready yet. Refresh and try again.'
  if (err instanceof DownloadHttpError) {
    if (err.status === 401 || err.status === 403) return 'Sign in with the account that created this job to download it.'
    if (err.status === 404) return 'This file is no longer available. Files are deleted after processing.'
    return `Download failed (${err.status})`
  }
  return 'Download failed. Check your connection and try again.'
}
