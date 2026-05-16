import * as fs from 'fs'
import * as path from 'path'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const REPORT_DIR = path.join(REPO_ROOT, 'reports')

const AFFECTED_ROUTES = [
  '/accuracy-test',
  '/ai-transcription-tools',
  '/ai-transcription-workflow',
  '/fastest-transcription-software',
  '/free-captions-and-subtitles',
  '/google-meet-transcription',
  '/subtitle-character-checker',
  '/subtitle-reading-speed',
  '/subtitle-validator',
  '/subtitle-word-counter',
  '/teams-meeting-transcription',
  '/transcription-benchmark',
  '/translation',
  '/voice-recorder',
]

interface RouteValidation {
  route: string
  htmlPath: string
  exists: boolean
  htmlSize: number
  title: string
  h1: string
  paragraphCount: number
  h2Count: number
  wordCount: number
  visibleTextLength: number
  semanticRichnessScore: number
  emptySpaShell: boolean
  status: 'pass' | 'fail'
  issues: string[]
}

function htmlPathForRoute(route: string): string {
  return route === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, route.slice(1), 'index.html')
}

function stripScriptsAndStyles(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
}

function stripTags(html: string): string {
  return stripScriptsAndStyles(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function textOfFirst(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? stripTags(match[1]) : ''
}

function countMatches(html: string, pattern: RegExp): number {
  return [...html.matchAll(pattern)].length
}

function wordCount(text: string): number {
  return (text.toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)?/g) || []).length
}

function richnessScore(input: { title: string; h1: string; paragraphCount: number; h2Count: number; wordCount: number; visibleTextLength: number; emptySpaShell: boolean }): number {
  let score = 0
  if (input.title) score += 15
  if (input.h1) score += 15
  score += Math.min(20, input.h2Count * 5)
  score += Math.min(20, input.paragraphCount * 4)
  score += Math.min(20, Math.floor(input.wordCount / 25))
  if (!input.emptySpaShell) score += 10
  if (input.visibleTextLength >= 1200) score += 10
  return Math.min(100, score)
}

function validate(route: string): RouteValidation {
  const htmlPath = htmlPathForRoute(route)
  if (!fs.existsSync(htmlPath)) {
    return {
      route,
      htmlPath: path.relative(REPO_ROOT, htmlPath),
      exists: false,
      htmlSize: 0,
      title: '',
      h1: '',
      paragraphCount: 0,
      h2Count: 0,
      wordCount: 0,
      visibleTextLength: 0,
      semanticRichnessScore: 0,
      emptySpaShell: true,
      status: 'fail',
      issues: ['Missing local prerendered HTML in /dist'],
    }
  }

  const html = fs.readFileSync(htmlPath, 'utf8')
  const rootMatch = html.match(/<div\s+id=["']root["'][^>]*>([\s\S]*?)<\/div>/i)
  const emptySpaShell = rootMatch ? stripTags(rootMatch[1]).length === 0 : true
  const visible = stripTags(html)
  const title = textOfFirst(html, 'title')
  const h1 = textOfFirst(html, 'h1')
  const paragraphCount = countMatches(html, /<p\b[^>]*>[\s\S]*?<\/p>/gi)
  const h2Count = countMatches(html, /<h2\b[^>]*>[\s\S]*?<\/h2>/gi)
  const words = wordCount(visible)
  const score = richnessScore({ title, h1, paragraphCount, h2Count, wordCount: words, visibleTextLength: visible.length, emptySpaShell })
  const issues: string[] = []
  if (!title) issues.push('Missing title')
  if (!h1) issues.push('Missing H1')
  if (paragraphCount < 3) issues.push(`Only ${paragraphCount} paragraphs`)
  if (h2Count < 3) issues.push(`Only ${h2Count} H2s`)
  if (emptySpaShell && h2Count < 3) issues.push('Output is effectively an empty SPA shell')

  return {
    route,
    htmlPath: path.relative(REPO_ROOT, htmlPath),
    exists: true,
    htmlSize: Buffer.byteLength(html, 'utf8'),
    title,
    h1,
    paragraphCount,
    h2Count,
    wordCount: words,
    visibleTextLength: visible.length,
    semanticRichnessScore: score,
    emptySpaShell,
    status: issues.length ? 'fail' : 'pass',
    issues,
  }
}

function table(headers: string[], rows: string[][]): string {
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${row.join(' | ')} |`).join('\n')}`
}

function main(): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const results = AFFECTED_ROUTES.map(validate)
  const failures = results.filter((result) => result.status === 'fail')
  const generatedAt = new Date().toISOString()
  const contentAuditPath = path.join(REPORT_DIR, 'content-audit.json')
  let contentAuditSummary = '- Semantic content audit was not available when this report was generated.'
  if (fs.existsSync(contentAuditPath)) {
    const audit = JSON.parse(fs.readFileSync(contentAuditPath, 'utf8')) as { summary?: { missingLocalHtml?: number; thinContentClassifications?: { critical?: number; high?: number; moderate?: number; healthy?: number } } }
    const classifications = audit.summary?.thinContentClassifications
    contentAuditSummary = `- Current semantic content audit missing local HTML: ${audit.summary?.missingLocalHtml ?? 'unknown'}.\n- Current thin-content audit critical-risk pages: ${classifications?.critical ?? 'unknown'}.\n- Current thin-content audit high-risk pages: ${classifications?.high ?? 'unknown'}.`
  }

  const validation = `# Prerender Validation — Fixed Routes\n\nGenerated: ${generatedAt}\n\n${table(['Route', 'HTML path', 'HTML size', 'Paragraphs', 'H2s', 'Words', 'Richness', 'Status', 'Issues'], results.map((result) => [
    result.route,
    result.htmlPath,
    String(result.htmlSize),
    String(result.paragraphCount),
    String(result.h2Count),
    String(result.wordCount),
    String(result.semanticRichnessScore),
    result.status.toUpperCase(),
    result.issues.join('; ') || '—',
  ]))}\n`

  const summary = `# Prerender Gap Resolution Summary\n\nGenerated: ${generatedAt}\n\n## Routes fixed\n\n${results.map((result) => `- ${result.route} — ${result.status === 'pass' ? 'generated semantic HTML' : `still failing: ${result.issues.join('; ')}`}`).join('\n')}\n\n## Before vs after audit results\n\n- Before: 14 routes were flagged as \`CRITICAL THIN-CONTENT RISK\` because local prerendered HTML was missing in \`/dist\`.\n- After: ${results.length - failures.length}/${results.length} affected routes have local HTML with title, H1, paragraphs, H2 sections, and non-empty semantic content.\n- Missing HTML warnings remaining for affected routes: ${results.filter((result) => !result.exists).length}.\n${contentAuditSummary}\n\n## Remaining failures\n\n${failures.length ? failures.map((result) => `- ${result.route}: ${result.issues.join('; ')}`).join('\n') : '_None for the originally affected routes._'}\n`

  fs.writeFileSync(path.join(REPORT_DIR, 'prerender-validation-fixed.md'), validation, 'utf8')
  fs.writeFileSync(path.join(REPORT_DIR, 'prerender-gap-resolution-summary.md'), summary, 'utf8')

  if (failures.length) {
    console.error(`[validate-prerender-gaps] ${failures.length} affected routes still fail prerender validation.`)
    process.exit(1)
  }
  console.log(`[validate-prerender-gaps] ${results.length} affected routes passed prerender validation.`)
}

main()
