import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2 } from 'lucide-react'
import { submitFeedback } from '../lib/api'
import { getCurrentUsage } from '../lib/api'
import { isLoggedIn } from '../lib/auth'

const FEEDBACK_OPEN_EVENT = 'videotext:open-feedback'

export function useOpenFeedbackModal() {
  return useCallback(() => {
    window.dispatchEvent(new CustomEvent(FEEDBACK_OPEN_EVENT))
  }, [])
}

const TOOL_ACTIONS: Record<string, string> = {
  'video-to-transcript': 'transcribing your video',
  'video-to-subtitles': 'generating subtitles',
  'translate-subtitles': 'translating subtitles',
  'fix-subtitles': 'fixing your SRT file',
  'burn-subtitles': 'burning subtitles into video',
  'compress-video': 'compressing your video',
  'batch-process': 'batch processing',
}

const STAR_PROMPTS: Record<number, string> = {
  1: "We're sorry it didn't work out — what went wrong?",
  2: "That's not good enough — what let you down?",
  3: "Good to know — what could we do better?",
  4: "Glad it worked! What could make it perfect?",
  5: "Amazing! What did you love most?",
}

function StarRating({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? value

  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(n)}
          className="p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-transform duration-100 hover:scale-110 active:scale-95"
        >
          <svg
            className={`w-8 h-8 transition-colors duration-100 ${active != null && n <= active ? 'text-amber-400 drop-shadow-sm' : 'text-gray-200 dark:text-gray-700'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  /** Optional tool context when opened after a specific job */
  toolId?: string
  /** Pre-filled star rating (e.g. from quick banner click) */
  initialStars?: number
}

export default function FeedbackModal({ isOpen, onClose, toolId, initialStars }: FeedbackModalProps) {
  const [stars, setStars] = useState<number | null>(initialStars ?? null)
  const [comment, setComment] = useState('')
  const [featureRequest, setFeatureRequest] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [plan, setPlan] = useState<string>('free')

  useEffect(() => {
    if (isOpen) {
      getCurrentUsage().then((d) => setPlan((d.plan || 'free').toLowerCase())).catch(() => {})
    }
  }, [isOpen])

  const reset = useCallback(() => {
    setStars(initialStars ?? null)
    setComment('')
    setFeatureRequest('')
    setEmail('')
    setSent(false)
  }, [initialStars])

  useEffect(() => {
    if (!isOpen) reset()
  }, [isOpen, reset])

  // Sync initialStars when prop changes
  useEffect(() => {
    if (isOpen && initialStars != null) setStars(initialStars)
  }, [isOpen, initialStars])

  const toolAction = toolId ? TOOL_ACTIONS[toolId] : null
  const heading = toolAction ? `How was ${toolAction}?` : 'How are we doing?'
  const placeholder = stars != null ? STAR_PROMPTS[stars] : 'What worked? What could be better?'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      await submitFeedback({
        toolId: toolId ?? undefined,
        stars: stars ?? undefined,
        comment: comment.trim() || undefined,
        featureRequest: featureRequest.trim() || undefined,
        userNameOrEmail: !isLoggedIn() && email.trim() ? email.trim() : undefined,
        planAtSubmit: plan,
      })
      setSent(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch {
      setSending(false)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          role="dialog"
          aria-labelledby="feedback-title"
          aria-modal="true"
        >
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600" />

          <div className="p-6">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                    Thank you!
                  </p>
                  <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Your feedback goes directly to the founder and shapes what we build next.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="mb-5 pr-8">
                    <h2
                      id="feedback-title"
                      className="text-lg font-semibold text-gray-900 dark:text-white font-display leading-tight"
                    >
                      {heading}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Takes 30 seconds. Goes straight to the founder.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Stars */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
                        Your rating
                      </p>
                      <StarRating value={stars} onChange={setStars} />
                      {stars != null && (
                        <motion.p
                          key={stars}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-400"
                        >
                          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][stars]}
                        </motion.p>
                      )}
                    </div>

                    {/* Comment */}
                    <div>
                      <label
                        htmlFor="feedback-comment"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                      >
                        Tell us more{' '}
                        <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        id="feedback-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, 500))}
                        placeholder={placeholder}
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-750 resize-none transition"
                      />
                    </div>

                    {/* Feature request */}
                    <div>
                      <label
                        htmlFor="feedback-feature"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                      >
                        Any feature you wish existed?{' '}
                        <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        id="feedback-feature"
                        value={featureRequest}
                        onChange={(e) => setFeatureRequest(e.target.value.slice(0, 300))}
                        placeholder="e.g. Auto-detect speaker names, batch export to Notion…"
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-750 resize-none transition"
                      />
                    </div>

                    {/* Email for anonymous users */}
                    {!isLoggedIn() && (
                      <div>
                        <label
                          htmlFor="feedback-email"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                        >
                          Your email{' '}
                          <span className="text-gray-400 font-normal">(optional, for follow-up)</span>
                        </label>
                        <input
                          id="feedback-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value.slice(0, 200))}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-750 transition"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={sending || (!stars && !comment.trim())}
                        className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-violet-200 dark:shadow-violet-900/30"
                      >
                        {sending ? 'Sending…' : 'Send feedback'}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Skip
                      </button>
                    </div>

                    <p className="text-center text-xs text-gray-400 dark:text-gray-600">
                      Private — goes directly to the founders. No spam, ever.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
