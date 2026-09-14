import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'src')
const dist = path.join(root, 'dist')
const repoRoot = path.resolve(root, '../..')
const artifacts = path.join(repoRoot, 'artifacts')
const zipPath = path.join(artifacts, 'videotext-fix-srt-v1.0.0.zip')

const { spawnSync: run } = { spawnSync }
run(process.execPath, [path.join(root, 'scripts/generate-icons.mjs')], { stdio: 'inherit' })

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true })
fs.mkdirSync(path.join(dist, 'icons'), { recursive: true })

const files = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'background.js',
  'content-auth.js',
  'config.js',
  'api.js',
  'srtValidate.js',
]
for (const file of files) {
  fs.copyFileSync(path.join(src, file), path.join(dist, file))
}
for (const icon of fs.readdirSync(path.join(src, 'icons'))) {
  fs.copyFileSync(path.join(src, 'icons', icon), path.join(dist, 'icons', icon))
}
fs.copyFileSync(path.join(dist, 'popup.css'), path.join(dist, 'assets', 'popup.css'))

assertNoSecrets(dist)
assertNoLocalhost(dist)

fs.mkdirSync(artifacts, { recursive: true })
fs.rmSync(zipPath, { force: true })

const zip = spawnSync('zip', ['-X', '-r', zipPath, '.'], { cwd: dist, stdio: 'inherit' })
if (zip.status !== 0) {
  throw new Error('zip failed')
}

verifyZipRoot(zipPath)
console.log(`Built ${dist}`)
console.log(`Packaged ${zipPath}`)

function assertNoSecrets(dir) {
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
  ]
  walk(dir, (file, text) => {
    for (const pattern of forbidden) {
      if (pattern.test(text)) {
        throw new Error(`Forbidden secret pattern ${pattern} in ${file}`)
      }
    }
    if (text.includes('eval(')) {
      throw new Error(`eval() is not allowed in ${file}`)
    }
  })
}

function assertNoLocalhost(dir) {
  walk(dir, (file, text) => {
    if (file.endsWith('.md')) return
    if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(text)) {
      throw new Error(`loopback URL found in ${file}`)
    }
  })
}

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, visit)
    else if (/\.(js|html|css|json|md)$/.test(entry.name)) {
      visit(full, fs.readFileSync(full, 'utf8'))
    }
  }
}

function verifyZipRoot(file) {
  const listing = spawnSync('unzip', ['-l', file], { encoding: 'utf8' })
  if (listing.status !== 0) throw new Error('unzip -l failed')
  const names = listing.stdout.split('\n').map((line) => line.trim().split(/\s+/).pop()).filter(Boolean)
  if (!names.includes('manifest.json')) {
    throw new Error('manifest.json must be at the ZIP root')
  }
  if (names.some((name) => name.startsWith('fix-srt/'))) {
    throw new Error('ZIP must not nest files under fix-srt/')
  }
}
