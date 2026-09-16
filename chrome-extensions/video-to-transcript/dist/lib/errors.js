/**
 * Error model for the extension. Deliberately thin: the VideoText backend already
 * returns a human-readable `message` for every failure (quota, rate limit, file
 * too large, duration exceeded, queue pressure…), and reproducing that wording
 * client-side would let the two drift apart. We surface the server's message and
 * only add copy where the server cannot speak — network loss and timeouts.
 */
export class VideoTextApiError extends Error {
    status;
    retryAfterSeconds;
    constructor(status, message, retryAfterSeconds) {
        super(message);
        this.name = 'VideoTextApiError';
        this.status = status;
        this.retryAfterSeconds = retryAfterSeconds;
    }
    /** The signed-in session is gone or was rejected — the popup must return to the signed-out state. */
    get isAuthError() {
        return this.status === 401;
    }
    /**
     * Plan/quota refusal the user can act on by upgrading. 403 is what the shared
     * intake pipeline returns for QUOTA_EXCEEDED (free monthly imports, guest IP
     * cap, minute cap, language cap) — see server/src/services/transcriptionIntake.ts.
     */
    get isQuotaError() {
        return this.status === 403;
    }
    /** Upload rate limit or per-plan concurrency (429), or queue pressure (503) — retry later. */
    get isBusyError() {
        return this.status === 429 || this.status === 503;
    }
}
/** Job id no longer known to the backend (GET /api/job/:id → 404). Mirrors SessionExpiredError in client/src/lib/api.ts. */
export class SessionExpiredError extends Error {
    constructor(message = 'This job expired. Please upload the file again.') {
        super(message);
        this.name = 'SessionExpiredError';
    }
}
/** True for fetch-level failures: offline, DNS, connection reset, abort/timeout. */
export function isNetworkError(e) {
    if (e instanceof VideoTextApiError)
        return false;
    if (e instanceof TypeError && /failed to fetch|load failed|network/i.test(e.message))
        return true;
    if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError'))
        return true;
    return false;
}
/** One concise, useful sentence for any thrown value. */
export function getUserFacingMessage(e) {
    if (isNetworkError(e))
        return 'Connection lost. Check your network and try again.';
    if (e instanceof Error && e.message)
        return e.message;
    return 'Something went wrong. Please try again.';
}
