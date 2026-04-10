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
  // Monetization tracking
  | 'transcript_copied'            // copy succeeded; props: { plan }
  | 'copy_gate_auth'               // copy blocked — user not logged in; shown auth modal
  | 'copy_gate_limit'              // copy blocked — free copies exhausted; shown paywall
  | 'ai_summary_teaser_shown'      // blurred AI summary teaser rendered for free user
  | 'upgrade_clicked'              // user clicked upgrade CTA; props: { source, plan }
  | 'billing_period_toggled'       // monthly/annual toggle; props: { annual: boolean }
  // Auth funnel
  | 'login_started'
  | 'login_completed'
  | 'login_failed'                 // props: { error }
  | 'signup_started'
  | 'signup_completed'             // account created
  | 'forgot_password_requested'
  | 'magic_login_completed'
  | 'magic_login_failed'           // props: { error }
  // Nav & discovery
  | 'nav_cta_clicked'              // props: { label, destination }
  | 'tool_nav_clicked'             // user clicked a tool from nav dropdown; props: { tool, path }
  // Tool configuration
  | 'format_changed'               // props: { tool, format }
  | 'language_selected'            // props: { tool, language, additional?: boolean }
  | 'tool_option_changed'          // generic; props: { tool, option, value }
  // Tool result actions
  | 'process_another_clicked'      // props: { tool }
  | 'recording_started'
  | 'recording_stopped'            // props: { duration_seconds }
  // Viral / referral mechanics
  | 'repurpose_generate_clicked'   // user clicked generate in RepurposePanel
  | 'repurpose_generated'          // repurpose API call succeeded; props: { jobId }
  | 'repurpose_copied'             // user copied repurposed content; props: { tab }
  | 'share_unlock_claimed'         // share-to-unlock bonus claimed; props: { sessionId }
  | 'share_unlock_shared'          // user shared link via share-to-unlock
  | 'api_key_created'              // user created a developer API key
  | 'referral_link_copied'         // user copied referral link; props: { type }
  | 'referral_shared'              // user shared referral link; props: { platform }

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
