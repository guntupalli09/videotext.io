/**
 * Reusable Google Sign-In button using Google Identity Services.
 * Loads the GSI script once per page, initializes with a credential callback,
 * and renders Google's standard button into a full-width container.
 */

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            options: {
              type?: string
              theme?: string
              size?: string
              text?: string
              width?: number
              logo_alignment?: string
            }
          ) => void
        }
      }
    }
  }
}

export const GOOGLE_CLIENT_ID =
  (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID ?? ''

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('gsi-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = 'gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

interface GoogleSignInButtonProps {
  /** Called with the raw Google ID token credential string */
  onCredential: (credential: string) => void
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

export default function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
}: GoogleSignInButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null)
  // Use a ref so the callback is always fresh without re-initializing GSI
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false
    loadGsiScript()
      .then(() => {
        if (cancelled || !btnRef.current || !window.google?.accounts) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential)
          },
        })
        window.google.accounts.id.renderButton(btnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          width: btnRef.current.offsetWidth || 400,
          logo_alignment: 'center',
        })
      })
      .catch(() => {
        /* GSI script failed to load — button silently disappears */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div
      ref={btnRef}
      className="w-full overflow-hidden rounded-xl"
      style={{ minHeight: 44 }}
    />
  )
}
