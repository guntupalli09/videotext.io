/**
 * Trigger B — Export / Download Feedback
 *
 * Fires on the user's first export/download action.
 * Question: "What almost stopped you from exporting?"
 * Options: Accuracy / Speaker labels / Formatting / Speed / Other
 * If "Other": text input.
 * Shown only once per user.
 */

import { useState } from 'react'
import FeedbackSheet, {
  SheetTitle, SheetSubtitle, OptionButton, SubmitButton, SkipButton, ThankYouState,
} from './FeedbackSheet'
import { submitStructuredFeedback } from '../../lib/feedbackEvents'

const OPTIONS = [
  { label: '🎯  Accuracy of the transcript', value: 'Accuracy' },
  { label: '🗣️  Speaker labels / diarization', value: 'Speaker labels' },
  { label: '📄  Formatting or punctuation', value: 'Formatting' },
  { label: '⚡  Processing speed', value: 'Speed' },
  { label: '💸  Pricing or limits', value: 'Pricing' },
  { label: '✏️  Other', value: 'Other' },
]

interface Props {
  isOpen: boolean
  toolId?: string
  onClose: () => void
}

export default function TriggerB_Export({ isOpen, toolId, onClose }: Props) {
  const [category, setCategory] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function handleClose() {
    if (!sent && !category) {
      submitStructuredFeedback({ triggerType: 'export', toolId, dismissed: true }).catch(() => {})
    }
    onClose()
  }

  async function handleSubmit() {
    if (!category || sending) return
    setSending(true)
    try {
      await submitStructuredFeedback({
        triggerType: 'export',
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
    <FeedbackSheet isOpen={isOpen} onClose={handleClose}>
      {sent ? (
        <ThankYouState message="This helps us prioritize what to improve next." />
      ) : (
        <div className="space-y-4">
          <div>
            <SheetTitle>What almost stopped you from exporting?</SheetTitle>
            <SheetSubtitle>Pick the biggest friction point, even if you pushed through.</SheetSubtitle>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tell us more
              </label>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value.slice(0, 500))}
                placeholder="What was the issue?"
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-violet-500 resize-none transition"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2 pt-1">
            <SubmitButton onClick={handleSubmit} disabled={!category} loading={sending} label="Send feedback" />
            <SkipButton onClick={handleClose} />
          </div>
        </div>
      )}
    </FeedbackSheet>
  )
}
