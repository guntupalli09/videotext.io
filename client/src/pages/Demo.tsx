import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDemoToken } from '../lib/api'
import { storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'
import { Features } from '../components/figma/Features'

/**
 * Zero-friction Pro access login page.
 * Logs the visitor in instantly, then shows the full tool suite so they
 * can see everything available and pick where to start.
 */
export default function Demo() {
  const attempted = useRef(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    getDemoToken()
      .then((result) => {
        storeLoginResult(result)
        try {
          identifyUser(result.userId, { plan: result.plan, email: result.email })
        } catch {
          // non-blocking
        }
        setReady(true)
      })
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pro access is unavailable right now.</p>
          <Link to="/login" className="text-sm text-violet-600 hover:underline">Sign in instead</Link>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 mx-auto border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Setting up your Pro access…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Pro access context banner */}
      <div className="bg-violet-600 py-3 px-4 text-center">
        <p className="text-white text-sm font-semibold">
          You're in — full pro access, no sign-up needed. Pick any tool below and try it for free.
        </p>
      </div>

      {/* Full tool showcase — same design as the home page */}
      <Features />

      {/* Signup nudge */}
      <div className="text-center pb-12 -mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Want to keep your work?{' '}
          <Link to="/signup" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
            Create a free account →
          </Link>
        </p>
      </div>
    </div>
  )
}
