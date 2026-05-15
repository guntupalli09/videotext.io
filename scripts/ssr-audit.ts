import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderPageToHtml, getSsrPagePaths, getSsrRenderMode } from '../client/src/ssr-render'
import { getAllSeoEntries } from '../client/src/lib/seoRegistry'
import { getIndexablePaths } from './seo/registry'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const REPORT_DIR = path.join(REPO_ROOT, 'reports')
const APP_PATH = path.join(REPO_ROOT, 'client/src/App.tsx')
const PAGES_DIR = path.join(REPO_ROOT, 'client/src/pages')

interface RouteRecord {
  path: string
  source: 'react-router' | 'seo-registry' | 'sitemap-indexable'
  indexable: boolean
  prerendered: boolean
  ssrMode: string | null
  ssrCovered: boolean
}

interface FileAnalysis {
  file: string
  category: 'A' | 'B' | 'C'
  reasons: string[]
  signals: Record<string, number>
}

const signalPatterns: Record<string, RegExp> = {
  window: /\bwindow\b/g,
  document: /\bdocument\b/g,
  localStorage: /\blocalStorage\b/g,
  sessionStorage: /\bsessionStorage\b/g,
  navigator: /\bnavigator\b/g,
  useEffect: /\buseEffect\b/g,
  useLayoutEffect: /\buseLayoutEffect\b/g,
  useNavigate: /\buseNavigate\b/g,
  useLocation: /\buseLocation\b/g,
  directDom: /\b(querySelector|getElementById|addEventListener|removeEventListener|createElement|scrollTo)\b/g,
  browserOnlyLibraries: /(@ffmpeg|react-dropzone|jspdf|docx|mammoth|posthog|@sentry|@vercel\/analytics|framer-motion)/g,
  lazyLoading: /\blazy\s*\(|import\(/g,
  suspense: /\bSuspense\b/g,
}

function ensureReportDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
}

function read(file: string): string {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

function extractRouterPaths(): string[] {
  const app = read(APP_PATH)
  const paths = new Set<string>()
  for (const match of app.matchAll(/<Route\s+[^>]*path=(?:"([^"]+)"|'([^']+)')/g)) {
    const routePath = match[1] || match[2]
    if (!routePath || routePath === '*') continue
    paths.add(routePath)
  }
  return [...paths].sort()
}

function walkTsx(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkTsx(full))
    if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

function countMatches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length
}

function analyzePageFile(file: string): FileAnalysis {
  const source = read(file)
  const signals = Object.fromEntries(Object.entries(signalPatterns).map(([name, pattern]) => [name, countMatches(source, pattern)]))
  const reasons: string[] = []
  const rel = path.relative(REPO_ROOT, file)
  const lower = rel.toLowerCase()
  const browserSignals = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'directDom', 'browserOnlyLibraries']
    .filter((key) => signals[key] > 0)
  const hydrationSignals = ['useEffect', 'useLayoutEffect', 'useNavigate', 'useLocation', 'lazyLoading', 'suspense']
    .filter((key) => signals[key] > 0)

  let category: FileAnalysis['category'] = 'A'
  if (/(login|signup|password|magic|founder|dashboard|feedback|survey|sharetranscript|voicerecorder|transcriptresult|batchprocess)/.test(lower)) {
    category = 'C'
    reasons.push('Auth, dashboard, upload/editor, share, or operational flow should remain hydration-only/client-only.')
  }
  if (signals.browserOnlyLibraries > 0) {
    category = 'C'
    reasons.push('Imports browser-heavy/client-only libraries that are not safe to execute during Node SSR.')
  }
  if (browserSignals.length > 0 && category !== 'C') {
    category = 'B'
    reasons.push(`Uses browser-only APIs or direct DOM access: ${browserSignals.join(', ')}.`)
  }
  if (hydrationSignals.length > 0 && category === 'A') {
    category = 'B'
    reasons.push(`Uses hydration/router/lazy behavior that should be audited before direct SSR: ${hydrationSignals.join(', ')}.`)
  }
  if (category === 'A') reasons.push('No browser-only or hydration-only signals detected by static scan.')
  if (category === 'B' && reasons.length === 0) reasons.push('Small SSR guard/refactor likely required.')

  return { file: rel, category, reasons, signals }
}

function buildRouteRecords(): RouteRecord[] {
  const routerPaths = extractRouterPaths()
  const seoPaths = getAllSeoEntries().map((e) => e.path)
  const indexablePaths = getIndexablePaths()
  const ssrPaths = new Set(getSsrPagePaths())
  const paths = new Set([...routerPaths, ...seoPaths, ...indexablePaths])
  const records: RouteRecord[] = []
  for (const routePath of [...paths].sort()) {
    const source: RouteRecord['source'] = routerPaths.includes(routePath)
      ? 'react-router'
      : seoPaths.includes(routePath)
        ? 'seo-registry'
        : 'sitemap-indexable'
    const indexable = indexablePaths.includes(routePath) || getAllSeoEntries().some((e) => e.path === routePath && e.indexable)
    const ssrMode = getSsrRenderMode(routePath)
    records.push({
      path: routePath,
      source,
      indexable,
      prerendered: indexablePaths.includes(routePath),
      ssrMode,
      ssrCovered: ssrPaths.has(routePath) || Boolean(ssrMode),
    })
  }
  return records
}

function semanticCounts(html: string) {
  return {
    htmlSize: Buffer.byteLength(html, 'utf8'),
    h1Count: (html.match(/<h1\b/gi) || []).length,
    h2Count: (html.match(/<h2\b/gi) || []).length,
    paragraphCount: (html.match(/<p\b/gi) || []).length,
    linkCount: (html.match(/<a\b/gi) || []).length,
    containsEmptyRootDiv: /<div id="root"><\/div>/.test(html) || /<div id="root"\s*><\/div>/.test(html),
  }
}

function validateRender(paths: string[]) {
  return paths.sort().map((routePath) => {
    const html = renderPageToHtml(routePath) || ''
    const counts = semanticCounts(html)
    const succeeded = html.length > 0
    const meaningful = succeeded && counts.htmlSize >= 1500 && counts.h1Count >= 1 && (counts.h2Count >= 2 || counts.paragraphCount >= 5)
    const flags: string[] = []
    if (!succeeded) flags.push('render-failed-or-unregistered')
    if (succeeded && counts.htmlSize < 1500) flags.push('suspiciously-small')
    if (succeeded && counts.h2Count === 0) flags.push('no-h2')
    if (succeeded && counts.paragraphCount < 3) flags.push('low-paragraph-count')
    if (counts.containsEmptyRootDiv) flags.push('empty-root-div')
    return {
      path: routePath,
      mode: getSsrRenderMode(routePath),
      succeeded,
      meaningful,
      ...counts,
      flags,
    }
  })
}

function writeReports() {
  ensureReportDir()
  const routes = buildRouteRecords()
  const pageAnalyses = walkTsx(PAGES_DIR).map(analyzePageFile).sort((a, b) => a.file.localeCompare(b.file))
  const validationPaths = [...new Set([...getIndexablePaths(), ...getSsrPagePaths()])]
  const validation = validateRender(validationPaths)

  const totalRoutes = routes.length
  const seoIndexable = routes.filter((r) => r.indexable).length
  const prerendered = routes.filter((r) => r.prerendered).length
  const currentlySsr = routes.filter((r) => r.ssrCovered).length
  const missingSsr = routes.filter((r) => r.indexable && !r.ssrCovered).map((r) => r.path)
  const byCategory = {
    A: pageAnalyses.filter((p) => p.category === 'A').length,
    B: pageAnalyses.filter((p) => p.category === 'B').length,
    C: pageAnalyses.filter((p) => p.category === 'C').length,
  }
  const meaningful = validation.filter((v) => v.meaningful).length

  fs.writeFileSync(path.join(REPORT_DIR, 'ssr-routes.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary: { totalRoutes, seoIndexable, prerendered, currentlySsr, missingSsr: missingSsr.length }, routes }, null, 2))
  fs.writeFileSync(path.join(REPORT_DIR, 'ssr-render-validation.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary: { validatedRoutes: validation.length, succeeded: validation.filter((v) => v.succeeded).length, meaningful, suspicious: validation.filter((v) => v.flags.length > 0).length }, routes: validation }, null, 2))

  fs.writeFileSync(path.join(REPORT_DIR, 'ssr-summary.md'), `# SSR Coverage Report\n\nGenerated: ${new Date().toISOString()}\n\n\`\`\`txt\nSSR COVERAGE REPORT\n\nTotal routes: ${totalRoutes}\nSEO/indexable routes: ${seoIndexable}\nTotal prerendered routes: ${prerendered}\nCurrently SSR-rendered: ${currentlySsr}\nMissing SSR coverage: ${missingSsr.length}\nMeaningful SSR validation passes: ${meaningful}/${validation.length}\n\`\`\`\n\n## SSR modes\n\n- \`react-page\`: audited presentational React page rendered with \`renderToString\`.\n- \`seo-document\`: registry/meta driven semantic document rendered with \`renderToString\`, while interactive tool UI remains client-hydrated.\n\n## Routes missing SSR coverage\n\n${missingSsr.length ? missingSsr.map((p) => `- ${p}`).join('\n') : '- None'}\n`)

  fs.writeFileSync(path.join(REPORT_DIR, 'ssr-page-categories.md'), `# SSR Page Categories\n\nGenerated: ${new Date().toISOString()}\n\n## Summary\n\n- Category A — SSR ready: ${byCategory.A}\n- Category B — SSR compatible with small changes: ${byCategory.B}\n- Category C — client only / hydration only: ${byCategory.C}\n\n${(['A', 'B', 'C'] as const).map((category) => `## Category ${category}\n\n${pageAnalyses.filter((p) => p.category === category).map((p) => `### ${p.file}\n\n${p.reasons.map((r) => `- ${r}`).join('\n')}\n\nSignals: ${Object.entries(p.signals).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}\n`).join('\n') || '- None'}\n`).join('\n')}\n`)

  fs.writeFileSync(path.join(REPORT_DIR, 'ssr-architecture-plan.md'), `# SSR Architecture Plan\n\nGenerated: ${new Date().toISOString()}\n\n## Current architecture\n\nVideoText remains a Vite + React SPA. Build-time prerendering writes route-specific HTML files. The upgraded SSR helper now supports direct React SSR for audited presentational pages and a registry-driven static SEO document for programmatic landing pages.\n\n## Recommended scalable pattern\n\n1. Keep uploader, editor, auth, dashboard, analytics, and billing behavior client-only.\n2. Store durable SEO copy in registries/content objects rather than inside browser-heavy tool components.\n3. Render that content with reusable SSR-safe sections: hero, proof points, workflow steps, output examples, comparison tables, use cases, FAQs, and related links.\n4. Hydrate the SPA normally on the client; the server-rendered HTML is an SEO-rich shell that matches the page intent without executing browser APIs in Node.\n5. Promote pages from Category B to direct React SSR only after browser APIs are guarded and lazy/client-only boundaries are explicit.\n\n## Migration sequence\n\n- Phase 1: Use \`seo-document\` mode for all registry SEO pages and high-value money pages.\n- Phase 2: Refactor Category B pages by moving browser API reads into effects, adding \`typeof window !== 'undefined'\` guards, and isolating upload widgets behind client-only boundaries.\n- Phase 3: Add direct \`react-page\` registration only for presentational pages with successful render validation.\n- Phase 4: Keep build-time validation as a CI gate for indexable routes: render succeeds, HTML is large enough, and at least one H1 plus semantic sections exist.\n\n## Build-time verification gates\n\n- Route inventory must be written to \`reports/ssr-routes.json\`.\n- Render validation must be written to \`reports/ssr-render-validation.json\`.\n- Important SEO pages should not be accepted if they render only metadata, an injected H1, or an empty root.\n`)

  const afterCoverage = seoIndexable ? Math.round(((seoIndexable - missingSsr.length) / seoIndexable) * 1000) / 10 : 0
  fs.writeFileSync(path.join(REPORT_DIR, 'final-ssr-status.md'), `# Final SSR Status\n\nGenerated: ${new Date().toISOString()}\n\n## Before vs after\n\n- Before: 7 comparison pages were direct React SSR; most SEO pages received metadata, JSON-LD, crawler links, and minimal injected copy.\n- After: ${currentlySsr} total routes have SSR coverage through direct \`react-page\` rendering or registry-driven \`seo-document\` rendering.\n- SEO/indexable coverage: ${afterCoverage}% (${seoIndexable - missingSsr.length}/${seoIndexable}).\n- Render validation meaningful outputs: ${meaningful}/${validation.length}.\n\n## Routes fixed\n\n${routes.filter((r) => r.ssrCovered).map((r) => `- ${r.path} (${r.ssrMode})`).join('\n')}\n\n## Intentionally client-only\n\nCategory C pages and components remain client-only when they include uploader/editor/auth/dashboard/share/feedback logic or browser-heavy libraries. See \`reports/ssr-page-categories.md\` for exact reasons by file.\n\n## Remaining gaps\n\n${missingSsr.length ? missingSsr.map((p) => `- ${p}`).join('\n') : '- None for indexable routes in the current registry/sitemap inventory.'}\n`)

  console.log(`SSR COVERAGE REPORT\n\nTotal routes: ${totalRoutes}\nSEO/indexable routes: ${seoIndexable}\nCurrently SSR-rendered: ${currentlySsr}\nMissing SSR coverage: ${missingSsr.length}`)
}

writeReports()
