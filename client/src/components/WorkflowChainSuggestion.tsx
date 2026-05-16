/**
 * Renders a single inline "next step" action from getTexTrigger when a job just completed.
 * UI only; no business logic. Shows at most one suggestion (no stacking).
 */

import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getTexTrigger } from '../tex'

export interface WorkflowChainSuggestionProps {
  pathname: string
  plan: string
  /** Set when this page completed a job (e.g. 'video-to-transcript'). */
  lastJobCompletedToolId?: string | null
  className?: string
}

export default function WorkflowChainSuggestion({
  pathname,
  plan,
  lastJobCompletedToolId,
  className = '',
}: WorkflowChainSuggestionProps) {
  const navigate = useNavigate()
  const trigger = lastJobCompletedToolId
    ? getTexTrigger({
        pathname,
        plan,
        lastJobCompletedToolId,
      })
    : null

  if (!trigger?.link) return null

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => navigate(trigger.link!.path)}
        className="inline-flex items-center gap-2 h-11 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-motion active:translate-y-px"
      >
        {trigger.link.label}
        <ArrowRight className="h-5 w-5 text-gray-400" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  )
}
