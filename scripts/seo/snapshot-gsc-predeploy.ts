#!/usr/bin/env node
/**
 * Pre-deploy GSC baseline snapshot (28 days, page-level).
 *
 * Exports CSV with clicks, impressions, CTR, position for every page in
 * scripts/seo/gsc-predeploy-pages.txt (and a full-site page CSV backup).
 *
 * Required env:
 *   GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL
 *
 * Usage:
 *   npm run seo:gsc-predeploy
 *   npm run seo:gsc-predeploy -- --pages scripts/seo/gsc-predeploy-pages.txt
 */
import * as fs from 'fs'
import * as path from 'path'
import { google } from 'googleapis'

const repoRoot = path.resolve(__dirname, '..', '..')
const defaultPagesFile = path.join(__dirname, 'gsc-predeploy-pages.txt')
const dataDir = path.join(repoRoot, 'scripts', 'seo', 'data')
const reportsDir = path.join(repoRoot, 'reports')

type GscRow = {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value?.trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value.trim()
}

function parseArgs(): { pagesFile: string } {
  const args = process.argv.slice(2)
  let pagesFile = defaultPagesFile
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--pages' && args[i + 1]) {
      pagesFile = path.resolve(args[i + 1])
      i += 1
    }
  }
  return { pagesFile }
}

function getDateRange28Days(): { startDate: string; endDate: string; snapshotLabel: string } {
  // GSC typically lags 2–3 days; end 3 days ago for complete rows.
  const lagDays = Number(process.env.GSC_LAG_DAYS || 3)
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - lagDays)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 27)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return {
    startDate: fmt(start),
    endDate: fmt(end),
    snapshotLabel: fmt(end),
  }
}

function loadTargetPaths(pagesFile: string): string[] {
  if (!fs.existsSync(pagesFile)) {
    throw new Error(`Pages file not found: ${pagesFile}`)
  }
  return fs
    .readFileSync(pagesFile, 'utf8')
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map((p) => (p.startsWith('/') ? p : `/${p}`))
}

function normalizeGscPage(url: string, siteUrl: string): string | null {
  try {
    const site = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`)
    const parsed = new URL(url)
    if (parsed.hostname.replace(/^www\./, '') !== site.hostname.replace(/^www\./, '')) {
      return null
    }
    let pathname = parsed.pathname || '/'
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
    return pathname
  } catch {
    return null
  }
}

function csvEscape(value: string | number): string {
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowsToCsv(
  rows: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>,
): string {
  const header = 'page,clicks,impressions,ctr,position'
  const lines = rows.map((r) =>
    [
      csvEscape(r.page),
      csvEscape(r.clicks),
      csvEscape(r.impressions),
      csvEscape(r.ctr.toFixed(4)),
      csvEscape(r.position.toFixed(2)),
    ].join(','),
  )
  return [header, ...lines].join('\n') + '\n'
}

async function fetchPageAnalytics(
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<GscRow[]> {
  const clientEmail = requiredEnv('GSC_CLIENT_EMAIL')
  const privateKey = requiredEnv('GSC_PRIVATE_KEY').replace(/\\n/g, '\n')
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const webmasters = google.webmasters({ version: 'v3', auth })
  const allRows: GscRow[] = []
  let startRow = 0
  const rowLimit = 25000

  while (true) {
    const response = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit,
        startRow,
      },
    })
    const batch = response.data.rows ?? []
    allRows.push(...batch)
    if (batch.length < rowLimit) break
    startRow += batch.length
  }

  return allRows
}

function mapRows(siteUrl: string, rows: GscRow[]) {
  const byPath = new Map<
    string,
    { page: string; clicks: number; impressions: number; ctr: number; position: number }
  >()
  for (const row of rows) {
    const pageUrl = row.keys?.[0]
    if (!pageUrl) continue
    const pathname = normalizeGscPage(pageUrl, siteUrl)
    if (!pathname) continue
    byPath.set(pathname, {
      page: pathname,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    })
  }
  return byPath
}

async function main(): Promise<void> {
  const { pagesFile } = parseArgs()
  const siteUrl = requiredEnv('GSC_SITE_URL')
  const targetPaths = loadTargetPaths(pagesFile)
  const { startDate, endDate, snapshotLabel } = getDateRange28Days()

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })

  console.log(`[GSC predeploy] Site: ${siteUrl}`)
  console.log(`[GSC predeploy] Range: ${startDate} → ${endDate} (28 days, end lag ${process.env.GSC_LAG_DAYS || 3}d)`)
  console.log(`[GSC predeploy] Target pages: ${targetPaths.length} from ${pagesFile}`)

  const rawRows = await fetchPageAnalytics(siteUrl, startDate, endDate)
  console.log(`[GSC predeploy] Fetched ${rawRows.length} page rows from API`)

  const byPath = mapRows(siteUrl, rawRows)

  const fullSiteCsv = rowsToCsv(
    [...byPath.values()].sort((a, b) => b.impressions - a.impressions),
  )
  const fullSiteCsvPath = path.join(reportsDir, `gsc-predeploy-full-site-${snapshotLabel}.csv`)
  fs.writeFileSync(fullSiteCsvPath, fullSiteCsv, 'utf8')

  const touchedRows = targetPaths.map((p) => {
    const hit = byPath.get(p)
    return (
      hit ?? {
        page: p,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
      }
    )
  })
  const touchedCsv = rowsToCsv(touchedRows)
  const touchedCsvPath = path.join(reportsDir, `gsc-predeploy-touched-pages-${snapshotLabel}.csv`)
  fs.writeFileSync(touchedCsvPath, touchedCsv, 'utf8')

  const jsonPath = path.join(dataDir, `gsc-predeploy-${snapshotLabel}.json`)
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        fetched_at: new Date().toISOString(),
        site_url: siteUrl,
        start_date: startDate,
        end_date: endDate,
        pages_file: pagesFile,
        target_page_count: targetPaths.length,
        api_row_count: rawRows.length,
        touched_pages: touchedRows,
        full_site_pages: [...byPath.values()],
      },
      null,
      2,
    ),
    'utf8',
  )

  const missing = touchedRows.filter((r) => r.impressions === 0 && r.clicks === 0)
  console.log(`[GSC predeploy] Wrote touched CSV: ${touchedCsvPath}`)
  console.log(`[GSC predeploy] Wrote full-site CSV: ${fullSiteCsvPath}`)
  console.log(`[GSC predeploy] Wrote JSON backup: ${jsonPath}`)
  if (missing.length) {
    console.log(`[GSC predeploy] Note: ${missing.length} touched pages had zero clicks/impressions in range (may be new or low volume).`)
  }
}

main().catch((err) => {
  console.error(`[GSC predeploy] Failed: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
