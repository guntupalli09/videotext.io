import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LucideIcon, Zap } from 'lucide-react'
import { resolveInternalLinkPath } from '../lib/primaryUrls'
import { motion } from 'framer-motion'

export interface ToolSuggestion {
  icon: LucideIcon
  title: string
  path: string
  /** Optional one-line description */
  description?: string
  /** State to pass when navigating (e.g. useWorkflowVideo so next tool pre-fills from workflow) */
  state?: object
  /** Run before navigating (e.g. set workflow SRT from current transcript); then navigate with state */
  onBeforeNavigate?: () => void
  /** Mark this suggestion as the recommended next action */
  recommended?: boolean
}

interface CrossToolSuggestionsProps {
  suggestions: ToolSuggestion[]
  /** Optional hint shown below the section title */
  workflowHint?: string
  /** When true, shows a "files pre-loaded" badge — set when workflow context has pre-filled files */
  hasPreloadedFiles?: boolean
}

export default function CrossToolSuggestions({
  suggestions,
  workflowHint,
  hasPreloadedFiles,
}: CrossToolSuggestionsProps) {
  const navigate = useNavigate()

  if (suggestions.length === 0) return null

  // Auto-feature the first card if none are explicitly marked
  const enriched = suggestions.map((s, i) => ({
    ...s,
    recommended: s.recommended ?? i === 0,
  }))

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="surface-card p-5 sm:p-6"
      aria-labelledby="continue-tool-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2
          id="continue-tool-heading"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          Continue your workflow
        </h2>
        {hasPreloadedFiles && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/50 text-[11px] text-violet-700 dark:text-violet-300 font-medium shrink-0">
            <Zap className="w-3 h-3" />
            Files pre-loaded
          </span>
        )}
      </div>

      {workflowHint && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4" aria-hidden="true">
          {workflowHint}
        </p>
      )}
      {!workflowHint && <div className="mb-4" />}

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {enriched.map((suggestion, index) => {
          const Icon = suggestion.icon
          const isRecommended = suggestion.recommended

          const inner = (
            <div className={`
              group relative flex items-center gap-3 p-4 rounded-xl w-full text-left
              border transition-all duration-200
              ${isRecommended
                ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/60 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-100/60 dark:hover:bg-violet-900/20 hover:shadow-sm'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-sm'
              }
            `}>
              {/* Icon */}
              <div className={`
                shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                ${isRecommended
                  ? 'bg-violet-100 dark:bg-violet-800/40 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/60'
                  : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                }
              `} aria-hidden>
                <Icon
                  className={`w-4 h-4 transition-colors ${isRecommended ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400'}`}
                  strokeWidth={1.75}
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium leading-snug transition-colors ${isRecommended ? 'text-violet-900 dark:text-violet-100' : 'text-gray-800 dark:text-gray-100'}`}>
                    {suggestion.title}
                  </span>
                  {isRecommended && index === 0 && (
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-600 text-white leading-none shrink-0">
                      Next
                    </span>
                  )}
                </div>
                {suggestion.description && (
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    {suggestion.description}
                  </span>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight
                className={`shrink-0 w-4 h-4 transition-all duration-200 group-hover:translate-x-0.5 ${isRecommended ? 'text-violet-400 dark:text-violet-500' : 'text-gray-300 dark:text-gray-600 group-hover:text-violet-400'}`}
                strokeWidth={2}
                aria-hidden
              />
            </div>
          )

          if (suggestion.onBeforeNavigate) {
            return (
              <motion.button
                key={suggestion.path}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => {
                  suggestion.onBeforeNavigate?.()
                  navigate(resolveInternalLinkPath(suggestion.path), { state: suggestion.state })
                }}
                className="text-left"
              >
                {inner}
              </motion.button>
            )
          }

          return (
            <motion.div
              key={suggestion.path}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
            >
              <Link
                to={resolveInternalLinkPath(suggestion.path)}
                state={suggestion.state}
                className="block"
              >
                {inner}
              </Link>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
