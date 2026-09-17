import test from 'node:test'
import assert from 'node:assert/strict'

import { downloadPath } from '../src/utils/downloadUrl'
import { sanitizeFilename } from '../src/utils/sanitizeFilename'

/** What Express hands the route back as req.params.filename. */
function asRouteParam(path: string): string {
  return decodeURIComponent(path.replace('/api/download/', ''))
}

test('a stored filename survives the round-trip to the route', () => {
  // sanitizeFilename deliberately keeps spaces, so stored names contain them.
  const names = [
    '05 Interview Final.srt',
    'screenrecording_07-28-2026 at 11.12.07.mp4',
    'plain_name.srt',
  ]
  for (const name of names) {
    assert.equal(sanitizeFilename(name), name, `precondition: ${name} is already a stored name`)
    assert.equal(asRouteParam(downloadPath(name)), name)
  }
})

test('a space no longer ends the path early', () => {
  // The observed failure: /api/download/05 <rest dropped> → SPA 404 "Page not found".
  const path = downloadPath('05 Interview Final.srt')
  assert.equal(path, '/api/download/05%20Interview%20Final.srt')
  assert.ok(!path.includes(' '))
  assert.notEqual(path.split(' ')[0], '/api/download/05')
})

test('characters that break a URL harder than a space are encoded too', () => {
  // '#' truncates everything after it; '&' and '?' start a query string.
  assert.equal(downloadPath('a#b.srt'), '/api/download/a%23b.srt')
  assert.equal(downloadPath('a&b.srt'), '/api/download/a%26b.srt')
  assert.equal(asRouteParam(downloadPath('a#b.srt')), 'a#b.srt')
})

test('encoding is idempotent in effect — the route sees the original name once', () => {
  const stored = sanitizeFilename('my video.mp4')
  assert.equal(asRouteParam(downloadPath(stored)), 'my video.mp4')
})
