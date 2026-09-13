/**
 * Sign-in handoff for the "Video to Transcript — VideoText" Chrome extension
 * (chrome-extensions/video-to-transcript).
 *
 * VideoText auth is a bearer JWT in localStorage (see lib/auth.ts), not a cookie
 * session, so an extension cannot inherit the signed-in state ambiently. This page
 * is the one and only place where the existing session token is handed over:
 *
 *   - Not signed in  → redirect to /login?returnTo=/extension-auth.
 *   - Signed in      → postMessage the token to this window; the extension's
 *                      content script (matched ONLY on /extension-auth) relays it
 *                      to the extension's service worker, which stores it.
 *
 * No new account system, no new token type, no server call: the extension ends up
 * holding exactly the same credential the website already issued to this user, and
 * therefore exactly the same entitlements and limits.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { getAuthToken } from '../lib/api'

/** Message contract shared with chrome-extensions/video-to-transcript/src/content-auth.ts. */
export const EXTENSION_AUTH_MESSAGE_SOURCE = 'videotext-extension-auth'

type HandoffState = 'checking' | 'sent'

export default function ExtensionAuth() {
  const navigate = useNavigate()
  const [state, setState] = useState<HandoffState>('checking')

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login?returnTo=/extension-auth', { replace: true })
      return
    }

    // Same-window postMessage. targetOrigin is this exact origin, so the token is
    // never broadcast to an embedder or another frame.
    window.postMessage(
      {
        source: EXTENSION_AUTH_MESSAGE_SOURCE,
        token,
        plan: localStorage.getItem('plan') ?? 'free',
        email: localStorage.getItem('userEmail') ?? undefined,
      },
      window.location.origin
    )
    setState('sent')
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50 py-16 dark:bg-gray-900">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {state === 'checking' ? (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" aria-hidden />
              <h1 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">
                Connecting your extension…
              </h1>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden />
              <h1 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">
                Extension connected
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                You can close this tab and go back to the VideoText extension.
              </p>
            </>
          )}

          <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            This page only shares your existing VideoText session with the VideoText Chrome
            extension. Your plan and limits are unchanged.
          </p>

          <Link
            to="/video-to-transcript"
            className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Open Video to Transcript on the web →
          </Link>
        </div>
      </div>
    </div>
  )
}
