'use strict';

const { BASE_URL } = require('../constants');
const { friendlyApiError } = require('./errors');

// Job.status values persisted by the VideoText Job table (server/prisma/schema.prisma):
// 'queued' | 'processing' | 'completed' | 'failed'. Only these two are terminal.
const TERMINAL_STATUSES = new Set(['completed', 'failed']);

/**
 * Async-job strategy for this integration
 * -----------------------------------------------------------------------
 * Every VideoText processing endpoint is asynchronous: POST returns 202 with
 * a queued job, and the real result only exists once
 * GET /api/v1/<resource>/:id reports a terminal status.
 *
 * Zapier hard-caps a single create/trigger execution at 30 seconds (see
 * docs.zapier.com "Operating constraints"). VideoText jobs (video
 * transcription, subtitle burn-in, compression, ...) can legitimately run
 * far longer than that for large files. There is no way to block inside one
 * Zapier execution until such a job finishes without risking a hard
 * timeout — so this helper does NOT try to.
 *
 * Instead, each create does a bounded, best-effort poll:
 *   - submit the job (POST, fast, well inside the execution window)
 *   - poll GET .../:id a few times with a short interval, but only for as
 *     long as fits safely inside the 30s window (POLL_BUDGET_MS below,
 *     with real margin reserved for the submit request + Zapier overhead)
 *   - if the job reaches a terminal state within that budget, return the
 *     final result (this is the common case for short audio clips / small
 *     files, and keeps a single-step Zap fully synchronous)
 *   - if it does NOT finish in time, return the job in its current
 *     (non-terminal) state rather than blocking further or failing the
 *     step. The action succeeds with `status: "queued"/"processing"` and
 *     no output URLs yet.
 *
 * For anything that doesn't finish inside one execution, the supported
 * pattern is the "New Completed Transcription" trigger (or, for other
 * operations, polling GET .../:id from a subsequent step / a second Zap):
 * it polls VideoText's own completed-jobs feed on Zapier's normal trigger
 * schedule, well outside any single execution's time budget, and fires
 * once the job is actually done. This is a deliberate two-tier design, not
 * a workaround — seeexpanded rationale in zapier/README.md
 * ("Polling architecture").
 */
const POLL_BUDGET_MS = Number(process.env.VIDEOTEXT_ZAPIER_POLL_BUDGET_MS) || 22000;
const POLL_INTERVAL_MS = Number(process.env.VIDEOTEXT_ZAPIER_POLL_INTERVAL_MS) || 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls GET `${BASE_URL}${resourcePath}/:id` until it reaches a terminal
 * status or the poll budget is exhausted, whichever comes first. Never
 * throws for a job that is merely still processing when the budget runs
 * out — only for a `failed` job or a genuine API/network error.
 */
async function pollUntilTerminalOrBudget(z, resourcePath, jobId, startedAtMs) {
  const deadline = (startedAtMs || Date.now()) + POLL_BUDGET_MS;
  let last = null;

  while (Date.now() < deadline) {
    const response = await z.request({ url: `${BASE_URL}${resourcePath}/${encodeURIComponent(jobId)}` });
    last = response.data;

    if (!last || typeof last.status !== 'string') {
      throw friendlyApiError('INTERNAL_ERROR', 'VideoText returned an unexpected response while checking job status.');
    }

    if (TERMINAL_STATUSES.has(last.status)) {
      break;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(POLL_INTERVAL_MS, remaining));
  }

  return last;
}

/**
 * Runs the shared submit → bounded-poll → shape-result flow for a single
 * async job-producing action. `submit()` must return `{ id, ... }` (the
 * 202 response). Throws a friendly error for a `failed` terminal job;
 * otherwise returns the last known job record (terminal or not).
 */
async function runAsyncJob(z, resourcePath, submit) {
  const startedAt = Date.now();
  const created = await submit();
  if (!created || !created.id) {
    throw friendlyApiError('INTERNAL_ERROR', 'VideoText did not return a job id for this request.');
  }

  const job = await pollUntilTerminalOrBudget(z, resourcePath, created.id, startedAt);
  // GET responses intentionally omit a few POST-only fields (notably
  // `target_language` for subtitle-translations — see
  // docs/API_PRIVATE_BETA.md "GET /api/v1/<resource>/:id"), so fields from
  // the initial 202 response are preserved unless the GET poll overwrites
  // them (status, URLs, timestamps, ...).
  const finalJob = job ? { ...created, ...job } : created;

  if (finalJob.status === 'failed') {
    throw friendlyApiError(
      'PROCESSING_FAILED',
      finalJob.failure_reason
        ? `VideoText processing failed: ${finalJob.failure_reason}`
        : 'VideoText processing failed for an unknown reason.'
    );
  }

  return finalJob;
}

module.exports = { runAsyncJob, pollUntilTerminalOrBudget, TERMINAL_STATUSES, POLL_BUDGET_MS, POLL_INTERVAL_MS };
