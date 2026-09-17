import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DownloadHttpError,
  DownloadNotReadyError,
  downloadErrorMessage,
  downloadFailureReason,
  isBlankDownloadUrl,
} from '../src/lib/downloadErrors'

test('a blank download URL is never treated as a usable one', () => {
  // The regression this guards: getDownloadUrl() used to return '' here, and
  // fetch('') resolves against the current page — 200 OK, SPA HTML in the
  // blob, saved under the output's filename. A throw is the only safe answer.
  assert.equal(isBlankDownloadUrl(''), true)
  assert.equal(isBlankDownloadUrl('   '), true)
  assert.equal(isBlankDownloadUrl(null), true)
  assert.equal(isBlankDownloadUrl(undefined), true)
  assert.equal(isBlankDownloadUrl('/api/download/out.mp4'), false)
})

test('failure reasons separate the three ways a download dies', () => {
  assert.equal(downloadFailureReason(new DownloadHttpError(403)), 'http_error')
  assert.equal(downloadFailureReason(new DownloadNotReadyError()), 'missing_url')
  assert.equal(downloadFailureReason(new TypeError('Failed to fetch')), 'network_error')
})

test('the HTTP status survives onto the error, so the event can carry it', () => {
  const err = new DownloadHttpError(403)
  assert.equal(err.status, 403)
  assert.match(err.message, /403/)
})

test('error copy tells the user what to actually do', () => {
  // An owner-bound 403 is the guest-job claim gap — say so, do not say "failed".
  assert.match(downloadErrorMessage(new DownloadHttpError(403)), /Sign in/)
  assert.match(downloadErrorMessage(new DownloadHttpError(401)), /Sign in/)
  assert.match(downloadErrorMessage(new DownloadHttpError(404)), /no longer available/)
  assert.match(downloadErrorMessage(new DownloadHttpError(500)), /500/)
  assert.match(downloadErrorMessage(new DownloadNotReadyError()), /not ready/)
  assert.match(downloadErrorMessage(new TypeError('Failed to fetch')), /connection/)
})
