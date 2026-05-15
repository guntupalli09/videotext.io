/**
 * Trigger C — Drop-off / Abandonment Feedback
 *
 * Fires when:
 *   (a) user is idle on the results page for 45 seconds without exporting, OR
 *   (b) user starts to leave before transcription completes.
 * Only shown to 30% of users (sampled in useFeedbackFrequency).
 * Question: "What stopped you from finishing?"
 * Options: Too slow / Confusing / Didn't trust output / Just testing / Other
 */

import { useState } from 'react'
import FeedbackSheet, {
  SheetTitle, SheetSubtitle, OptionButton, SubmitButton, SkipButton, ThankYouState,
} from './FeedbackSheet'
import { submitStructuredFeedback } from '../../lib/feedbackEvents'

const OPTIONS = [
  { label: '🐌  Too slow', value: 'Too slow' },
  { label: '😕  Confusing to use', value: 'Confusing' },
  { label: '🤔  Didn\'t trust the output', value: "Didn't trust output" },
  { label: '🧪  Just testing / exploring', value: 'Just testing' },
  { label: '✏️  Something else', value: 'Other' },
]

interface Props {
  isOpen: boolean
  toolId?: string
  /** 'idle' = user was idle on results page; 'leaving' = user is navigating away */
  reason?: 'idle' | 'leaving'
  onClose: () => void
}

export default function TriggerC_Dropoff({ isOpen, toolId, reason = 'idle', onClose }: Props) {
  const [category, setCategory] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function handleClose() {
    if (!sent && !category) {
      submitStructuredFeedback({ triggerType: 'dropoff', toolId, dismissed: true }).catch(() => {})
    }
    onClose()
  }

  async function handleSubmit() {
    if (!category || sending) return
    setSending(true)
    try {
      await submitStructuredFeedback({
        triggerType: 'dropoff',
        toolId,
        category,
        freeText: freeText.trim() || undefined,
        rating: reason,
      })
      setSent(true)
      setTimeout(onClose, 2200)
    } catch {
      setSending(false)
    }
  }

  const title = reason === 'leaving'
    ? 'Heading out? Quick question —'
    : "Looks like you haven't exported yet —"

  return (
    <FeedbackSheet isOpen={isOpen} onClose={handleClose}>
      {sent ? (
        <ThankYouState message="Honest answers like this are the most valuable signal we get." />
      ) : (
        <div className="space-y-4">
          <div>
            <SheetTitle>{title}</SheetTitle>
            <SheetSubtitle>What stopped you from finishing? (One tap, no judgment.)</SheetSubtitle>
          </div>

          <div className="space-y-2">
            {OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={category === opt.value}
                onClick={() => setCategory(opt.value)}
              />
            ))}
          </div>

          {category === 'Other' && (
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value.slice(0, 400))}
              placeholder="What happened?"
              rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 resize-none transition"
              autoFocus
            />
          )}

          <div className="space-y-2 pt-1">
            <SubmitButton onClick={handleSubmit} disabled={!category} loading={sending} label="Send" />
            <SkipButton onClick={handleClose} />
          </div>
        </div>
      )}
    </FeedbackSheet>
  )
}
