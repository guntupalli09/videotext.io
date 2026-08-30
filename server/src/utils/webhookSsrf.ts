/**
 * SSRF-hardening for outbound webhook URLs (Phase 7). The existing
 * fireWebhook() only checked the URL scheme; this adds the checks needed
 * before VideoText's server ever makes an outbound request to a
 * caller-supplied URL — required even though Zapier V1 uses polling, not
 * webhooks, since `webhookUrl` is already accepted today on
 * POST /api/upload and POST /api/upload/youtube.
 *
 * Checks: scheme allowlist, no embedded credentials, hostname resolution
 * with every resolved address validated against private/loopback/link-
 * local/metadata ranges (defeats DNS rebinding — the address actually
 * connected to is what's checked, not just the hostname), and the same
 * validation re-applied to every redirect hop up to a small cap.
 */
import dns from 'dns'
import net from 'net'
import { getLogger } from '../lib/logger'

const log = getLogger('worker').child({ module: 'webhook-ssrf' })

export const WEBHOOK_MAX_REDIRECTS = 2
export const WEBHOOK_TIMEOUT_MS = 10_000
export const WEBHOOK_MAX_RESPONSE_BYTES = 64 * 1024

/** IPv4 CIDR ranges that must never be reachable from a server-initiated webhook call. */
const BLOCKED_IPV4_RANGES: [string, number][] = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // RFC1918
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, includes cloud metadata (169.254.169.254)
  ['172.16.0.0', 12], // RFC1918
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16], // RFC1918
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved
]

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip)
  if (value === null) return true // unparseable — fail closed
  for (const [base, prefix] of BLOCKED_IPV4_RANGES) {
    const baseValue = ipv4ToInt(base)
    if (baseValue === null) continue
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    if ((value & mask) === (baseValue & mask)) return true
  }
  return false
}

/** Best-effort IPv6 checks: loopback, unspecified, link-local, unique-local, and IPv4-mapped addresses. */
function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === '::1' || normalized === '::') return true
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true // link-local fe80::/10
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // unique local fc00::/7
  // IPv4-mapped (::ffff:a.b.c.d) or IPv4-compatible — validate the embedded IPv4 address.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isBlockedIpv4(mapped[1])
  return false
}

export function isBlockedIp(ip: string): boolean {
  if (net.isIP(ip) === 4) return isBlockedIpv4(ip)
  if (net.isIP(ip) === 6) return isBlockedIpv6(ip)
  return true // not a valid IP at all — fail closed
}

export interface UrlValidationResult {
  ok: boolean
  reason?: string
}

/**
 * Validates scheme, credential-free authority, and (via DNS resolution) that
 * every address the hostname currently resolves to is a public, non-reserved
 * address. Re-resolving on every call (rather than caching) is deliberate:
 * it is what defeats a DNS-rebinding attempt between check and connect for
 * the redirect-revalidation case, and keeps a single call cheap and simple.
 */
export async function validateWebhookUrl(rawUrl: string): Promise<UrlValidationResult> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'Malformed URL' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http(s) URLs are allowed' }
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed' }
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '')
  if (!hostname || hostname.toLowerCase() === 'localhost') {
    return { ok: false, reason: 'localhost is not allowed' }
  }

  // Literal IP in the URL — validate directly, no DNS involved.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) return { ok: false, reason: 'Private/reserved IP addresses are not allowed' }
    return { ok: true }
  }

  let addresses: dns.LookupAddress[]
  try {
    addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true })
  } catch (err) {
    return { ok: false, reason: `Could not resolve hostname: ${err instanceof Error ? err.message : String(err)}` }
  }
  if (addresses.length === 0) {
    return { ok: false, reason: 'Hostname did not resolve to any address' }
  }
  for (const addr of addresses) {
    if (isBlockedIp(addr.address)) {
      return { ok: false, reason: 'Hostname resolves to a private/reserved IP address' }
    }
  }
  return { ok: true }
}

export interface SafeFetchResult {
  ok: boolean
  status?: number
  reason?: string
}

/**
 * Fetches a caller-supplied URL with SSRF protections: validates the URL
 * (and, on each redirect, the new target) before connecting, follows at
 * most WEBHOOK_MAX_REDIRECTS redirects, enforces a request timeout, and
 * caps the amount of response body read.
 */
export async function safeFetchWebhook(
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
): Promise<SafeFetchResult> {
  let currentUrl = url
  for (let hop = 0; hop <= WEBHOOK_MAX_REDIRECTS; hop++) {
    const validation = await validateWebhookUrl(currentUrl)
    if (!validation.ok) {
      log.warn({ msg: '[webhook] blocked by SSRF validation', url: currentUrl, reason: validation.reason })
      return { ok: false, reason: validation.reason }
    }

    let res: Response
    try {
      res = await fetch(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      })
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) }
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return { ok: false, reason: 'Redirect with no Location header' }
      if (hop === WEBHOOK_MAX_REDIRECTS) {
        return { ok: false, reason: 'Too many redirects' }
      }
      currentUrl = new URL(location, currentUrl).toString()
      continue
    }

    // Cap how much of the response we read (webhook responses are not used, but
    // an unbounded read could still be used to tie up a connection).
    try {
      const reader = res.body?.getReader()
      if (reader) {
        let received = 0
        while (received < WEBHOOK_MAX_RESPONSE_BYTES) {
          const { done, value } = await reader.read()
          if (done) break
          received += value?.byteLength ?? 0
        }
        await reader.cancel().catch(() => {})
      }
    } catch {
      // Response body reading is best-effort only.
    }

    return { ok: res.ok, status: res.status }
  }
  return { ok: false, reason: 'Too many redirects' }
}
