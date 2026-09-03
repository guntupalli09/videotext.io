import test from 'node:test'
import assert from 'node:assert/strict'

import { parseHeaderedBlocks, hasAnyHeader, joinHeaderedBlocks } from '../src/utils/transcriptBlocks'

// ── parseHeaderedBlocks ─────────────────────────────────────────────────────

test('parseHeaderedBlocks: per-speaker/per-segment "Name (M:SS)" headers', () => {
  const text =
    'LUCA (0:19)\nReally good. Really good.\n\n' +
    'P (0:27)\nThat’s okay.'
  const blocks = parseHeaderedBlocks(text)
  assert.equal(blocks.length, 2)
  assert.deepEqual(blocks[0], { header: 'LUCA (0:19)', body: 'Really good. Really good.' })
  assert.deepEqual(blocks[1], { header: 'P (0:27)', body: 'That’s okay.' })
})

test('parseHeaderedBlocks: multi-digit minutes and hour-scale minutes', () => {
  const text = 'Speaker 1 (75:03)\nSome long-video line.'
  const blocks = parseHeaderedBlocks(text)
  assert.equal(blocks[0].header, 'Speaker 1 (75:03)')
})

test('parseHeaderedBlocks: per-interval "[M:SS]" header', () => {
  const text = '[0:00]\nP: Hello there.'
  const blocks = parseHeaderedBlocks(text)
  assert.equal(blocks[0].header, '[0:00]')
  assert.equal(blocks[0].body, 'P: Hello there.')
})

test('parseHeaderedBlocks: headerless block ("none" mode / arbitrary pasted text)', () => {
  const text = 'Just a plain paragraph with no speaker or timestamp line.'
  const blocks = parseHeaderedBlocks(text)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].header, null)
  assert.equal(blocks[0].body, text)
})

test('parseHeaderedBlocks: a line that merely looks header-shaped but has no body is not treated as a header', () => {
  // Single-line block: "LUCA (0:19)" alone, no following body line — kept whole as body.
  const text = 'LUCA (0:19)'
  const blocks = parseHeaderedBlocks(text)
  assert.equal(blocks[0].header, null)
  assert.equal(blocks[0].body, 'LUCA (0:19)')
})

test('parseHeaderedBlocks: mixed headered and headerless blocks', () => {
  const text = 'LUCA (0:19)\nHello.\n\nSome headerless paragraph.\n\nP (0:27)\nOkay.'
  const blocks = parseHeaderedBlocks(text)
  assert.equal(blocks.length, 3)
  assert.equal(blocks[0].header, 'LUCA (0:19)')
  assert.equal(blocks[1].header, null)
  assert.equal(blocks[2].header, 'P (0:27)')
})

// ── hasAnyHeader ─────────────────────────────────────────────────────────────

test('hasAnyHeader: true when at least one block has a header', () => {
  const blocks = parseHeaderedBlocks('LUCA (0:19)\nHi.\n\nplain text')
  assert.equal(hasAnyHeader(blocks), true)
})

test('hasAnyHeader: false for fully headerless input', () => {
  const blocks = parseHeaderedBlocks('plain paragraph one.\n\nplain paragraph two.')
  assert.equal(hasAnyHeader(blocks), false)
})

// ── joinHeaderedBlocks (round-trip + reassembly with edited bodies) ─────────

test('joinHeaderedBlocks: round-trips parseHeaderedBlocks output unchanged', () => {
  const text = 'LUCA (0:19)\nReally good.\n\nP (0:27)\nThat’s okay.'
  const blocks = parseHeaderedBlocks(text)
  assert.equal(joinHeaderedBlocks(blocks), text)
})

test('joinHeaderedBlocks: header stays verbatim even when body is edited to something implausible', () => {
  const blocks = [
    { header: 'LUCA (0:19)', body: 'Really good.' },
    { header: null, body: 'plain paragraph' },
  ]
  const edited = blocks.map((b, i) => ({ header: b.header, body: i === 0 ? 'Rewritten wording.' : b.body }))
  const out = joinHeaderedBlocks(edited)
  assert.equal(out, 'LUCA (0:19)\nRewritten wording.\n\nplain paragraph')
})
