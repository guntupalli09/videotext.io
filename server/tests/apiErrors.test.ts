import test from 'node:test'
import assert from 'node:assert/strict'

import { buildApiErrorBody, API_ERROR_STATUS, type ApiErrorCode } from '../src/utils/apiErrors'

test('buildApiErrorBody: shape matches the documented external error envelope', () => {
  const body = buildApiErrorBody('QUOTA_EXCEEDED', 'Monthly minute limit reached.')
  assert.deepEqual(Object.keys(body), ['error'])
  assert.equal(body.error.code, 'QUOTA_EXCEEDED')
  assert.equal(body.error.message, 'Monthly minute limit reached.')
})

test('buildApiErrorBody: never includes a stack trace or internal path', () => {
  const body = buildApiErrorBody('INTERNAL_ERROR', 'Something went wrong.')
  const serialized = JSON.stringify(body)
  assert.ok(!serialized.includes('/home/'))
  assert.ok(!serialized.includes('.ts:'))
  assert.ok(!serialized.toLowerCase().includes('at object.'))
})

test('API_ERROR_STATUS: every documented code has a mapped HTTP status', () => {
  const requiredCodes: ApiErrorCode[] = [
    'INVALID_API_KEY',
    'API_KEY_REVOKED',
    'UPGRADE_REQUIRED',
    'QUOTA_EXCEEDED',
    'FILE_TOO_LARGE',
    'DURATION_EXCEEDED',
    'UNSUPPORTED_FILE',
    'TRANSCRIPTION_NOT_FOUND',
    'FORBIDDEN',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
  ]
  for (const code of requiredCodes) {
    assert.ok(typeof API_ERROR_STATUS[code] === 'number', `missing status for ${code}`)
  }
})

test('API_ERROR_STATUS: auth failures map to 401, quota/plan failures to 403, rate limit to 429', () => {
  assert.equal(API_ERROR_STATUS.INVALID_API_KEY, 401)
  assert.equal(API_ERROR_STATUS.API_KEY_REVOKED, 401)
  assert.equal(API_ERROR_STATUS.UPGRADE_REQUIRED, 403)
  assert.equal(API_ERROR_STATUS.QUOTA_EXCEEDED, 403)
  assert.equal(API_ERROR_STATUS.RATE_LIMITED, 429)
  assert.equal(API_ERROR_STATUS.TRANSCRIPTION_NOT_FOUND, 404)
})
