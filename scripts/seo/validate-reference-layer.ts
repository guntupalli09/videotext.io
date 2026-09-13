#!/usr/bin/env node
/**
 * Structural SEO/content gate for the citation hub and glossary.
 * Does not score keyword density. HTTP availability is handled by validate-citation-hub.
 */
import * as fs from 'fs'
import * as path from 'path'
import { GLOSSARY_INVENTORY, getDraftInventory, getNextGlossaryTerms, getPublishedGlossaryTerms } from '../../client/src/data/glossary/inventory'
import { getRejectedStatistics, getRetainedStatistics, STATISTIC_CANDIDATES } from '../../client/src/data/referenceLayer/statistics'
import { ROUTE_BREADCRUMB, ROUTE_SEO } from '../../client/src/lib/seoMeta'
import {
  getCitationHubJsonLd,
  getGlossaryHubJsonLd,
  getGlossaryTermJsonLd,
  getPublishedGlossaryPaths,
  getReferenceLayerPaths,
  getReferenceLayerSeo,
} from '../../client/src/lib/referenceLayer'
import { getIndexablePaths } from './registry'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const CSV_PATH = path.join(REPO_ROOT, 'docs', 'seo', 'glossary-inventory.csv')
const PLACEHOLDER_RE = /\b(TODO|TBD|FIXME|xxx+|lorem ipsum|PLACEHOLDER)\b/i
const URL_RE = /^https?:\/\/[^\s]+$/i

interface Issue {
  level: 'error' | 'warning'
  message: string
}

function csvEscape(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function buildGlossaryInventoryCsv(): string {
  const header = [
    'term',
    'slug',
    'cluster',
    'definition_intent',
    'search_demand_if_known',
    'commercial_relevance',
    'entity_centrality',
    'internal_link_value',
    'source_confidence',
    'existing_page_conflict',
    'priority',
    'status',
  ]
  const rows = GLOSSARY_INVENTORY.map((row) =>
    [
      row.term,
      row.slug,
      row.cluster,
      row.definitionIntent,
      row.searchDemandIfKnown,
      row.commercialRelevance,
      row.entityCentrality,
      row.internalLinkValue,
      row.sourceConfidence,
      row.existingPageConflict,
      row.priority,
      row.status,
    ]
      .map(csvEscape)
      .join(','),
  )
  return `${header.join(',')}\n${rows.join('\n')}\n`
}

function writeGlossaryInventoryCsv(): void {
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true })
  fs.writeFileSync(CSV_PATH, buildGlossaryInventoryCsv(), 'utf8')
}

function isValidJsonLd(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record['@context'] === 'string' && typeof record['@type'] === 'string'
}

function main(): void {
  const issues: Issue[] = []
  writeGlossaryInventoryCsv()

  const published = getPublishedGlossaryTerms()
  const drafts = getDraftInventory()
  const seo = getReferenceLayerSeo()
  const indexable = new Set(getIndexablePaths())
  const referencePaths = getReferenceLayerPaths()

  if (GLOSSARY_INVENTORY.length < 150) {
    issues.push({ level: 'error', message: `Glossary inventory has ${GLOSSARY_INVENTORY.length} terms; expected at least 150.` })
  }
  if (published.length < 30 || published.length > 50) {
    issues.push({ level: 'error', message: `Published glossary count is ${published.length}; expected 30–50 production pages.` })
  }

  const slugs = new Set<string>()
  const titles = new Set<string>()
  const h1s = new Set<string>()
  for (const row of GLOSSARY_INVENTORY) {
    if (slugs.has(row.slug)) issues.push({ level: 'error', message: `Duplicate glossary slug: ${row.slug}` })
    slugs.add(row.slug)
    if (PLACEHOLDER_RE.test(JSON.stringify(row))) {
      issues.push({ level: 'error', message: `Placeholder text in inventory slug ${row.slug}` })
    }
    if (!row.searchDemandIfKnown || /[0-9]{3,}/.test(row.searchDemandIfKnown) && !row.searchDemandIfKnown.includes('UNKNOWN')) {
      if (/^\d+$/.test(row.searchDemandIfKnown)) {
        issues.push({ level: 'error', message: `Invented numeric search volume on ${row.slug}` })
      }
    }
  }

  for (const term of published) {
    const pathName = `/glossary/${term.slug}`
    if (!term.definition || term.definition.length < 40) {
      issues.push({ level: 'error', message: `${pathName} is missing a direct definition` })
    }
    if (!term.metaTitle) issues.push({ level: 'error', message: `${pathName} missing title` })
    if (!term.metaDescription) issues.push({ level: 'error', message: `${pathName} missing meta description` })
    if (!term.h1) issues.push({ level: 'error', message: `${pathName} missing H1` })
    if (!term.updatedAt) issues.push({ level: 'error', message: `${pathName} missing updated date` })
    if (!term.sources?.length) issues.push({ level: 'error', message: `${pathName} missing sources` })
    if (!seo[pathName]?.title) issues.push({ level: 'error', message: `${pathName} missing route title` })
    if (!seo[pathName]?.description) issues.push({ level: 'error', message: `${pathName} missing route description` })
    if (!ROUTE_SEO[pathName]) issues.push({ level: 'error', message: `${pathName} missing from ROUTE_SEO (would 404/noindex)` })
    if (!ROUTE_BREADCRUMB[pathName]) issues.push({ level: 'error', message: `${pathName} missing breadcrumbs` })
    if (!indexable.has(pathName)) issues.push({ level: 'error', message: `${pathName} missing from indexable sitemap paths` })
    if (titles.has(term.metaTitle)) issues.push({ level: 'error', message: `Duplicate title: ${term.metaTitle}` })
    titles.add(term.metaTitle)
    if (h1s.has(term.h1)) issues.push({ level: 'error', message: `Duplicate H1: ${term.h1}` })
    h1s.add(term.h1)
    if (PLACEHOLDER_RE.test(JSON.stringify(term))) {
      issues.push({ level: 'error', message: `${pathName} contains placeholder/TODO text` })
    }
    for (const source of term.sources) {
      if (!source.url || !URL_RE.test(source.url)) {
        issues.push({ level: 'error', message: `${pathName} has a malformed source URL` })
      }
      if (!source.organization) issues.push({ level: 'error', message: `${pathName} source missing organization` })
    }
    const relatedPublished = term.relatedTerms.filter((slug) => published.some((item) => item.slug === slug))
    if (relatedPublished.length === 0) {
      issues.push({ level: 'error', message: `${pathName} is an orphan glossary term (no published related terms)` })
    }
    const jsonLd = getGlossaryTermJsonLd(term.slug)
    if (!jsonLd || !jsonLd.every(isValidJsonLd)) {
      issues.push({ level: 'error', message: `${pathName} JSON-LD is invalid` })
    }
  }

  for (const draft of drafts) {
    const pathName = `/glossary/${draft.slug}`
    if (indexable.has(pathName)) {
      issues.push({ level: 'error', message: `Unpublished term entered sitemap: ${pathName}` })
    }
    if (ROUTE_SEO[pathName]) {
      issues.push({ level: 'error', message: `Unpublished term has ROUTE_SEO (would be indexed): ${pathName}` })
    }
  }

  if (!ROUTE_SEO['/transcription-statistics'] || !ROUTE_SEO['/glossary']) {
    issues.push({ level: 'error', message: 'Citation hub or glossary hub missing from ROUTE_SEO' })
  }
  if (!indexable.has('/transcription-statistics') || !indexable.has('/glossary')) {
    issues.push({ level: 'error', message: 'Citation hub or glossary hub missing from sitemap indexable paths' })
  }
  if (!getCitationHubJsonLd().every(isValidJsonLd) || !getGlossaryHubJsonLd().every(isValidJsonLd)) {
    issues.push({ level: 'error', message: 'Hub JSON-LD failed structural validation' })
  }

  const retained = getRetainedStatistics()
  const rejected = getRejectedStatistics()
  if (STATISTIC_CANDIDATES.length < 120) {
    issues.push({ level: 'error', message: `Only ${STATISTIC_CANDIDATES.length} candidate statistics` })
  }
  if (retained.length >= STATISTIC_CANDIDATES.length) {
    issues.push({ level: 'error', message: 'Retained statistics were not filtered from candidates' })
  }
  for (const item of retained) {
    if (!item.sourceUrl || !item.sourceOrganization || !item.verifiedAt) {
      issues.push({ level: 'error', message: `Statistic ${item.id} missing source metadata` })
    }
  }

  const csv = fs.readFileSync(CSV_PATH, 'utf8')
  if (!csv.includes('search_demand_if_known') || !csv.includes(published[0].slug)) {
    issues.push({ level: 'error', message: 'glossary-inventory.csv is missing required columns or published slugs' })
  }

  const next = getNextGlossaryTerms(20)
  if (next.length < 10) {
    issues.push({ level: 'warning', message: `Only ${next.length} recommended next glossary terms` })
  }

  const extraIndexableGlossary = [...indexable].filter((item) => item.startsWith('/glossary/') && !referencePaths.includes(item))
  for (const extra of extraIndexableGlossary) {
    issues.push({ level: 'error', message: `Unexpected glossary URL in sitemap: ${extra}` })
  }

  const errors = issues.filter((issue) => issue.level === 'error')
  const warnings = issues.filter((issue) => issue.level === 'warning')
  console.log('Reference-layer validation report')
  console.log('=================================')
  console.log(`Glossary inventory: ${GLOSSARY_INVENTORY.length}`)
  console.log(`Published glossary pages: ${published.length}`)
  console.log(`Draft terms: ${drafts.length}`)
  console.log(`Candidate statistics: ${STATISTIC_CANDIDATES.length}`)
  console.log(`Retained statistics: ${retained.length}`)
  console.log(`Rejected statistics: ${rejected.length}`)
  console.log(`Wrote ${path.relative(REPO_ROOT, CSV_PATH)}`)
  console.log(`Errors: ${errors.length}`)
  console.log(`Warnings: ${warnings.length}`)
  for (const issue of issues) {
    console.log(`${issue.level === 'error' ? 'ERROR' : 'WARN'}: ${issue.message}`)
  }
  if (errors.length) process.exit(1)
}

main()
