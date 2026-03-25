import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export type UpgradeBannerVariant =
  | 'video-length'   // "Unlock full-length videos — upgrade to Pro"
  | 'watermark'      // "Remove watermark from all exports"
  | 'queue'          // "Process faster with priority queue"
  | 'ai-features'    // "Unlock AI chapters, keywords & summaries"
  | 'batch'          // "Process 20 videos at once with batch"

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
}

interface UpgradeBannerProps {
  variant?: UpgradeBannerVariant
}

export default function UpgradeBanner({ variant = 'video-length' }: UpgradeBannerProps) {
  const plan = typeof window !== 'undefined' ? (localStorage.getItem('plan') || 'free').toLowerCase() : 'free'
  if (plan !== 'free') return null

  const { text, cta } = MESSAGES[variant]

  return (
    <div className="mb-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="w-4 h-4 text-violet-500 shrink-0" />
        <span className="text-sm text-violet-700 dark:text-violet-300 font-medium">{text}</span>
      </div>
      <Link
        to="/pricing"
        className="shrink-0 text-sm font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-white underline underline-offset-2 transition-colors"
      >
        {cta} →
      </Link>
    </div>
  )
}
