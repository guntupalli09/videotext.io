import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { trackEvent, identifyUser } from '../lib/analytics'
import { storeLoginResult } from '../lib/auth'

/**
 * Handles magic login links sent via email (welcome, activation, re-engagement).
 * URL format: /magic-login?token=xxx&next=/video-to-transcript
 *
 * Exchanges the one-time server token for a JWT, saves it via storeLoginResult
 * (identical to regular login), then redirects to `next`.
 */
export default function MagicLogin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const next = searchParams.get('next') || '/video-to-transcript'
    const notice = searchParams.get('notice')

    if (notice === 'link-expired' || !token) {
      setError('This link has expired. Please log in.')
      return
    }

    const base = (import.meta as any).env?.VITE_API_URL || ''
    fetch(`${base}/api/auth/magic-login?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Invalid or expired link.')
        storeLoginResult({
          token: data.token,
          userId: data.userId,
          plan: data.plan,
          email: data.email || '',
        })
        try {
          if (data.userId) identifyUser(data.userId, { plan: data.plan })
          trackEvent('magic_login_completed', { plan: data.plan })
        } catch { /* non-blocking */ }
        navigate(next, { replace: true })
        window.location.reload()
      })
      .catch((e: any) => {
        try { trackEvent('magic_login_failed', { error: e.message }) } catch { /* non-blocking */ }
        setError(e.message || 'Magic link failed.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-sm w-full text-center">
          <p className="text-2xl mb-3">🔗</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Link expired</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
          >
            Go to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Logging you in…</p>
      </div>
    </div>
  )
}
