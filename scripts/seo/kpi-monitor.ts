#!/usr/bin/env node
/**
 * KPI monitor for SEO ops.
 * Reads GSC export CSVs and emits ranked actions for impressions, CTR, and ranking movement.
 *
 * Usage:
 *   npx tsx scripts/seo/kpi-monitor.ts
 * Optional env:
 *   GSC_QUERIES_CSV=docs/Performance-extracted/Queries.csv
 *   GSC_PAGES_CSV=docs/Performance-extracted/Pages.csv
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

const repoRoot = path.resolve(__dirname, '..', '..')
const outputDir = path.join(repoRoot, 'scripts', 'seo', 'output')
const queriesCsvPath = path.resolve(repoRoot, process.env.GSC_QUERIES_CSV || 'docs/Performance-extracted/Queries.csv')
const pagesCsvPath = path.resolve(repoRoot, process.env.GSC_PAGES_CSV || 'docs/Performance-extracted/Pages.csv')

function parsePercent(raw: string): number {
  const cleaned = raw.replace('%', '').trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function parseNumber(raw: string): number {
  const n = Number(raw.replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

function parseCsv(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf8').trim()
  const lines = content.split(/\r?\n/)
  return lines.map((line) => line.split(',').map((x) => x.trim()))
}

function loadQueries(): QueryRow[] {
  if (!fs.existsSync(queriesCsvPath)) return []
  const rows = parseCsv(queriesCsvPath)
  return rows.slice(1).map((cols) => ({
    query: cols[0] || '',
    clicks: parseNumber(cols[1] || '0'),
    impressions: parseNumber(cols[2] || '0'),
    ctr: parsePercent(cols[3] || '0'),
    position: parseNumber(cols[4] || '0'),
  })).filter((r) => r.query)
}

function loadPages(): PageRow[] {
  if (!fs.existsSync(pagesCsvPath)) return []
  const rows = parseCsv(pagesCsvPath)
  return rows.slice(1).map((cols) => ({
    page: cols[0] || '',
    clicks: parseNumber(cols[1] || '0'),
    impressions: parseNumber(cols[2] || '0'),
    ctr: parsePercent(cols[3] || '0'),
    position: parseNumber(cols[4] || '0'),
  })).filter((r) => r.page)
}

function buildActions(queries: QueryRow[], pages: PageRow[]): ActionItem[] {
  const actions: ActionItem[] = []

  const quickWins = queries.filter((q) => q.position >= 10 && q.position <= 20).sort((a, b) => b.impressions - a.impressions)
  for (const q of quickWins.slice(0, 10)) {
    actions.push({
      priority: 'P0',
      type: 'CONTENT_DEPTH',
      target: q.query,
      reason: 'Ranking on page 2 with existing relevance. Add richer proof/workflow content to push top-10.',
      metric: `pos=${q.position.toFixed(2)}, imp=${q.impressions}`,
    })
  }

  const highImpLowCtr = queries
    .filter((q) => q.impressions >= 20 && q.ctr < 2.5 && q.position <= 15)
    .sort((a, b) => b.impressions - a.impressions)

  for (const q of highImpLowCtr.slice(0, 10)) {
    actions.push({
      priority: 'P0',
      type: 'CTR_REWRITE',
      target: q.query,
      reason: 'High visibility but weak click-through. Rewrite title/meta with specific outcomes and proof.',
      metric: `ctr=${q.ctr.toFixed(2)}%, imp=${q.impressions}, pos=${q.position.toFixed(2)}`,
    })
  }

  const zeroClickPages = pages
    .filter((p) => p.impressions >= 10 && p.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions)

  for (const p of zeroClickPages.slice(0, 10)) {
    actions.push({
      priority: 'P1',
      type: 'INTENT_REMAP',
      target: p.page,
      reason: 'Page receives impressions but no engagement. Align copy and CTA to intent or de-prioritize indexation.',
      metric: `imp=${p.impressions}, ctr=${p.ctr.toFixed(2)}%, pos=${p.position.toFixed(2)}`,
    })
  }

  const canonicalSplit = pages.filter((p) => p.page.includes('https://videotext.io/'))
  if (canonicalSplit.length > 0) {
    actions.push({
      priority: 'P0',
      type: 'TECHNICAL',
      target: 'domain canonicalization',
      reason: 'Detected non-www indexed URLs. Consolidate to one host and enforce redirect/canonical consistency.',
      metric: `non_www_pages=${canonicalSplit.length}`,
    })
  }

  const deepContentTargets = ['/youtube-url-to-transcription', '/podcast-transcription-tool']
  for (const target of deepContentTargets) {
    actions.push({
      priority: 'P1',
      type: 'INTERNAL_LINKING',
      target,
      reason: 'Route this page from homepage, footer, and related alternatives to increase authority flow and crawl frequency.',
      metric: 'deep-content priority route',
    })
  }

  return actions
}

function renderMarkdown(queries: QueryRow[], pages: PageRow[], actions: ActionItem[]): string {
  const now = new Date().toISOString()
  const lines: string[] = [
    '# SEO KPI Monitor Report',
    '',
    `Generated: ${now}`,
    '',
    '## Data summary',
    '',
    `- Query rows: ${queries.length}`,
    `- Page rows: ${pages.length}`,
    '',
    '## Priority actions',
    '',
    '| Priority | Type | Target | Metric | Why now |',
    '|---|---|---|---|---|',
  ]

  for (const a of actions) {
    lines.push(`| ${a.priority} | ${a.type} | ${a.target} | ${a.metric} | ${a.reason} |`)
  }

  lines.push('')
  lines.push('## Operating rule')
  lines.push('- P0: execute in this sprint.')
  lines.push('- P1: queue next sprint and validate early impressions/CTR deltas.')
  lines.push('- P2: backlog unless directly tied to revenue pages.')

  return lines.join('\n')
}

function main(): void {
  const queries = loadQueries()
  const pages = loadPages()

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const actions = buildActions(queries, pages)
  const report = renderMarkdown(queries, pages, actions)

  const jsonPath = path.join(outputDir, 'seo-kpi-actions.json')
  const mdPath = path.join(outputDir, 'seo-kpi-report.md')

  fs.writeFileSync(jsonPath, JSON.stringify({ generated_at: new Date().toISOString(), actions }, null, 2), 'utf8')
  fs.writeFileSync(mdPath, report, 'utf8')

  console.log('[SEO KPI] Queries:', queries.length)
  console.log('[SEO KPI] Pages:', pages.length)
  console.log('[SEO KPI] Actions:', actions.length)
  console.log('[SEO KPI] Wrote', jsonPath)
  console.log('[SEO KPI] Wrote', mdPath)
}

main()
