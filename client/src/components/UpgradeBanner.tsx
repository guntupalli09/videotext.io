import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { trackAppEvent } from '../lib/feedbackEvents'
import { trackEvent } from '../lib/analytics'
import { createCheckoutSession } from '../lib/billing'
import { logout } from '../lib/auth'

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
  const plan = typeof window !== 'undefined' ? (localStorage.getItem('plan') || 'free').toLowerCase() : 'free'
  if (plan !== 'free') return null

  const { text, cta } = MESSAGES[variant]

  async function handleDirectCheckout() {
    if (loading) return
    trackAppEvent('upgrade_clicked', { source: `upgrade_banner:${variant}`, plan: 'pro' })
    trackEvent('upgrade_clicked', { source: `upgrade_banner:${variant}`, plan: 'pro' })

    setLoading(true)
    try {
      const { url } = await createCheckoutSession({
        mode: 'subscription',
        plan: 'pro',
        returnToPath: window.location.pathname,
        frontendOrigin: window.location.origin,
      })
      window.location.href = url
    } catch (e: any) {
      setLoading(false)
      const msg: string = e.message || ''
      if (msg.includes('session has expired') || msg.includes('log out and log back in')) {
        logout(); window.location.reload(); return
      }
      toast.error(msg || 'Failed to start checkout. Please try again.')
    }
  }

  return (
    <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{text}</span>
      </div>
      <button
        type="button"
        onClick={handleDirectCheckout}
        disabled={loading}
        className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white underline underline-offset-2 transition-colors disabled:opacity-60"
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {loading ? 'Redirecting…' : <>{cta} →</>}
      </button>
      <Link
        to="/pricing"
        className="shrink-0 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        See all plans
      </Link>
    </div>
  )
}
