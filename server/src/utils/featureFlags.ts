/**
 * Pipeline performance upgrade feature flags.
 * All default to FALSE. Set env to "true" | "1" | "yes" (case-insensitive) to enable.
 * When all flags are false, system behavior is unchanged from baseline.
 */
function isFlagEnabled(value: string | undefined): boolean {
  if (value == null || typeof value !== 'string') return false
  return /^(1|true|yes)$/i.test(value.trim())
}

/** Phase 2: One-pass extract+split audio (PROCESSING_V2) */
export const PROCESSING_V2 = isFlagEnabled(process.env.PROCESSING_V2)

/** Phase 4: Defer summary/chapters to async; return transcript first (DEFER_SUMMARY) */
export const DEFER_SUMMARY = isFlagEnabled(process.env.DEFER_SUMMARY)

/** Phase 5–6: Chunk-based progress interpolation + min stream visibility (STREAM_PROGRESS) */
export const STREAM_PROGRESS = isFlagEnabled(process.env.STREAM_PROGRESS)

/** Phase 1: Streaming reassembly in /api/upload/complete (STREAM_UPLOAD_ASSEMBLY) */
export const STREAM_UPLOAD_ASSEMBLY = isFlagEnabled(process.env.STREAM_UPLOAD_ASSEMBLY)

/** Phase 7: Higher worker concurrency (WORKER_CONCURRENCY_V2) */
export const WORKER_CONCURRENCY_V2 = isFlagEnabled(process.env.WORKER_CONCURRENCY_V2)

/** Phase 8: Separate queues for YouTube pipeline so captions never wait behind Whisper (YOUTUBE_QUEUE_SEPARATION) */
export const YOUTUBE_QUEUE_SEPARATION = isFlagEnabled(process.env.YOUTUBE_QUEUE_SEPARATION)

/**
 * Analytics Sprint 1 (revised): shadow-compute the corrected Stripe MRR
 * extraction (2026-01-28.clover object shape — see stripeMrr.ts V2 functions)
 * alongside the existing, currently-inert legacy extraction on every
 * invoice.payment_succeeded webhook. Log-only — does not change what gets
 * written to SubscriptionSnapshot. Safe to enable at any time; adds one
 * extra Stripe API call (invoices.retrieve with expand) per webhook event.
 */
export const MRR_EXTRACTION_V2_SHADOW = isFlagEnabled(process.env.MRR_EXTRACTION_V2_SHADOW)

/**
 * Analytics Sprint 1 (revised): once MRR_EXTRACTION_V2_SHADOW's comparison
 * report has been validated (see docs/analytics/SPRINT_PLAN.md Sprint 1),
 * enabling this flag switches SubscriptionSnapshot writes to use the
 * corrected (V2) extraction result instead of the legacy one. Must not be
 * enabled without MRR_EXTRACTION_V2_SHADOW also enabled and validated first.
 * Rollback is this flag alone — no code change required.
 */
export const MRR_EXTRACTION_V2_WRITE = isFlagEnabled(process.env.MRR_EXTRACTION_V2_WRITE)
