import test from 'node:test'
import assert from 'node:assert/strict'

import {
  fetchTranscriptDownloadText,
  isTranscriptDownloadZip,
  jobHasUsableResult,
  jobPayloadHasTranscript,
  looksLikeJsonErrorBody,
  transcriptTextFromResult,
} from '../src/lib/hydrateTranscriptResult'

test('transcriptTextFromResult prefers joined segment text', () => {
  const text = transcriptTextFromResult({
    fullText: 'should not win',
    downloadUrl: '/api/download/x.txt',
    segments: [
      { start: 0, end: 1, text: 'Hello there.' },
      { start: 1, end: 2, text: 'Next line.' },
    ],
  })
  assert.equal(text, 'Hello there.\n\nNext line.')
})

test('transcriptTextFromResult falls back to fullText when segments are missing', () => {
  const text = transcriptTextFromResult({
    fullText: '  Summary-only jobs still have words.  ',
    downloadUrl: '/api/download/x.txt',
  })
  assert.equal(text, 'Summary-only jobs still have words.')
})

test('transcriptTextFromResult is empty when the payload was stripped (requiresAuth path)', () => {
  assert.equal(transcriptTextFromResult({ downloadUrl: '' }), '')
  assert.equal(transcriptTextFromResult(null), '')
})

test('jobPayloadHasTranscript is false for the SSE completed event (no result / requiresAuth)', () => {
  assert.equal(jobPayloadHasTranscript(undefined), false)
  assert.equal(jobPayloadHasTranscript({ downloadUrl: '' }), false)
})

test('jobHasUsableResult treats zip downloads and analyze issues as ready for non-transcript tools', () => {
  assert.equal(
    jobHasUsableResult({ downloadUrl: '/api/download/out.zip', fileName: 'out.zip' }),
    true,
  )
  assert.equal(jobHasUsableResult({ issues: [] }), true)
  assert.equal(jobHasUsableResult({ downloadUrl: '' }), false)
})

test('jobPayloadHasTranscript is true when segments, fullText, or a non-zip download exist', () => {
  assert.equal(
    jobPayloadHasTranscript({
      segments: [{ start: 0, end: 1, text: 'Hello.' }],
    }),
    true,
  )
  assert.equal(jobPayloadHasTranscript({ fullText: 'Hello.' }), true)
  assert.equal(
    jobPayloadHasTranscript({ downloadUrl: '/api/download/talk.txt', fileName: 'talk.txt' }),
    true,
  )
  assert.equal(
    jobPayloadHasTranscript({ downloadUrl: '/api/download/talk.zip', fileName: 'talk.zip' }),
    false,
  )
})

test('isTranscriptDownloadZip detects zip primary downloads so we do not treat them as text', () => {
  assert.equal(isTranscriptDownloadZip('/api/download/talk.zip', 'talk.zip'), true)
  assert.equal(isTranscriptDownloadZip('/api/download/talk.txt', 'talk.txt'), false)
})

test('looksLikeJsonErrorBody rejects 401 JSON that a bare fetch would otherwise paste into the pane', () => {
  assert.equal(looksLikeJsonErrorBody('{"message":"Authentication required."}'), true)
  assert.equal(looksLikeJsonErrorBody('The actual transcript starts here.'), false)
})

test('fetchTranscriptDownloadText sends the auth header and returns body text', async () => {
  const calls: { url: string; headers: HeadersInit | undefined }[] = []
  const fetchImpl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init?.headers as HeadersInit | undefined })
    return new Response('Spoken words from the file.', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
  const text = await fetchTranscriptDownloadText(
    '/api/download/recording.txt',
    'recording.txt',
    fetchImpl,
    'test-token'
  )
  assert.equal(text, 'Spoken words from the file.')
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].headers, { Authorization: 'Bearer test-token' })
})

test('fetchTranscriptDownloadText throws on 401 instead of silently returning an empty pane', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ message: 'Authentication required.' }), { status: 401 })
  await assert.rejects(
    () => fetchTranscriptDownloadText('/api/download/x.txt', 'x.txt', fetchImpl, null),
    /401/
  )
})
