import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

type Status = 'loading' | 'success' | 'invalid' | 'error'

export default function Unsubscribe() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    if (!email || !token) {
      setStatus('invalid')
      return
    }

    const controller = new AbortController()

    api('/api/newsletter/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success')
        } else {
          const data = await res.json().catch(() => ({}))
          setStatus(data?.message === 'Invalid unsubscribe link.' ? 'invalid' : 'error')
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setStatus('error')
      })

    return () => controller.abort()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4" role="status" aria-label="Unsubscribing" />
            <p className="text-gray-600 dark:text-gray-300">Unsubscribing…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-medium text-gray-900 dark:text-white">You've been unsubscribed</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You won't receive further newsletter emails from VideoText.io.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to VideoText
            </Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <h1 className="text-xl font-medium text-gray-900 dark:text-white">Invalid unsubscribe link</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This link may be expired or malformed. Please use the unsubscribe link from a recent email.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to VideoText
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-medium text-gray-900 dark:text-white">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              We couldn't process your unsubscribe request. Please try again or reply to any newsletter email to be removed.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to VideoText
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
