import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDemoToken } from '../lib/api'
import { storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'

const TOOLS = [
  {
    path: '/video-to-transcript',
    name: 'Video → Transcript',
    description: 'Transcribe any video or audio file to accurate text with speaker labels.',
    emoji: '🎙️',
  },
  {
    path: '/video-to-subtitles',
    name: 'Video → Subtitles',
    description: 'Generate timed SRT/VTT subtitle files from your video automatically.',
    emoji: '💬',
  },
  {
    path: '/translate-subtitles',
    name: 'Translate Subtitles',
    description: 'Translate an existing subtitle file into another language instantly.',
    emoji: '🌐',
  },
  {
    path: '/fix-subtitles',
    name: 'Fix Subtitles',
    description: 'Clean up timing, punctuation, and line breaks in any SRT file.',
    emoji: '✏️',
  },
  {
    path: '/burn-subtitles',
    name: 'Burn Subtitles',
    description: 'Hard-code subtitles directly into your video file.',
    emoji: '🔥',
  },
  {
    path: '/compress-video',
    name: 'Compress Video',
    description: 'Shrink video file size without visible quality loss.',
    emoji: '📦',
  },
  {
    path: '/batch-process',
    name: 'Batch Processing',
    description: 'Transcribe or subtitle multiple videos in a single job.',
    emoji: '⚡',
  },
]

/**
 * Zero-friction demo login page.
 * Logs the visitor in instantly, then shows all available tools so they can
 * pick where to start — no signup required.
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Demo unavailable right now.</p>
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Setting up your demo…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">You're in — pick a tool</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">Full pro access. No sign-up needed. Try anything.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              className="group flex items-start gap-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition-all duration-150"
            >
              <span className="text-3xl shrink-0">{tool.emoji}</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {tool.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          Want to keep your work?{' '}
          <Link to="/signup" className="text-violet-600 dark:text-violet-400 hover:underline">Create a free account</Link>
        </p>
      </div>
    </div>
  )
}
