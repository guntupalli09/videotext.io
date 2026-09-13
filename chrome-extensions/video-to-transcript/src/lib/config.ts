/**
 * Production configuration for the VideoText Chrome extension.
 *
 * These are the real production origins used by the web app — see
 * client/.env.example (VITE_API_URL / VITE_SITE_URL). They are compile-time
 * constants on purpose: an extension has no environment variables, and a
 * configurable backend URL in a shipped extension is an exfiltration risk a
 * Chrome Web Store reviewer is right to flag.
 *
 * There are no secrets here and there must never be: the extension
 * authenticates with the signed-in user's own bearer token and nothing else.
 */

/** VideoText API origin. All request paths start with /api/ (same contract as client/src/lib/apiBase.ts). */
export const API_ORIGIN = 'https://api.videotext.io'

/** Canonical VideoText website. */
export const SITE_ORIGIN = 'https://videotext.io'

/** Backend toolType for this extension's single purpose. Must match BACKEND_TOOL_TYPES in client/src/lib/api.ts. */
export const TOOL_TYPE = 'video-to-transcript'

export const URLS = {
  site: SITE_ORIGIN,
  videoToTranscript: `${SITE_ORIGIN}/video-to-transcript`,
  /** Sign-in handoff page — client/src/pages/ExtensionAuth.tsx. */
  extensionAuth: `${SITE_ORIGIN}/extension-auth`,
  pricing: `${SITE_ORIGIN}/pricing`,
  privacy: `${SITE_ORIGIN}/privacy`,
  terms: `${SITE_ORIGIN}/terms`,
} as const

/** chrome.storage.local keys. */
export const STORAGE_KEYS = {
  /** VideoText session JWT, handed over by the /extension-auth page. */
  authToken: 'videotext:authToken',
  plan: 'videotext:plan',
  email: 'videotext:email',
  /** In-flight or last-finished job, so reopening the popup resumes it. */
  activeJob: 'videotext:activeJob',
} as const

/** Job polling interval. Mirrors JOB_POLL_INTERVAL_MS in client/src/lib/jobPolling.ts. */
export const JOB_POLL_INTERVAL_MS = 1500

/** Consecutive network failures tolerated while polling. Mirrors client/src/lib/api.ts. */
export const POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS = 5

/** Above this size the upload switches to the chunked endpoints. Mirrors CHUNK_THRESHOLD in client/src/lib/api.ts. */
export const CHUNK_THRESHOLD_BYTES = 15 * 1024 * 1024

/** Chunk size for chunked uploads. Server accepts up to 10 MB per chunk (server/src/index.ts express.raw limit). */
export const CHUNK_SIZE_BYTES = 8 * 1024 * 1024

/** Server-side cap on totalChunks — MAX_CHUNKS in server/src/routes/upload.ts. */
export const MAX_CHUNKS = 2000

/** Message contract with client/src/pages/ExtensionAuth.tsx. */
export const EXTENSION_AUTH_MESSAGE_SOURCE = 'videotext-extension-auth'
