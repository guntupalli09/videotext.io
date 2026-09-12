import { AlertTriangle, Sparkles } from 'lucide-react'
import LanguageLaneBar from './LanguageLaneBar'

interface StudioWorkspaceToolbarProps {
  sourceLanguageLabel: string
  activeLanguage: string | null
  languages: string[]
  languageOptions: { value: string; label: string }[]
  onSelectLanguage: (language: string) => void
  onAddLanguage: (language: string) => void
  reviewItemCount: number
  onReviewItems?: () => void
  /** Optional compact note about safe auto-fixes. */
  safeFixesApplied?: number
}

/**
 * Workspace toolbar: language lane controls + ambient Smart Assist summary.
 * Keep translation and QA discoverable without scrolling past the cue list.
 * Parent sticky shell should pin this with the project header.
 */
export default function StudioWorkspaceToolbar({
  sourceLanguageLabel,
  activeLanguage,
  languages,
  languageOptions,
  onSelectLanguage,
  onAddLanguage,
  reviewItemCount,
  onReviewItems,
  safeFixesApplied = 0,
}: StudioWorkspaceToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-white/95 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/95">
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{sourceLanguageLabel}</span>
      <span className="hidden text-gray-300 sm:inline dark:text-gray-600" aria-hidden>
        |
      </span>

      <LanguageLaneBar
        activeLanguage={activeLanguage}
        languages={languages}
        languageOptions={languageOptions}
        onSelectLanguage={onSelectLanguage}
        onAddLanguage={onAddLanguage}
        compact
      />

      <span className="hidden text-gray-300 sm:inline dark:text-gray-600" aria-hidden>
        |
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {safeFixesApplied > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {safeFixesApplied} auto-fixed
          </span>
        )}
        <button
          type="button"
          onClick={onReviewItems}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            reviewItemCount > 0
              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60'
              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}
        >
          {reviewItemCount > 0 ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Smart Assist: {reviewItemCount} item{reviewItemCount === 1 ? '' : 's'} need review
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Smart Assist: clear
            </>
          )}
        </button>
      </div>
    </div>
  )
}
