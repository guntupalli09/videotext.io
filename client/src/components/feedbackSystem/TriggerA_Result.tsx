/**
 * Trigger A — First Result Feedback
 *
 * Fires 5 seconds after the user sees their first transcription result.
 * Question: "How was your result?"
 * Options: Perfect / Good but needs tweaks / Not usable
 * If not "Perfect": optional "What's missing?" text input.
 * Shown only once per user (tracked in localStorage).
 */

import { useState } from 'react'
import FeedbackSheet, {
  SheetTitle, SheetSubtitle, OptionButton, SubmitButton, SkipButton, ThankYouState,
} from './FeedbackSheet'
import { submitStructuredFeedback } from '../../lib/feedbackEvents'

const OPTIONS = [
  { label: '✅  Perfect — exactly what I needed', value: 'Perfect', variant: 'positive' as const },
  { label: '✏️  Good but needs tweaks', value: 'Good but needs tweaks', variant: 'warning' as const },
  { label: '❌  Not usable', value: 'Not usable', variant: 'negative' as const },
]

interface Props {
  isOpen: boolean
  toolName?: string
  onClose: () => void
}

export default function TriggerA_Result({ isOpen, toolName, onClose }: Props) {
  const [rating, setRating] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function handleClose() {
    if (!sent && !rating) {
      submitStructuredFeedback({ triggerType: 'result', dismissed: true }).catch(() => {})
    }
    onClose()
  }

  async function handleSubmit() {
    if (!rating || sending) return
    setSending(true)
    try {
      await submitStructuredFeedback({
        triggerType: 'result',
        rating,
        freeText: freeText.trim() || undefined,
      })
      setSent(true)
      setTimeout(onClose, 2200)
    } catch {
      setSending(false)
    }
  }

  const showFollowUp = rating && rating !== 'Perfect'

  return (
    <FeedbackSheet isOpen={isOpen} onClose={handleClose}>
      {sent ? (
        <ThankYouState message="We read every response and use it to improve accuracy." />
      ) : (
        <div className="space-y-4">
          <div>
            <SheetTitle>How was your {toolName ?? 'result'}?</SheetTitle>
            <SheetSubtitle>Takes 10 seconds. Goes straight to the founder.</SheetSubtitle>
          </div>

          <div className="space-y-2">
            {OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={rating === opt.value}
                onClick={() => setRating(opt.value)}
                variant={opt.variant}
              />
            ))}
          </div>

          {showFollowUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                What's missing or broken?{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value.slice(0, 500))}
                placeholder="e.g. Speaker names were wrong, formatting was off…"
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none transition"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2 pt-1">
            <SubmitButton onClick={handleSubmit} disabled={!rating} loading={sending} label="Send feedback" />
            <SkipButton onClick={handleClose} />
          </div>
        </div>
      )}
    </FeedbackSheet>
  )
}
