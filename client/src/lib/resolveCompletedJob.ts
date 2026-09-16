/**
 * Shared completion path for quota-consuming tools.
 *
 * EventSource cannot send Authorization, so the SSE completed event often arrives
 * with requiresAuth / no result even for a logged-in owner. Guest jobs also
 * withhold the payload until claimed. Tools must not flip to a blank "ready"
 * workspace — claim, re-fetch, and retry before showing completed UI.
 */

import type { JobStatus } from './api'
import { jobHasUsableResult } from './hydrateTranscriptResult'
import { JOB_POLL_INTERVAL_MS } from './jobPolling'

export type ResolvedCompletedJob =
  | { kind: 'ready'; status: JobStatus }
  | { kind: 'auth-gate'; status?: JobStatus }
  | { kind: 'missing'; status?: JobStatus }

export type ResolveCompletedJobDeps = {
  getAuthToken: () => string | null
  getJobStatus: (jobId: string, options?: { jobToken?: string }) => Promise<JobStatus>
  ensureGuestJobClaimed: (jobId: string, jobToken: string) => Promise<void>
  sleep: (ms: number) => Promise<void>
}

function classifyCompletedJob(
  status: JobStatus | undefined,
  hasAuth: boolean,
): ResolvedCompletedJob | null {
  if (!status || status.status !== 'completed') return null
  if (jobHasUsableResult(status.result) && !status.requiresAuth) {
    return { kind: 'ready', status }
  }
  if (!hasAuth) {
    return { kind: 'auth-gate', status }
  }
  return null
}

export async function resolveCompletedJobResultWith(
  jobId: string,
  jobToken: string | undefined,
  incoming: JobStatus | undefined,
  deps: ResolveCompletedJobDeps,
  retries = 8,
): Promise<ResolvedCompletedJob> {
  const options = jobToken ? { jobToken } : undefined
  let latest = incoming

  const classify = (status: JobStatus | undefined) =>
    classifyCompletedJob(status, Boolean(deps.getAuthToken()))

  const first = classify(latest)
  if (first) return first

  const claimIfNeeded = async (status: JobStatus | undefined): Promise<JobStatus | undefined> => {
    if (!deps.getAuthToken() || !jobToken || !status?.requiresAuth) return status
    try {
      await deps.ensureGuestJobClaimed(jobId, jobToken)
      return await deps.getJobStatus(jobId, options)
    } catch {
      return status
    }
  }

  latest = await claimIfNeeded(latest)
  const afterClaim = classify(latest)
  if (afterClaim) return afterClaim

  if (deps.getAuthToken()) {
    try {
      latest = await deps.getJobStatus(jobId, options)
      latest = await claimIfNeeded(latest)
      const immediate = classify(latest)
      if (immediate) return immediate
    } catch {
      // retry below
    }
  }

  for (let i = 0; i < retries; i++) {
    await deps.sleep(JOB_POLL_INTERVAL_MS)
    try {
      latest = await deps.getJobStatus(jobId, options)
      latest = await claimIfNeeded(latest)
      const next = classify(latest)
      if (next) return next
    } catch {
      // keep trying
    }
  }

  if (!deps.getAuthToken()) return { kind: 'auth-gate', status: latest }
  return { kind: 'missing', status: latest }
}

export async function resolveCompletedJobResult(
  jobId: string,
  jobToken: string | undefined,
  incoming?: JobStatus,
  deps?: Partial<ResolveCompletedJobDeps>,
  retries = 8,
): Promise<ResolvedCompletedJob> {
  const api = await import('./api')
  return resolveCompletedJobResultWith(
    jobId,
    jobToken,
    incoming,
    {
      getAuthToken: deps?.getAuthToken ?? api.getAuthToken,
      getJobStatus: deps?.getJobStatus ?? api.getJobStatus,
      ensureGuestJobClaimed: deps?.ensureGuestJobClaimed ?? api.ensureGuestJobClaimed,
      sleep: deps?.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
    },
    retries,
  )
}
