import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import FeedbackModal from './FeedbackModal'
import { submitFeedback } from '../lib/api'
import { getCurrentUsage } from '../lib/api'

const JOB_COMPLETED_EVENT = 'videotext:job-completed'
const FEEDBACK_OPEN_EVENT = 'videotext:open-feedback'
const SESSION_KEY_OFFERED = 'videotext:feedback-prompt-offered'
const SESSION_KEY_DISMISSED = 'videotext:feedback-prompt-dismissed'

interface JobCompletedDetail {
  toolId?: string
}

export function dispatchJobCompletedForFeedback(toolId?: string) {
  window.dispatchEvent(new CustomEvent<JobCompletedDetail>(JOB_COMPLETED_EVENT, { detail: { toolId } }))
}

const TOOL_COPY: Record<string, string> = {
  'video-to-transcript': 'How was the transcript?',
  'video-to-subtitles': 'How did the subtitles turn out?',
  'translate-subtitles': 'How was the translation?',
  'fix-subtitles': 'Did we fix your SRT file?',
  'burn-subtitles': 'How did the burned subtitles look?',
  'compress-video': 'Happy with the compression?',
  'batch-process': 'How did the batch job go?',
}

const QUICK_OPTIONS = [
  { label: '😍', sublabel: 'Loved it', stars: 5 },
  { label: '👍', sublabel: 'Pretty good', stars: 4 },
  { label: '😐', sublabel: 'Just okay', stars: 3 },
  { label: '👎', sublabel: 'Needs work', stars: 2 },
]

type BannerState = 'idle' | 'prompt' | 'thanked' | 'done'

export default function FeedbackPrompt() {
  const [bannerState, setBannerState] = useState<BannerState>('idle')
  const [showModal, setShowModal] = useState(false)
  const [toolId, setToolId] = useState<string | undefined>()
  const [quickStars, setQuickStars] = useState<number | undefined>()
  const [plan, setPlan] = useState<string>('free')

  useEffect(() => {
    getCurrentUsage().then((d) => setPlan((d.plan || 'free').toLowerCase())).catch(() => {})
  }, [])

  useEffect(() => {
    const onJobCompleted = (e: Event) => {
      if (typeof sessionStorage === 'undefined') return
      if (sessionStorage.getItem(SESSION_KEY_OFFERED) || sessionStorage.getItem(SESSION_KEY_DISMISSED)) return
      sessionStorage.setItem(SESSION_KEY_OFFERED, '1')
      const detail = (e as CustomEvent<JobCompletedDetail>).detail
      setToolId(detail?.toolId)
      setBannerState('prompt')
    }
    const onOpenFeedback = () => {
      setShowModal(true)
      setBannerState('done')
    }
    window.addEventListener(JOB_COMPLETED_EVENT, onJobCompleted)
    window.addEventListener(FEEDBACK_OPEN_EVENT, onOpenFeedback)
    return () => {
      window.removeEventListener(JOB_COMPLETED_EVENT, onJobCompleted)
      window.removeEventListener(FEEDBACK_OPEN_EVENT, onOpenFeedback)
    }
  }, [])

  const handleQuickRate = useCallback(async (stars: number) => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY_DISMISSED, '1')
    setQuickStars(stars)
    setBannerState('thanked')

    // Submit quick star signal immediately
    try {
      await submitFeedback({
        toolId: toolId ?? undefined,
        stars,
        planAtSubmit: plan,
      })
    } catch {
      // silent
    }

    // After a moment, offer to add context
    setTimeout(() => {
      setBannerState('done')
    }, 3000)
  }, [toolId, plan])

  const handleTellUsMore = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY_DISMISSED, '1')
    setBannerState('done')
    setShowModal(true)
  }, [])

  const handleDismiss = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY_DISMISSED, '1')
    setBannerState('done')
  }, [])

  const handleCloseModal = useCallback(() => setShowModal(false), [])

  const bannerCopy = toolId ? TOOL_COPY[toolId] ?? 'How was it?' : 'How are we doing?'

  return (
    <>
      <AnimatePresence>
        {(bannerState === 'prompt' || bannerState === 'thanked') && (
          <motion.div
            key="banner"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-5 right-5 z-50 w-[340px] max-w-[calc(100vw-2rem)]"
          >
            <div className="relative rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              {/* Accent bar */}
              <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600" />

              <AnimatePresence mode="wait">
                {bannerState === 'prompt' ? (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white font-display leading-tight">
                          {bannerCopy}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          One tap. Helps us build what matters.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDismiss}
                        className="ml-2 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick emoji rating */}
                    <div className="flex gap-1.5">
                      {QUICK_OPTIONS.map((opt) => (
                        <button
                          key={opt.stars}
                          type="button"
                          onClick={() => handleQuickRate(opt.stars)}
                          className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all group"
                          title={opt.sublabel}
                        >
                          <span className="text-xl transition-transform group-hover:scale-110 duration-150">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-600 group-hover:text-violet-600 dark:group-hover:text-violet-400 font-medium transition-colors">
                            {opt.sublabel}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleTellUsMore}
                      className="mt-2.5 w-full py-1.5 rounded-xl text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
                    >
                      Write detailed feedback →
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="thanked"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 flex items-center gap-3"
                  >
                    <span className="text-2xl">
                      {quickStars != null && quickStars >= 4 ? '🙌' : quickStars === 3 ? '👌' : '🙏'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white font-display">
                        {quickStars != null && quickStars >= 4 ? 'Awesome, thanks!' : 'Got it, thank you!'}
                      </p>
                      <button
                        type="button"
                        onClick={handleTellUsMore}
                        className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium mt-0.5"
                      >
                        Add a comment →
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBannerState('done')}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackModal
        isOpen={showModal}
        onClose={handleCloseModal}
        toolId={toolId}
        initialStars={quickStars}
      />
    </>
  )
}
