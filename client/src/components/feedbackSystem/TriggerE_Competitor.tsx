/**
 * Trigger E — Competitor Insight Survey
 *
 * Fires for "activated" users (exported at least once).
 * Question: "What would you use instead of VideoText?"
 * Options: Otter / Descript / Manual / Other
 * One-time only; never shown in same session as PMF survey.
 */

import { useState } from 'react'
import FeedbackSheet, {
  SheetTitle, SheetSubtitle, OptionButton, SubmitButton, SkipButton, ThankYouState,
} from './FeedbackSheet'
import { submitStructuredFeedback } from '../../lib/feedbackEvents'

const OPTIONS = [
  { label: '🦦  Otter.ai', value: 'Otter' },
  { label: '🎬  Descript', value: 'Descript' },
  { label: '🐦  rev.com', value: 'Rev' },
  { label: '⌨️  Manual transcription', value: 'Manual transcription' },
  { label: '🤖  Another AI tool', value: 'Other AI tool' },
  { label: '✏️  Other / nothing', value: 'Other' },
]

interface Props {
  isOpen: boolean
  toolId?: string
  onClose: () => void
}

export default function TriggerE_Competitor({ isOpen, toolId, onClose }: Props) {
  const [category, setCategory] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function handleClose() {
    if (!sent && !category) {
      submitStructuredFeedback({ triggerType: 'competitor', toolId, dismissed: true }).catch(() => {})
    }
    onClose()
  }

  async function handleSubmit() {
    if (!category || sending) return
    setSending(true)
    try {
      await submitStructuredFeedback({
        triggerType: 'competitor',
        toolId,
        category,
        freeText: freeText.trim() || undefined,
      })
      setSent(true)
      setTimeout(onClose, 2200)
    } catch {
      setSending(false)
    }
  }

  return (
    <FeedbackSheet isOpen={isOpen} onClose={handleClose} maxWidth="max-w-sm">
      {sent ? (
        <ThankYouState message="Knowing your alternatives helps us focus on what makes VideoText irreplaceable." />
      ) : (
        <div className="space-y-4">
          <div>
            <SheetTitle>Quick question —</SheetTitle>
            <SheetSubtitle>If VideoText didn't exist, what would you use instead?</SheetSubtitle>
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

          {(category === 'Other' || category === 'Other AI tool') && (
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value.slice(0, 300))}
              placeholder="Which tool?"
              rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 resize-none transition"
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
