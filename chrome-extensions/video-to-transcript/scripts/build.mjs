/**
 * Production build for the "Video to Transcript — VideoText" Chrome extension.
 *
 *   1. type-check + compile src/**.ts  →  dist/*.js   (tsc, no bundler)
 *   2. copy manifest.json, public/*, icons/*          →  dist/
 *   3. write artifacts/videotext-video-to-transcript-v<version>.zip
 *      with manifest.json at the ARCHIVE ROOT
 *   4. run the shipped-bundle security audit
 *
 * No bundler and no minifier: everything Chrome runs is the readable output of
 * tsc, which is what a Web Store reviewer wants to see and what makes "no
 * remote code, no eval" verifiable by reading dist/.
 *
 * Usage: npm run build   (or, from the repo root, npm run chrome:transcript:build)
 */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipDirectory } from './zip.mjs'
import { auditBundle, formatAuditReport } from './audit-bundle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const REPO_ROOT = resolve(ROOT, '..', '..')
const DIST = resolve(ROOT, 'dist')
const ARTIFACTS = resolve(REPO_ROOT, 'artifacts')

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'manifest.json'), 'utf8'))
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))

if (manifest.version !== pkg.version) {
  throw new Error(
    `Version mismatch: manifest.json is ${manifest.version}, package.json is ${pkg.version}. Keep them in sync.`
  )
}

console.log(`Building ${manifest.name} v${manifest.version}\n`)

// 1 — clean and compile
rmSync(DIST, { recursive: true, force: true })
mkdirSync(DIST, { recursive: true })

console.log('› tsc')
execFileSync(process.execPath, [resolve(ROOT, 'node_modules/typescript/bin/tsc'), '--project', resolve(ROOT, 'tsconfig.json')], {
  cwd: ROOT,
  stdio: 'inherit',
})

// 2 — static assets
console.log('› assets')
cpSync(resolve(ROOT, 'manifest.json'), resolve(DIST, 'manifest.json'))
cpSync(resolve(ROOT, 'public'), DIST, { recursive: true })
cpSync(resolve(ROOT, 'icons'), resolve(DIST, 'icons'), { recursive: true })

// 3 — Web Store package
mkdirSync(ARTIFACTS, { recursive: true })
const zipPath = resolve(ARTIFACTS, `videotext-video-to-transcript-v${manifest.version}.zip`)
const { entries, bytes } = await zipDirectory(DIST, zipPath)

if (entries[0] !== 'manifest.json') {
  throw new Error('manifest.json is not at the root of the ZIP')
}
if (entries.some((name) => name.includes('/') && name.split('/')[0] === 'video-to-transcript')) {
  throw new Error('ZIP contains a wrapper directory')
}

console.log(`› zip  ${entries.length} files, ${(bytes / 1024).toFixed(1)} KB`)
for (const entry of entries) console.log(`    ${entry}`)

// 4 — security audit of exactly what ships
const report = auditBundle(DIST)
const reportText = formatAuditReport(report, { manifest, zipPath: zipPath.replace(`${REPO_ROOT}/`, '') })
writeFileSync(resolve(ROOT, 'SECURITY_AUDIT.md'), reportText)
console.log(`\n${report.findings.length === 0 ? '✓' : '✗'} security audit — ${report.checks.length} checks, ${report.findings.length} finding(s)`)
for (const finding of report.findings) console.log(`    ! ${finding}`)

if (report.findings.length > 0) {
  throw new Error('Security audit failed — see the findings above. The ZIP was written but must not be uploaded.')
}

console.log(`\nBuild complete.\n  dist: ${DIST.replace(`${REPO_ROOT}/`, '')}\n  zip:  ${zipPath.replace(`${REPO_ROOT}/`, '')}`)
