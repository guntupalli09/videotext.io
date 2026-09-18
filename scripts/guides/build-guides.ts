/**
 * Build step: content/guides/*.md → client/src/data/guides.json
 *
 * Markdown is converted to HTML here, at build time, so the client bundle never
 * ships a markdown parser and prerender can inline finished HTML.
 *
 * Run: npx tsx scripts/guides/build-guides.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { marked } from 'marked'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const GUIDES_DIR = path.join(REPO_ROOT, 'content', 'guides')
const DATA_DIR = path.join(REPO_ROOT, 'client', 'src', 'data')
const INDEX_PATH = path.join(DATA_DIR, 'guides-index.json')
const BODIES_DIR = path.join(DATA_DIR, 'guides')
const SITE_URL = 'https://videotext.io'

export interface GuideFrontmatter {
  slug: string
  title: string
  description: string
  date?: string
  image?: string
  source_path?: string
}

export interface GuideMeta extends GuideFrontmatter {
  readMinutes: number
  words: number
}

export interface Guide extends GuideMeta {
  html: string
}

/** Minimal frontmatter parser — the generated files use a flat `key: value` shape. */
function parseFrontmatter(raw: string, file: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) throw new Error(`${file}: missing frontmatter block`)
  const data: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/)
    if (!kv) continue
    let value = kv[2].trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
    data[kv[1]] = value
  }
  return { data, body: raw.slice(match[0].length) }
}

/**
 * Drop the leading H1: the page component renders the title itself, so keeping it
 * in the body would emit two H1s per page.
 */
function stripLeadingH1(body: string): string {
  return body.replace(/^\s*#\s+.*\n+/, '')
}

/** Internal links must stay relative so they do not force a full page reload. */
function relativizeInternalLinks(html: string): string {
  return html.replace(new RegExp(`href="${SITE_URL}(/[^"]*)"`, 'g'), 'href="$1"')
}

export function buildGuides(): Guide[] {
  if (!fs.existsSync(GUIDES_DIR)) {
    throw new Error(`content/guides not found at ${GUIDES_DIR}`)
  }
  const files = fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md')
    .sort()

  const guides: Guide[] = []
  const seen = new Set<string>()

  for (const file of files) {
    const raw = fs.readFileSync(path.join(GUIDES_DIR, file), 'utf8')
    const { data, body } = parseFrontmatter(raw, file)

    for (const required of ['slug', 'title', 'description'] as const) {
      if (!data[required]) throw new Error(`${file}: frontmatter is missing "${required}"`)
    }
    if (seen.has(data.slug)) throw new Error(`${file}: duplicate slug "${data.slug}"`)
    seen.add(data.slug)
    if (data.slug !== file.replace(/\.md$/, '')) {
      throw new Error(`${file}: slug "${data.slug}" does not match filename`)
    }

    const markdown = stripLeadingH1(body)
    const html = relativizeInternalLinks(marked.parse(markdown, { async: false }) as string)
    const words = markdown.split(/\s+/).filter(Boolean).length

    guides.push({
      slug: data.slug,
      title: data.title,
      description: data.description,
      date: data.date || undefined,
      image: data.image || undefined,
      source_path: data.source_path || undefined,
      html,
      words,
      readMinutes: Math.max(1, Math.round(words / 225)),
    })
  }

  return guides
}

/**
 * Metadata and article bodies are emitted separately, and one file per article:
 * the hub and every build-time consumer only need the small index, while a reader
 * downloads just the one body they asked for instead of all 90.
 */
function main(): void {
  const guides = buildGuides()

  fs.mkdirSync(BODIES_DIR, { recursive: true })
  for (const stale of fs.readdirSync(BODIES_DIR).filter((f) => f.endsWith('.json'))) {
    if (!guides.some((g) => `${g.slug}.json` === stale)) fs.rmSync(path.join(BODIES_DIR, stale))
  }

  const index: GuideMeta[] = guides.map(({ html, ...meta }) => {
    void html
    return meta
  })
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8')

  for (const guide of guides) {
    fs.writeFileSync(
      path.join(BODIES_DIR, `${guide.slug}.json`),
      JSON.stringify({ slug: guide.slug, html: guide.html }) + '\n',
      'utf8',
    )
  }

  const totalWords = guides.reduce((sum, g) => sum + g.words, 0)
  const indexKb = Math.round(fs.statSync(INDEX_PATH).size / 1024)
  console.log(
    `[guides] wrote ${guides.length} guides → data/guides-index.json (${indexKb} kB) + data/guides/*.json (${totalWords.toLocaleString()} words)`,
  )
}

if (require.main === module) main()
