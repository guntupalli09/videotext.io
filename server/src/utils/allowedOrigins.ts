/**
 * Centralized origin allowlist used by:
 *   1. CORS middleware in index.ts
 *   2. Checkout route in billing.ts to validate frontendOrigin (prevents open-redirect attacks)
 *
 * Rules:
 *   - Production: exact origins from the hardcoded set + CORS_ORIGINS env var.
 *   - All environments: any https://*.vercel.app preview deployment is allowed.
 *   - Development: any localhost / 127.0.0.1 / [::1] origin is allowed regardless of port.
 *   - Chrome extensions: only the exact chrome-extension:// origins listed in
 *     EXTENSION_ORIGINS. Never a wildcard — an unset variable allows none.
 */

const PRODUCTION_ORIGINS = new Set<string>([
  'https://videotext.io',
  'https://www.videotext.io',
  'https://us.posthog.com',
])

// Operator-supplied additional origins (comma-separated).
// e.g. CORS_ORIGINS=https://staging.videotext.io
const envOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)
envOrigins.forEach((o) => PRODUCTION_ORIGINS.add(o))

if (process.env.NODE_ENV !== 'production') {
  PRODUCTION_ORIGINS.add('http://localhost:3000')
  PRODUCTION_ORIGINS.add('http://localhost:3001')
  PRODUCTION_ORIGINS.add('http://127.0.0.1:3000')
}

/**
 * Chrome extension origins allowed to call the API (comma-separated), e.g.
 *   EXTENSION_ORIGINS=chrome-extension://abcdefghijklmnopabcdefghijklmnop
 *
 * Used by the "Video to Transcript — VideoText" MV3 extension in
 * chrome-extensions/video-to-transcript, whose popup/service worker send
 * Origin: chrome-extension://<id>. Only exact, well-formed ids are accepted;
 * there is deliberately no wildcard, so an unset variable allows nothing and
 * a typo fails closed rather than opening the API to every extension.
 */
const EXTENSION_ID_PATTERN = /^chrome-extension:\/\/[a-p]{32}$/

/** Parse EXTENSION_ORIGINS, dropping anything that is not an exact, well-formed extension origin. */
export function parseExtensionOrigins(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter((o) => EXTENSION_ID_PATTERN.test(o))
  )
}

// Parsed once per distinct value of the variable. The cache key is the raw
// string, so the set is computed at most once in a running server (the value
// never changes) while tests can still exercise different configurations.
let extensionOriginsCache: { raw: string | undefined; set: Set<string> } | null = null

function getExtensionOrigins(): Set<string> {
  const raw = process.env.EXTENSION_ORIGINS
  if (!extensionOriginsCache || extensionOriginsCache.raw !== raw) {
    extensionOriginsCache = { raw, set: parseExtensionOrigins(raw) }
  }
  return extensionOriginsCache.set
}

/** True when the origin is an explicitly configured Chrome extension origin. */
export function isAllowedExtensionOrigin(origin: string): boolean {
  return getExtensionOrigins().has(origin)
}

export function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, '')
}


function isVercelPreview(origin: string): boolean {
  try {
    const parsed = new URL(origin)
    const host = parsed.hostname.toLowerCase()
    return parsed.protocol === 'https:' && host.endsWith('.vercel.app')
  } catch {
    return false
  }
}

function isLocalhost(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    const h = hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
  } catch {
    return false
  }
}

/**
 * Returns true when the origin is allowed.
 * No Origin header (curl / server-to-server) is always permitted.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true
  const norm = normalizeOrigin(origin)
  if (PRODUCTION_ORIGINS.has(norm)) return true
  if (isAllowedExtensionOrigin(norm)) return true
  if (isVercelPreview(norm)) return true
  // In dev allow any localhost port; in production this branch is never reached.
  if (process.env.NODE_ENV !== 'production' && isLocalhost(norm)) return true
  return false
}

/**
 * Allowlist for origins a browser can be *redirected to* (e.g. the Stripe
 * success/cancel URL in routes/billing.ts). Same set as isAllowedOrigin minus
 * chrome-extension:// origins: an extension may call the API, but must never
 * become a redirect target for a URL that carries a checkout session id.
 */
export function isAllowedRedirectOrigin(origin?: string): boolean {
  if (!origin) return false
  const norm = normalizeOrigin(origin)
  if (isAllowedExtensionOrigin(norm)) return false
  return isAllowedOrigin(norm)
}
