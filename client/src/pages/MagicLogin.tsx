import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Handles magic login links sent via daily email.
 * URL format: /magic-login?token=xxx&next=/video-to-transcript
 *
 * Exchanges the one-time token for a JWT, saves it to localStorage (same as
 * regular login), then redirects to `next` (default: /video-to-transcript).
 */
export default function MagicLogin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const next = searchParams.get('next') || '/video-to-transcript'

    if (!token) {
      setError('Invalid magic link — no token provided.')
      return
    }

    const base = (import.meta as any).env?.VITE_API_URL || ''
    fetch(`${base}/api/auth/magic-login?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Invalid or expired link.')
        // Save auth the same way regular login does
        if (data.token) localStorage.setItem('auth_token', data.token)
        if (data.plan)  localStorage.setItem('plan', data.plan)
        if (data.userId) localStorage.setItem('user_id', data.userId)
        navigate(next, { replace: true })
      })
      .catch((e: any) => {
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
