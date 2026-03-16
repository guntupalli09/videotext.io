import fs from 'fs'

const DEFAULT_POLL_MS = 100
const DEFAULT_MAX_WAIT_MS = 10_000

/** Poll interval when waiting for a specific expected file size. */
const EXPECTED_SIZE_POLL_MS = 500
/** Minimum timeout when waiting for expected file size (1 minute). */
const EXPECTED_SIZE_MIN_TIMEOUT_MS = 60_000
/** Maximum timeout when waiting for expected file size (30 minutes). */
const EXPECTED_SIZE_MAX_TIMEOUT_MS = 30 * 60_000
/**
 * Conservative lower-bound upload throughput (bytes/ms ≈ 500 KB/s ≈ 4 Mbps).
 * Used to compute a generous timeout proportional to the expected file size.
 */
const ASSUMED_MIN_BYTES_PER_MS = 500

/**
 * Wait until the file at filePath has not changed size for stableMs.
 * Polls every pollMs; gives up after maxWaitMs.
 * Prevents worker from reading a file that is still being written (e.g. after early enqueue).
 */
export async function waitForFileStable(
  filePath: string,
  stableMs: number,
  options?: { pollMs?: number; maxWaitMs?: number }
): Promise<void> {
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS
  const maxWaitMs = options?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
  const start = Date.now()
  let lastSize: number | null = null
  let lastChangeAt = Date.now()

  while (Date.now() - start < maxWaitMs) {
    try {
      const stat = fs.statSync(filePath)
      const size = stat.size
      if (lastSize !== null && size === lastSize) {
        if (Date.now() - lastChangeAt >= stableMs) {
          return
        }
      } else {
        lastSize = size
        lastChangeAt = Date.now()
      }
    } catch {
      // File may not exist yet; keep waiting
    }
    await new Promise((r) => setTimeout(r, pollMs))
  }
  // Timeout: proceed anyway to avoid blocking forever; worker may still succeed if file is complete
}

/**
 * Wait until the file at filePath has reached at least expectedSize bytes.
 * Used after early-enqueue so the worker never processes a partially-written
 * large file (e.g. iPhone MOV where the moov atom is at the end).
 *
 * Timeout is proportional to expectedSize (min 1 min, max 30 min).
 * Throws if the timeout is exceeded so the job fails clearly rather than
 * processing a truncated file.
 */
export async function waitForExpectedFileSize(
  filePath: string,
  expectedSize: number,
  options?: { pollMs?: number }
): Promise<void> {
  const pollMs = options?.pollMs ?? EXPECTED_SIZE_POLL_MS
  // Allow at least 1 minute; scale up proportionally to file size; cap at 30 minutes.
  const timeoutMs = Math.min(
    EXPECTED_SIZE_MAX_TIMEOUT_MS,
    Math.max(EXPECTED_SIZE_MIN_TIMEOUT_MS, Math.ceil(expectedSize / ASSUMED_MIN_BYTES_PER_MS))
  )
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const stat = fs.statSync(filePath)
      if (stat.size >= expectedSize) return
    } catch {
      // File may not exist yet; keep waiting
    }
    await new Promise((r) => setTimeout(r, pollMs))
  }

  throw new Error(
    `File upload timed out: expected ${expectedSize} bytes but file was not fully written after ${Math.round(timeoutMs / 1000)}s`
  )
}
