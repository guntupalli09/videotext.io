#!/usr/bin/env node
/**
 * Fetch Google Search Console Search Analytics rows and persist latest + dated snapshot.
 *
 * Required env vars:
 *   - GSC_CLIENT_EMAIL
 *   - GSC_PRIVATE_KEY
 *   - GSC_SITE_URL
 */
import * as fs from 'fs'
import * as path from 'path'
import { google } from 'googleapis'

const repoRoot = path.resolve(__dirname, '..', '..')
const dataDir = path.join(repoRoot, 'scripts', 'seo', 'data')
const latestPath = path.join(dataDir, 'gsc-latest.json')

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`[GSC fetch] Missing required env var: ${name}`)
  }
  return value
}

function getDateRange(): { startDate: string; endDate: string; snapshotDate: string } {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7))

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return {
    startDate: fmt(start),
    endDate: fmt(end),
    snapshotDate: fmt(end),
  }
}

async function main(): Promise<void> {
  const clientEmail = requiredEnv('GSC_CLIENT_EMAIL')
  const privateKeyRaw = requiredEnv('GSC_PRIVATE_KEY')
  const siteUrl = requiredEnv('GSC_SITE_URL')
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

  const { startDate, endDate, snapshotDate } = getDateRange()

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })

  const webmasters = google.webmasters({ version: 'v3', auth })

  const response = await webmasters.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: 25000,
    },
  })

  const rows = response.data.rows ?? []
  if (rows.length === 0) {
    console.warn(`[GSC fetch] Warning: no rows returned for ${startDate} → ${endDate}`)
  }

  const payload = {
    fetched_at: new Date().toISOString(),
    site_url: siteUrl,
    start_date: startDate,
    end_date: endDate,
    row_count: rows.length,
    rows,
  }

  const historyPath = path.join(dataDir, `gsc-history-${snapshotDate}.json`)
  fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2), 'utf8')
  fs.writeFileSync(historyPath, JSON.stringify(payload, null, 2), 'utf8')

  console.log(`[GSC fetch] Site: ${siteUrl}`)
  console.log(`[GSC fetch] Range: ${startDate} → ${endDate}`)
  console.log(`[GSC fetch] Rows fetched: ${rows.length}`)
  console.log(`[GSC fetch] Wrote latest: ${latestPath}`)
  console.log(`[GSC fetch] Wrote snapshot: ${historyPath}`)
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[GSC fetch] Failed: ${message}`)
  process.exit(1)
})
