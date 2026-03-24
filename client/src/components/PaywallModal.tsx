import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'

export type PaywallReason =
  | 'FREE_DAILY_LIMIT_REACHED'
  | 'VIDEO_TOO_LONG'
  | 'BATCH_NOT_AVAILABLE'
  | 'MULTI_LANGUAGE_NOT_AVAILABLE'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: PaywallReason
  onUpgrade?: () => void
  /** ISO string for midnight UTC reset (free plan) */
  resetDate?: string
}

function getContent(reason?: PaywallReason, resetDate?: string) {
  const resetLabel = resetDate
    ? new Date(resetDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : 'midnight'

  switch (reason) {
    case 'VIDEO_TOO_LONG':
      return {
        title: 'Video too long for free plan',
        body: 'Free supports up to 30 minutes. Pro supports up to 2 hours.',
        cta: 'Upgrade to Pro',
        secondary: null,
      }
    case 'BATCH_NOT_AVAILABLE':
      return {
        title: 'Batch processing is a Pro feature',
        body: 'Upload up to 20 videos at once with Pro. Pro also includes speaker labels, AI summaries, and 5 languages.',
        cta: 'Upgrade to Pro',
        secondary: null,
      }
    case 'MULTI_LANGUAGE_NOT_AVAILABLE':
      return {
        title: 'Multiple languages require Pro',
        body: 'Pro supports 5 languages with speaker diarization, AI summaries, and batch processing.',
        cta: 'Upgrade to Pro',
        secondary: null,
      }
    case 'FREE_DAILY_LIMIT_REACHED':
    default:
      return {
        title: "You've used today's 3 free imports",
        body: 'Pro includes batch processing, speaker labels, AI summaries, chapters, keywords, and 5 languages — no fixed limits.',
        cta: 'Upgrade to Pro — $10/mo annual',
        secondary: `Resets at ${resetLabel} if you'd like to wait.`,
      }
  }
}

export default function PaywallModal({ isOpen, onClose, reason, onUpgrade, resetDate }: PaywallModalProps) {
  if (!isOpen) return null

  const { title, body, cta, secondary } = getContent(reason, resetDate)

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

          {secondary && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">{secondary}</p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
