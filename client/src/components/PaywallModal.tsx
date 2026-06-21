import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { createCheckoutSession } from '../lib/billing'

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
        title: 'This video is over 30 minutes',
        body: 'Free stops at 30 minutes. Pro handles videos up to 2 hours, so full webinars, podcasts, and lectures can finish in one run.',
        cta: 'Process long videos — upgrade to Pro',
        secondaryLabel: 'Upload shorter video',
        secondary: null,
      }
    case 'BATCH_NOT_AVAILABLE':
      return {
        title: 'You selected multiple files',
        body: 'Free processes one file at a time. Pro runs up to 20 videos per batch and gives you one ZIP with every transcript/subtitle.',
        cta: 'Run batches — upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
    case 'MULTI_LANGUAGE_NOT_AVAILABLE':
      return {
        title: 'You selected multiple languages',
        body: 'Free exports one language. Pro generates up to 5 language files in the same job, plus speaker labels and summaries.',
        cta: 'Create multi-language files — upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
    case 'COPY_LIMIT_REACHED':
      return {
        title: 'You hit the free copy/export limit',
        body: 'Your transcript is ready. Pro removes copy/export limits and watermark interruptions so you can finish the handoff now.',
        cta: 'Copy and export — upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
    case 'AI_FEATURES':
      return {
        title: 'You asked for AI summary and chapters',
        body: 'Free gives you the transcript. Pro adds summary, bullet points, and chapter markers automatically for each video.',
        cta: 'Generate AI outputs — upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
    case 'FREE_DAILY_LIMIT_REACHED':
    default:
      return {
        title: "Today's 3 free imports are used",
        body: 'Free resets tomorrow. Pro removes the daily stop so you can keep transcribing today, including longer videos, speaker labels, summaries, and batch export.',
        cta: 'Keep processing today — upgrade to Pro',
        secondaryLabel: null,
        secondary: null,
      }
  }
}

export default function PaywallModal({ isOpen, onClose, reason, onUpgrade }: PaywallModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (isOpen) trackEvent('paywall_shown', { reason })
  }, [isOpen, reason])

  if (!isOpen) return null

  const { title, body, cta, secondaryLabel, secondary } = getContent(reason)

  async function handleUpgrade() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      try { trackEvent('upgrade_clicked', { source: 'paywall_modal', reason, plan: 'pro' }) } catch { /* non-blocking */ }
      trackAppEvent('upgrade_clicked', { source: 'paywall_modal', reason, plan: 'pro' })
      onUpgrade?.()
      const { url } = await createCheckoutSession({
        mode: 'subscription',
        plan: 'pro',
        returnToPath: '/pricing',
        frontendOrigin: window.location.origin,
      })
      trackEvent('checkout_session_created', { source: 'paywall_modal', reason, plan: 'pro' })
      trackEvent('stripe_redirect', { source: 'paywall_modal', reason, plan: 'pro' })
      window.location.assign(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout. Please try again.'
      setError(message)
      setLoading(false)
    }
  }

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
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{body}</p>

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center transition-colors shadow-sm disabled:cursor-wait disabled:opacity-75"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {loading ? 'Opening checkout…' : cta}
          </button>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center" role="alert">{error}</p>}

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
