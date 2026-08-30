/**
 * Unit tests for the GET /api/v1/transcriptions response shaping and
 * keyset-pagination cursor encoding used by the Zapier polling trigger.
 * Full HTTP-level pagination behavior (querying real rows across pages)
 * requires a live Postgres connection and is not exercised here — see
 * docs/API_PRIVATE_BETA.md "Testing notes".
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { encodeCursor, decodeCursor, extOf, toExternalTranscription, type StableJobRow } from '../src/services/apiV1Format'

test('encodeCursor/decodeCursor: round-trips a timestamp + id', () => {
  const sortValue = new Date('2026-08-30T12:00:00.000Z')
  const cursor = encodeCursor(sortValue, 'job_123')
  const decoded = decodeCursor(cursor)
  assert.ok(decoded)
  assert.equal(decoded!.sortValue.toISOString(), sortValue.toISOString())
  assert.equal(decoded!.id, 'job_123')
})

test('decodeCursor: rejects a malformed cursor rather than throwing', () => {
  assert.equal(decodeCursor('not-base64-!!!'), null)
  assert.equal(decodeCursor(Buffer.from('no-separator-here').toString('base64url')), null)
})

test('decodeCursor: rejects a cursor with an invalid embedded timestamp', () => {
  const bad = Buffer.from('not-a-date|job_1').toString('base64url')
  assert.equal(decodeCursor(bad), null)
})

test('encodeCursor: two jobs with the same completedAt still produce distinct, orderable cursors (id tiebreak)', () => {
  const t = new Date('2026-08-30T12:00:00.000Z')
  const cursorA = encodeCursor(t, 'job_a')
  const cursorB = encodeCursor(t, 'job_b')
  assert.notEqual(cursorA, cursorB)
  const a = decodeCursor(cursorA)!
  const b = decodeCursor(cursorB)!
  assert.equal(a.sortValue.getTime(), b.sortValue.getTime())
  assert.ok(a.id < b.id) // deterministic tiebreak used by the /transcriptions query
})

function makeRow(overrides: Partial<StableJobRow> = {}): StableJobRow {
  return {
    id: 'job_1',
    status: 'completed',
    toolType: 'video-to-transcript',
    resultFilename: null,
    jobToken: null,
    videoDurationSec: 120,
    createdAt: new Date('2026-08-30T10:00:00.000Z'),
    completedAt: new Date('2026-08-30T10:05:00.000Z'),
    failureReason: null,
    ...overrides,
  }
}

test('extOf: extracts a lowercased extension including the dot', () => {
  assert.equal(extOf('transcript.SRT'), '.srt')
  assert.equal(extOf('output.txt'), '.txt')
  assert.equal(extOf(null), '')
  assert.equal(extOf('no-extension'), '')
})

test('toExternalTranscription: routes a .txt output to txt_url only', () => {
  const out = toExternalTranscription(makeRow({ resultFilename: 'abc-transcript.txt', jobToken: 'tok_1' }))
  assert.ok(out.txt_url?.includes('abc-transcript.txt'))
  assert.ok(out.txt_url?.includes('jobToken=tok_1'))
  assert.equal(out.srt_url, null)
  assert.equal(out.vtt_url, null)
  assert.equal(out.download_url, null)
})

test('toExternalTranscription: routes a .srt output to srt_url only', () => {
  const out = toExternalTranscription(makeRow({ resultFilename: 'abc-subs.srt' }))
  assert.equal(out.txt_url, null)
  assert.ok(out.srt_url?.includes('abc-subs.srt'))
  assert.equal(out.vtt_url, null)
})

test('toExternalTranscription: a .docx/.zip output falls back to download_url, not txt/srt/vtt', () => {
  const out = toExternalTranscription(makeRow({ resultFilename: 'abc-export.docx' }))
  assert.equal(out.txt_url, null)
  assert.equal(out.srt_url, null)
  assert.equal(out.vtt_url, null)
  assert.ok(out.download_url?.includes('abc-export.docx'))
})

test('toExternalTranscription: no result yet (still processing) -> all URL fields null, no invented fields', () => {
  const out = toExternalTranscription(makeRow({ resultFilename: null, status: 'processing', completedAt: null }))
  assert.equal(out.txt_url, null)
  assert.equal(out.srt_url, null)
  assert.equal(out.vtt_url, null)
  assert.equal(out.download_url, null)
  assert.equal(out.completed_at, null)
  // `language` and `transcript` are intentionally not part of the shape at
  // all (not durably persisted) — assert they never leak in as undefined-
  // valued keys either, i.e. this is a deliberate omission, not an oversight.
  assert.ok(!('language' in out))
  assert.ok(!('transcript' in out))
})

test('toExternalTranscription: id/status/tool_type/duration/timestamps pass through unchanged', () => {
  const row = makeRow({ id: 'job_42', status: 'failed', toolType: 'video-to-subtitles', videoDurationSec: 90, failureReason: 'boom' })
  const out = toExternalTranscription(row)
  assert.equal(out.id, 'job_42')
  assert.equal(out.status, 'failed')
  assert.equal(out.tool_type, 'video-to-subtitles')
  assert.equal(out.duration_seconds, 90)
  assert.equal(out.failure_reason, 'boom')
  assert.equal(out.created_at, row.createdAt.toISOString())
})
