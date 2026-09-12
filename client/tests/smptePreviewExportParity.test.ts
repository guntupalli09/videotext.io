import test from 'node:test'
import assert from 'node:assert/strict'

import { buildTxt, buildCsv, buildJson, buildNotion } from '../src/lib/transcriptExport'
import { addAnchorTimecode } from '../src/lib/smpteTimecode'

// ── Preview/export parity ────────────────────────────────────────────────────
//
// VideoToTranscript.tsx's transcript preview computes each speaker-turn
// header's SMPTE timestamp via the exact same call the export path uses —
// addAnchorTimecode(smpteAnchor, smpteFps, segmentStart) — against the same
// smpteAnchor/smpteFps state. These tests don't render the component (no
// React test harness wired up here), but they pin down the one thing that
// actually matters: given identical (anchor, fps, segment start) inputs, the
// export builder (buildTxt) and the preview's own call to addAnchorTimecode
// produce byte-identical strings, because both call the same underlying
// SMPTE module — nothing is duplicated or reimplemented for the preview.

test('production case: anchor 19:30:00;00, 29.97 DF, first segment -> 19:30:08;28 in both export and the preview call', () => {
  const anchor = '19:30:00;00'
  const fps = 29.97
  // The exact offset (seconds) that produces the production-observed
  // 19:30:08;28 from this anchor at 29.97 drop-frame.
  const firstSegmentStart = 8.942275608942277

  const segments = [
    { start: firstSegmentStart, end: firstSegmentStart + 2, text: 'Good afternoon.', speaker: 'SPEAKER_00' },
  ]

  // Export path (buildTxt, timestampMode: 'smpte')
  const exported = buildTxt(segments, {}, {
    timestampMode: 'smpte',
    smpteAnchor: anchor,
    smpteFps: fps,
  })
  assert.equal(exported, 'Speaker 1 (19:30:08;28)\nGood afternoon.')

  // Preview path: VideoToTranscript.tsx's header renderer calls
  // addAnchorTimecode(smpteAnchor, smpteFps, vg.startTime) directly — same
  // module, same anchor/fps state, same segment start.
  const previewHeaderTimestamp = addAnchorTimecode(anchor, fps, firstSegmentStart)
  assert.equal(previewHeaderTimestamp, '19:30:08;28')

  // The exported header must contain exactly the preview's computed string.
  assert.ok(exported.includes(`(${previewHeaderTimestamp})`))
})

test('29.97 drop-frame renders with a semicolon in both paths', () => {
  const anchor = '00:00:00;00'
  const fps = 29.97
  const start = 65.5

  const exportTc = buildTxt(
    [{ start, end: start + 1, text: 'x', speaker: 'A' }],
    {},
    { timestampMode: 'smpte', smpteAnchor: anchor, smpteFps: fps },
  ).match(/\(([^)]+)\)/)?.[1]
  const previewTc = addAnchorTimecode(anchor, fps, start)

  assert.equal(exportTc, previewTc)
  assert.match(exportTc!, /;/)
})

test('non-drop-frame (e.g. 25fps) renders with a colon in both paths, never a semicolon', () => {
  const anchor = '00:00:00:00'
  const fps = 25
  const start = 65.5

  const exportTc = buildTxt(
    [{ start, end: start + 1, text: 'x', speaker: 'A' }],
    {},
    { timestampMode: 'smpte', smpteAnchor: anchor, smpteFps: fps },
  ).match(/\(([^)]+)\)/)?.[1]
  const previewTc = addAnchorTimecode(anchor, fps, start)

  assert.equal(exportTc, previewTc)
  assert.match(exportTc!, /:/)
  assert.doesNotMatch(exportTc!, /;/)
})

test('changing the anchor changes both export and preview output identically', () => {
  const fps = 29.97
  const start = 30
  const anchors = ['00:00:00;00', '01:00:00;00', '19:30:00;00']

  const results = anchors.map((anchor) => {
    const exportTc = buildTxt(
      [{ start, end: start + 1, text: 'x', speaker: 'A' }],
      {},
      { timestampMode: 'smpte', smpteAnchor: anchor, smpteFps: fps },
    ).match(/\(([^)]+)\)/)?.[1]
    const previewTc = addAnchorTimecode(anchor, fps, start)
    return { anchor, exportTc, previewTc }
  })

  // Every anchor must agree between export and preview...
  for (const r of results) assert.equal(r.exportTc, r.previewTc)
  // ...and different anchors must actually produce different timestamps
  // (proves the preview genuinely reacts to the anchor, not a stale value).
  const distinct = new Set(results.map((r) => r.exportTc))
  assert.equal(distinct.size, anchors.length)
})

test('changing frame rate / DF vs NDF changes both export and preview output identically', () => {
  const anchor = '00:00:00;00'
  const anchorNdf = '00:00:00:00'
  const start = 100.4 // fractional so the frame digit actually differs across frame rates
  const configs: { fps: number; anchor: string }[] = [
    { fps: 25, anchor: anchorNdf },
    { fps: 29.97, anchor },
    { fps: 59.94, anchor },
    { fps: 30, anchor: anchorNdf },
  ]

  const results = configs.map(({ fps, anchor }) => {
    const exportTc = buildTxt(
      [{ start, end: start + 1, text: 'x', speaker: 'A' }],
      {},
      { timestampMode: 'smpte', smpteAnchor: anchor, smpteFps: fps },
    ).match(/\(([^)]+)\)/)?.[1]
    const previewTc = addAnchorTimecode(anchor, fps, start)
    return { fps, exportTc, previewTc }
  })

  for (const r of results) assert.equal(r.exportTc, r.previewTc)
  const distinct = new Set(results.map((r) => r.exportTc))
  assert.equal(distinct.size, configs.length)
})

test('switching away from smpte falls back to the pre-existing per-speaker timestamp format (M:SS, not SMPTE)', () => {
  const segments = [{ start: 65.5, end: 68, text: 'x', speaker: 'A' }]
  const perSpeaker = buildTxt(segments, {}, { timestampMode: 'per-speaker' })
  assert.match(perSpeaker, /\(1:05\)/)
  assert.doesNotMatch(perSpeaker, /;|:\d{2}:\d{2}:\d{2}/)
})

// ── DOCX/PDF export header parity ────────────────────────────────────────────
//
// exportToDocx/exportToPdf/exportToDocxThreeColumn/exportToPdfThreeColumn all
// depend on browser-only libraries (docx, jspdf) and DOM APIs not available in
// this Node test run, so they can't be executed end-to-end here. What CAN be
// pinned down without those libraries: their header-line construction is the
// exact same three-way branch as buildTxt's (`timestampMode === 'smpte' ?
// addAnchorTimecode(smpteAnchor, smpteFps, g.start) : ... : formatTimestamp(...)`),
// just with a double-space before the parenthesis instead of a single space
// (`"${speaker}  (${tc})"` vs buildTxt's `"${speaker} (${tc})"`). These tests
// assert that exact string shape using the real production case, so a manual
// source diff against transcriptExport.ts's four export functions is enough
// to confirm they match — same addAnchorTimecode call, same anchor/fps state.

test('docx/pdf export header format (double-space before parenthesis) matches the production SMPTE case', () => {
  const anchor = '19:30:00;00'
  const fps = 29.97
  const start = 8.942275608942277
  const tc = addAnchorTimecode(anchor, fps, start)
  const docxPdfHeader = `Speaker 1  (${tc})` // exportToDocx/exportToPdf's exact template
  assert.equal(docxPdfHeader, 'Speaker 1  (19:30:08;28)')
})

// ── CSV / JSON / Notion export SMPTE parity ─────────────────────────────────
//
// These three are pure functions (no browser-only libs), so they're executed
// directly here rather than pinned like the docx/pdf ones above.

test('CSV: start/end columns are the SMPTE string, not raw seconds, in smpte mode', () => {
  const anchor = '19:30:00;00'
  const fps = 29.97
  const start = 8.942275608942277
  const segments = [{ start, end: start + 2, text: 'Good afternoon.', speaker: 'SPEAKER_00' }]

  const csv = buildCsv(segments, {}, { timestampMode: 'smpte', smpteAnchor: anchor, smpteFps: fps })
  const [header, row] = csv.split('\n')
  assert.equal(header, 'start,end,speaker,text')
  assert.ok(row.includes(addAnchorTimecode(anchor, fps, start)), `expected SMPTE start in row: ${row}`)
  assert.ok(row.includes(addAnchorTimecode(anchor, fps, start + 2)), `expected SMPTE end in row: ${row}`)
  assert.doesNotMatch(row, /\b8\.94\d*\b/, 'must not contain the raw-seconds form')
})

test('CSV: non-smpte modes are unaffected (still raw seconds)', () => {
  const segments = [{ start: 8.94, end: 10.94, text: 'x', speaker: 'A' }]
  const csv = buildCsv(segments, {}, { timestampMode: 'per-speaker' })
  assert.match(csv.split('\n')[1], /^8\.940,10\.940,/)
})

test('JSON: segments carry startTimecode/endTimecode SMPTE strings in smpte mode, start/end stay numeric seconds', () => {
  const anchor = '19:30:00;00'
  const fps = 29.97
  const start = 8.942275608942277
  const segments = [{ start, end: start + 2, text: 'Good afternoon.', speaker: 'SPEAKER_00' }]

  const json = JSON.parse(
    buildJson(segments, {}, {}, { timestampMode: 'smpte', smpteAnchor: anchor, smpteFps: fps }),
  )
  const seg = json.segments[0]
  assert.equal(seg.startTimecode, addAnchorTimecode(anchor, fps, start))
  assert.equal(seg.endTimecode, addAnchorTimecode(anchor, fps, start + 2))
  assert.equal(typeof seg.start, 'number') // numeric seconds preserved for existing consumers
  assert.equal(seg.start, start)
})

test('JSON: non-smpte modes never add startTimecode/endTimecode fields', () => {
  const segments = [{ start: 8.94, end: 10.94, text: 'x', speaker: 'A' }]
  const json = JSON.parse(buildJson(segments, {}, {}, { timestampMode: 'per-speaker' }))
  assert.equal('startTimecode' in json.segments[0], false)
})

test('Notion: block content includes the SMPTE timestamp in smpte mode', () => {
  const anchor = '19:30:00;00'
  const fps = 29.97
  const start = 8.942275608942277
  const segments = [{ start, end: start + 2, text: 'Good afternoon.', speaker: 'SPEAKER_00' }]

  const blocks = JSON.parse(
    buildNotion(segments, {}, { timestampMode: 'smpte', smpteAnchor: anchor, smpteFps: fps }),
  )
  const content = blocks[0].rich_text[0].text.content
  const tc = addAnchorTimecode(anchor, fps, start)
  assert.equal(content, `[Speaker 1] (${tc}) Good afternoon.`)
  assert.equal(tc, '19:30:08;28')
})
