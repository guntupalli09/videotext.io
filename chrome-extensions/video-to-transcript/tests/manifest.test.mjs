/**
 * Manifest validity and permission hygiene.
 *
 * These assertions are the contract with the Chrome Web Store review process:
 * MV3, a single stated purpose, the minimum permission set, and no broad host
 * access. A change that widens any of them should fail here and be justified in
 * docs/chrome-extension-permissions.md before it ships.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'manifest.json'), 'utf8'))
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))

test('uses Manifest V3', () => {
  assert.equal(manifest.manifest_version, 3)
})

test('name, version and description meet Web Store requirements', () => {
  assert.equal(manifest.name, 'Video to Transcript — VideoText')
  assert.ok(manifest.name.length <= 75, 'name must be 75 characters or fewer')
  assert.match(manifest.version, /^\d+\.\d+(\.\d+){0,2}$/)
  assert.ok(manifest.description.length > 0)
  assert.ok(
    manifest.description.length <= 132,
    `description must be 132 characters or fewer, got ${manifest.description.length}`
  )
})

test('manifest version matches package.json', () => {
  assert.equal(manifest.version, pkg.version)
})

test('requests only the storage permission', () => {
  assert.deepEqual(manifest.permissions, ['storage'])
})

test('requests no prohibited or unrelated permissions', () => {
  const prohibited = [
    '<all_urls>', 'tabs', 'cookies', 'webRequest', 'webRequestBlocking', 'history',
    'bookmarks', 'management', 'debugger', 'proxy', 'privacy', 'nativeMessaging',
    'declarativeNetRequest', 'clipboardRead', 'geolocation', 'topSites',
    'browsingData', 'contentSettings', 'desktopCapture', 'pageCapture',
    'tabCapture', 'downloads', 'scripting', 'identity', 'unlimitedStorage',
  ]
  const requested = [...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? [])]
  for (const permission of requested) {
    assert.ok(!prohibited.includes(permission), `prohibited permission requested: ${permission}`)
  }
})

test('host permissions are limited to the VideoText API origin', () => {
  assert.deepEqual(manifest.host_permissions, ['https://api.videotext.io/*'])
  for (const host of manifest.host_permissions) {
    assert.ok(!host.includes('<all_urls>'), 'must not request <all_urls>')
    assert.ok(!/^\*:\/\//.test(host), 'must not use a wildcard scheme')
    assert.ok(!/:\/\/\*\//.test(host), 'must not use a wildcard host')
    assert.match(host, /^https:\/\//, 'host permissions must be https')
  }
})

test('the content script is scoped to the sign-in handoff page only', () => {
  assert.equal(manifest.content_scripts.length, 1)
  const [script] = manifest.content_scripts
  assert.deepEqual(script.matches, ['https://videotext.io/extension-auth*'])
  assert.deepEqual(script.js, ['content-auth.js'])
  assert.ok(!script.all_frames, 'must not run in all frames')
  assert.ok(!script.match_about_blank, 'must not run in about:blank')
})

test("extension pages CSP is script-src 'self' with no unsafe directives", () => {
  const csp = manifest.content_security_policy.extension_pages
  assert.match(csp, /script-src 'self'/)
  assert.ok(!/unsafe-eval/.test(csp), "CSP must not allow 'unsafe-eval'")
  assert.ok(!/unsafe-inline/.test(csp), "CSP must not allow 'unsafe-inline'")
})

test('declares no remote code or externally connectable surface', () => {
  assert.equal(manifest.externally_connectable, undefined)
  assert.equal(manifest.web_accessible_resources, undefined)
  assert.equal(manifest.sandbox, undefined)
})

test('declares every icon size Chrome asks for, and the files exist', () => {
  for (const size of ['16', '32', '48', '128']) {
    assert.ok(manifest.icons[size], `missing icons.${size}`)
    assert.ok(manifest.action.default_icon[size], `missing action.default_icon.${size}`)
    assert.ok(
      existsSync(resolve(ROOT, manifest.icons[size])),
      `icon file missing: ${manifest.icons[size]}`
    )
  }
})

test('the action opens the popup', () => {
  assert.equal(manifest.action.default_popup, 'popup.html')
  assert.ok(existsSync(resolve(ROOT, 'public/popup.html')))
})
