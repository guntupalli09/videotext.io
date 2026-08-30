import { getLogger } from '../lib/logger'
import { safeFetchWebhook } from './webhookSsrf'
const webhookLog = getLogger('worker')

/**
 * Fire webhook on job completion (optional). Non-blocking; failures are logged only.
 *
 * SSRF-hardened (Phase 7): validates the URL — and, on each redirect, the
 * new target — against localhost/private/link-local/metadata address
 * ranges via safeFetchWebhook() before connecting. See utils/webhookSsrf.ts.
 */
export async function fireWebhook(
  webhookUrl: string,
  payload: {
    jobId: string
    status: 'completed' | 'failed'
    result?: unknown
    error?: string
  }
): Promise<void> {
  if (!webhookUrl || typeof webhookUrl !== 'string') return
  const url = webhookUrl.trim()
  if (!url.startsWith('https://') && !url.startsWith('http://')) return

  const result = await safeFetchWebhook(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!result.ok) {
    webhookLog.warn({ msg: '[webhook] request failed or blocked', url, status: result.status, reason: result.reason })
  }
}
