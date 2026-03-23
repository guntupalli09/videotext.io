/**
 * Trigger D — PMF (Product-Market Fit) Survey
 *
 * Fires after the user has completed 2–3 sessions.
 * The classic Sean Ellis PMF question.
 * Question: "How would you feel if VideoText disappeared tomorrow?"
 * Options: Very disappointed / Somewhat disappointed / Not disappointed
 * One-time only; never stacks with Competitor survey in same session.
 */

import { useState } from 'react'
import FeedbackSheet, {
  SheetTitle, SheetSubtitle, OptionButton, SubmitButton, SkipButton, ThankYouState,
} from './FeedbackSheet'
import { submitStructuredFeedback } from '../../lib/feedbackEvents'

const OPTIONS = [
  {
    label: '😭  Very disappointed',
    value: 'Very disappointed',
    desc: 'I rely on it — it would be a real loss',
  },
  {
    label: '😕  Somewhat disappointed',
    value: 'Somewhat disappointed',
    desc: "It's useful but I'd find an alternative",
  },
  {
    label: '😐  Not disappointed',
    value: 'Not disappointed',
    desc: "It's not essential to my workflow",
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function TriggerD_PMF({ isOpen, onClose }: Props) {
  const [rating, setRating] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function handleClose() {
    if (!sent && !rating) {
      submitStructuredFeedback({ triggerType: 'pmf', dismissed: true }).catch(() => {})
    }
    onClose()
  }

  async function handleSubmit() {
    if (!rating || sending) return
    setSending(true)
    try {
      await submitStructuredFeedback({
        triggerType: 'pmf',
        rating,
        freeText: freeText.trim() || undefined,
      })
      setSent(true)
      setTimeout(onClose, 2500)
    } catch {
      setSending(false)
    }
  }

  return (
    <FeedbackSheet isOpen={isOpen} onClose={handleClose} maxWidth="max-w-sm">
      {sent ? (
        <ThankYouState message="This is the most important signal we measure. Thank you for being honest." />
      ) : (
        <div className="space-y-4">
          <div>
            <SheetTitle>How would you feel if VideoText disappeared tomorrow?</SheetTitle>
            <SheetSubtitle>
              A quick honest answer shapes everything we invest in next.
            </SheetSubtitle>
          </div>

          <div className="space-y-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRating(opt.value)}
                className={`
                  w-full text-left px-3.5 py-3 rounded-xl border text-sm transition-all
                  ${rating === opt.value
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-950/20'}
                `}
              >
                <span className={`font-medium ${rating === opt.value ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-gray-200'}`}>
                  {opt.label}
                </span>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>

          {rating && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tell us why{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value.slice(0, 500))}
                placeholder="What matters most to you about VideoText?"
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 resize-none transition"
              />
            </div>
          )}

          <div className="space-y-2 pt-1">
            <SubmitButton onClick={handleSubmit} disabled={!rating} loading={sending} label="Submit" />
            <SkipButton onClick={handleClose} />
          </div>
        </div>
      )}
    </FeedbackSheet>
  )
}
