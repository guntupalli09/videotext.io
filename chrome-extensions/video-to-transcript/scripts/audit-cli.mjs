/**
 * Re-run the shipped-bundle security audit against an existing dist/ without
 * rebuilding, and print the report. Useful when inspecting a package that was
 * already built (for example, before uploading it to the Web Store).
 *
 * Usage: npm run audit [-- <path-to-dist>]
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditBundle, formatAuditReport } from './audit-bundle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const dist = resolve(process.argv[2] ?? resolve(ROOT, 'dist'))

if (!existsSync(dist)) {
  console.error(`No build found at ${dist}. Run "npm run build" first.`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'manifest.json'), 'utf8'))
const report = auditBundle(dist)
console.log(
  formatAuditReport(report, {
    manifest,
    zipPath: `artifacts/videotext-video-to-transcript-v${manifest.version}.zip`,
  })
)
process.exit(report.findings.length === 0 ? 0 : 1)
