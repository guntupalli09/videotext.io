import { useEffect } from 'react'
import { X, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { SITE_METRICS } from '../lib/siteMetrics'

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
        title: `Free plan: ${SITE_METRICS.freeMaxMinutes} min max`,
        body: `Free plan supports videos up to ${SITE_METRICS.freeMaxMinutes} minutes. Upgrade to Pro to process full-length videos up to ${SITE_METRICS.proMaxMinutes} minutes.`,
        cta: `Upgrade to Pro — $${SITE_METRICS.proPrice}/mo`,
        detail: `Includes ${SITE_METRICS.proMonthlyMinutes} min/month · 7-day money-back guarantee`,
      }
    case 'BATCH_NOT_AVAILABLE':
      return {
        title: 'Batch processing is Pro',
        body: `Process up to ${SITE_METRICS.proMaxBatchFiles} files at once. Pro also unlocks speaker labels, AI summaries, and full-length video support.`,
        cta: `Unlock batch — upgrade to Pro · $${SITE_METRICS.proPrice}/mo`,
        detail: '7-day money-back guarantee · cancel any time',
      }
    case 'MULTI_LANGUAGE_NOT_AVAILABLE':
      return {
        title: 'Multiple languages require Pro',
        body: `Pro supports ${SITE_METRICS.translationLanguages}+ translation languages with speaker labels, AI summaries, and batch processing.`,
        cta: `Upgrade to Pro — $${SITE_METRICS.proPrice}/mo`,
        detail: '7-day money-back guarantee · cancel any time',
      }
    case 'COPY_LIMIT_REACHED':
      return {
        title: 'Keep this workflow uninterrupted',
        body: "You've already generated a production-quality transcript. Upgrade to Pro for unlimited copy/export, no watermark, and no daily interruptions.",
        cta: `Upgrade to Pro — $${SITE_METRICS.proPrice}/mo`,
        detail: '7-day money-back guarantee · cancel any time',
      }
    case 'AI_FEATURES':
      return {
        title: 'Unlock AI Summary & Chapters',
        body: 'Pro automatically generates a summary, bullet points, and chapter markers for every transcript.',
        cta: `Upgrade to Pro — $${SITE_METRICS.proPrice}/mo`,
        detail: '7-day money-back guarantee · cancel any time',
      }
    case 'FREE_DAILY_LIMIT_REACHED':
    default:
      return {
        title: `Today's ${SITE_METRICS.freeUploadsPerDay} free imports used`,
        body: 'Upgrade to Pro to keep processing without daily stops: no watermark, longer videos, speaker labels, summary, chapters, and batch export.',
        cta: `Upgrade to Pro — $${SITE_METRICS.proPrice}/mo`,
        detail: '7-day money-back guarantee · cancel any time',
      }
  }
}

export default function PaywallModal({ isOpen, onClose, reason, onUpgrade }: PaywallModalProps) {
  useEffect(() => {
    if (isOpen) trackEvent('paywall_shown', { reason })
  }, [isOpen, reason])

  if (!isOpen) return null

  const { title, body, cta, detail } = getContent(reason)

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
          className="relative bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2 pr-6">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{body}</p>

          <Link
            to="/pricing"
            onClick={() => {
              try { trackEvent('upgrade_clicked', { source: 'paywall_modal', reason }) } catch { /* non-blocking */ }
              trackAppEvent('upgrade_clicked', { source: 'paywall_modal', reason })
              ;(onUpgrade ?? onClose)?.()
            }}
            className="block w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center transition-colors shadow-sm"
          >
            {cta}
          </Link>

          {/* Trust line — always visible so price context is in-modal */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" aria-hidden />
            <span>{detail}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
