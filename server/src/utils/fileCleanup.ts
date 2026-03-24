import fs from 'fs'
import path from 'path'
import * as Sentry from '@sentry/node'
import { getLogger } from '../lib/logger'
import { getActiveFilePaths } from './activeFiles'
import type { Redis } from 'ioredis'

const cleanupLog = getLogger('api')

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

const CLEANUP_INTERVAL   = 15 * 60 * 1000  // 15 minutes
const FILE_MAX_AGE       = 150 * 60 * 1000  // 2.5 hours (normal) — jobs routinely take 10–30 min, 1 hr was too tight
// 90 minutes covers: up to 20 min queue wait + up to 30 min Whisper processing + overhead.
// Previously 40 min, which was tight enough to kill jobs under load.
const EMERGENCY_AGE_MS   = 90 * 60 * 1000   // 90 minutes (disk pressure)
const DISK_EMERGENCY_THRESHOLD = 0.80        // 80% full triggers emergency mode

export function startFileCleanup(redis?: Redis) {
  const doCleanup = () => cleanupFiles(redis)
  doCleanup()
  setInterval(doCleanup, CLEANUP_INTERVAL)
}

function getDiskUsageRatio(): number {
  try {
    const stat = fs.statfsSync(tempDir)
    const total = stat.blocks * stat.bsize
    if (total === 0) return 0
    const used = (stat.blocks - stat.bfree) * stat.bsize
    return used / total
  } catch {
    return 0
  }
}

async function cleanupFiles(redis?: Redis) {
  if (!fs.existsSync(tempDir)) {
    return
  }

  const diskRatio = getDiskUsageRatio()
  const emergency = diskRatio >= DISK_EMERGENCY_THRESHOLD
  const maxAge = emergency ? EMERGENCY_AGE_MS : FILE_MAX_AGE

  if (emergency) {
    cleanupLog.warn({ msg: '[FileCleanup] Disk emergency mode', diskPct: Math.round(diskRatio * 100), maxAgeMin: maxAge / 60000 })
  }

  // Fetch the set of paths currently in use by active jobs.
  // If Redis is unavailable this returns an empty set; files are then protected
  // only by the age threshold (still safe with the raised 90-min emergency limit).
  const activeFilePaths = redis ? await getActiveFilePaths(redis) : new Set<string>()

  const entries = fs.readdirSync(tempDir)
  const now = Date.now()
  let deletedCount = 0
  let deletedBytes = 0

  for (const entry of entries) {
    const entryPath = path.join(tempDir, entry)
    try {
      const stats = fs.lstatSync(entryPath)

      // ── Regular files ──────────────────────────────────────────────────────
      if (stats.isFile()) {
        if (stats.isSymbolicLink()) continue
        const age = now - stats.mtimeMs
        if (age <= maxAge) continue
        if (activeFilePaths.has(entryPath)) continue   // protected by active job
        fs.unlinkSync(entryPath)
        deletedCount++
        deletedBytes += stats.size
        continue
      }

      // ── Orphaned audio-chunk directories (chunks-{jobId}-{timestamp}/) ────
      // These are created by transcribeVideoParallel; normally removed in its
      // own finally block, but can be left behind when the directory is not
      // empty (e.g. a chunk file was never cleaned up after an error).
      if (stats.isDirectory() && entry.startsWith('chunks-')) {
        const age = now - stats.mtimeMs
        if (age <= maxAge) continue
        // Skip if any file inside is actively in use
        let hasActiveFile = false
        try {
          for (const child of fs.readdirSync(entryPath)) {
            if (activeFilePaths.has(path.join(entryPath, child))) {
              hasActiveFile = true
              break
            }
          }
        } catch { /* ignore read errors — skip the directory */ }
        if (hasActiveFile) continue
        try {
          fs.rmSync(entryPath, { recursive: true, force: true })
          deletedCount++
        } catch (err) {
          cleanupLog.error({ msg: '[FileCleanup] Error removing chunk dir', dir: entry, error: String(err) })
        }
      }
    } catch (error) {
      cleanupLog.error({ msg: '[FileCleanup] Error cleaning up entry', entry, error: String(error) })
      Sentry.captureException(error, { tags: { service: 'file-cleanup', file: entry } })
    }
  }

  if (deletedCount > 0) {
    const mb = (deletedBytes / 1024 / 1024).toFixed(1)
    cleanupLog.info({ msg: '[FileCleanup] Cleanup complete', files: deletedCount, freedMb: mb })
  }
}
