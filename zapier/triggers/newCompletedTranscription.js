'use strict';

const { BASE_URL } = require('../constants');
const { shapeJobOutput } = require('../lib/api');

/**
 * Polling strategy & dedup — see docs/API_PRIVATE_BETA.md
 * "GET /api/v1/<resource> — polling for Zapier's trigger" and
 * zapier/README.md "Trigger implementation".
 *
 * Zapier's documented polling-trigger contract is: return items as an array
 * in reverse-chronological order; Zapier itself deduplicates by each item's
 * `id` across polls (an ID Zapier has seen before never fires again). No
 * cross-poll state is required or assumed on our side for this to work
 * correctly — which matters here because VideoText's `/transcriptions`
 * feed is intentionally ascending-cursor-only (`(completedAt, id)` keyset
 * pagination — see apiV1.ts), specifically so equal-timestamp jobs are
 * never skipped, not because it's designed for reverse listing.
 *
 * So each poll:
 *   1. Asks for everything completed since a rolling lookback window
 *      (LOOKBACK_MS, comfortably larger than any realistic gap between
 *      Zapier polls) rather than trying to persist a "last seen" cursor
 *      across separate poll executions — cursor state that would outlive
 *      one execution isn't part of the documented polling-trigger contract,
 *      so this deliberately doesn't invent one.
 *   2. Follows the API's own `next_cursor` forward, in the same execution,
 *      up to MAX_PAGES pages — this is normal same-request pagination
 *      (well within the 30s trigger budget for the beta's expected volume),
 *      not a cross-poll cursor.
 *   3. Reverses the (ascending) result into the descending order Zapier's
 *      contract expects, so the newest completed job is first.
 *   4. Re-checks `status === 'completed' && !failure_reason` defensively,
 *      even though the query already filters for it server-side.
 *
 * Trade-off, stated plainly: if more than MAX_PAGES * limit jobs complete
 * within one LOOKBACK_MS window (private-beta traffic makes this
 * extremely unlikely), the oldest of that burst could be missed by this
 * trigger. Not silently accepted — see zapier/README.md.
 */
const LOOKBACK_MS = Number(process.env.VIDEOTEXT_ZAPIER_TRIGGER_LOOKBACK_MS) || 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 4;

async function fetchRecentlyCompleted(z, since) {
  const items = [];
  let cursor;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = { status: 'completed', since, limit: PAGE_LIMIT };
    if (cursor) params.cursor = cursor;

    // eslint-disable-next-line no-await-in-loop
    const response = await z.request({ url: `${BASE_URL}/transcriptions`, params });
    const body = response.data || {};
    const data = Array.isArray(body.data) ? body.data : [];
    items.push(...data);

    if (!body.pagination || !body.pagination.has_more || !body.pagination.next_cursor) break;
    cursor = body.pagination.next_cursor;
  }

  return items;
}

async function perform(z, bundle) {
  const since = new Date(Date.now() - LOOKBACK_MS).toISOString();
  const items = await fetchRecentlyCompleted(z, since);

  return items
    .filter((job) => job && job.status === 'completed' && !job.failure_reason && job.id)
    .map(shapeJobOutput)
    // API returns ascending (oldest → newest) by design (apiV1.ts keyset
    // pagination); Zapier's polling contract wants newest-first.
    .reverse();
}

const sample = {
  id: '12345',
  status: 'completed',
  operation: 'video_to_transcript',
  filename: 'a1b2c3d4-my-video_transcript.txt',
  duration_seconds: 612,
  txt_url: 'https://api.videotext.io/api/download/a1b2c3d4-my-video_transcript.txt?jobToken=sample-token',
  srt_url: null,
  vtt_url: null,
  download_url: null,
  original_size_bytes: 104857600,
  created_at: '2026-08-30T05:50:00.000Z',
  completed_at: '2026-08-30T05:52:14.000Z',
  failure_reason: null,
};

module.exports = {
  key: 'newCompletedTranscription',
  noun: 'Transcription',
  display: {
    label: 'New Completed Transcription',
    description: 'Triggers when VideoText completes a new transcription.',
  },
  operation: {
    type: 'polling',
    perform,
    sample,
    outputFields: [
      { key: 'id', label: 'Job ID', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'operation', label: 'Operation', type: 'string' },
      { key: 'filename', label: 'Filename', type: 'string' },
      { key: 'duration_seconds', label: 'Duration (seconds)', type: 'number' },
      { key: 'txt_url', label: 'Transcript (TXT) URL', type: 'string' },
      { key: 'srt_url', label: 'Subtitles (SRT) URL', type: 'string' },
      { key: 'vtt_url', label: 'Subtitles (VTT) URL', type: 'string' },
      { key: 'download_url', label: 'Download URL', type: 'string' },
      { key: 'original_size_bytes', label: 'Original Size (bytes)', type: 'number' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
      { key: 'failure_reason', label: 'Failure Reason', type: 'string' },
    ],
  },
};
