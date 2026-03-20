import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDemoToken } from '../lib/api'
import { storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'

/**
 * Zero-friction demo login page.
 * Visiting /demo instantly logs the user into the shared pro demo account
 * and redirects to the main transcription tool.
 */
export default function Demo() {
  const navigate = useNavigate()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    getDemoToken()
      .then((result) => {
        storeLoginResult(result)
        try {
          identifyUser(result.userId, { plan: result.plan, email: result.email, demo: true })
        } catch {
          // non-blocking
        }
        navigate('/video-to-transcript', { replace: true })
        window.location.reload()
      })
      .catch(() => {
        // Fall back to login page on any error
        navigate('/login', { replace: true })
      })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 mx-auto border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Setting up your demo…</p>
      </div>
    </div>
  )
}
