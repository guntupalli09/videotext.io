import { claimGuestJob } from './api'
import { getAllPersistedGuestJobs } from './jobSession'

/**
 * Link every guest job persisted in this tab to the account that just
 * authenticated. Safe to call on any auth success — signup, login, OTP or
 * Google — and best-effort by design: a claim that fails must never block
 * the user from reaching their account.
 */
export async function claimPersistedGuestJobs(): Promise<void> {
  const jobs = getAllPersistedGuestJobs()
  if (jobs.length === 0) return
  await Promise.all(
    jobs.map(async ({ jobId, jobToken }) => {
      try {
        await claimGuestJob(jobId, jobToken)
      } catch {
        // non-blocking: the auth-gate modal claim path retries on the tool page
      }
    })
  )
}
