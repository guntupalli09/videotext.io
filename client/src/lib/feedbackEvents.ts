/**
 * feedbackEvents.ts — Behavioral event tracking + structured feedback submission.
 *
 * trackAppEvent()         → POST /api/events (fire-and-forget, no throw)
 * submitStructuredFeedback() → POST /api/feedback/structured
 *
 * Also dispatches CustomEvents on window so FeedbackOrchestrator can listen
 * without prop-drilling.
 */

import { API_ORIGIN } from './apiBase'
import { getAuthToken } from './api'
import { getSessionId } from './sessionTracking'

export type AppEventName =
  | 'upload_started'
  | 'transcription_completed'
  | 'result_viewed'
  | 'export_clicked'
  | 'session_returned'
  | 'upgrade_clicked'
  | 'activation_wizard_completed'
  | 'first_output_seen'

export type TriggerType = 'result' | 'export' | 'dropoff' | 'pmf' | 'competitor'

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

/** Fire-and-forget behavioral event. Never throws. */
export function trackAppEvent(name: AppEventName, metadata?: Record<string, unknown>): void {
  const sessionId = getSessionId()

  // Notify local listeners immediately (zero-latency for triggers)
  window.dispatchEvent(new CustomEvent(`vt:evt:${name}`, { detail: { metadata } }))

  // Persist to backend asynchronously
  fetch(`${API_ORIGIN}/api/events`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ eventName: name, sessionId, metadata: metadata ?? {} }),
  }).catch(() => {})
}

export interface StructuredFeedbackPayload {
  triggerType: TriggerType
  rating?: string
  category?: string
  freeText?: string
  dismissed?: boolean
}

/** Submit contextual feedback from one of the triggers A–E. */
export async function submitStructuredFeedback(payload: StructuredFeedbackPayload): Promise<void> {
  const sessionId = getSessionId()
  const res = await fetch(`${API_ORIGIN}/api/feedback/structured`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, sessionId }),
  })
  if (!res.ok) throw new Error(`Feedback submit failed: ${res.status}`)
}
