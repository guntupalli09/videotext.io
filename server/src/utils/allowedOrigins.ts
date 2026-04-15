/**
 * Centralized origin allowlist used by:
 *   1. CORS middleware in index.ts
 *   2. Checkout route in billing.ts to validate frontendOrigin (prevents open-redirect attacks)
 *
 * Rules:
 *   - Production: only exact origins from the hardcoded set + CORS_ORIGINS env var.
 *     The *.vercel.app wildcard is intentionally REMOVED — any preview URL must be
 *     explicitly listed in CORS_ORIGINS. That is a one-time setup, not ongoing toil.
 *   - Development: any localhost / 127.0.0.1 / [::1] origin is allowed regardless of port.
 */

const PRODUCTION_ORIGINS = new Set<string>([
  'https://videotext.io',
  'https://www.videotext.io',
])

// Operator-supplied additional origins (comma-separated). Add preview URLs here.
// e.g. CORS_ORIGINS=https://myapp-git-branch.vercel.app,https://staging.videotext.io
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

export function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, '')
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
  // In dev allow any localhost port; in production this branch is never reached.
  if (process.env.NODE_ENV !== 'production' && isLocalhost(norm)) return true
  return false
}
