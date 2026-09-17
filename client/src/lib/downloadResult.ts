import { getAbsoluteDownloadUrl } from './apiBase'
import { getAuthToken } from './api'
import { trackEvent } from './analytics'
import {
  DownloadHttpError,
  DownloadNotReadyError,
  downloadFailureReason,
  isBlankDownloadUrl,
} from './downloadErrors'

export {
  DownloadHttpError,
  DownloadNotReadyError,
  downloadErrorMessage,
  isBlankDownloadUrl,
} from './downloadErrors'

/**
 * Absolute URL for a job result, or a throw when the result carries no URL.
 *
 * Returning '' here (the old behaviour) was worse than failing: fetch('')
 * resolves against the current page, comes back 200 with the SPA's HTML, and
 * the user silently saves that HTML under the output's filename.
 */
export function resolveResultDownloadUrl(downloadUrl: string | null | undefined): string {
  if (isBlankDownloadUrl(downloadUrl)) throw new DownloadNotReadyError()
  return getAbsoluteDownloadUrl(downloadUrl as string)
}

export interface DownloadFailureMeta {
  tool: string
  plan?: string
}

/** Emits the failure counterpart of result_downloaded, so a collapsed funnel step is diagnosable. */
export function trackDownloadFailure(err: unknown, meta: DownloadFailureMeta): void {
  try {
    trackEvent('result_download_failed', {
      ...meta,
      reason: downloadFailureReason(err),
      ...(err instanceof DownloadHttpError && { status: err.status }),
    })
  } catch {
    // non-blocking
  }
}

/**
 * Fetch a result with the required auth header and trigger a real file save
 * (a plain <a> click can't carry the Bearer token, so it 401s).
 */
export async function downloadAuthedUrl(url: string, filename: string): Promise<void> {
  if (isBlankDownloadUrl(url)) throw new DownloadNotReadyError()
  const token = getAuthToken()
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new DownloadHttpError(res.status)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  // Anchor must be in the document for .click() to trigger a save in Firefox.
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}
