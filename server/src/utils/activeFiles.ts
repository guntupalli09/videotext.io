/**
 * Active-file registry backed by Redis.
 *
 * When a worker starts processing a job it registers every input file path it will
 * touch.  The cleanup cron reads this registry before deleting any file so it never
 * removes a file that is still in use, regardless of how old the mtime looks.
 *
 * Keys:  active:file:{jobId}   value: JSON array of absolute paths   TTL: 4 hours
 * The TTL is a safety-net for crashed workers that never deregister.
 */

import type { Redis } from 'ioredis'

const KEY_PREFIX = 'active:file:'
const TTL_SEC = 4 * 3600  // 4 hours — generous upper bound; normal jobs deregister immediately

function key(jobId: string | number): string {
  return `${KEY_PREFIX}${jobId}`
}

/**
 * Register one or more absolute file paths as in-use for a job.
 * Overwrites any previous registration for the same jobId (safe to call again
 * when new intermediate files are created mid-job).
 */
export async function registerActiveFiles(
  redis: Redis,
  jobId: string | number,
  paths: string[],
): Promise<void> {
  const nonEmpty = paths.filter(Boolean)
  if (!nonEmpty.length) return
  try {
    await redis.set(key(jobId), JSON.stringify(nonEmpty), 'EX', TTL_SEC)
  } catch { /* non-blocking — a missed registration is caught by the raised emergency threshold */ }
}

/**
 * Remove the job's active-file entry.  Call from the worker's finally block.
 */
export async function deregisterActiveFiles(
  redis: Redis,
  jobId: string | number,
): Promise<void> {
  try {
    await redis.del(key(jobId))
  } catch { /* non-blocking */ }
}

/**
 * Return a Set of every absolute file path currently registered as in-use,
 * or `null` if Redis is unavailable.
 *
 * Callers MUST treat `null` as "skip this operation" — not as "nothing is
 * active".  Returning an empty set when Redis is down would re-introduce the
 * same failure class the registry was designed to prevent.
 */
export async function getActiveFilePaths(redis: Redis): Promise<Set<string> | null> {
  try {
    const keys = await redis.keys(`${KEY_PREFIX}*`)
    if (!keys.length) return new Set()
    const vals = await redis.mget(...keys)
    const paths = new Set<string>()
    for (const v of vals) {
      if (!v) continue
      try {
        const arr = JSON.parse(v) as string[]
        for (const p of arr) {
          if (p) paths.add(p)
        }
      } catch { /* ignore malformed entries */ }
    }
    return paths
  } catch {
    // Redis unavailable — signal to callers to skip rather than fail open
    return null
  }
}
