import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'

export type PaywallReason =
  | 'FREE_DAILY_LIMIT_REACHED'
  | 'VIDEO_TOO_LONG'
  | 'BATCH_NOT_AVAILABLE'
  | 'MULTI_LANGUAGE_NOT_AVAILABLE'
  | 'COPY_LIMIT_REACHED'
  | 'AI_FEATURES'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: PaywallReason
  onUpgrade?: () => void
  /** ISO string for midnight UTC reset (free plan) */
  resetDate?: string
}

function getContent(reason?: PaywallReason) {
  switch (reason) {
    case 'VIDEO_TOO_LONG':
      return {
        title: 'Free plan: 30 min max',
        body: 'Free plan supports videos up to 30 minutes. Upgrade to Pro to process full-length videos (up to 2 hours).',
        cta: 'Upgrade to Pro',
        secondaryLabel: 'Upload shorter video',
        secondary: null,
      }
    case 'BATCH_NOT_AVAILABLE':
      return {
        title: 'Batch processing is Pro',
        body: 'Process 20 videos at once. Pro also unlocks speaker labels, AI summaries, and full-length videos.',
        cta: 'Unlock batch — upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
    case 'MULTI_LANGUAGE_NOT_AVAILABLE':
      return {
        title: 'Multiple languages require Pro',
        body: 'Pro supports 5 languages with speaker diarization, AI summaries, and batch processing.',
        cta: 'Upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
    case 'COPY_LIMIT_REACHED':
      return {
        title: 'Your transcript is ready',
        body: "You've used your 3 free copies. Upgrade to Pro to copy and export unlimited transcripts — no watermark, no limits.",
        cta: 'Upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
    case 'AI_FEATURES':
      return {
        title: 'Unlock AI Summary & Chapters',
        body: 'Pro automatically generates a summary, bullet points, and chapter markers for every transcript.',
        cta: 'Upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
    case 'FREE_DAILY_LIMIT_REACHED':
    default:
      return {
        title: "Today's 3 free imports used",
        body: 'Upgrade to Pro — no daily limits, AI chapters, keywords, speaker labels, batch processing, and no watermark.',
        cta: 'Upgrade to Pro — $10/mo annual',
        secondaryLabel: null,
        secondary: null,
      }
  }
}

export default function PaywallModal({ isOpen, onClose, reason, onUpgrade, resetDate }: PaywallModalProps) {
  useEffect(() => {
    if (isOpen) trackEvent('paywall_shown', { reason })
  }, [isOpen, reason])

  if (!isOpen) return null

  const { title, body, cta, secondaryLabel, secondary } = getContent(reason)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{body}</p>

          <Link
            to="/pricing"
            onClick={onUpgrade ?? onClose}
            className="block w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm text-center transition-colors shadow-sm"
          >
            {cta}
          </Link>

          {secondaryLabel && (
            <button
              type="button"
              onClick={onClose}
              className="mt-3 block w-full py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-sm text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {secondaryLabel}
            </button>
          )}

          {secondary && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">{secondary}</p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
