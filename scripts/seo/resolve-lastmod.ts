/**
 * Resolve sitemap lastmod from git history of content-bearing source files.
 * Avoids stamping every URL with build time — Google ignores uniform lastmod.
 */
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const APP_TSX = path.join(REPO_ROOT, 'client', 'src', 'App.tsx')
const CONTENT_BLOG_DIR = path.join(REPO_ROOT, 'content', 'blog')

const SHARED_CONTENT_FILES = [
  'client/src/lib/seoRegistry.ts',
  'client/src/lib/seoMeta.ts',
  'client/src/lib/pageGscSeoDepth.ts',
  'client/src/lib/coreToolSeoDepth.ts',
  'client/src/lib/routeFamilyTemplates.ts',
  'client/src/lib/seoJourneyConfig.ts',
  'client/src/lib/generateSeoPages.ts',
  'client/src/lib/slugToPrimary.ts',
  'client/src/data/seoPages.ts',
  'vercel.json',
  'scripts/prerender.ts',
  'client/src/pages/SeoToolPage.tsx',
]

const pickaxeCache = new Map<string, string | null>()
let fileLastmodMap: Map<string, string> | null = null
let routeComponentFiles: Map<string, string> | null = null
let pathsInFile: Map<string, Set<string>> | null = null

function runGit(args: string): string | null {
  try {
    return execSync(`git ${args}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

function normalizeDate(isoOrDate: string): string {
  return isoOrDate.slice(0, 10)
}

function maxDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter((d): d is string => Boolean(d))
  if (valid.length === 0) return null
  return valid.sort().at(-1) ?? null
}

/** One git walk: latest commit date per tracked file under content paths. */
function loadFileLastmodMap(): Map<string, string> {
  if (fileLastmodMap) return fileLastmodMap
  fileLastmodMap = new Map()

  const log = runGit(
    'log --format=COMMIT:%cs --name-only -- client/src content/blog scripts/prerender.ts vercel.json',
  )
  if (!log) return fileLastmodMap

  let currentDate: string | null = null
  for (const line of log.split('\n')) {
    if (line.startsWith('COMMIT:')) {
      currentDate = line.slice('COMMIT:'.length)
      continue
    }
    if (!line || !currentDate) continue
    if (!fileLastmodMap.has(line)) fileLastmodMap.set(line, currentDate)
  }

  return fileLastmodMap
}

function gitLastmodForFile(relativePath: string): string | null {
  return loadFileLastmodMap().get(relativePath) ?? null
}

function gitPickaxeLastmod(relativePath: string, needle: string): string | null {
  const key = `${relativePath}:${needle}`
  if (pickaxeCache.has(key)) return pickaxeCache.get(key) ?? null
  const escaped = needle.replace(/"/g, '\\"')
  const date = runGit(`log -1 --format=%cs -S"${escaped}" -- "${relativePath}"`)
  const normalized = date ? normalizeDate(date) : null
  pickaxeCache.set(key, normalized)
  return normalized
}

function loadPathsInSharedFiles(): Map<string, Set<string>> {
  if (pathsInFile) return pathsInFile
  pathsInFile = new Map()
  for (const file of SHARED_CONTENT_FILES) {
    const abs = path.join(REPO_ROOT, file)
    if (!fs.existsSync(abs)) continue
    const content = fs.readFileSync(abs, 'utf8')
    const paths = new Set<string>()
    for (const m of content.matchAll(/['"]\/(?:[^'"]+)['"]/g)) {
      const raw = m[0].slice(1, -1)
      if (raw.startsWith('/')) paths.add(raw)
    }
    pathsInFile.set(file, paths)
  }
  return pathsInFile
}

function pathMentionedInFile(canonicalPath: string, file: string): boolean {
  return loadPathsInSharedFiles().get(file)?.has(canonicalPath) ?? false
}

/** Parse App.tsx lazy imports + Route paths → component source file. */
function loadRouteComponentFiles(): Map<string, string> {
  if (routeComponentFiles) return routeComponentFiles
  routeComponentFiles = new Map()
  if (!fs.existsSync(APP_TSX)) return routeComponentFiles

  const content = fs.readFileSync(APP_TSX, 'utf8')
  const componentToFile = new Map<string, string>()

  for (const m of content.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"](\.\/[^'"]+)['"]\)/g)) {
    const relImport = m[2].replace(/^\.\//, 'client/src/')
    const candidates = [`${relImport}.tsx`, `${relImport}/index.tsx`]
    const file = candidates.find((c) => fs.existsSync(path.join(REPO_ROOT, c)))
    if (file) componentToFile.set(m[1], file)
  }

  for (const m of content.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g)) {
    const routePath = m[1]
    const component = m[2]
    if (component === 'Navigate' || component === 'SeoToolPage') continue
    const file = componentToFile.get(component)
    if (file) routeComponentFiles.set(routePath, file)
  }

  return routeComponentFiles
}

/** Needles scoped to avoid relatedSlugs / cross-page mentions false positives. */
function pickaxeNeedlesForFile(canonicalPath: string, file: string): string[] {
  if (canonicalPath === '/') {
    if (file.includes('seoRegistry')) return [`path: '/'`]
    if (file.includes('seoMeta') || file.includes('prerender')) return [`path: '/'`, `'/'`]
    return [`'/'`]
  }

  if (file.includes('seoRegistry') || file.includes('prerender')) {
    return [`path: '${canonicalPath}'`]
  }
  if (file.includes('seoMeta') || file.includes('pageGscSeoDepth') || file.includes('coreToolSeoDepth')) {
    return [`'${canonicalPath}':`]
  }
  if (file.includes('generateSeoPages')) {
    return [`'${canonicalPath}'`, `\`/${canonicalPath.slice(1)}\``]
  }
  return [`'${canonicalPath}'`]
}

function resolveSitePathLastmod(canonicalPath: string): string | null {
  const dates: Array<string | null> = []

  const componentFile = loadRouteComponentFiles().get(canonicalPath)
  if (componentFile) dates.push(gitLastmodForFile(componentFile))

  for (const file of SHARED_CONTENT_FILES) {
    if (!pathMentionedInFile(canonicalPath, file)) continue
    for (const needle of pickaxeNeedlesForFile(canonicalPath, file)) {
      dates.push(gitPickaxeLastmod(file, needle))
    }
  }

  return maxDate(dates)
}

function blogSlugFromPath(canonicalPath: string): string | null {
  if (!canonicalPath.startsWith('/blog/')) return null
  return canonicalPath.slice('/blog/'.length) || null
}

/** Blog posts: markdown source file git date (real editorial change). */
export function resolveBlogPathLastmod(canonicalPath: string): string | null {
  const slug = blogSlugFromPath(canonicalPath)
  if (!slug) return null
  const rel = path.join('content', 'blog', `${slug}.md`)
  if (!fs.existsSync(path.join(REPO_ROOT, rel))) return null
  return gitLastmodForFile(rel)
}

export function resolveLastmodForPath(canonicalPath: string): string | null {
  if (canonicalPath === '/blog') {
    const blogDates = fs.existsSync(CONTENT_BLOG_DIR)
      ? fs
          .readdirSync(CONTENT_BLOG_DIR)
          .filter((f) => f.endsWith('.md'))
          .map((f) => gitLastmodForFile(path.join('content', 'blog', f)))
      : []
    return maxDate([
      ...blogDates,
      gitLastmodForFile('client/src/components/BlogRoute.tsx'),
      gitPickaxeLastmod('client/src/lib/seoMeta.ts', "'/blog'"),
    ])
  }

  if (canonicalPath.startsWith('/blog/')) {
    return resolveBlogPathLastmod(canonicalPath)
  }

  return resolveSitePathLastmod(canonicalPath)
}

/** Max lastmod across URL paths (for sitemap index child lastmod). */
export function maxLastmodForPaths(paths: string[]): string | null {
  return maxDate(paths.map((p) => resolveLastmodForPath(p)))
}

const ZERO_SHA = '0000000000000000000000000000000000000000'

/** Oldest commit date in the deploy range (Vercel/GitHub), or HEAD / today. */
export function getDeploySinceDate(): string {
  if (process.env.INDEXNOW_SINCE) return normalizeDate(process.env.INDEXNOW_SINCE)

  const prev = process.env.VERCEL_GIT_PREVIOUS_SHA || process.env.GITHUB_EVENT_BEFORE
  const cur = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'HEAD'

  if (prev && prev !== ZERO_SHA) {
    const log = runGit(`log --format=%cs ${prev}..${cur}`)
    const dates = log?.split('\n').filter(Boolean) ?? []
    if (dates.length > 0) return dates.sort()[0]!
  }

  return normalizeDate(runGit('log -1 --format=%cs') ?? new Date().toISOString())
}

/** Paths whose git-resolved lastmod is on or after sinceDate (YYYY-MM-DD). */
export function getChangedPathsSince(sinceDate: string, paths: string[]): string[] {
  const since = normalizeDate(sinceDate)
  return paths.filter((p) => {
    const lastmod = resolveLastmodForPath(p)
    return Boolean(lastmod && lastmod >= since)
  })
}
