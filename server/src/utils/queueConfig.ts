/**
 * Phase 2.5: Queue limits and backpressure (CPX31 single-node).
 * MAX_GLOBAL_WORKERS = 3. Soft/hard limits for user messaging.
 */

export const MAX_GLOBAL_WORKERS = 3
export const QUEUE_SOFT_LIMIT = 200
export const QUEUE_HARD_LIMIT = 300
export const PAID_TIER_RESERVATION_QUEUE_THRESHOLD = 50

export function isQueueAtHardLimit(totalCount: number): boolean {
  return totalCount >= QUEUE_HARD_LIMIT
}

export function isQueueAtSoftLimit(totalCount: number): boolean {
  return totalCount >= QUEUE_SOFT_LIMIT
}

/**
 * Returns a concurrency multiplier based on current queue depth.
 * Applied to all plan concurrency limits during traffic spikes
 * (e.g. Reddit/Product Hunt surge) to keep the system stable.
 *
 * queueDepth >= 150 → halve all plan concurrency
 * queueDepth >= 100 → reduce by 25%
 * queueDepth <  100 → no reduction (full concurrency)
 *
 * This is intentionally conservative: users never get blocked,
 * their jobs just queue slightly longer during spikes.
 */
export function getSystemConcurrencyMultiplier(queueDepth: number): number {
  if (queueDepth >= 150) return 0.5
  if (queueDepth >= 100) return 0.75
  return 1.0
}
