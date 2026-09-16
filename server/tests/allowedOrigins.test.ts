import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isAllowedOrigin,
  isChromeExtensionOrigin,
  isCorsAllowedOrigin,
} from '../src/utils/allowedOrigins'

const STORE_EXTENSION_ORIGIN = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'

test('isChromeExtensionOrigin accepts a 32-char a-p extension id', () => {
  assert.equal(isChromeExtensionOrigin(STORE_EXTENSION_ORIGIN), true)
})

test('isChromeExtensionOrigin rejects empty, http, and malformed ids', () => {
  assert.equal(isChromeExtensionOrigin(undefined), false)
  assert.equal(isChromeExtensionOrigin('https://videotext.io'), false)
  assert.equal(isChromeExtensionOrigin('chrome-extension://'), false)
  assert.equal(isChromeExtensionOrigin('chrome-extension://not-an-id'), false)
  assert.equal(isChromeExtensionOrigin('chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef'), false)
})

test('isAllowedOrigin does not treat chrome-extension as a web/checkout origin', () => {
  assert.equal(isAllowedOrigin(STORE_EXTENSION_ORIGIN), false)
  assert.equal(isAllowedOrigin('https://videotext.io'), true)
  assert.equal(isAllowedOrigin(undefined), true)
})

test('isCorsAllowedOrigin allows VideoText hosts and chrome-extension popups', () => {
  assert.equal(isCorsAllowedOrigin('https://videotext.io'), true)
  assert.equal(isCorsAllowedOrigin('https://www.videotext.io'), true)
  assert.equal(isCorsAllowedOrigin(STORE_EXTENSION_ORIGIN), true)
  assert.equal(isCorsAllowedOrigin('https://evil.example'), false)
})
