/**
 * Regression tests for the /api/v1 "public operation -> internal operation"
 * mapping (services/apiOperations.ts) and the security fix it enables:
 * a client can never choose which internal worker toolType actually runs.
 *
 * These are pure-function tests (registry shape + resolveToolType), so they
 * run without a live Postgres/Redis connection — full end-to-end coverage
 * (auth, ownership propagation, quota gating) is documented as requiring a
 * live DB in docs/API_PRIVATE_BETA.md "Testing notes", matching the existing
 * convention in tests/apiKeyModel.test.ts.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { PUBLIC_OPERATIONS, internalToolTypeFor, type PublicOperation } from '../src/services/apiOperations'
import { resolveToolType } from '../src/services/toolTypeResolution'
import { operationForToolType, toolTypesForOperation } from '../src/services/apiV1Format'

const KNOWN_WORKER_TOOL_TYPES = new Set([
  'video-to-transcript',
  'video-to-subtitles',
  'translate-subtitles',
  'fix-subtitles',
  'burn-subtitles',
  'compress-video',
])

test('PUBLIC_OPERATIONS: every single-file/dual-file operation maps to a real, known worker toolType (never invented)', () => {
  for (const [op, cfg] of Object.entries(PUBLIC_OPERATIONS)) {
    if (cfg.kind === 'guideline-format') continue
    assert.ok(
      KNOWN_WORKER_TOOL_TYPES.has(cfg.internalToolType),
      `${op} maps to unknown/invented toolType "${cfg.internalToolType}"`
    )
  }
})

test('PUBLIC_OPERATIONS: covers all 8 paid workflows with exactly one operation each (no duplicates)', () => {
  const ops = Object.keys(PUBLIC_OPERATIONS) as PublicOperation[]
  // 7 public operations: guideline-format, video_to_transcript (covers voice-recorder
  // too — see apiOperations.ts doc comment), video_to_subtitles, subtitle_translation,
  // subtitle_fix, subtitle_burn, video_compression.
  assert.equal(ops.length, 7)
  assert.equal(new Set(ops).size, ops.length)
})

test('internalToolTypeFor: guideline_format has no worker toolType (it does not use workers/videoProcessor.ts at all)', () => {
  assert.equal(internalToolTypeFor('guideline_format'), undefined)
})

test('internalToolTypeFor: burn-subtitles and fix-subtitles are exposed as their exact production toolTypes', () => {
  assert.equal(internalToolTypeFor('subtitle_burn'), 'burn-subtitles')
  assert.equal(internalToolTypeFor('subtitle_fix'), 'fix-subtitles')
})

// --- BUG 2 regression: POST /api/v1/transcriptions accepted toolType=transcribe
// (an unsupported public value) and forwarded it straight to the worker, which
// then failed with "Unknown tool type: transcribe". Also covers the sharper
// case in the task: a malicious/careless client sending
// toolType=burn-subtitles to POST /api/v1/transcriptions must never cause
// burn-subtitles to execute. ---

test('resolveToolType: forcedToolType always wins over client-supplied toolType (BUG 2 fix)', () => {
  assert.equal(resolveToolType('transcribe', 'video-to-transcript'), 'video-to-transcript')
  assert.equal(resolveToolType('burn-subtitles', 'video-to-transcript'), 'video-to-transcript')
  assert.equal(resolveToolType(undefined, 'video-to-transcript'), 'video-to-transcript')
  assert.equal(resolveToolType('video-to-transcript', 'video-to-transcript'), 'video-to-transcript')
})

test('resolveToolType: with no forcedToolType (web route), falls back to whatever the client sent — unchanged web behavior', () => {
  assert.equal(resolveToolType('video-to-subtitles', undefined), 'video-to-subtitles')
  assert.equal(resolveToolType(undefined, undefined), undefined)
  // Non-string client input (e.g. an array from a malformed multipart body) never leaks through as toolType.
  assert.equal(resolveToolType(['video-to-transcript'], undefined), undefined)
})

test('resolveToolType: every /api/v1 single/dual-file operation forces its registry toolType regardless of client input', () => {
  for (const [, cfg] of Object.entries(PUBLIC_OPERATIONS)) {
    if (cfg.kind === 'guideline-format') continue
    for (const attackerValue of ['transcribe', 'burn-subtitles', 'compress-video', '', null, undefined]) {
      assert.equal(resolveToolType(attackerValue as any, cfg.internalToolType), cfg.internalToolType)
    }
  }
})

test('operationForToolType: maps every known worker toolType back to its public operation name', () => {
  assert.equal(operationForToolType('video-to-transcript'), 'video_to_transcript')
  assert.equal(operationForToolType('video-to-subtitles'), 'video_to_subtitles')
  assert.equal(operationForToolType('translate-subtitles'), 'subtitle_translation')
  assert.equal(operationForToolType('fix-subtitles'), 'subtitle_fix')
  assert.equal(operationForToolType('burn-subtitles'), 'subtitle_burn')
  assert.equal(operationForToolType('compress-video'), 'video_compression')
})

test('operationForToolType: Voice Recorder\'s analytics toolType label maps to the same operation as video_to_transcript', () => {
  // Voice Recorder is not a separate public operation — see apiOperations.ts.
  // The analytics mirror records audio-source uploads as 'voice-to-transcript'
  // (services/transcriptionIntake.ts) even though the worker still runs
  // 'video-to-transcript'; GET /api/v1/transcriptions must surface both.
  assert.equal(operationForToolType('voice-to-transcript'), 'video_to_transcript')
})

test('operationForToolType: falls back to the raw toolType for internal-only jobs rather than hiding them', () => {
  assert.equal(operationForToolType('cached-result'), 'cached-result')
  assert.equal(operationForToolType('youtube-to-transcript'), 'youtube-to-transcript')
})

test('toolTypesForOperation: video_to_transcript includes the voice-recorder analytics alias so GET lists surface both', () => {
  const toolTypes = toolTypesForOperation('video_to_transcript')
  assert.ok(toolTypes.includes('video-to-transcript'))
  assert.ok(toolTypes.includes('voice-to-transcript'))
})

test('toolTypesForOperation: subtitle_burn only ever matches burn-subtitles jobs (no cross-operation leakage)', () => {
  assert.deepEqual(toolTypesForOperation('subtitle_burn'), ['burn-subtitles'])
})

test('toolTypesForOperation: guideline_format has no Job.toolType (it lives on FormattingJob instead)', () => {
  assert.deepEqual(toolTypesForOperation('guideline_format'), [])
})
