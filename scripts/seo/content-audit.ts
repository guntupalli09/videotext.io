#!/usr/bin/env node
/**
 * Semantic content quality audit for prerendered HTML output.
 *
 * Crawls indexable routes from sitemap, SEO registry, prerender registry, and
 * React route registry, then reads local /dist HTML files only. No network calls.
 *
 * Run from repo root after build/prerender:
 *   npm run seo:content-audit
 */
import * as fs from 'fs'
import * as path from 'path'
import { getCanonicalPathForRoute } from '../../client/src/lib/primaryUrls'
import { getIndexablePaths } from './registry'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const REPORT_DIR = path.join(REPO_ROOT, 'reports')
const PUBLIC_DIR = path.join(REPO_ROOT, 'client', 'public')
const PRERENDER_PATH = path.join(REPO_ROOT, 'scripts', 'prerender.ts')
const APP_PATH = path.join(REPO_ROOT, 'client', 'src', 'App.tsx')
const SITE_HOSTS = new Set(['videotext.io', 'www.videotext.io'])

const bannedPhrases = [
  'hydration',
  'hydrated',
  'semantic html',
  'spa shell',
  'ssr-safe',
  'client-only',
  'client hydration',
  'browser-hydrated',
  'rendered at build time',
  'crawler',
  'crawlers',
  'prerendered document',
  'semantic route summary',
  'react spa',
  'empty spa shell',
  'server render',
  'server-rendered',
  'build-time rendering',
]

const LOW_WORD_COUNT = 300
const LOW_H2_COUNT = 3
const HIGH_PARAGRAPH_DUPLICATION = 0.7
const FAQ_BLOCK_REUSE_LIMIT = 10
const INTRO_REUSE_LIMIT = 15
const H2_REUSE_LIMIT = 10
const TOP_LIMIT = 25

const PRACTICAL_SIGNAL_TERMS = [
  'export', 'download', 'upload', 'timestamp', 'speaker', 'subtitle', 'srt', 'vtt', 'qa', 'review', 'format', 'workflow',
  'troubleshoot', 'error', 'edge case', 'privacy', 'accuracy', 'chapter', 'summary', 'batch', 'integration', 'file', 'recording',
  'youtube', 'zoom', 'team', 'creator', 'editor', 'transcript', 'caption', 'verbatim', 'clean', 'sync', 'line break',
]

const GENERIC_TEMPLATE_PATTERNS = [
  /this workflow helps/gi,
  /outputs you can use/gi,
  /built for .* workflows/gi,
  /save time and improve/gi,
  /whether you(?:'|’)re/gi,
  /get started in minutes/gi,
  /use this page to/gi,
  /simple way to/gi,
  /powerful tool for/gi,
  /streamline your workflow/gi,
]

const GENERIC_H2_PATTERNS = [
  /^how it works$/i,
  /^why use/i,
  /^frequently asked questions$/i,
  /^related tools$/i,
  /^get started$/i,
  /^features$/i,
  /^use cases$/i,
]

const NON_INDEXABLE_REACT_PATHS = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/magic-login',
  '/refer',
  '/feedback',
  '/survey',
  '/founder',
  '/status',
  '/pro-access',
  '/demo',
  '/preview/transcript-results',
  '/preview/icp-results-studio',
  '/icp-results-studio',
  '/unsubscribe',
])

type Severity = 'good' | 'warning' | 'critical'
type ThinContentClassification = 'HEALTHY' | 'MODERATE RISK' | 'HIGH THIN-CONTENT RISK' | 'CRITICAL THIN-CONTENT RISK'
type RouteSource = 'sitemap' | 'seo-registry' | 'prerender-registry' | 'react-route-registry'

interface TableAudit {
  text: string
  rows: string[][]
}

interface PageAudit {
  path: string
  sources: RouteSource[]
  htmlPath: string | null
  exists: boolean
  title: string
  metaDescription: string
  h1: string
  h2s: string[]
  paragraphs: string[]
  faqQuestions: string[]
  tables: TableAudit[]
  internalLinks: string[]
  listItems: string[]
  ctaTexts: string[]
  metrics: {
    wordCount: number
    paragraphCount: number
    h2Count: number
    faqCount: number
    internalLinkCount: number
    htmlSize: number
    uniqueParagraphRatio: number
    duplicateParagraphReuseFrequency: number
    duplicateH2ReuseFrequency: number
    duplicateFaqReuseFrequency: number
    paragraphDuplicationRatio: number
    visibleTextLength: number
    averageParagraphWords: number
    averageParagraphRichness: number
    uniqueSemanticSectionCount: number
    h2Diversity: number
    faqDiversity: number
    tableCount: number
    listItemCount: number
    semanticStructureVariety: number
    practicalSignalCount: number
    genericPatternCount: number
    pageUniquenessRatio: number
    reusedContentRatio: number
    topicalCoverageRatio: number
  }
  bannedPhraseHits: string[]
  duplicateParagraphs: Array<{ text: string; pageCount: number }>
  duplicateH2s: Array<{ text: string; pageCount: number }>
  duplicateFaqs: Array<{ text: string; pageCount: number }>
  warnings: string[]
  criticals: string[]
  priorityScore: number
  thinContent: ThinContentAssessment
}

interface RepeatedItem {
  text: string
  count: number
  pages: string[]
}

interface ThinContentAssessment {
  route: string
  thinContentRisk: number
  classification: ThinContentClassification
  issues: string[]
  recommendations: string[]
  components: {
    semanticContentDepth: number
    templateDuplicationRisk: number
    searchIntentCoverage: number
    engineeringLeakage: number
    topicalCompleteness: number
    htmlRichness: number
    aiTemplatePatternRisk: number
  }
  missingSubtopics: string[]
  weakSections: string[]
  semanticExpansionOpportunities: string[]
}

interface TopicalGapAssessment {
  route: string
  missingSubtopics: string[]
  weakSections: string[]
  opportunities: string[]
}

interface DuplicationCluster {
  signature: string
  type: 'intro' | 'faq-block' | 'h2-structure' | 'cta' | 'paragraph-block'
  pageCount: number
  pages: string[]
}

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
}

function color(text: string, severity: Severity): string {
  if (process.env.NO_COLOR) return text
  if (severity === 'critical') return `${colors.red}${text}${colors.reset}`
  if (severity === 'warning') return `${colors.yellow}${text}${colors.reset}`
  return `${colors.green}${text}${colors.reset}`
}

function normalizeRoute(routePath: string): string {
  const withoutHash = routePath.split('#')[0].split('?')[0]
  const withSlash = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
  const canonical = getCanonicalPathForRoute(withSlash)
  if (!canonical || canonical === '/') return '/'
  return canonical.replace(/\/+$/, '') || '/'
}

function addRoute(routes: Map<string, Set<RouteSource>>, routePath: string, source: RouteSource): void {
  if (!routePath || routePath.includes(':') || routePath === '*') return
  const normalized = normalizeRoute(routePath)
  if (!normalized.startsWith('/')) return
  if (!routes.has(normalized)) routes.set(normalized, new Set())
  routes.get(normalized)!.add(source)
}

function extractSitemapPaths(): string[] {
  const sitemapFiles = ['sitemap-core.xml', 'sitemap-programmatic.xml', 'sitemap.xml']
  const paths = new Set<string>()
  for (const file of sitemapFiles) {
    const fullPath = path.join(PUBLIC_DIR, file)
    if (!fs.existsSync(fullPath)) continue
    const xml = fs.readFileSync(fullPath, 'utf8')
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      const loc = decodeHtml(match[1].trim())
      if (/sitemap-[^/]+\.xml$/i.test(loc)) continue
      const routePath = pathFromUrlOrPath(loc)
      if (routePath) paths.add(routePath)
    }
  }
  return [...paths]
}


function stripCodeComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function extractPrerenderRegistryPaths(): string[] {
  if (!fs.existsSync(PRERENDER_PATH)) return []
  const content = stripCodeComments(fs.readFileSync(PRERENDER_PATH, 'utf8'))
  const paths: string[] = []
  const matches = [...content.matchAll(/path:\s*['"](\/[^'"]+)['"]/g)]
  for (let i = 0; i < matches.length; i++) {
    const blockStart = matches[i].index || 0
    const blockEnd = i + 1 < matches.length ? matches[i + 1].index || content.length : content.length
    const block = content.slice(blockStart, blockEnd)
    if (/noindex:\s*true/.test(block)) continue
    paths.push(matches[i][1])
  }
  return paths
}

function extractReactRoutePaths(): string[] {
  if (!fs.existsSync(APP_PATH)) return []
  const content = fs.readFileSync(APP_PATH, 'utf8')
  const paths: string[] = []
  const routeTagRe = /<Route\b[^>]*\bpath=[{]?['"]([^'"]+)['"][}]?[^>]*>/g
  for (const match of content.matchAll(routeTagRe)) {
    const routePath = match[1]
    const tag = match[0]
    if (!routePath.startsWith('/')) continue
    if (routePath.includes(':') || routePath.includes('*')) continue
    if (NON_INDEXABLE_REACT_PATHS.has(routePath)) continue
    if (/<Navigate\b/.test(tag)) continue
    paths.push(routePath)
  }
  return paths
}

function collectRoutes(): Array<{ path: string; sources: RouteSource[] }> {
  const routes = new Map<string, Set<RouteSource>>()

  for (const routePath of extractSitemapPaths()) addRoute(routes, routePath, 'sitemap')
  for (const routePath of getIndexablePaths()) addRoute(routes, routePath, 'seo-registry')
  for (const routePath of extractPrerenderRegistryPaths()) addRoute(routes, routePath, 'prerender-registry')

  const knownIndexable = new Set(routes.keys())
  for (const routePath of extractReactRoutePaths()) {
    const normalized = normalizeRoute(routePath)
    if (knownIndexable.has(normalized) || isPublicIndexableReactRoute(normalized)) {
      addRoute(routes, normalized, 'react-route-registry')
    }
  }

  return [...routes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([routePath, sources]) => ({ path: routePath, sources: [...sources].sort() as RouteSource[] }))
}

function isPublicIndexableReactRoute(routePath: string): boolean {
  if (NON_INDEXABLE_REACT_PATHS.has(routePath)) return false
  if (routePath.startsWith('/preview/')) return false
  return true
}

function pathFromUrlOrPath(input: string): string | null {
  if (input.startsWith('/')) return input
  const match = input.match(/^https?:\/\/([^/]+)(\/.*)?$/i)
  if (!match) return null
  if (!SITE_HOSTS.has(match[1].toLowerCase())) return null
  return match[2] || '/'
}

function htmlPathForRoute(routePath: string): string {
  return routePath === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, routePath.slice(1), 'index.html')
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  }
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (_, name) => named[name.toLowerCase()] || `&${name};`)
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function extractTagTexts(html: string, tagName: string): string[] {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  return [...html.matchAll(re)].map((m) => stripTags(m[1])).filter((text) => text.length > 0)
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i)
  return match ? decodeHtml(match[1]).trim() : ''
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? stripTags(match[1]) : ''
}

function visibleText(html: string): string {
  return stripTags(html.replace(/<head[\s\S]*?<\/head>/i, ' '))
}

function wordCount(text: string): number {
  const matches = text.toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)*/g)
  return matches ? matches.length : 0
}

function normalizeText(text: string): string {
  return decodeHtml(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function meaningfulParagraphs(paragraphs: string[]): string[] {
  return paragraphs.filter((p) => wordCount(p) >= 5)
}

function extractJsonLdFaqs(html: string): string[] {
  const out: string[] = []
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const script of scripts) {
    const raw = stripJsonLdComments(script[1].trim())
    if (!raw) continue
    try {
      const data = JSON.parse(raw)
      collectFaqNames(data, out)
    } catch (e) {
      // Ignore malformed JSON-LD in this semantic content audit; SEO smoke tests validate syntax separately.
    }
  }
  return out
}

function stripJsonLdComments(raw: string): string {
  return raw.replace(/<!--|-->/g, '').trim()
}

function collectFaqNames(node: unknown, out: string[]): void {
  if (!node) return
  if (Array.isArray(node)) {
    for (const item of node) collectFaqNames(item, out)
    return
  }
  if (typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  const type = obj['@type']
  const isFaqPage = type === 'FAQPage' || (Array.isArray(type) && type.includes('FAQPage'))
  if (isFaqPage && Array.isArray(obj.mainEntity)) {
    for (const item of obj.mainEntity) {
      if (item && typeof item === 'object') {
        const name = (item as Record<string, unknown>).name
        if (typeof name === 'string' && name.trim()) out.push(decodeHtml(name).trim())
      }
    }
  }
  for (const value of Object.values(obj)) collectFaqNames(value, out)
}

function extractFaqQuestions(html: string): string[] {
  const questions = new Set<string>()
  for (const q of extractJsonLdFaqs(html)) questions.add(q)
  const candidates = [...html.matchAll(/<(h2|h3|h4|dt|summary|button)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => stripTags(m[2]))
    .filter((text) => text.endsWith('?') && wordCount(text) >= 3)
  for (const q of candidates) questions.add(q)
  return [...questions]
}

function extractTables(html: string): TableAudit[] {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((tableMatch) => {
    const tableHtml = tableMatch[1]
    const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) => {
      return [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) => stripTags(cellMatch[1]))
    }).filter((row) => row.length > 0)
    return { text: stripTags(tableHtml), rows }
  }).filter((table) => table.text.length > 0)
}

function extractInternalLinks(html: string): string[] {
  const links = new Set<string>()
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = decodeHtml(match[1].trim())
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
    const routePath = pathFromUrlOrPath(href)
    if (!routePath) continue
    const normalized = normalizeRoute(routePath)
    if (normalized.match(/\.(png|jpg|jpeg|gif|svg|webp|pdf|zip|js|css)$/i)) continue
    links.add(normalized)
  }
  return [...links].sort()
}


function emptyThinContent(routePath: string, score = 0, classification: ThinContentClassification = 'HEALTHY'): ThinContentAssessment {
  return {
    route: routePath,
    thinContentRisk: score,
    classification,
    issues: [],
    recommendations: [],
    components: {
      semanticContentDepth: 0,
      templateDuplicationRisk: 0,
      searchIntentCoverage: 0,
      engineeringLeakage: 0,
      topicalCompleteness: 0,
      htmlRichness: 0,
      aiTemplatePatternRisk: 0,
    },
    missingSubtopics: [],
    weakSections: [],
    semanticExpansionOpportunities: [],
  }
}

function extractListItems(html: string): string[] {
  return extractTagTexts(html, 'li').filter((item) => wordCount(item) >= 2)
}

function extractCtaTexts(html: string): string[] {
  const texts = new Set<string>()
  for (const match of html.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = stripTags(match[2])
    if (!text) continue
    if (/\b(upload|get|start|try|download|convert|transcribe|generate|sign up|create|open|view)\b/i.test(text)) {
      texts.add(text)
    }
  }
  for (const match of html.matchAll(/<[^>]+class=["'][^"']*\bcta\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi)) {
    const text = stripTags(match[1])
    if (wordCount(text) >= 3) texts.add(text)
  }
  return [...texts].slice(0, 30)
}

function uniqueWordRatio(text: string): number {
  const words = text.toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)*/g) || []
  if (words.length === 0) return 0
  return new Set(words).size / words.length
}

function countPracticalSignals(text: string): number {
  const normalized = normalizeText(text)
  return PRACTICAL_SIGNAL_TERMS.reduce((count, term) => count + (normalized.includes(normalizeText(term)) ? 1 : 0), 0)
}

function countGenericPatterns(text: string): number {
  return GENERIC_TEMPLATE_PATTERNS.reduce((count, pattern) => count + ([...text.matchAll(pattern)].length), 0)
}

function semanticStructureVariety(pageParts: { h2s: string[]; faqQuestions: string[]; tables: TableAudit[]; listItems: string[]; internalLinks: string[] }): number {
  return [
    pageParts.h2s.length > 0,
    pageParts.faqQuestions.length > 0,
    pageParts.tables.length > 0,
    pageParts.listItems.length > 0,
    pageParts.internalLinks.length > 3,
  ].filter(Boolean).length
}

function analyzeHtml(routePath: string, sources: RouteSource[], htmlPath: string, html: string): PageAudit {
  const paragraphs = meaningfulParagraphs(extractTagTexts(html, 'p'))
  const h2s = extractTagTexts(html, 'h2')
  const faqQuestions = extractFaqQuestions(html)
  const internalLinks = extractInternalLinks(html)
  const tables = extractTables(html)
  const listItems = extractListItems(html)
  const ctaTexts = extractCtaTexts(html)
  const text = visibleText(html)
  const normalizedParagraphs = paragraphs.map(normalizeText).filter(Boolean)
  const uniqueParagraphCount = new Set(normalizedParagraphs).size
  const paragraphCount = paragraphs.length
  const duplicateWithinPage = paragraphCount - uniqueParagraphCount
  const paragraphDuplicationRatio = paragraphCount > 0 ? duplicateWithinPage / paragraphCount : 0
  const paragraphWordCounts = paragraphs.map(wordCount)
  const averageParagraphWords = paragraphWordCounts.length ? paragraphWordCounts.reduce((sum, count) => sum + count, 0) / paragraphWordCounts.length : 0
  const averageParagraphRichness = paragraphs.length ? paragraphs.reduce((sum, paragraph) => sum + uniqueWordRatio(paragraph), 0) / paragraphs.length : 0
  const uniqueSemanticSectionCount = new Set(h2s.map(normalizeText).filter(Boolean)).size
  const h2Diversity = h2s.length ? uniqueSemanticSectionCount / h2s.length : 0
  const faqDiversity = faqQuestions.length ? new Set(faqQuestions.map(normalizeText)).size / faqQuestions.length : 0

  return {
    path: routePath,
    sources,
    htmlPath: path.relative(REPO_ROOT, htmlPath),
    exists: true,
    title: extractTitle(html),
    metaDescription: extractMetaDescription(html),
    h1: extractTagTexts(html, 'h1')[0] || '',
    h2s,
    paragraphs,
    faqQuestions,
    tables,
    internalLinks,
    listItems,
    ctaTexts,
    metrics: {
      wordCount: wordCount(text),
      paragraphCount,
      h2Count: h2s.length,
      faqCount: faqQuestions.length,
      internalLinkCount: internalLinks.length,
      htmlSize: Buffer.byteLength(html, 'utf8'),
      uniqueParagraphRatio: paragraphCount > 0 ? uniqueParagraphCount / paragraphCount : 0,
      duplicateParagraphReuseFrequency: 0,
      duplicateH2ReuseFrequency: 0,
      duplicateFaqReuseFrequency: 0,
      paragraphDuplicationRatio,
      visibleTextLength: text.length,
      averageParagraphWords,
      averageParagraphRichness,
      uniqueSemanticSectionCount,
      h2Diversity,
      faqDiversity,
      tableCount: tables.length,
      listItemCount: listItems.length,
      semanticStructureVariety: semanticStructureVariety({ h2s, faqQuestions, tables, listItems, internalLinks }),
      practicalSignalCount: countPracticalSignals(text),
      genericPatternCount: countGenericPatterns(text),
      pageUniquenessRatio: paragraphCount > 0 ? uniqueParagraphCount / paragraphCount : 0,
      reusedContentRatio: 0,
      topicalCoverageRatio: 0,
    },
    bannedPhraseHits: findBannedPhraseHits(html),
    duplicateParagraphs: [],
    duplicateH2s: [],
    duplicateFaqs: [],
    warnings: [],
    criticals: [],
    priorityScore: 0,
    thinContent: emptyThinContent(routePath),
  }
}

function missingPageAudit(routePath: string, sources: RouteSource[], htmlPath: string): PageAudit {
  return {
    path: routePath,
    sources,
    htmlPath: path.relative(REPO_ROOT, htmlPath),
    exists: false,
    title: '',
    metaDescription: '',
    h1: '',
    h2s: [],
    paragraphs: [],
    faqQuestions: [],
    tables: [],
    internalLinks: [],
    listItems: [],
    ctaTexts: [],
    metrics: {
      wordCount: 0,
      paragraphCount: 0,
      h2Count: 0,
      faqCount: 0,
      internalLinkCount: 0,
      htmlSize: 0,
      uniqueParagraphRatio: 0,
      duplicateParagraphReuseFrequency: 0,
      duplicateH2ReuseFrequency: 0,
      duplicateFaqReuseFrequency: 0,
      paragraphDuplicationRatio: 1,
      visibleTextLength: 0,
      averageParagraphWords: 0,
      averageParagraphRichness: 0,
      uniqueSemanticSectionCount: 0,
      h2Diversity: 0,
      faqDiversity: 0,
      tableCount: 0,
      listItemCount: 0,
      semanticStructureVariety: 0,
      practicalSignalCount: 0,
      genericPatternCount: 0,
      pageUniquenessRatio: 0,
      reusedContentRatio: 1,
      topicalCoverageRatio: 0,
    },
    bannedPhraseHits: [],
    duplicateParagraphs: [],
    duplicateH2s: [],
    duplicateFaqs: [],
    warnings: [],
    criticals: ['Missing local prerendered HTML in /dist'],
    priorityScore: 100,
    thinContent: { ...emptyThinContent(routePath, 100, 'CRITICAL THIN-CONTENT RISK'), issues: ['Missing local prerendered HTML in /dist'], recommendations: ['Run the build/prerender pipeline or remove this route from indexable inventories.'] },
  }
}

function findBannedPhraseHits(html: string): string[] {
  const text = normalizeText(visibleText(html))
  return bannedPhrases.filter((phrase) => text.includes(normalizeText(phrase)))
}

function buildReuseMap(pages: PageAudit[], selector: (page: PageAudit) => string[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const page of pages) {
    const values = new Set(selector(page).map(normalizeText).filter((text) => wordCount(text) >= 3))
    for (const value of values) {
      if (!map.has(value)) map.set(value, new Set())
      map.get(value)!.add(page.path)
    }
  }
  return map
}

function topRepeated(map: Map<string, Set<string>>, minCount = 2, limit = TOP_LIMIT): RepeatedItem[] {
  return [...map.entries()]
    .map(([text, pages]) => ({ text, count: pages.size, pages: [...pages].sort() }))
    .filter((item) => item.count >= minCount)
    .sort((a, b) => b.count - a.count || b.text.length - a.text.length)
    .slice(0, limit)
}

function applyGlobalDuplication(pages: PageAudit[]): {
  topRepeatedParagraphs: RepeatedItem[]
  topRepeatedFaqs: RepeatedItem[]
  topRepeatedH2s: RepeatedItem[]
  repeatedIntroBlocks: RepeatedItem[]
  repeatedFaqBlocks: RepeatedItem[]
  repeatedH2Structures: RepeatedItem[]
  repeatedCtas: RepeatedItem[]
  paragraphBlocks: RepeatedItem[]
} {
  const paragraphMap = buildReuseMap(pages, (page) => page.paragraphs)
  const h2Map = buildReuseMap(pages, (page) => page.h2s)
  const faqMap = buildReuseMap(pages, (page) => page.faqQuestions)
  const introMap = buildReuseMap(pages, (page) => page.paragraphs.length ? [page.paragraphs[0]] : [])
  const faqBlockMap = buildReuseMap(pages, (page) => page.faqQuestions.length ? [page.faqQuestions.map(normalizeText).join(' | ')] : [])
  const h2StructureMap = buildReuseMap(pages, (page) => page.h2s.length ? [page.h2s.map(normalizeText).join(' > ')] : [])
  const ctaMap = buildReuseMap(pages, (page) => page.ctaTexts)
  const paragraphBlockMap = buildReuseMap(pages, (page) => page.paragraphs.length >= 2 ? [page.paragraphs.slice(0, 3).map(normalizeText).join(' | ')] : [])

  for (const page of pages) {
    const paragraphDuplicates = repeatedForPage(page, page.paragraphs, paragraphMap)
    const h2Duplicates = repeatedForPage(page, page.h2s, h2Map)
    const faqDuplicates = repeatedForPage(page, page.faqQuestions, faqMap)

    page.duplicateParagraphs = paragraphDuplicates
    page.duplicateH2s = h2Duplicates
    page.duplicateFaqs = faqDuplicates
    page.metrics.duplicateParagraphReuseFrequency = maxCount(paragraphDuplicates)
    page.metrics.duplicateH2ReuseFrequency = maxCount(h2Duplicates)
    page.metrics.duplicateFaqReuseFrequency = maxCount(faqDuplicates)
    const reusedParagraphCount = page.paragraphs.filter((paragraph) => (paragraphMap.get(normalizeText(paragraph))?.size || 0) > 1).length
    page.metrics.reusedContentRatio = page.paragraphs.length ? reusedParagraphCount / page.paragraphs.length : 0
    page.metrics.pageUniquenessRatio = 1 - page.metrics.reusedContentRatio
  }

  return {
    topRepeatedParagraphs: topRepeated(paragraphMap),
    topRepeatedFaqs: topRepeated(faqMap),
    topRepeatedH2s: topRepeated(h2Map),
    repeatedIntroBlocks: topRepeated(introMap, INTRO_REUSE_LIMIT + 1),
    repeatedFaqBlocks: topRepeated(faqBlockMap, FAQ_BLOCK_REUSE_LIMIT + 1),
    repeatedH2Structures: topRepeated(h2StructureMap, 4),
    repeatedCtas: topRepeated(ctaMap, 5),
    paragraphBlocks: topRepeated(paragraphBlockMap, 5),
  }
}

function repeatedForPage(page: PageAudit, values: string[], reuseMap: Map<string, Set<string>>): Array<{ text: string; pageCount: number }> {
  const seen = new Set<string>()
  const repeated: Array<{ text: string; pageCount: number }> = []
  for (const raw of values) {
    const normalized = normalizeText(raw)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    const pageCount = reuseMap.get(normalized)?.size || 0
    if (pageCount > 1) repeated.push({ text: raw, pageCount })
  }
  return repeated.sort((a, b) => b.pageCount - a.pageCount).slice(0, 10)
}

function maxCount(items: Array<{ pageCount: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.pageCount), 0)
}

function applyWarnings(pages: PageAudit[], repeatedIntroBlocks: RepeatedItem[], repeatedFaqBlocks: RepeatedItem[]): void {
  const introByText = new Map(repeatedIntroBlocks.map((item) => [item.text, item]))
  const faqBlockByText = new Map(repeatedFaqBlocks.map((item) => [item.text, item]))

  for (const page of pages) {
    if (!page.exists) {
      page.priorityScore += 100
      continue
    }
    if (page.bannedPhraseHits.length > 0) {
      page.criticals.push(`Contains banned engineering/internal phrases: ${page.bannedPhraseHits.join(', ')}`)
      page.priorityScore += 35 + page.bannedPhraseHits.length * 5
    }
    if (page.metrics.wordCount < LOW_WORD_COUNT) {
      page.warnings.push(`Low word count: ${page.metrics.wordCount} words (< ${LOW_WORD_COUNT})`)
      page.priorityScore += 20
    }
    if (page.metrics.h2Count < LOW_H2_COUNT) {
      page.warnings.push(`Fewer than ${LOW_H2_COUNT} H2s: ${page.metrics.h2Count}`)
      page.priorityScore += 10
    }
    if (page.metrics.paragraphDuplicationRatio > HIGH_PARAGRAPH_DUPLICATION) {
      page.criticals.push(`High within-page paragraph duplication: ${Math.round(page.metrics.paragraphDuplicationRatio * 100)}% (> 70%)`)
      page.priorityScore += 30
    }
    if (page.duplicateParagraphs.length > 0) {
      page.warnings.push(`Paragraphs reused on other pages; max reuse frequency ${page.metrics.duplicateParagraphReuseFrequency}`)
      page.priorityScore += Math.min(25, page.metrics.duplicateParagraphReuseFrequency)
    }
    if (page.duplicateFaqs.length > 0) {
      page.warnings.push(`FAQ questions reused on other pages; max reuse frequency ${page.metrics.duplicateFaqReuseFrequency}`)
      page.priorityScore += Math.min(20, page.metrics.duplicateFaqReuseFrequency)
    }
    if (page.metrics.uniqueParagraphRatio < 0.5 && page.metrics.paragraphCount >= 4) {
      page.warnings.push(`Low semantic uniqueness: ${Math.round(page.metrics.uniqueParagraphRatio * 100)}% unique paragraphs`)
      page.priorityScore += 25
    }
    if (page.metrics.duplicateH2ReuseFrequency > H2_REUSE_LIMIT) {
      page.warnings.push(`Repeated H2 pattern: one or more H2s appear on > ${H2_REUSE_LIMIT} pages`)
      page.priorityScore += 15
    }

    const intro = page.paragraphs.length ? normalizeText(page.paragraphs[0]) : ''
    const introItem = introByText.get(intro)
    if (introItem) {
      page.warnings.push(`Generic templated intro reused across ${introItem.count} pages (> ${INTRO_REUSE_LIMIT})`)
      page.priorityScore += 25
    }

    const faqBlock = page.faqQuestions.length ? page.faqQuestions.map(normalizeText).join(' | ') : ''
    const faqBlockItem = faqBlockByText.get(faqBlock)
    if (faqBlockItem) {
      page.warnings.push(`Same FAQ block reused across ${faqBlockItem.count} pages (> ${FAQ_BLOCK_REUSE_LIMIT})`)
      page.priorityScore += 25
    }

    page.priorityScore += Math.round((1 - page.metrics.uniqueParagraphRatio) * 20)
  }
}


function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function classifyThinContent(score: number): ThinContentClassification {
  if (score >= 75) return 'CRITICAL THIN-CONTENT RISK'
  if (score >= 55) return 'HIGH THIN-CONTENT RISK'
  if (score >= 30) return 'MODERATE RISK'
  return 'HEALTHY'
}

interface TopicExpectation {
  name: string
  terms: string[]
  recommendation: string
}

function expectedSubtopicsForRoute(page: PageAudit): TopicExpectation[] {
  const haystack = normalizeText(`${page.path} ${page.title} ${page.h1}`)
  const expectations: TopicExpectation[] = []
  const add = (items: TopicExpectation[]) => expectations.push(...items)
  const isAlternativeOrComparison = /alternative| vs |compare|comparison/.test(haystack)

  if (/guideline|guidelines|style guide|style-guide|transcription rules/.test(haystack)) {
    add([
      { name: 'clean vs full verbatim formatting', terms: ['clean verbatim', 'full verbatim', 'verbatim'], recommendation: 'Add clean vs full verbatim examples and when each rule applies.' },
      { name: 'timestamps', terms: ['timestamp', 'time stamp', 'timecode'], recommendation: 'Explain timestamp placement, interval rules, and edge cases.' },
      { name: 'speaker labels', terms: ['speaker label', 'speaker labels', 'speaker identification'], recommendation: 'Add speaker-label formatting rules and examples.' },
      { name: 'QA rejection criteria', terms: ['qa rejection', 'quality assurance', 'rejection', 'review checklist'], recommendation: 'Add a transcript QA workflow and common rejection reasons.' },
      { name: 'transcription vendor standards', terms: ['rev', 'gotranscript', 'transcribeme', 'scribie'], recommendation: 'Compare Rev/GoTranscript/TranscribeMe/Scribie rule differences.' },
    ])
  }

  if (!isAlternativeOrComparison && /video to transcript|video transcript|transcribe video|youtube transcript|audio to text|mp[34] to text|wav to text/.test(haystack)) {
    add([
      { name: 'subtitle export behavior', terms: ['srt', 'vtt', 'subtitle export', 'caption export'], recommendation: 'Describe subtitle export behavior, formats, and downstream platform use.' },
      { name: 'summaries and chapters', terms: ['summary', 'summaries', 'chapter', 'chapters'], recommendation: 'Add how summaries and chapters are generated and used.' },
      { name: 'long recordings', terms: ['long recording', 'long video', '2-hour', 'large file', 'batch'], recommendation: 'Add guidance for long recordings, large files, and batching.' },
      { name: 'searchable text workflows', terms: ['searchable', 'search', 'find quotes', 'knowledge base'], recommendation: 'Explain how searchable transcript text supports editing, research, or teams.' },
      { name: 'creator/team workflows', terms: ['creator', 'team', 'editor', 'agency', 'podcast'], recommendation: 'Add concrete creator/team workflow examples.' },
    ])
  }

  if (!isAlternativeOrComparison && /subtitle|caption|srt|vtt/.test(haystack)) {
    add([
      { name: 'timing and synchronization', terms: ['timing', 'sync', 'synchronization', 'offset'], recommendation: 'Add timing/sync guidance with common subtitle edge cases.' },
      { name: 'line length and reading speed', terms: ['line length', 'reading speed', 'characters per line', 'cps'], recommendation: 'Discuss line length, reading speed, and accessibility constraints.' },
      { name: 'platform export compatibility', terms: ['youtube', 'vimeo', 'premiere', 'final cut', 'platform'], recommendation: 'Add platform-specific export and compatibility notes.' },
      { name: 'accessibility considerations', terms: ['accessibility', 'sdh', 'closed caption', 'captions'], recommendation: 'Add accessibility and SDH/closed-caption considerations.' },
    ])
  }

  if (isAlternativeOrComparison) {
    add([
      { name: 'feature-by-feature comparison', terms: ['feature', 'comparison', 'compare', 'versus'], recommendation: 'Add a feature-by-feature comparison with tradeoffs.' },
      { name: 'pricing or plan limits', terms: ['pricing', 'price', 'plan', 'limit'], recommendation: 'Discuss pricing, plan limits, or usage constraints.' },
      { name: 'migration guidance', terms: ['migrate', 'migration', 'switch', 'import', 'export'], recommendation: 'Add switching/migration guidance and data export considerations.' },
      { name: 'best-fit user types', terms: ['best for', 'team', 'creator', 'student', 'journalist', 'agency'], recommendation: 'Identify which user types each option fits best.' },
    ])
  }

  if (/voice|dictation|recorder|speech/.test(haystack)) {
    add([
      { name: 'microphone and audio quality', terms: ['microphone', 'audio quality', 'noise', 'recording quality'], recommendation: 'Add microphone, noise, and recording quality guidance.' },
      { name: 'dictation correction workflow', terms: ['edit', 'correction', 'punctuation', 'proofread'], recommendation: 'Explain dictation correction, proofreading, and export workflow.' },
      { name: 'privacy and storage', terms: ['privacy', 'storage', 'delete', 'retention'], recommendation: 'Clarify recording privacy, storage, and retention behavior.' },
    ])
  }

  if (/translate|translation|language/.test(haystack)) {
    add([
      { name: 'language coverage', terms: ['language', 'spanish', 'french', 'arabic', 'hindi'], recommendation: 'List important language coverage and quality caveats.' },
      { name: 'timing preservation', terms: ['preserve timing', 'timing preserved', 'timestamps', 'sync'], recommendation: 'Explain how subtitle timing is preserved during translation.' },
      { name: 'review and localization QA', terms: ['review', 'localization', 'qa', 'native speaker'], recommendation: 'Add localization QA and review workflow guidance.' },
    ])
  }

  return expectations.filter((item, index, arr) => arr.findIndex((other) => other.name === item.name) === index)
}

function topicalCoverage(page: PageAudit): { ratio: number; missing: string[]; recommendations: string[] } {
  const expectations = expectedSubtopicsForRoute(page)
  if (expectations.length === 0) return { ratio: 1, missing: [], recommendations: [] }
  const text = normalizeText(`${page.title} ${page.metaDescription} ${page.h1} ${page.h2s.join(' ')} ${page.paragraphs.join(' ')} ${page.faqQuestions.join(' ')} ${page.listItems.join(' ')} ${page.tables.map((table) => table.text).join(' ')}`)
  const missing = expectations.filter((expectation) => !expectation.terms.some((term) => text.includes(normalizeText(term))))
  return {
    ratio: (expectations.length - missing.length) / expectations.length,
    missing: missing.map((item) => item.name),
    recommendations: missing.map((item) => item.recommendation),
  }
}

function repeatedItemForPage(items: RepeatedItem[], page: PageAudit, normalizedText: string): RepeatedItem | undefined {
  return items.find((item) => item.text === normalizedText && item.pages.includes(page.path))
}

function repeatedH2StructureForPage(page: PageAudit, repeatedH2Structures: RepeatedItem[]): RepeatedItem | undefined {
  const signature = page.h2s.length ? page.h2s.map(normalizeText).join(' > ') : ''
  return signature ? repeatedItemForPage(repeatedH2Structures, page, signature) : undefined
}

function repeatedIntroForPage(page: PageAudit, repeatedIntroBlocks: RepeatedItem[]): RepeatedItem | undefined {
  const signature = page.paragraphs.length ? normalizeText(page.paragraphs[0]) : ''
  return signature ? repeatedItemForPage(repeatedIntroBlocks, page, signature) : undefined
}

function repeatedFaqBlockForPage(page: PageAudit, repeatedFaqBlocks: RepeatedItem[]): RepeatedItem | undefined {
  const signature = page.faqQuestions.length ? page.faqQuestions.map(normalizeText).join(' | ') : ''
  return signature ? repeatedItemForPage(repeatedFaqBlocks, page, signature) : undefined
}

function repeatedCtaForPage(page: PageAudit, repeatedCtas: RepeatedItem[]): RepeatedItem | undefined {
  const pageCtas = new Set(page.ctaTexts.map(normalizeText))
  return repeatedCtas.find((item) => pageCtas.has(item.text) && item.pages.includes(page.path))
}

function genericH2Count(page: PageAudit): number {
  return page.h2s.filter((h2) => GENERIC_H2_PATTERNS.some((pattern) => pattern.test(h2.trim()))).length
}

function shallowParagraphCount(page: PageAudit): number {
  return page.paragraphs.filter((paragraph) => wordCount(paragraph) < 14).length
}

function applyThinContentRisk(pages: PageAudit[], repeated: ReturnType<typeof applyGlobalDuplication>): void {
  for (const page of pages) {
    if (!page.exists) continue

    const topical = topicalCoverage(page)
    page.metrics.topicalCoverageRatio = topical.ratio

    const repeatedIntro = repeatedIntroForPage(page, repeated.repeatedIntroBlocks)
    const repeatedFaqBlock = repeatedFaqBlockForPage(page, repeated.repeatedFaqBlocks)
    const repeatedH2Structure = repeatedH2StructureForPage(page, repeated.repeatedH2Structures)
    const repeatedCta = repeatedCtaForPage(page, repeated.repeatedCtas)
    const genericH2s = genericH2Count(page)
    const shallowParagraphs = shallowParagraphCount(page)
    const noComparison = page.tables.length === 0 && !/compare|versus| vs |alternative/.test(normalizeText(page.h2s.join(' ') + ' ' + page.paragraphs.join(' ')))

    const semanticContentDepth = clamp(
      (page.metrics.wordCount < 450 ? 18 : page.metrics.wordCount < 800 ? 8 : 0) +
      (page.metrics.paragraphCount < 5 ? 15 : page.metrics.paragraphCount < 9 ? 7 : 0) +
      (page.metrics.averageParagraphWords < 18 ? 12 : page.metrics.averageParagraphWords < 28 ? 5 : 0) +
      (page.metrics.averageParagraphRichness < 0.48 ? 10 : page.metrics.averageParagraphRichness < 0.58 ? 5 : 0) +
      (page.metrics.uniqueSemanticSectionCount < 4 ? 14 : page.metrics.uniqueSemanticSectionCount < 7 ? 6 : 0) +
      (page.metrics.h2Diversity < 0.75 ? 8 : 0) +
      (page.metrics.faqCount > 0 && page.metrics.faqDiversity < 0.8 ? 5 : 0) +
      (noComparison ? 4 : 0)
    )

    const templateDuplicationRisk = clamp(
      page.metrics.reusedContentRatio * 45 +
      Math.min(18, page.metrics.duplicateParagraphReuseFrequency * 1.5) +
      Math.min(12, page.metrics.duplicateH2ReuseFrequency) +
      Math.min(12, page.metrics.duplicateFaqReuseFrequency) +
      (repeatedIntro ? 14 : 0) +
      (repeatedFaqBlock ? 14 : 0) +
      (repeatedH2Structure ? 10 : 0) +
      (repeatedCta ? 6 : 0)
    )

    const searchIntentCoverage = clamp(
      (page.metrics.practicalSignalCount < 5 ? 18 : page.metrics.practicalSignalCount < 9 ? 8 : 0) +
      (genericH2s >= Math.max(2, page.h2s.length / 2) ? 12 : genericH2s > 0 ? 5 : 0) +
      (page.metrics.semanticStructureVariety < 3 ? 10 : 0) +
      (page.faqQuestions.length === 0 ? 6 : 0) +
      (page.listItems.length === 0 && page.tables.length === 0 ? 8 : 0) +
      (topical.ratio < 0.5 ? 10 : topical.ratio < 0.8 ? 5 : 0)
    )

    const engineeringLeakage = clamp(page.bannedPhraseHits.length * 15)
    const topicalCompleteness = clamp((1 - topical.ratio) * 45)
    const htmlRichness = clamp(
      (page.metrics.h2Count < 3 ? 18 : page.metrics.h2Count < 5 ? 8 : 0) +
      (page.metrics.paragraphCount < page.metrics.h2Count ? 8 : 0) +
      (page.metrics.semanticStructureVariety < 2 ? 18 : page.metrics.semanticStructureVariety < 4 ? 8 : 0) +
      (page.metrics.internalLinkCount < 5 ? 6 : 0) +
      (page.metrics.tableCount === 0 ? 4 : 0) +
      (page.metrics.listItemCount < 4 ? 4 : 0)
    )
    const aiTemplatePatternRisk = clamp(
      page.metrics.genericPatternCount * 8 +
      (shallowParagraphs >= Math.max(3, page.paragraphs.length / 3) ? 12 : 0) +
      (repeatedCta ? 8 : 0) +
      (repeatedIntro ? 8 : 0) +
      (genericH2s > 0 ? genericH2s * 3 : 0)
    )

    const score = clamp(
      semanticContentDepth * 0.18 +
      templateDuplicationRisk * 0.22 +
      searchIntentCoverage * 0.18 +
      engineeringLeakage * 0.12 +
      topicalCompleteness * 0.14 +
      htmlRichness * 0.08 +
      aiTemplatePatternRisk * 0.08 +
      (page.metrics.reusedContentRatio > 0.5 ? 12 : page.metrics.reusedContentRatio > 0.35 ? 7 : 0) +
      (page.bannedPhraseHits.length > 0 ? 10 : 0) +
      (repeatedCta && repeatedCta.count > 50 ? 4 : 0) +
      (genericH2s >= 2 ? 4 : 0) +
      (topical.missing.length >= 3 ? 6 : topical.missing.length > 0 ? 3 : 0)
    )
    const issues: string[] = []
    const recommendations = new Set<string>()
    const weakSections: string[] = []

    if (repeatedIntro) issues.push(`Repeated intro used on ${repeatedIntro.count} pages`)
    if (repeatedFaqBlock) issues.push(`Same FAQ block reused on ${repeatedFaqBlock.count} pages`)
    if (repeatedH2Structure) issues.push(`Repeated H2 structure shared by ${repeatedH2Structure.count} pages`)
    if (repeatedCta) issues.push(`Repeated CTA text reused on ${repeatedCta.count} pages`)
    if (page.metrics.reusedContentRatio > 0.35) issues.push(`${Math.round(page.metrics.reusedContentRatio * 100)}% duplicated paragraph reuse`)
    if (genericH2s > 0) issues.push(`Weak generic H2 structure (${genericH2s} generic headings)`)
    if (shallowParagraphs > 0) issues.push(`${shallowParagraphs} shallow or low-information paragraphs`)
    if (page.bannedPhraseHits.length > 0) issues.push('Contains engineering leakage')
    if (topical.missing.length > 0) issues.push(`Missing topical subtopics: ${topical.missing.slice(0, 5).join(', ')}`)
    if (page.metrics.practicalSignalCount < 5) issues.push('Limited operational guidance or intent-satisfaction signals')
    if (page.metrics.semanticStructureVariety < 3) issues.push('Sparse HTML structure variety')
    if (page.metrics.genericPatternCount > 0) issues.push(`AI/template-like sentence patterns detected (${page.metrics.genericPatternCount})`)

    if (genericH2s > 0) weakSections.push('Generic H2s such as “How it works”, “Features”, or “Use cases” need route-specific framing')
    if (shallowParagraphs > 0) weakSections.push('Several paragraphs are too short to add standalone informational value')
    if (page.metrics.semanticStructureVariety < 3) weakSections.push('The document lacks a mix of lists, tables, FAQs, links, and sectioned explanatory copy')

    for (const recommendation of topical.recommendations) recommendations.add(recommendation)
    if (page.metrics.practicalSignalCount < 8) recommendations.add('Add operational guidance, edge cases, QA details, export behavior, or troubleshooting steps.')
    if (page.metrics.reusedContentRatio > 0.25) recommendations.add('Rewrite duplicated paragraphs with route-specific examples and differentiated insights.')
    if (repeatedIntro) recommendations.add('Replace the templated intro with a page-specific problem, audience, and workflow description.')
    if (repeatedFaqBlock) recommendations.add('Replace reused FAQs with questions unique to this intent and user type.')
    if (repeatedH2Structure) recommendations.add('Vary the section architecture so the page is not differentiated only by swapped nouns.')
    if (page.bannedPhraseHits.length > 0) recommendations.add('Remove implementation commentary and engineering language from crawlable content.')
    if (page.metrics.semanticStructureVariety < 3) recommendations.add('Add richer HTML structure: specific H2s, lists, comparison tables, examples, FAQs, and internal links.')
    if (page.metrics.genericPatternCount > 0) recommendations.add('Replace generic AI-style transitions with concrete examples and constraints.')

    page.thinContent = {
      route: page.path,
      thinContentRisk: score,
      classification: classifyThinContent(score),
      issues,
      recommendations: [...recommendations],
      components: {
        semanticContentDepth,
        templateDuplicationRisk,
        searchIntentCoverage,
        engineeringLeakage,
        topicalCompleteness,
        htmlRichness,
        aiTemplatePatternRisk,
      },
      missingSubtopics: topical.missing,
      weakSections,
      semanticExpansionOpportunities: [...recommendations],
    }
    page.priorityScore = Math.max(page.priorityScore, score)
  }
}

function buildTopicalGapAssessments(pages: PageAudit[]): TopicalGapAssessment[] {
  return pages
    .filter((page) => page.exists && expectedSubtopicsForRoute(page).length > 0)
    .map((page) => ({
      route: page.path,
      missingSubtopics: page.thinContent.missingSubtopics,
      weakSections: page.thinContent.weakSections,
      opportunities: page.thinContent.semanticExpansionOpportunities,
    }))
    .filter((gap) => gap.missingSubtopics.length > 0 || gap.weakSections.length > 0 || gap.opportunities.length > 0)
    .sort((a, b) => (b.missingSubtopics.length + b.weakSections.length) - (a.missingSubtopics.length + a.weakSections.length))
}

function buildDuplicationClusters(repeated: ReturnType<typeof applyGlobalDuplication>): DuplicationCluster[] {
  const fromRepeated = (items: RepeatedItem[], type: DuplicationCluster['type']): DuplicationCluster[] => items.map((item) => ({
    signature: item.text,
    type,
    pageCount: item.count,
    pages: item.pages,
  }))
  return [
    ...fromRepeated(repeated.repeatedIntroBlocks, 'intro'),
    ...fromRepeated(repeated.repeatedFaqBlocks, 'faq-block'),
    ...fromRepeated(repeated.repeatedH2Structures, 'h2-structure'),
    ...fromRepeated(repeated.repeatedCtas, 'cta'),
    ...fromRepeated(repeated.paragraphBlocks, 'paragraph-block'),
  ].sort((a, b) => b.pageCount - a.pageCount).slice(0, 100)
}

function markdownTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '_None._\n'
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  return [
    `| ${headers.map(escape).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n') + '\n'
}

function renderRepeated(items: RepeatedItem[]): string {
  if (items.length === 0) return '_None._\n'
  return items.map((item, index) => `${index + 1}. **${item.count} pages** — ${truncate(item.text, 220)}\n   - Pages: ${item.pages.slice(0, 12).join(', ')}${item.pages.length > 12 ? `, +${item.pages.length - 12} more` : ''}`).join('\n') + '\n'
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}


function deterministicGeneratedAt(): string {
  if (process.env.CONTENT_AUDIT_GENERATED_AT) return process.env.CONTENT_AUDIT_GENERATED_AT
  if (process.env.SOURCE_DATE_EPOCH && /^\d+$/.test(process.env.SOURCE_DATE_EPOCH)) {
    return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  }
  return 'local-dist-snapshot'
}

function countByClassification(pages: PageAudit[]): { healthy: number; moderate: number; high: number; critical: number } {
  return {
    healthy: pages.filter((page) => page.thinContent.classification === 'HEALTHY').length,
    moderate: pages.filter((page) => page.thinContent.classification === 'MODERATE RISK').length,
    high: pages.filter((page) => page.thinContent.classification === 'HIGH THIN-CONTENT RISK').length,
    critical: pages.filter((page) => page.thinContent.classification === 'CRITICAL THIN-CONTENT RISK').length,
  }
}

function renderDuplicationClusters(clusters: DuplicationCluster[]): string {
  if (clusters.length === 0) return '_None._\n'
  return clusters.map((cluster, index) => `${index + 1}. **${cluster.type}** — ${cluster.pageCount} pages\n   - Signature: ${truncate(cluster.signature, 220)}\n   - Pages: ${cluster.pages.slice(0, 15).join(', ')}${cluster.pages.length > 15 ? `, +${cluster.pages.length - 15} more` : ''}`).join('\n') + '\n'
}

function generateReports(pages: PageAudit[], repeated: ReturnType<typeof applyGlobalDuplication>): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const pagesWithBanned = pages.filter((page) => page.bannedPhraseHits.length > 0)
  const thinPages = pages.filter((page) => page.metrics.wordCount < LOW_WORD_COUNT || page.metrics.h2Count < LOW_H2_COUNT)
  const highDuplication = pages.filter((page) => page.metrics.paragraphDuplicationRatio > HIGH_PARAGRAPH_DUPLICATION || page.metrics.uniqueParagraphRatio < 0.5 || page.duplicateParagraphs.length > 0 || page.duplicateFaqs.length > 0)
  const missingPages = pages.filter((page) => !page.exists)
  const generatedAt = deterministicGeneratedAt()
  const thinAudits = pages.map((page) => page.thinContent).sort((a, b) => b.thinContentRisk - a.thinContentRisk)
  const topicalGaps = buildTopicalGapAssessments(pages)
  const duplicationClusters = buildDuplicationClusters(repeated)
  const classificationCounts = countByClassification(pages)
  const suppressedRiskPages = thinAudits.filter((audit) => audit.classification === 'HIGH THIN-CONTENT RISK' || audit.classification === 'CRITICAL THIN-CONTENT RISK')

  const summary = `# Content Audit Summary\n\nGenerated: ${generatedAt}\n\n## Totals\n\n${markdownTable(['Metric', 'Count'], [
    ['Total pages audited', String(pages.length)],
    ['Missing local /dist HTML', String(missingPages.length)],
    ['Pages with banned phrases', String(pagesWithBanned.length)],
    ['Pages flagged thin', String(thinPages.length)],
    ['Pages with high duplication', String(highDuplication.length)],
    ['High thin-content risk pages', String(classificationCounts.high)],
    ['Critical thin-content risk pages', String(classificationCounts.critical)],
  ])}\n\n## Pages with banned phrases\n\n${markdownTable(['Path', 'Phrases'], pagesWithBanned.map((page) => [page.path, page.bannedPhraseHits.join(', ')]))}\n\n## Pages flagged thin\n\n${markdownTable(['Path', 'Words', 'Paragraphs', 'H2s', 'FAQs', 'Thin risk'], thinPages.sort((a, b) => b.thinContent.thinContentRisk - a.thinContent.thinContentRisk).slice(0, 100).map((page) => [page.path, String(page.metrics.wordCount), String(page.metrics.paragraphCount), String(page.metrics.h2Count), String(page.metrics.faqCount), `${page.thinContent.thinContentRisk} (${page.thinContent.classification})`]))}\n\n## Pages with high duplication\n\n${markdownTable(['Path', 'Unique paragraph ratio', 'Reused content', 'Max paragraph reuse', 'Max FAQ reuse'], highDuplication.sort((a, b) => b.metrics.reusedContentRatio - a.metrics.reusedContentRatio).slice(0, 100).map((page) => [page.path, `${Math.round(page.metrics.uniqueParagraphRatio * 100)}%`, `${Math.round(page.metrics.reusedContentRatio * 100)}%`, String(page.metrics.duplicateParagraphReuseFrequency), String(page.metrics.duplicateFaqReuseFrequency)]))}\n\n## Top repeated paragraphs\n\n${renderRepeated(repeated.topRepeatedParagraphs)}\n\n## Top repeated FAQs\n\n${renderRepeated(repeated.topRepeatedFaqs)}\n\n## Top repeated H2s\n\n${renderRepeated(repeated.topRepeatedH2s)}\n`

  const priority = `# Content Priority Fixes\n\nGenerated: ${generatedAt}\n\nRanked by highest duplication, weakest uniqueness, stale engineering language, and lowest semantic richness.\n\n${markdownTable(['Rank', 'Path', 'Risk', 'Classification', 'Words', 'Reused content', 'Top issues'], pages.slice().sort((a, b) => b.thinContent.thinContentRisk - a.thinContent.thinContentRisk || b.priorityScore - a.priorityScore).slice(0, 150).map((page, index) => [
    String(index + 1),
    page.path,
    String(page.thinContent.thinContentRisk),
    page.thinContent.classification,
    String(page.metrics.wordCount),
    `${Math.round(page.metrics.reusedContentRatio * 100)}%`,
    page.thinContent.issues.slice(0, 4).join('; ') || [...page.criticals, ...page.warnings].slice(0, 4).join('; ') || 'No major warnings',
  ]))}\n\n## Recommended fix order\n\n1. Remove banned engineering/internal language from critical pages first.\n2. Rewrite pages with repeated intros or FAQ blocks reused beyond heuristic thresholds.\n3. Expand thin pages with page-specific examples, workflows, operational constraints, and troubleshooting details.\n4. Replace generic H2 templates with intent-specific sections.\n5. Add useful paragraphs, tables, FAQs, lists, and internal links where semantic richness is weakest.\n`

  const thinRisk = `# Thin Content Risk\n\nGenerated: ${generatedAt}\n\nThis report estimates low-value-page risk from semantic uniqueness, informational value, usefulness, perceived expertise, crawlable document quality, and large-scale templated-page risk. It intentionally avoids keyword-density and meta-tag-only scoring.\n\n## Classification totals\n\n${markdownTable(['Classification', 'Pages'], [
    ['HEALTHY', String(classificationCounts.healthy)],
    ['MODERATE RISK', String(classificationCounts.moderate)],
    ['HIGH THIN-CONTENT RISK', String(classificationCounts.high)],
    ['CRITICAL THIN-CONTENT RISK', String(classificationCounts.critical)],
  ])}\n\n## Highest-risk pages\n\n${markdownTable(['Rank', 'Route', 'Risk', 'Classification', 'Primary issues', 'Recommendations'], thinAudits.slice(0, 75).map((audit, index) => [
    String(index + 1),
    audit.route,
    String(audit.thinContentRisk),
    audit.classification,
    audit.issues.slice(0, 5).join('; ') || 'No major issues',
    audit.recommendations.slice(0, 3).join('; ') || 'Maintain current quality',
  ]))}\n\n## Duplication hotspots\n\n${renderDuplicationClusters(duplicationClusters.slice(0, 20))}\n\n## Weakest semantic pages\n\n${markdownTable(['Route', 'Depth risk', 'Intent risk', 'HTML richness risk', 'Missing topical coverage'], pages.slice().sort((a, b) => (b.thinContent.components.semanticContentDepth + b.thinContent.components.searchIntentCoverage + b.thinContent.components.htmlRichness) - (a.thinContent.components.semanticContentDepth + a.thinContent.components.searchIntentCoverage + a.thinContent.components.htmlRichness)).slice(0, 50).map((page) => [
    page.path,
    String(page.thinContent.components.semanticContentDepth),
    String(page.thinContent.components.searchIntentCoverage),
    String(page.thinContent.components.htmlRichness),
    page.thinContent.missingSubtopics.slice(0, 4).join(', ') || '—',
  ]))}\n\n## Pages likely to be suppressed by Google\n\n${markdownTable(['Route', 'Risk', 'Why'], suppressedRiskPages.slice(0, 100).map((audit) => [
    audit.route,
    `${audit.thinContentRisk} (${audit.classification})`,
    audit.issues.slice(0, 5).join('; ') || 'High aggregate thin-content risk',
  ]))}\n`

  const topicalGapsMarkdown = `# Topical Gaps\n\nGenerated: ${generatedAt}\n\nImportant routes are evaluated against obvious user-intent subtopics for their route family. Missing items are not keyword-density failures; they are opportunities to add useful, specific information.\n\n${topicalGaps.length ? topicalGaps.map((gap) => `## ${gap.route}\n\n- **Missing subtopics:** ${gap.missingSubtopics.length ? gap.missingSubtopics.join(', ') : 'None detected'}\n- **Weak sections:** ${gap.weakSections.length ? gap.weakSections.join('; ') : 'None detected'}\n- **Expansion opportunities:**\n${gap.opportunities.length ? gap.opportunities.map((item) => `  - ${item}`).join('\n') : '  - Maintain current topical depth.'}`).join('\n\n') : '_No topical gaps detected._'}\n`

  const duplicationMarkdown = `# Duplication Clusters\n\nGenerated: ${generatedAt}\n\nSemantically similar page clusters that may look templated at scale.\n\n${renderDuplicationClusters(duplicationClusters)}\n`

  const json = {
    generatedAt,
    thresholds: {
      lowWordCount: LOW_WORD_COUNT,
      lowH2Count: LOW_H2_COUNT,
      highParagraphDuplication: HIGH_PARAGRAPH_DUPLICATION,
      faqBlockReuseLimit: FAQ_BLOCK_REUSE_LIMIT,
      introReuseLimit: INTRO_REUSE_LIMIT,
      h2ReuseLimit: H2_REUSE_LIMIT,
    },
    bannedPhrases,
    summary: {
      totalPagesAudited: pages.length,
      missingLocalHtml: missingPages.length,
      pagesWithBannedPhrases: pagesWithBanned.length,
      pagesFlaggedThin: thinPages.length,
      pagesWithHighDuplication: highDuplication.length,
      thinContentClassifications: classificationCounts,
    },
    thinContentAudits: thinAudits,
    topicalGaps,
    duplicationClusters,
    topRepeatedParagraphs: repeated.topRepeatedParagraphs,
    topRepeatedFaqs: repeated.topRepeatedFaqs,
    topRepeatedH2s: repeated.topRepeatedH2s,
    repeatedIntroBlocks: repeated.repeatedIntroBlocks,
    repeatedFaqBlocks: repeated.repeatedFaqBlocks,
    repeatedH2Structures: repeated.repeatedH2Structures,
    repeatedCtas: repeated.repeatedCtas,
    pages,
  }

  fs.writeFileSync(path.join(REPORT_DIR, 'content-audit-summary.md'), summary, 'utf8')
  fs.writeFileSync(path.join(REPORT_DIR, 'content-priority-fixes.md'), priority, 'utf8')
  fs.writeFileSync(path.join(REPORT_DIR, 'content-audit.json'), JSON.stringify(json, null, 2), 'utf8')
  fs.writeFileSync(path.join(REPORT_DIR, 'thin-content-risk.md'), thinRisk, 'utf8')
  fs.writeFileSync(path.join(REPORT_DIR, 'topical-gaps.md'), topicalGapsMarkdown, 'utf8')
  fs.writeFileSync(path.join(REPORT_DIR, 'duplication-clusters.md'), duplicationMarkdown, 'utf8')
}


function summarizeIssue(issue: string): string {
  if (/faq/i.test(issue) && /reused|same/i.test(issue)) return 'repeated FAQs'
  if (/generic h2|h2 structure/i.test(issue)) return 'generic H2 structures'
  if (/intro/i.test(issue)) return 'duplicated intros'
  if (/engineering leakage/i.test(issue)) return 'engineering leakage'
  if (/duplicated paragraph|paragraph reuse/i.test(issue)) return 'duplicated paragraph blocks'
  if (/cta/i.test(issue)) return 'repeated CTA sections'
  if (/missing topical/i.test(issue)) return 'missing topical subtopics'
  if (/operational guidance|intent/i.test(issue)) return 'weak intent satisfaction signals'
  if (/ai\/template|template-like/i.test(issue)) return 'AI/template-like patterns'
  return issue.replace(/\d+/g, '#').replace(/\([^)]*\)/g, '').trim()
}

function logCliSummary(pages: PageAudit[]): void {
  const counts = countByClassification(pages)
  const topIssues = new Map<string, number>()
  for (const page of pages) {
    for (const issue of page.thinContent.issues) {
      const key = summarizeIssue(issue)
      topIssues.set(key, (topIssues.get(key) || 0) + 1)
    }
  }
  const topIssueLabels = [...topIssues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([issue]) => issue)
  console.log(`${colors.bold}${colors.cyan}THIN CONTENT AUDIT SUMMARY${colors.reset}`)
  console.log('')
  console.log(color(`Healthy pages: ${counts.healthy}`, 'good'))
  console.log(color(`Moderate risk: ${counts.moderate}`, 'warning'))
  console.log(color(`High risk: ${counts.high}`, 'warning'))
  console.log(color(`Critical risk: ${counts.critical}`, 'critical'))
  console.log('')
  console.log('Top issues:')
  for (const issue of topIssueLabels) console.log(`- ${issue}`)
  console.log('')
  console.log(`reports/content-audit-summary.md`)
  console.log(`reports/content-audit.json`)
  console.log(`reports/content-priority-fixes.md`)
  console.log(`reports/thin-content-risk.md`)
  console.log(`reports/topical-gaps.md`)
  console.log(`reports/duplication-clusters.md`)
}


function assertBuildQuality(pages: PageAudit[]): void {
  const failures: string[] = []
  for (const page of pages) {
    if (!page.exists) {
      failures.push(`${page.path}: Missing local prerendered HTML in /dist`)
      continue
    }
    if (!page.title) failures.push(`${page.path}: missing title`)
    if (!page.h1) failures.push(`${page.path}: missing H1`)
    if (page.metrics.h2Count < LOW_H2_COUNT) failures.push(`${page.path}: fewer than ${LOW_H2_COUNT} H2s (${page.metrics.h2Count})`)
    if (page.metrics.paragraphCount < 3) failures.push(`${page.path}: fewer than 3 paragraphs (${page.metrics.paragraphCount})`)
    if (page.metrics.visibleTextLength < 400) failures.push(`${page.path}: possible empty SPA shell (${page.metrics.visibleTextLength} visible chars)`)
  }

  if (failures.length) {
    console.error(color('[content-audit] Build-blocking prerender quality failures:', 'critical'))
    for (const failure of failures.slice(0, 80)) console.error(`  - ${failure}`)
    if (failures.length > 80) console.error(`  - ...and ${failures.length - 80} more`)
    process.exit(1)
  }
}

function main(): void {
  if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.error(color('[content-audit] dist/index.html not found. Run npm run build or npm run prerender before auditing local prerendered HTML.', 'critical'))
    process.exit(1)
  }

  const routes = collectRoutes()
  const pages = routes.map((route) => {
    const htmlPath = htmlPathForRoute(route.path)
    if (!fs.existsSync(htmlPath)) return missingPageAudit(route.path, route.sources, htmlPath)
    const html = fs.readFileSync(htmlPath, 'utf8')
    return analyzeHtml(route.path, route.sources, htmlPath, html)
  })

  const repeated = applyGlobalDuplication(pages)
  applyWarnings(pages, repeated.repeatedIntroBlocks, repeated.repeatedFaqBlocks)
  applyThinContentRisk(pages, repeated)
  generateReports(pages, repeated)
  logCliSummary(pages)
  assertBuildQuality(pages)
}

main()
