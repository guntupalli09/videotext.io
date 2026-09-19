/**
 * Authorization and result-disclosure rules for job status and claiming.
 *
 * These were inline expressions in routes/jobs.ts. They are the security
 * boundary between "may observe this job's progress" and "may see its output",
 * so they are extracted here as pure predicates that can be unit tested
 * directly. Behavior is unchanged from the inline form.
 *
 * THE INVARIANT THAT MUST NOT BE RELAXED
 * A job token authorizes *observation* (status, progress, queue position) and
 * claiming. It never authorizes *disclosure* of the result payload. Only the
 * authenticated owner sees `result`, because the result carries the download
 * URL and the whole free-tier gate depends on that separation. Collapsing
 * `revealResults` to `allowedByUser || allowedByToken` would hand any holder of
 * a job token — which travels in URLs and sessionStorage — the finished file
 * without ever signing up.
 */

/** Guest identities are synthesized per upload and are never real accounts. */
export function isGuestUserId(userId: string | null | undefined): boolean {
  return typeof userId === 'string' && userId.startsWith('guest_')
}

export interface JobAccessInput {
  /** Authenticated user from JWT or API key. Null when the caller is anonymous. */
  requestUserId: string | null | undefined
  /** Owner recorded on the queue job's data. */
  jobUserId: string | null | undefined
  /** Token supplied by the caller (query param or x-job-token header). */
  clientJobToken: string | null | undefined
  /** Token recorded on the queue job's data. */
  jobToken: string | null | undefined
}

export interface JobAccess {
  /** The caller owns the job: full access, including the result payload. */
  allowedByUser: boolean
  /** The caller proved knowledge of the job token: status only. */
  allowedByToken: boolean
  /** Whether the request may proceed at all. */
  allowed: boolean
  /** Whether `result` may be included in the response. Owner-only. */
  revealResults: boolean
}

/**
 * Decide what a caller may see for a given job.
 *
 * Ownership is matched only on a concrete, equal pair of ids — two nullish
 * values must never satisfy the comparison, or an anonymous caller would match
 * an ownerless job. The same applies to the token comparison, so an absent
 * token on both sides cannot authorize anything.
 */
export function resolveJobAccess(input: JobAccessInput): JobAccess {
  const { requestUserId, jobUserId, clientJobToken, jobToken } = input

  const allowedByUser =
    requestUserId != null &&
    requestUserId !== '' &&
    jobUserId != null &&
    jobUserId !== '' &&
    requestUserId === jobUserId

  const allowedByToken =
    clientJobToken != null &&
    clientJobToken !== '' &&
    jobToken != null &&
    jobToken !== '' &&
    clientJobToken === jobToken

  return {
    allowedByUser,
    allowedByToken,
    allowed: allowedByUser || allowedByToken,
    // Deliberately NOT `allowedByUser || allowedByToken`. See the file header.
    revealResults: allowedByUser,
  }
}

export type ClaimDecision =
  /** Caller may take ownership of this guest job. */
  | { kind: 'allow' }
  /** No authenticated (non-guest) identity on the request. */
  | { kind: 'unauthenticated' }
  /** Token missing or does not match the job's token. */
  | { kind: 'invalid-token' }
  /** A real account already owns this job. */
  | { kind: 'already-claimed' }

/**
 * Whether a claim request may take ownership of a job.
 *
 * Both proofs are required: an authenticated non-guest identity AND the job
 * token. The token alone must not transfer ownership, and authentication alone
 * must not let one user claim a job they never ran.
 *
 * A job already owned by a real account is `already-claimed` even when the
 * caller is that same owner; the route maps this to 409, which the client
 * treats as success (the job is attached either way).
 */
export function resolveClaimDecision(input: {
  requestUserId: string | null | undefined
  jobUserId: string | null | undefined
  clientJobToken: string | null | undefined
  jobToken: string | null | undefined
}): ClaimDecision {
  const { requestUserId, jobUserId, clientJobToken, jobToken } = input

  if (!requestUserId || isGuestUserId(requestUserId)) return { kind: 'unauthenticated' }

  if (!clientJobToken || !jobToken || clientJobToken !== jobToken) {
    return { kind: 'invalid-token' }
  }

  if (jobUserId && !isGuestUserId(jobUserId)) return { kind: 'already-claimed' }

  return { kind: 'allow' }
}
