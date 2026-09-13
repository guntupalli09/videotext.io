/**
 * Production endpoints for the Fix SRT Chrome extension.
 * API origin matches the website client (VITE_API_URL / README).
 * Shipped builds must keep the production API origin above.
 */
export const SITE_ORIGIN = 'https://videotext.io'
export const API_ORIGIN = 'https://api.videotext.io'
export const TOOL_TYPE = 'fix-subtitles'
export const POLL_INTERVAL_MS = 1500
export const POLL_MAX_MS = 10 * 60 * 1000
export const POLL_NETWORK_FAIL_LIMIT = 8
export const MAX_SRT_BYTES = 10 * 1024 * 1024
export const LARGE_SRT_WARN_BYTES = 2 * 1024 * 1024
export const PRICING_URL = `${SITE_ORIGIN}/pricing`
export const LOGIN_URL = `${SITE_ORIGIN}/login`
export const SIGNUP_URL = `${SITE_ORIGIN}/login`
export const FIX_SRT_WEB_URL = `${SITE_ORIGIN}/fix-subtitles`
export const PRIVACY_URL = `${SITE_ORIGIN}/privacy`
export const SUPPORT_URL = SITE_ORIGIN
export const EXTENSION_VERSION = '1.0.0'
