/**
 * Unit tests for the API-key primitives (hashing, generation, format).
 * Pure-function tests only — creating/listing/revoking keys requires a live
 * Postgres connection (prisma.apiKey.*), which is not available in this
 * sandbox; those code paths are exercised by manual/staging verification
 * instead (see docs/API_PRIVATE_BETA.md "Testing notes").
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { generateRawApiKey, hashApiKey, API_KEY_PREFIX } from '../src/models/ApiKey'

test('generateRawApiKey: starts with the vt_live_ prefix', () => {
  const key = generateRawApiKey()
  assert.ok(key.startsWith(API_KEY_PREFIX))
})

test('generateRawApiKey: produces a long, high-entropy secret (not guessable)', () => {
  const key = generateRawApiKey()
  const secret = key.slice(API_KEY_PREFIX.length)
  // 32 random bytes, base64url-encoded, is 43 chars with no padding.
  assert.equal(secret.length, 43)
  assert.match(secret, /^[A-Za-z0-9_-]+$/)
})

test('generateRawApiKey: two calls never produce the same key', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 1000; i++) {
    const key = generateRawApiKey()
    assert.ok(!seen.has(key), 'raw key collision detected')
    seen.add(key)
  }
})

test('hashApiKey: deterministic for the same input', () => {
  const key = generateRawApiKey()
  assert.equal(hashApiKey(key), hashApiKey(key))
})

test('hashApiKey: different keys hash to different values', () => {
  const a = generateRawApiKey()
  const b = generateRawApiKey()
  assert.notEqual(hashApiKey(a), hashApiKey(b))
})

test('hashApiKey: never returns the raw key (hash is a fixed-length hex digest, not a substring of the input)', () => {
  const key = generateRawApiKey()
  const hash = hashApiKey(key)
  assert.equal(hash.length, 64) // SHA-256 hex digest length
  assert.match(hash, /^[0-9a-f]{64}$/)
  assert.ok(!key.includes(hash))
  assert.ok(!hash.includes(key))
})
