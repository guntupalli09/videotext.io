/**
 * Analytics: PostHog + optional dev console. All calls are non-blocking and defensive.
 * When PostHog is blocked (e.g. ad blocker), we opt out to stop retries and console spam.
 * PostHog is initialized via PostHogProvider in main.tsx.
 * Env: VITE_POSTHOG_KEY, VITE_POSTHOG_HOST (default https://us.i.posthog.com)
 */

import posthog from 'posthog-js'

const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com'

let optedOut = false

/** If PostHog host is unreachable (e.g. blocked by ad blocker), opt out so the SDK stops retrying. */
function probeAndOptOutIfBlocked(): void {
  if (optedOut) return
  // Match posthog-js ingest path (e.g. us.i.posthog.com/i/v0/e/...) so ad-block blocks the same URL we probe.
  const base = POSTHOG_HOST.replace(/\/$/, '')
  const probeUrl = `${base}/i/v0/e/?ip=0&_=0&ver=1&compression=gzip-js`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  fetch(probeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: '',
    signal: controller.signal,
    keepalive: false,
  })
    .then(() => clearTimeout(timeout))
    .catch(() => {
      clearTimeout(timeout)
      try {
        posthog.opt_out_capturing()
        optedOut = true
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[analytics] PostHog requests blocked (e.g. ad blocker); analytics disabled')
        }
      } catch {
        // no-op
      }
    })
}

/** Probe for ad blockers after PostHog initializes. Call once from a root component. */
export function startAdBlockProbe(): void {
  setTimeout(probeAndOptOutIfBlocked, 1500)
}

/** Send PostHog's standard $pageview so Web analytics dashboard gets SPA route changes. */
export function capturePageview(pathname: string): void {
  if (optedOut) return
  try {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : ''
    posthog.capture('$pageview', { $current_url: url })
  } catch {
    // no-op
  }
}

/** Identify user (e.g. after checkout). Safe to call with anonymous id or skip for anonymous. */
export function identifyUser(userId: string, traits?: { email?: string; plan?: string }): void {
  if (optedOut) return
  try {
    posthog.identify(userId)
    if (traits?.plan) posthog.people.set({ plan: traits.plan })
    if (traits?.email) posthog.people.set({ email: traits.email })
  } catch {
    // no-op
  }
}

export type AnalyticsEvent =
  | 'page_viewed'
  | 'file_selected'
  | 'upload_started'
  | 'upload_completed'
  | 'job_started'
  | 'job_completed'
  | 'result_downloaded'
  | 'plan_clicked'
  | 'plan_upgraded'
  | 'tool_selected'
  | 'paywall_shown'
  | 'processing_started'
  | 'processing_completed'
  | 'payment_completed'
  | 'soft_cap_shown'
  | 'daily_cap_hit'
  // Phase 1 monetization tracking
  | 'transcript_copied'       // copy succeeded; props: { plan }
  | 'copy_gate_auth'          // copy blocked — user not logged in; shown auth modal
  | 'copy_gate_limit'         // copy blocked — free copies exhausted; shown paywall
  | 'ai_summary_teaser_shown' // blurred AI summary teaser rendered for free user

export function trackEvent(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, props ?? {})
  }
  if (optedOut) return
  try {
    posthog.capture(event, props)
  } catch {
    // non-blocking; never throw
  }
}
