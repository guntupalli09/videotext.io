import { useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { trackAppEvent } from '../lib/feedbackEvents'
import { trackEvent } from '../lib/analytics'
import { createCheckoutSession } from '../lib/billing'

export type UpgradeBannerVariant =
  | 'video-length'   // "Unlock full-length videos — upgrade to Pro"
  | 'watermark'      // "Remove watermark from all exports"
  | 'queue'          // "Process faster with priority queue"
  | 'ai-features'    // "Unlock AI chapters, keywords & summaries"
  | 'batch'          // "Process 20 videos at once with batch"
  | 'voice'          // "Remove watermark & unlock full-length recordings"

const MESSAGES: Record<UpgradeBannerVariant, { text: string; cta: string }> = {
  'video-length': {
    text: 'Free plan: 30 min max.',
    cta: 'Unlock full-length videos (up to 2 hrs) — upgrade to Pro',
  },
  'watermark': {
    text: 'Your exports include a watermark.',
    cta: 'Remove watermark — upgrade to Pro',
  },
  'queue': {
    text: 'Free plan uses the standard queue.',
    cta: 'Process faster with priority queue — upgrade to Pro',
  },
  'ai-features': {
    text: 'AI features are Pro-only.',
    cta: 'Unlock AI chapters, keywords & summaries — upgrade to Pro',
  },
  'batch': {
    text: 'Batch processing is Pro-only.',
    cta: 'Process 20 videos at once — upgrade to Pro',
  },
  'voice': {
    text: 'Voice recordings export with a watermark.',
    cta: 'Remove watermark & unlock full-length recordings — upgrade to Pro',
  },
}

interface UpgradeBannerProps {
  variant?: UpgradeBannerVariant
}

export default function UpgradeBanner({ variant = 'video-length' }: UpgradeBannerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const plan = typeof window !== 'undefined' ? (localStorage.getItem('plan') || 'free').toLowerCase() : 'free'
  if (plan !== 'free') return null

  const { text, cta } = MESSAGES[variant]

  async function handleUpgrade() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      trackAppEvent('upgrade_clicked', { source: `upgrade_banner:${variant}`, plan: 'pro' })
      trackEvent('upgrade_clicked', { source: `upgrade_banner:${variant}`, plan: 'pro' })
      const { url } = await createCheckoutSession({
        mode: 'subscription',
        plan: 'pro',
        returnToPath: '/pricing',
        frontendOrigin: window.location.origin,
      })
      trackEvent('checkout_session_created', { source: `upgrade_banner:${variant}`, plan: 'pro' })
      trackEvent('stripe_redirect', { source: `upgrade_banner:${variant}`, plan: 'pro' })
      window.location.assign(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout. Please try again.'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{text}</span>
      </div>
      <div className="shrink-0 flex flex-col gap-1">
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white underline underline-offset-2 transition-colors disabled:cursor-wait disabled:opacity-70"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
          {loading ? 'Opening checkout…' : `${cta} →`}
        </button>
        {error && <span className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</span>}
      </div>
    </div>
  )
}
