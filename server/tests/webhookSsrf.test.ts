/**
 * SSRF-hardening unit tests (Phase 7). Covers the synchronous IP-range
 * checks and the URL-shape checks (scheme, credentials, malformed input)
 * that do not require live DNS resolution. Hostname-resolution behavior
 * (validateWebhookUrl against a real domain) is exercised in staging —
 * this sandbox has no outbound DNS/network — see docs/API_PRIVATE_BETA.md.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { isBlockedIp, validateWebhookUrl } from '../src/utils/webhookSsrf'

test('isBlockedIp: blocks loopback (127.0.0.1)', () => {
  assert.equal(isBlockedIp('127.0.0.1'), true)
})

test('isBlockedIp: blocks RFC1918 private ranges', () => {
  assert.equal(isBlockedIp('10.0.0.1'), true)
  assert.equal(isBlockedIp('172.16.5.5'), true)
  assert.equal(isBlockedIp('192.168.1.1'), true)
})

test('isBlockedIp: blocks link-local, including the cloud metadata address', () => {
  assert.equal(isBlockedIp('169.254.169.254'), true)
  assert.equal(isBlockedIp('169.254.0.1'), true)
})

test('isBlockedIp: blocks IPv6 loopback and unique-local', () => {
  assert.equal(isBlockedIp('::1'), true)
  assert.equal(isBlockedIp('fd00::1'), true)
  assert.equal(isBlockedIp('fe80::1'), true)
})

test('isBlockedIp: blocks IPv4-mapped IPv6 addresses pointing at private ranges', () => {
  assert.equal(isBlockedIp('::ffff:127.0.0.1'), true)
  assert.equal(isBlockedIp('::ffff:10.0.0.5'), true)
})

test('isBlockedIp: allows a normal public IPv4 address', () => {
  assert.equal(isBlockedIp('8.8.8.8'), false)
  assert.equal(isBlockedIp('93.184.216.34'), false)
})

test('isBlockedIp: fails closed on garbage input', () => {
  assert.equal(isBlockedIp('not-an-ip'), true)
  assert.equal(isBlockedIp(''), true)
})

test('validateWebhookUrl: rejects non-http(s) schemes', async () => {
  const result = await validateWebhookUrl('file:///etc/passwd')
  assert.equal(result.ok, false)
})

test('validateWebhookUrl: rejects ftp/gopher/data schemes', async () => {
  const result = await validateWebhookUrl('ftp://example.com/x')
  assert.equal(result.ok, false)
})

test('validateWebhookUrl: rejects URLs with embedded credentials', async () => {
  const result = await validateWebhookUrl('http://user:pass@example.com/hook')
  assert.equal(result.ok, false)
  assert.match(result.reason || '', /credentials/i)
})

test('validateWebhookUrl: rejects localhost by name', async () => {
  const result = await validateWebhookUrl('http://localhost:3000/hook')
  assert.equal(result.ok, false)
})

test('validateWebhookUrl: rejects a literal loopback IP with no DNS involved', async () => {
  const result = await validateWebhookUrl('http://127.0.0.1/hook')
  assert.equal(result.ok, false)
})

test('validateWebhookUrl: rejects a literal private IP with no DNS involved', async () => {
  const result = await validateWebhookUrl('http://10.0.0.5:8080/hook')
  assert.equal(result.ok, false)
})

test('validateWebhookUrl: rejects the literal cloud metadata address', async () => {
  const result = await validateWebhookUrl('http://169.254.169.254/latest/meta-data/')
  assert.equal(result.ok, false)
})

test('validateWebhookUrl: rejects a malformed URL', async () => {
  const result = await validateWebhookUrl('not a url at all')
  assert.equal(result.ok, false)
  assert.match(result.reason || '', /malformed/i)
})

test('validateWebhookUrl: accepts a literal public IPv4 address', async () => {
  const result = await validateWebhookUrl('https://93.184.216.34/hook')
  assert.equal(result.ok, true)
})
