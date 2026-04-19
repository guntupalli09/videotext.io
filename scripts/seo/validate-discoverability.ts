#!/usr/bin/env node
import * as path from 'path'
import * as fs from 'fs'
import { getIndexablePaths } from './registry'
import { getCanonicalPathForRoute } from '../../client/src/lib/primaryUrls'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const MAX_DEPTH = 3

function normalizePath(p: string): string {
  if (!p || p === '') return '/'
  const noHash = p.split('#')[0].split('?')[0]
  if (!noHash.startsWith('/')) return `/${noHash}`
  return noHash === '' ? '/' : noHash
}

function htmlPathForRoute(routePath: string): string {
  return routePath === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, routePath.slice(1), 'index.html')
}

function collectLinksFromHtml(content: string): string[] {
  const hrefRe = /href="(\/[^"#?]*)"/g
  const links: string[] = []
  let match: RegExpExecArray | null
  while ((match = hrefRe.exec(content)) !== null) {
    links.push(getCanonicalPathForRoute(normalizePath(match[1])))
  }
  return links.filter(Boolean)
}

function bfsDepth(graph: Map<string, Set<string>>, start: string): Map<string, number> {
  const depth = new Map<string, number>()
  const queue: string[] = [start]
  depth.set(start, 0)

  while (queue.length) {
    const current = queue.shift()!
    const currentDepth = depth.get(current) || 0
    const neighbors = graph.get(current) || new Set<string>()
    for (const n of neighbors) {
      if (!depth.has(n)) {
        depth.set(n, currentDepth + 1)
        queue.push(n)
      }
    }
  }
  return depth
}

function main(): void {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('[validate-discoverability] dist/ not found. Run npm run build first.')
    process.exit(1)
  }

  const indexable = [...new Set(getIndexablePaths().map((p) => getCanonicalPathForRoute(p)))]
  const graph = new Map<string, Set<string>>()
  const incoming = new Map<string, number>()

  let failed = false

  for (const routePath of indexable) {
    const htmlFile = htmlPathForRoute(routePath)
    if (!fs.existsSync(htmlFile)) {
      console.error('[validate-discoverability] Missing prerendered HTML:', routePath)
      failed = true
      continue
    }
    const content = fs.readFileSync(htmlFile, 'utf8')
    const out = collectLinksFromHtml(content)
    const outSet = new Set(out)
    graph.set(routePath, outSet)
    for (const link of outSet) {
      incoming.set(link, (incoming.get(link) || 0) + 1)
    }
  }

  const depth = bfsDepth(graph, '/')

  for (const routePath of indexable) {
    const inlinks = incoming.get(routePath) || 0
    if (routePath !== '/' && inlinks === 0) {
      console.error('[validate-discoverability] Orphan page detected (0 internal inlinks):', routePath)
      failed = true
    }

    if (!depth.has(routePath)) {
      console.error('[validate-discoverability] Unreachable from home page:', routePath)
      failed = true
      continue
    }

    const d = depth.get(routePath) || 0
    if (d > MAX_DEPTH) {
      console.error(`[validate-discoverability] Crawl depth > ${MAX_DEPTH}:`, routePath, 'depth=', d)
      failed = true
    }
  }

  if (failed) process.exit(1)

  console.log('[validate-discoverability] OK — pages:', indexable.length, 'maxDepth:', Math.max(...Array.from(depth.values())))
}

main()
