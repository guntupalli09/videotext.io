/**
 * Helpers for assertions against JSON-LD in HTML (not bundled JS strings).
 */

/** Count separate FAQPage objects inside application/ld+json script tags. */
export function countFaqPageInJsonLdScripts(html: string): number {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let n = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (/"@type"\s*:\s*"FAQPage"/.test(m[1])) n++
  }
  return n
}

/** Count BreadcrumbList objects inside application/ld+json script tags. */
export function countBreadcrumbListInJsonLdScripts(html: string): number {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let n = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (/"@type"\s*:\s*"BreadcrumbList"/.test(m[1])) n++
  }
  return n
}

function parseJsonLdScriptPayload(block: string): unknown | null {
  const json = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim()
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function jsonLdBlockType(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const type = (data as { '@type'?: unknown })['@type']
  return typeof type === 'string' ? type : null
}

/** Remove top-level SoftwareApplication JSON-LD so each URL can emit at most one. */
export function stripTopLevelSoftwareApplicationScripts(html: string): string {
  return html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, (block) => {
    const data = parseJsonLdScriptPayload(block)
    if (jsonLdBlockType(data) === 'SoftwareApplication') return ''
    if (Array.isArray(data)) {
      const rest = data.filter((item) => jsonLdBlockType(item) !== 'SoftwareApplication')
      if (!rest.length) return ''
      if (rest.length !== data.length) {
        return `<script type="application/ld+json">${JSON.stringify(rest)}</script>`
      }
    }
    return block
  })
}

export function countTopLevelSoftwareApplication(html: string): number {
  let count = 0
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const data = parseJsonLdScriptPayload(match[0])
    if (jsonLdBlockType(data) === 'SoftwareApplication') count += 1
    else if (Array.isArray(data)) {
      count += data.filter((item) => jsonLdBlockType(item) === 'SoftwareApplication').length
    }
  }
  return count
}

export function countTopLevelHowTo(html: string): number {
  let count = 0
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const data = parseJsonLdScriptPayload(match[0])
    if (jsonLdBlockType(data) === 'HowTo') count += 1
    else if (Array.isArray(data)) {
      count += data.filter((item) => jsonLdBlockType(item) === 'HowTo').length
    }
  }
  return count
}
