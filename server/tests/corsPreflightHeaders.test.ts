/**
 * Regression guard for the 2026-09-14 CORS preflight incident.
 *
 * The Vercel client ships independently of this Docker image. When it started
 * sending `x-ph-distinct-id` on every API call, two closed allowlists blocked
 * the preflight and the browser reported "TypeError: Failed to fetch" on every
 * request:
 *
 *   1. Caddy intercepted OPTIONS and set a hard-coded
 *      Access-Control-Allow-Headers that omitted the new header.
 *   2. Express pinned `allowedHeaders` instead of reflecting the request's
 *      Access-Control-Request-Headers.
 *
 * The fix made Caddy a TLS/proxy layer only and let the `cors` package reflect
 * Access-Control-Request-Headers (its default when `allowedHeaders` is unset).
 *
 * These assertions are static: the failure mode is a *closed list reappearing*
 * in configuration, which is exactly what source inspection catches. Booting
 * Express here would require Postgres and Redis and would not test the
 * deployed Caddy layer at all.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..', '..')
const indexSrc = fs.readFileSync(path.join(repoRoot, 'server', 'src', 'index.ts'), 'utf8')
const caddySrc = fs.readFileSync(path.join(repoRoot, 'deploy', 'Caddyfile'), 'utf8')

/** Headers client/src/lib/api.ts attaches to API requests. */
const CLIENT_REQUEST_HEADERS = ['content-type', 'authorization', 'x-ph-distinct-id']

test('Express does not pin Access-Control-Allow-Headers to a closed list', () => {
  assert.equal(
    /allowedHeaders\s*:/.test(indexSrc),
    false,
    'corsOptions must omit allowedHeaders so the cors package reflects ' +
      'Access-Control-Request-Headers; pinning it breaks any header the ' +
      'independently-deployed client adds later.',
  )
})

test('Express still constrains origins while reflecting headers', () => {
  assert.ok(
    /isCorsAllowedOrigin/.test(indexSrc),
    'origin allowlist must remain enforced (isCorsAllowedOrigin includes web hosts and chrome-extension://)',
  )
  assert.ok(
    /app\.options\(\s*['"]\*['"]\s*,\s*cors\(/.test(indexSrc),
    'preflight must be handled by the cors middleware',
  )
})

test('Caddy does not intercept preflight or set CORS headers', () => {
  const directives = caddySrc
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n')

  assert.equal(
    /Access-Control-/i.test(directives),
    false,
    'Caddy must not set Access-Control-* headers — Express owns CORS',
  )
  assert.equal(
    /@?options|method\s+OPTIONS/i.test(directives),
    false,
    'Caddy must not match or short-circuit OPTIONS requests',
  )
  assert.ok(/reverse_proxy/.test(directives), 'Caddy should still proxy to the API')
})

test('every header the client sends would survive a reflecting preflight', () => {
  // With allowedHeaders unset, `cors` echoes Access-Control-Request-Headers
  // verbatim, so any client header is allowed by construction. This asserts the
  // precondition that makes that true, and documents the header set so a future
  // closed list is an obvious test failure rather than a production outage.
  for (const header of CLIENT_REQUEST_HEADERS) {
    assert.equal(
      new RegExp(`allowedHeaders[^\\n]*${header}`, 'i').test(indexSrc),
      false,
      `${header} must not depend on an explicit allowlist entry`,
    )
  }
  assert.ok(
    indexSrc.includes('x-ph-distinct-id'),
    'the incident header should stay documented in the CORS comment so the ' +
      'reason for reflecting headers is not lost',
  )
})
