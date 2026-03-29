/**
 * WorkflowPipelineBanner — inline visual pipeline shown after a tool completes.
 * Displays all 4 core steps (Transcript → Subtitles → Translate → Burn) with
 * completion state, a glowing "next step" CTA, and available steps.
 *
 * No bottom bar. No "Yes/No" prompt. Just a beautiful inline guide.
 */
import { useEffect, useState, type ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  FileText,
  MessageSquare,
  Languages,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { PIPELINE_STEPS, getSnapshot, type WorkflowSnapshot } from '../../workflow/workflowStore'
import { useWorkflowOptional } from '../../contexts/WorkflowContext'

// ─── Icon map ──────────────────────────────────────────────────────────────
const STEP_ICONS: Record<string, ElementType> = {
  'video-to-transcript': FileText,
  'video-to-subtitles':  MessageSquare,
  'translate-subtitles': Languages,
  'burn-subtitles':      Flame,
}

// ─── Types ──────────────────────────────────────────────────────────────────
type StepStatus = 'completed' | 'current' | 'next' | 'available' | 'locked'

interface ResolvedStep {
  def: typeof PIPELINE_STEPS[number]
  status: StepStatus
  /** state to pass via location when navigating to this step */
  navState: Record<string, boolean>
}

// ─── Props ──────────────────────────────────────────────────────────────────
export interface WorkflowPipelineBannerProps {
  /** toolId of the tool that just completed */
  currentTool: string
  /** whether a video file is in workflow context */
  hasVideo: boolean
  /** whether SRT content is in workflow context */
  hasSrt: boolean
  className?: string
}

// ─── Helper: resolve per-step status ────────────────────────────────────────
function resolveSteps(
  currentTool: string,
  completedToolIds: string[],
  hasVideo: boolean,
  hasSrt: boolean,
): ResolvedStep[] {
  // Only show the steps relevant to the tools actually in the pipeline.
  // Always show all 4 for context, but adjust status:
  const completedSet = new Set(completedToolIds)
  let nextAssigned = false

  return PIPELINE_STEPS.map((def) => {
    const navState: Record<string, boolean> = {}
    if (def.requiresVideo && hasVideo) navState.useWorkflowVideo = true
    if (def.requiresSrt && hasSrt) navState.useWorkflowSrt = true

    // Already done?
    if (completedSet.has(def.toolId)) {
      return { def, status: 'completed' as StepStatus, navState }
    }
    // Is this the tool that just finished (current)?
    if (def.toolId === currentTool) {
      return { def, status: 'current' as StepStatus, navState }
    }
    // Requirements met and we haven't assigned "next" yet?
    const reqsMet =
      (!def.requiresVideo || hasVideo) && (!def.requiresSrt || hasSrt)
    if (reqsMet && !nextAssigned) {
      nextAssigned = true
      return { def, status: 'next' as StepStatus, navState }
    }
    // Requirements met but already have a "next"?
    if (reqsMet) {
      return { def, status: 'available' as StepStatus, navState }
    }
    // Requirements not met
    return { def, status: 'locked' as StepStatus, navState }
  })
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepConnector({ active }: { active: boolean }) {
  return (
    <div
      className={[
        'hidden sm:block shrink-0 h-px w-6 lg:w-10 mx-1 transition-colors duration-500',
        active
          ? 'bg-gradient-to-r from-violet-400 to-violet-300 dark:from-violet-500 dark:to-violet-400'
          : 'bg-gray-200 dark:bg-gray-700',
      ].join(' ')}
      aria-hidden
    />
  )
}

interface StepPillProps {
  step: ResolvedStep
  index: number
  onClick?: () => void
}

function StepPill({ step, index, onClick }: StepPillProps) {
  const Icon = STEP_ICONS[step.def.toolId] ?? FileText
  const { status, def } = step

  if (status === 'completed') {
    return (
      <motion.button
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        type="button"
        onClick={onClick}
        aria-label={`${def.label} — completed. Click to revisit.`}
        className="flex flex-col items-center gap-1.5 group outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:rounded-lg"
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700/50 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/60 transition-colors">
          <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} aria-hidden />
          </div>
          <span className="text-xs font-medium text-violet-700 dark:text-violet-300 whitespace-nowrap">
            {def.shortLabel}
          </span>
        </div>
      </motion.button>
    )
  }

  if (status === 'current') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        aria-current="step"
        className="flex flex-col items-center gap-1.5"
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-sm shadow-violet-500/20">
          <Icon className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={1.5} aria-hidden />
          <span className="text-xs font-semibold text-white whitespace-nowrap">
            {def.shortLabel}
          </span>
        </div>
      </motion.div>
    )
  }

  if (status === 'next') {
    return (
      <motion.button
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        type="button"
        onClick={onClick}
        aria-label={`Continue to ${def.label}`}
        className="relative flex flex-col items-center gap-1.5 group outline-none"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-xl ring-2 ring-violet-400/60 dark:ring-violet-500/50 animate-pulse pointer-events-none" aria-hidden />
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 shadow-md shadow-violet-500/25 group-hover:shadow-lg group-hover:shadow-violet-500/30 group-active:scale-[0.98] transition-all">
          <Icon className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={1.5} aria-hidden />
          <span className="text-xs font-semibold text-white whitespace-nowrap">
            {def.shortLabel}
          </span>
          <ArrowRight className="w-3 h-3 text-white/80 shrink-0" strokeWidth={2.5} aria-hidden />
        </div>
      </motion.button>
    )
  }

  if (status === 'available') {
    return (
      <motion.button
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        type="button"
        onClick={onClick}
        aria-label={`Go to ${def.label}`}
        className="flex flex-col items-center gap-1.5 group outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:rounded-lg"
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 group-hover:border-violet-300 dark:group-hover:border-violet-600 group-hover:text-violet-600 dark:group-hover:text-violet-300 group-hover:bg-violet-50/50 dark:group-hover:bg-violet-900/10 transition-all">
          <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          <span className="text-xs font-medium whitespace-nowrap">
            {def.shortLabel}
          </span>
        </div>
      </motion.button>
    )
  }

  // locked
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      aria-label={`${def.label} — not available yet`}
      className="flex flex-col items-center gap-1.5 opacity-35 cursor-not-allowed"
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
        <Icon className="w-3.5 h-3.5 shrink-0 text-gray-400" strokeWidth={1.5} aria-hidden />
        <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
          {def.shortLabel}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Completed celebration state ─────────────────────────────────────────────
function AllDoneState({ onStartNew }: { onStartNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={1.5} aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Workflow complete!</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">You've finished all steps.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onStartNew}
        className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline underline-offset-2 transition-colors whitespace-nowrap"
      >
        Start a new video →
      </button>
    </motion.div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function WorkflowPipelineBanner({
  currentTool,
  hasVideo,
  hasSrt,
  className = '',
}: WorkflowPipelineBannerProps) {
  const navigate = useNavigate()
  const workflow = useWorkflowOptional()

  const [snapshot, setSnapshot] = useState<WorkflowSnapshot>(getSnapshot)

  // Re-sync if workflowStore changes (e.g. on back-navigation)
  useEffect(() => {
    setSnapshot(getSnapshot())
  }, [currentTool])

  const completedToolIds = snapshot.steps.map((s) => s.toolId)
  const resolvedSteps = resolveSteps(currentTool, completedToolIds, hasVideo, hasSrt)

  // Are all pipeline steps completed?
  const allCompleted = resolvedSteps.every(
    (s) => s.status === 'completed' || s.status === 'current',
  )

  function handleStepClick(step: ResolvedStep) {
    if (step.status === 'locked') return
    navigate(step.def.pathname, { state: step.navState })
  }

  function handleStartNew() {
    workflow?.clearAll()
    navigate('/')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      role="navigation"
      aria-label="Workflow pipeline"
      className={[
        'w-full px-4 py-3.5',
        'bg-gradient-to-r from-violet-50/90 to-indigo-50/70',
        'dark:from-violet-900/10 dark:to-indigo-900/10',
        'border border-violet-100 dark:border-violet-800/30',
        'rounded-2xl',
        className,
      ].join(' ')}
    >
      <AnimatePresence mode="wait">
        {allCompleted ? (
          <AllDoneState key="done" onStartNew={handleStartNew} />
        ) : (
          <div
            key="pipeline"
            className="flex items-center justify-center gap-0 overflow-x-auto scrollbar-none"
          >
            {resolvedSteps.map((step, i) => {
              const isLast = i === resolvedSteps.length - 1
              const prevCompleted =
                i === 0 || resolvedSteps[i - 1]!.status === 'completed' || resolvedSteps[i - 1]!.status === 'current'
              return (
                <div key={step.def.toolId} className="flex items-center">
                  <StepPill
                    step={step}
                    index={i}
                    onClick={
                      step.status !== 'locked' && step.status !== 'current'
                        ? () => handleStepClick(step)
                        : undefined
                    }
                  />
                  {!isLast && (
                    <StepConnector active={prevCompleted && step.status !== 'locked'} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
