/**
 * ShareToUnlock — Steal/viral growth mechanic.
 * Free users share their result and earn 2 bonus imports.
 * Shows only once per session; disappears after claim.
 */
import { useState, useCallback } from 'react'
import { Share2, Check, Zap, X } from 'lucide-react'
import { api } from '../lib/api'
import { getSessionId } from '../lib/sessionTracking'
import { trackEvent } from '../lib/analytics'

interface Props {
  jobId: string | null
  fileName?: string
}

const STORAGE_KEY = 'shareUnlockClaimed'

export default function ShareToUnlock({ jobId, fileName }: Props) {
  const plan = typeof window !== 'undefined' ? (localStorage.getItem('plan') || 'free').toLowerCase() : 'free'
  const [claimed, setClaimed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })
  const [dismissed, setDismissed] = useState(false)
  const [claiming, setClaiming] = useState(false)

  // Only show for free users who haven't claimed yet
  if (plan !== 'free' || claimed || dismissed) return null

  const handleShare = useCallback(async () => {
    if (!jobId) return
    setClaiming(true)
    try {
      const sessionId = getSessionId()
      // Claim the bonus first
      const resp = await api('/api/shares/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await resp.json()

      if (data.success || data.alreadyClaimed) {
        localStorage.setItem(STORAGE_KEY, 'true')
        setClaimed(true)
        trackEvent('share_unlock_claimed', { jobId, alreadyClaimed: data.alreadyClaimed })
      }

      // Open native share dialog or fallback to copy link
      const shareUrl = `${window.location.origin}/video-to-transcript`
      const shareText = `I just transcribed "${fileName || 'a video'}" in seconds with VideoText — try it free:`
      if (navigator.share) {
        await navigator.share({ title: 'VideoText — Fast Video Transcription', text: shareText, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
      }
      trackEvent('share_unlock_shared', { jobId })
    } catch {
      // User cancelled share dialog — still mark as claimed if backend succeeded
      localStorage.setItem(STORAGE_KEY, 'true')
      setClaimed(true)
    } finally {
      setClaiming(false)
    }
  }, [jobId, fileName])

  if (claimed) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 mb-4">
        <Check className="w-4 h-4 shrink-0 text-emerald-600" />
        <span>+2 bonus imports unlocked! They're added to this month's free quota.</span>
      </div>
    )
  }

  return (
    <div className="relative mb-4 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border border-violet-200 dark:border-violet-800/50 px-4 py-3">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
          <Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Share → get 2 free imports
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Share this result with a friend and unlock 2 extra free imports this month.
          </p>
          <button
            type="button"
            onClick={handleShare}
            disabled={claiming}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-violet-500/30"
          >
            {claiming ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            {claiming ? 'Opening…' : 'Share & unlock'}
          </button>
        </div>
      </div>
    </div>
  )
}
