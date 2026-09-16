/**
 * Sign-in handoff relay.
 *
 * Matched on https://videotext.io/extension-auth ONLY (see manifest.json
 * content_scripts). Its whole job is to receive one message the VideoText
 * sign-in handoff page posts to itself (client/src/pages/ExtensionAuth.tsx) and
 * store the session token for the extension.
 *
 * It reads nothing else from the page, runs on no other page, and sends nothing
 * anywhere except chrome.storage.local. Content scripts cannot use ES modules,
 * so the two constants below are intentionally inlined rather than imported
 * from lib/config.ts.
 */
const MESSAGE_SOURCE = 'videotext-extension-auth'
const STORAGE_KEYS = {
  authToken: 'videotext:authToken',
  plan: 'videotext:plan',
  email: 'videotext:email',
}

interface HandoffMessage {
  source: string
  token?: unknown
  plan?: unknown
  email?: unknown
}

window.addEventListener('message', (event: MessageEvent) => {
  // Only this exact page, in this exact window, may hand over a token.
  if (event.source !== window) return
  if (event.origin !== window.location.origin) return

  const data = event.data as HandoffMessage | null
  if (!data || data.source !== MESSAGE_SOURCE) return
  if (typeof data.token !== 'string' || !data.token) return

  void chrome.storage.local.set({
    [STORAGE_KEYS.authToken]: data.token,
    [STORAGE_KEYS.plan]: typeof data.plan === 'string' ? data.plan : 'free',
    [STORAGE_KEYS.email]: typeof data.email === 'string' ? data.email : '',
  })
})
