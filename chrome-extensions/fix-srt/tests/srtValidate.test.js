import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSrtSelection, inspectSrt } from '../src/srtValidate.js'

const limits = { maxBytes: 10 * 1024 * 1024, warnBytes: 2 * 1024 * 1024 }

const VALID = `1
00:00:01,000 --> 00:00:03,000
Hello there.

2
00:00:03,500 --> 00:00:06,000
This file is already valid.
`

const OVERLAP = `1
00:00:01,000 --> 00:00:04,000
First cue overlaps the next.

2
00:00:03,500 --> 00:00:06,000
Second cue.
`

test('rejects a non-srt extension', () => {
  const result = validateSrtSelection({ name: 'captions.vtt', size: VALID.length, text: VALID }, limits)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /srt/i)
})

test('rejects an empty file', () => {
  const result = validateSrtSelection({ name: 'empty.srt', size: 0, text: '' }, limits)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /empty/i)
})

test('rejects whitespace-only SRT', () => {
  const result = validateSrtSelection({ name: 'blank.srt', size: 4, text: '\n\n' }, limits)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /empty/i)
})

test('rejects a file with no timestamps', () => {
  const result = validateSrtSelection({
    name: 'notes.srt',
    size: 20,
    text: 'just some text without cues',
  }, limits)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /timestamp/i)
})

test('rejects WEBVTT content even if named .srt', () => {
  const text = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi'
  const result = validateSrtSelection({ name: 'file.srt', size: text.length, text }, limits)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /WebVTT/i)
})

test('accepts a correctly formatted SRT', () => {
  const result = validateSrtSelection({ name: 'ok.srt', size: VALID.length, text: VALID }, limits)
  assert.equal(result.ok, true)
  assert.equal(result.stats.cueCount, 2)
  assert.equal(result.errors.length, 0)
})

test('flags overlapping cues as a warning, not a hard error', () => {
  const result = validateSrtSelection({ name: 'overlap.srt', size: OVERLAP.length, text: OVERLAP }, limits)
  assert.equal(result.ok, true)
  assert.equal(result.stats.overlapCount, 1)
  assert.ok(result.warnings.some((w) => /overlap/i.test(w)))
})

test('inspectSrt counts skipped malformed blocks', () => {
  const text = `${VALID}\n\nnot a cue\n`
  const stats = inspectSrt(text)
  assert.equal(stats.cueCount, 2)
  assert.ok(stats.skippedBlocks >= 1)
})

test('rejects files over the extension size cap', () => {
  const text = VALID
  const result = validateSrtSelection({
    name: 'huge.srt',
    size: limits.maxBytes + 1,
    text,
  }, limits)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /Maximum size/i)
})
