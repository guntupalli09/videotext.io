#!/usr/bin/env node
/**
 * KPI monitor for SEO ops.
 * Reads Search Console API JSON output and emits ranked actions for impressions, CTR, and ranking movement.
 *
 * Usage:
 *   npx tsx scripts/seo/kpi-monitor.ts
 * Optional env:
 *   GSC_INPUT_JSON=scripts/seo/data/gsc-latest.json
 */

import * as fs from 'fs'
import * as path from 'path'

type QueryRow = {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type PageRow = {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type ActionItem = {
  priority: 'P0' | 'P1' | 'P2'
  type: 'CTR_REWRITE' | 'CONTENT_DEPTH' | 'INTERNAL_LINKING' | 'INTENT_REMAP' | 'TECHNICAL'
  target: string
  reason: string
  metric: string
}

type GscApiRow = {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

type GscPayload = {
  rows?: GscApiRow[]
}

const repoRoot = path.resolve(__dirname, '..', '..')
const outputDir = path.join(repoRoot, 'scripts', 'seo', 'output')
const gscJsonPath = path.resolve(
  repoRoot,
  process.env.GSC_INPUT_JSON || 'scripts/seo/data/gsc-latest.json'
)

function loadGscRows(): GscApiRow[] {
  if (!fs.existsSync(gscJsonPath)) {
    throw new Error(`[SEO KPI] Missing input file: ${gscJsonPath}. Run: npm run seo:fetch`)
  }

  const raw = fs.readFileSync(gscJsonPath, 'utf8')
  const payload = JSON.parse(raw) as GscPayload
  const rows = payload.rows ?? []

  if (rows.length === 0) {
    console.warn('[SEO KPI] Warning: GSC payload has no rows.')
  }

  return rows
}

function toQueryRows(apiRows: GscApiRow[]): QueryRow[] {
  const byQuery = new Map<string, { clicks: number; impressions: number; weightedPos: number }>()

  for (const row of apiRows) {
    const query = row.keys?.[0] ?? ''
    if (!query) continue

    const impressions = Number(row.impressions ?? 0)
    const clicks = Number(row.clicks ?? 0)
    const position = Number(row.position ?? 0)

    const prev = byQuery.get(query) ?? { clicks: 0, impressions: 0, weightedPos: 0 }

    byQuery.set(query, {
      clicks: prev.clicks + clicks,
      impressions: prev.impressions + impressions,
      weightedPos: prev.weightedPos + (position * impressions),
    })
  }

  return Array.from(byQuery.entries()).map(([query, v]) => ({
    query,
    clicks: v.clicks,
    impressions: v.impressions,
    ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
    position: v.impressions > 0 ? v.weightedPos / v.impressions : 0,
  }))
}

function toPageRows(apiRows: GscApiRow[]): PageRow[] {
  const byPage = new Map<string, { clicks: number; impressions: number; weightedPos: number }>()

  for (const row of apiRows) {
    const page = row.keys?.[1] ?? ''
    if (!page) continue

    const impressions = Number(row.impressions ?? 0)
    const clicks = Number(row.clicks ?? 0)
    const position = Number(row.position ?? 0)

    const prev = byPage.get(page) ?? { clicks: 0, impressions: 0, weightedPos: 0 }

    byPage.set(page, {
      clicks: prev.clicks + clicks,
      impressions: prev.impressions + impressions,
      weightedPos: prev.weightedPos + (position * impressions),
    })
  }

  return Array.from(byPage.entries()).map(([page, v]) => ({
    page,
    clicks: v.clicks,
    impressions: v.impressions,
    ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
    position: v.impressions > 0 ? v.weightedPos / v.impressions : 0,
  }))
}

function buildActions(queries: QueryRow[], pages: PageRow[]): ActionItem[] {
  const actions: ActionItem[] = []

  // P0: Page 2 quick wins
  const quickWins = queries
    .filter((q) => q.position >= 10 && q.position <= 20)
    .sort((a, b) => b.impressions - a.impressions)

  for (const q of quickWins.slice(0, 10)) {
    actions.push({
      priority: 'P0',
      type: 'CONTENT_DEPTH',
      target: q.query,
      reason: 'Page 2 ranking → add depth + proof to push top 10',
      metric: `pos=${q.position.toFixed(2)}, imp=${q.impressions}`,
    })
  }

  // P0: High impressions, low CTR
  const ctrIssues = queries
    .filter((q) => q.impressions >= 20 && q.ctr < 2.5 && q.position <= 15)
    .sort((a, b) => b.impressions - a.impressions)

  for (const q of ctrIssues.slice(0, 10)) {
    actions.push({
      priority: 'P0',
      type: 'CTR_REWRITE',
      target: q.query,
      reason: 'High impressions but low CTR → rewrite title/meta',
      metric: `ctr=${q.ctr.toFixed(2)}%, imp=${q.impressions}`,
    })
  }

  // P1: Pages with impressions but no clicks
  const zeroClickPages = pages
    .filter((p) => p.impressions >= 10 && p.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions)

  for (const p of zeroClickPages.slice(0, 10)) {
    actions.push({
      priority: 'P1',
      type: 'INTENT_REMAP',
      target: p.page,
      reason: 'Impressions but no clicks → mismatch intent or weak CTA',
      metric: `imp=${p.impressions}, ctr=${p.ctr.toFixed(2)}%`,
    })
  }

  return actions
}

function renderMarkdown(queries: QueryRow[], pages: PageRow[], actions: ActionItem[]): string {
  const now = new Date().toISOString()

  return [
    '# SEO KPI Report',
    '',
    `Generated: ${now}`,
    '',
    `Queries: ${queries.length}`,
    `Pages: ${pages.length}`,
    '',
    '## Actions',
    '',
    '| Priority | Type | Target | Metric | Reason |',
    '|---|---|---|---|---|',
    ...actions.map(
      (a) =>
        `| ${a.priority} | ${a.type} | ${a.target} | ${a.metric} | ${a.reason} |`
    ),
  ].join('\n')
}

function main(): void {
  const apiRows = loadGscRows()
  const queries = toQueryRows(apiRows)
  const pages = toPageRows(apiRows)

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const actions = buildActions(queries, pages)
  const report = renderMarkdown(queries, pages, actions)

  fs.writeFileSync(
    path.join(outputDir, 'seo-kpi-actions.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), actions }, null, 2)
  )

  fs.writeFileSync(
    path.join(outputDir, 'seo-kpi-report.md'),
    report
  )

  console.log('✅ KPI generated')
}

main()