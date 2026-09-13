/**
 * CORS allowlist behaviour for Chrome extension origins.
 *
 * The "Video to Transcript — VideoText" extension
 * (chrome-extensions/video-to-transcript) calls the API from a
 * chrome-extension://<id> origin. utils/allowedOrigins.ts allows only the exact
 * ids listed in EXTENSION_ORIGINS — never a wildcard — so these tests pin:
 *
 *   1. unset EXTENSION_ORIGINS allows no extension at all (fails closed),
 *   2. a configured id is allowed and a different one is not,
 *   3. malformed entries are ignored rather than widening the allowlist,
 *   4. existing web origins are unaffected,
 *   5. extension origins are excluded from the redirect allowlist used by the
 *      Stripe checkout URLs in routes/billing.ts.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isAllowedExtensionOrigin,
  isAllowedOrigin,
  isAllowedRedirectOrigin,
  parseExtensionOrigins,
} from '../src/utils/allowedOrigins'

const VALID_ID = 'abcdefghijklmnopabcdefghijklmnop' // 32 chars, a-p — the Chrome extension id alphabet
const OTHER_ID = 'ponmlkjihgfedcbaponmlkjihgfedcba'

/** Run a case with EXTENSION_ORIGINS set to the given value, then restore it. */
function withExtensionOrigins(value: string | undefined, run: () => void): void {
  const previous = process.env.EXTENSION_ORIGINS
  if (value === undefined) delete process.env.EXTENSION_ORIGINS
  else process.env.EXTENSION_ORIGINS = value
  try {
    run()
  } finally {
    if (previous === undefined) delete process.env.EXTENSION_ORIGINS
    else process.env.EXTENSION_ORIGINS = previous
  }
}

test('no extension origin is allowed when EXTENSION_ORIGINS is unset', () => {
  withExtensionOrigins(undefined, () => {
    assert.equal(isAllowedOrigin(`chrome-extension://${VALID_ID}`), false)
    assert.equal(isAllowedExtensionOrigin(`chrome-extension://${VALID_ID}`), false)
  })
})

test('a configured extension origin is allowed, and only that one', () => {
  withExtensionOrigins(`chrome-extension://${VALID_ID}`, () => {
    assert.equal(isAllowedOrigin(`chrome-extension://${VALID_ID}`), true)
    assert.equal(isAllowedOrigin(`chrome-extension://${OTHER_ID}`), false)
  })
})

test('several extension origins can be configured, comma-separated', () => {
  withExtensionOrigins(` chrome-extension://${VALID_ID} , chrome-extension://${OTHER_ID} `, () => {
    assert.equal(isAllowedOrigin(`chrome-extension://${VALID_ID}`), true)
    assert.equal(isAllowedOrigin(`chrome-extension://${OTHER_ID}`), true)
  })
})

test('malformed entries are ignored and never widen the allowlist', () => {
  const configured = [
    'chrome-extension://*',
    'chrome-extension://',
    'chrome-extension://TOO-SHORT',
    'chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', // z is outside the a-p id alphabet
    'moz-extension://abcdefghijklmnopabcdefghijklmnop',
    `chrome-extension://${VALID_ID}`,
  ].join(',')

  assert.deepEqual([...parseExtensionOrigins(configured)], [`chrome-extension://${VALID_ID}`])

  withExtensionOrigins(configured, () => {
    assert.equal(isAllowedOrigin('chrome-extension://*'), false)
    assert.equal(isAllowedOrigin('chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'), false)
    assert.equal(isAllowedOrigin('moz-extension://abcdefghijklmnopabcdefghijklmnop'), false)
    assert.equal(isAllowedOrigin(`chrome-extension://${OTHER_ID}`), false)
    // The one well-formed entry still works.
    assert.equal(isAllowedOrigin(`chrome-extension://${VALID_ID}`), true)
  })
})

test('existing web origins are unaffected by the extension allowlist', () => {
  withExtensionOrigins(`chrome-extension://${VALID_ID}`, () => {
    assert.equal(isAllowedOrigin('https://videotext.io'), true)
    assert.equal(isAllowedOrigin('https://www.videotext.io'), true)
    assert.equal(isAllowedOrigin('https://videotext-preview.vercel.app'), true)
    assert.equal(isAllowedOrigin(undefined), true, 'no Origin header (server-to-server) stays allowed')
    assert.equal(isAllowedOrigin('https://evil.example.com'), false)
  })
})

test('an extension origin is never a valid redirect target for checkout URLs', () => {
  withExtensionOrigins(`chrome-extension://${VALID_ID}`, () => {
    // Allowed to call the API…
    assert.equal(isAllowedOrigin(`chrome-extension://${VALID_ID}`), true)
    // …but never a Stripe success/cancel URL host (see routes/billing.ts).
    assert.equal(isAllowedRedirectOrigin(`chrome-extension://${VALID_ID}`), false)
    assert.equal(isAllowedRedirectOrigin('https://videotext.io'), true)
    assert.equal(isAllowedRedirectOrigin('https://evil.example.com'), false)
    assert.equal(isAllowedRedirectOrigin(undefined), false, 'a missing origin is not a redirect target')
  })
})
