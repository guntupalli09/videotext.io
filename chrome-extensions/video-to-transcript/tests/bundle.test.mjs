/**
 * Shipped-bundle checks: the security audit and the Web Store ZIP.
 *
 * These run against dist/ and artifacts/…zip, so they fail if the packaged
 * artifact drifts from the sources. Run `npm run build` first.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditBundle } from '../scripts/audit-bundle.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = resolve(ROOT, '..', '..')
const DIST = resolve(ROOT, 'dist')
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'manifest.json'), 'utf8'))
const ZIP = resolve(REPO_ROOT, `artifacts/videotext-video-to-transcript-v${manifest.version}.zip`)

const built = existsSync(DIST)
const skipUnbuilt = { skip: built ? false : 'run `npm run build` first' }

test('the security audit reports no findings against the shipped bundle', skipUnbuilt, () => {
  const report = auditBundle(DIST)
  assert.deepEqual(report.findings, [], report.findings.join('\n'))
  assert.ok(report.checks.length >= 10, 'expected the full audit check set to run')
})

test('the bundle points at the production VideoText API and site', skipUnbuilt, () => {
  const config = readFileSync(resolve(DIST, 'lib/config.js'), 'utf8')
  assert.match(config, /API_ORIGIN = 'https:\/\/api\.videotext\.io'/)
  assert.match(config, /SITE_ORIGIN = 'https:\/\/videotext\.io'/)
  assert.match(config, /TOOL_TYPE = 'video-to-transcript'/)
  assert.ok(!/localhost|127\.0\.0\.1/.test(config), 'no development URLs may ship')
})

test('the bundle contains no analytics or telemetry SDK', skipUnbuilt, () => {
  const report = auditBundle(DIST)
  const code = report.files
    .filter((f) => f.endsWith('.js') || f.endsWith('.html'))
    .map((f) => readFileSync(resolve(DIST, f), 'utf8'))
    .join('\n')
  for (const marker of ['posthog', 'sentry', 'google-analytics', 'gtag(', 'segment.com', 'mixpanel']) {
    assert.ok(!code.toLowerCase().includes(marker), `unexpected telemetry reference: ${marker}`)
  }
})

test('the Web Store ZIP exists and has manifest.json at its root', skipUnbuilt, () => {
  assert.ok(existsSync(ZIP), `missing package: ${ZIP}`)
  const zip = readFileSync(ZIP)

  // Read the first local file header: signature, then the name at offset 30.
  assert.equal(zip.readUInt32LE(0), 0x04034b50, 'not a ZIP archive')
  const nameLength = zip.readUInt16LE(26)
  const extraLength = zip.readUInt16LE(28)
  const firstName = zip.subarray(30, 30 + nameLength).toString('utf8')
  assert.equal(firstName, 'manifest.json', `first entry is ${firstName}, not manifest.json`)
  assert.equal(extraLength, 0)
})

test('the ZIP contains every dist file and no wrapper directory', skipUnbuilt, () => {
  const zip = readFileSync(ZIP)
  const names = []

  // Walk the central directory from the end-of-central-directory record.
  let eocd = zip.length - 22
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--
  assert.ok(eocd >= 0, 'no end-of-central-directory record')

  const count = zip.readUInt16LE(eocd + 10)
  let offset = zip.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(offset), 0x02014b50, 'bad central directory header')
    const nameLength = zip.readUInt16LE(offset + 28)
    const extraLength = zip.readUInt16LE(offset + 30)
    const commentLength = zip.readUInt16LE(offset + 32)
    names.push(zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'))
    offset += 46 + nameLength + extraLength + commentLength
  }

  const distFiles = auditBundle(DIST).files
  assert.deepEqual([...names].sort(), [...distFiles].sort())

  for (const name of names) {
    assert.ok(!name.startsWith('/'), `absolute path in archive: ${name}`)
    assert.ok(!name.includes('..'), `path traversal in archive: ${name}`)
    assert.ok(
      !name.startsWith('video-to-transcript/') && !name.startsWith('dist/'),
      `archive has a wrapper directory: ${name}`
    )
  }
})
