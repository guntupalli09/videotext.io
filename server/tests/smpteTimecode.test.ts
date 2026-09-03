import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isDropFrameEligible,
  secondsToFrameCount,
  encodeDropFrameDisplayCount,
  frameCountToTimecode,
  timecodeToFrameCount,
  addAnchorTimecode,
} from '../src/utils/smpteTimecode'

// ── isDropFrameEligible ──────────────────────────────────────────────────────

test('isDropFrameEligible: only 29.97 / 59.94', () => {
  assert.equal(isDropFrameEligible(29.97), true)
  assert.equal(isDropFrameEligible(59.94), true)
  assert.equal(isDropFrameEligible(30), false)
  assert.equal(isDropFrameEligible(25), false)
  assert.equal(isDropFrameEligible(24), false)
  assert.equal(isDropFrameEligible(60), false)
})

// ── Non-drop-frame rates: exact, no ambiguity ────────────────────────────────

test('non-drop-frame: 25fps round-trip through timecode string', () => {
  const tc = frameCountToTimecode(secondsToFrameCount(3725.4, 25), 25, false) // 1:02:05;10
  assert.equal(tc, '01:02:05:10')
  assert.equal(timecodeToFrameCount(tc, 25), secondsToFrameCount(3725.4, 25))
})

test('non-drop-frame: addAnchorTimecode simple addition at 30fps', () => {
  const out = addAnchorTimecode('00:10:00:00', 30, 5.5) // +5.5s = +165 frames
  assert.equal(out, '00:10:05:15')
})

// ── Drop-frame reference checkpoints (derived from the standard SMPTE algorithm) ──
// At 29.97fps, exactly 3600 real seconds = round(3600 * 29.97) = 107892 real frames.
// A naive (non-drop) 30fps-nominal reading of that count falls behind real time
// (~3.6s/hour, the well-known non-drop-frame drift); the drop-frame-corrected
// encoding lands exactly on 01:00:00;00 at this exact 10-minute-block boundary.

test('drop-frame: exactly 1 real hour at 29.97fps encodes to 01:00:00;00', () => {
  const realFrames = secondsToFrameCount(3600, 29.97)
  assert.equal(realFrames, 107892)
  const display = encodeDropFrameDisplayCount(realFrames, 29.97)
  assert.equal(frameCountToTimecode(display, 29.97, true), '01:00:00;00')
})

test('drop-frame: decoding 01:00:00;00 back to real frame count is the exact inverse', () => {
  assert.equal(timecodeToFrameCount('01:00:00;00', 29.97), 107892)
})

test('drop-frame: naive non-drop reading of the same real frame count falls behind real time (~3.6s)', () => {
  const realFrames = secondsToFrameCount(3600, 29.97) // 107892
  const naive = frameCountToTimecode(realFrames, 29.97, false)
  // 107892 / 30 = 3596.4s = 59:56;12 — about 3.6s behind the true 1:00:00 mark.
  assert.equal(naive, '00:59:56:12')
})

test('drop-frame: addAnchorTimecode from a zero drop-frame anchor to exactly 1 hour offset', () => {
  const out = addAnchorTimecode('00:00:00;00', 29.97, 3600)
  assert.equal(out, '01:00:00;00')
})

test('drop-frame: addAnchorTimecode preserves drop-frame notation on output when anchor is drop-frame', () => {
  const out = addAnchorTimecode('00:09:59;29', 29.97, 1 / 29.97) // one frame past 00:09:59;29
  assert.match(out, /;/) // stays drop-frame notation
})

// ── The actual bug report: no drift over a long file, computed anchor + offset ──

test('regression: encode -> decode round-trips exactly across a long file, every 7.3s for 3+ hours', () => {
  // Independent validation: decode (timecodeToFrameCount, the inverse formula)
  // must recover exactly what encode (via addAnchorTimecode) produced, for
  // every offset — not just a single checkpoint. A drift bug would show up as
  // a growing mismatch the further into the loop this runs.
  const anchor = '00:00:00;00'
  const fps = 29.97
  let offset = 0
  for (let i = 0; i < 1500; i++) {
    const tc = addAnchorTimecode(anchor, fps, offset)
    const decodedReal = timecodeToFrameCount(tc, fps)
    const expectedReal = secondsToFrameCount(offset, fps)
    assert.equal(decodedReal, expectedReal, `drift at offset ${offset}s (frame ${i}): got ${tc}`)
    offset += 7.3
  }
})

test("Brian's exact ExpressScribe complaint: no drift deep into a long file", () => {
  // ExpressScribe showed 19:59:34:16 as 19:59:36:10 deep into a file — a ~1.9s
  // error. Decoding our computed timecode ~5h20m into a file must recover the
  // exact real frame count for that offset — an independent check via the
  // inverse (decode) formula, not the same code path that produced it.
  const anchor = '00:00:00;00'
  const fps = 29.97
  const farOffsetSeconds = 3600 * 5 + 1234.56 // ~5h20m into a long file
  const out = addAnchorTimecode(anchor, fps, farOffsetSeconds)
  assert.equal(timecodeToFrameCount(out, fps), secondsToFrameCount(farOffsetSeconds, fps))
})
