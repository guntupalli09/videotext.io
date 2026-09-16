import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

test('dist bundle exists after build', () => {
  assert.ok(fs.existsSync(path.join(dist, 'manifest.json')), 'run npm run build first')
})

test('manifest is MV3 with minimum permissions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'))
  assert.equal(manifest.manifest_version, 3)
  assert.deepEqual(manifest.permissions, ['storage'])
  assert.deepEqual(manifest.host_permissions, ['https://api.videotext.io/*'])
  assert.ok(!manifest.permissions.includes('tabs'))
  assert.ok(!manifest.permissions.includes('downloads'))
  assert.ok(!manifest.host_permissions.includes('<all_urls>'))
  assert.ok(!manifest.externally_connectable)
})

test('bundle contains no secrets, eval, or localhost', () => {
  const files = walk(dist).filter((file) => /\.(js|html|css|json)$/.test(file))
  const forbidden = [
    /sk-live-/,
    /sk_live_/,
    /sk_test_/,
    /OPENAI_API_KEY/,
    /STRIPE_SECRET/,
    /DATABASE_URL/,
    /postgres:\/\//,
    /vt_live_/,
    /whsec_/,
    /\beval\s*\(/,
    /https?:\/\/localhost/,
    /https?:\/\/127\.0\.0\.1/,
  ]
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${pattern} found in ${path.relative(dist, file)}`)
    }
  }
})

test('API origin is production VideoText', () => {
  const config = fs.readFileSync(path.join(dist, 'config.js'), 'utf8')
  assert.match(config, /https:\/\/api\.videotext\.io/)
  assert.match(config, /https:\/\/videotext\.io/)
})
