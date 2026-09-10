import { AlertTriangle, Check, ChevronRight } from 'lucide-react'
import type { SubtitleRow } from '../SubtitleEditor'
import { runAssistValidation } from '../../lib/subtitleQaAssist'

export type FinalQaCheck = {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail?: string
  cueIndex?: number
}

type Props = {
  sourceRows: SubtitleRow[]
  translatedRows: SubtitleRow[]
  translationLanguage: string | null
  accepted: boolean
  onAcceptRemaining: () => void
  onFocusCue: (cueIndex: number) => void
  onContinueToExport: () => void
  exportUnlocked: boolean
}

/**
 * Final QA checkpoint before Export.
 * Operates on the live project cues — not a copied SRT.
 */
export default function FinalQaCheckpoint({
  sourceRows,
  translatedRows,
  translationLanguage,
  accepted,
  onAcceptRemaining,
  onFocusCue,
  onContinueToExport,
  exportUnlocked,
}: Props) {
  const issues = runAssistValidation(sourceRows)
  const overlaps = issues.filter((i) => i.type === 'overlap')
  const timingFails = issues.filter((i) => i.type === 'bad-timing' || i.type === 'short-duration')
  const reviewIssues = issues.filter((i) => !i.autoFixable)
  const reviewCueCount = new Set(reviewIssues.map((i) => i.cueIndex)).size

  const translationOk =
    !translationLanguage ||
    (translatedRows.length > 0 && translatedRows.length === sourceRows.length)

  const checks: FinalQaCheck[] = [
    {
      id: 'timing',
      label: 'Timing checks',
      status: timingFails.length === 0 ? 'pass' : 'warn',
      detail:
        timingFails.length === 0
          ? 'passed'
          : `${timingFails.length} cue${timingFails.length === 1 ? '' : 's'} need timing attention`,
      cueIndex: timingFails[0]?.cueIndex,
    },
    {
      id: 'overlaps',
      label: 'No overlaps',
      status: overlaps.length === 0 ? 'pass' : 'fail',
      detail:
        overlaps.length === 0
          ? 'passed'
          : `${overlaps.length} overlap${overlaps.length === 1 ? '' : 's'} found`,
      cueIndex: overlaps[0]?.cueIndex,
    },
    {
      id: 'translation',
      label: translationLanguage ? `Translation reviewed (${translationLanguage})` : 'Translation',
      status: !translationLanguage ? 'pass' : translationOk ? 'pass' : 'warn',
      detail: !translationLanguage
        ? 'skipped — source only'
        : translationOk
          ? 'reviewed'
          : 'translation incomplete',
    },
    {
      id: 'attention',
      label: 'Cues needing attention',
      status: reviewCueCount === 0 || accepted ? 'pass' : 'warn',
      detail:
        reviewCueCount === 0
          ? 'clear'
          : accepted
            ? `${reviewCueCount} accepted`
            : `${reviewCueCount} cue${reviewCueCount === 1 ? '' : 's'} need attention`,
      cueIndex: reviewIssues[0]?.cueIndex,
    },
  ]

  const blocking = checks.some((c) => c.status === 'fail')
  const warnings = checks.filter((c) => c.status === 'warn')

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Final QA</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Last checkpoint on the live project. Fixes autosave and flow into Export.
        </p>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {check.status === 'pass' ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 ${
                      check.status === 'fail' ? 'text-red-500' : 'text-amber-500'
                    }`}
                    aria-hidden
                  />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {check.status === 'pass' ? '✓ ' : check.status === 'fail' ? '✕ ' : '⚠ '}
                  {check.label}
                  {check.status === 'pass' && check.detail === 'passed' ? ' passed' : ''}
                </span>
              </div>
              {check.detail && check.detail !== 'passed' && (
                <p className="mt-0.5 pl-6 text-xs text-gray-500 dark:text-gray-400">{check.detail}</p>
              )}
            </div>
            {check.cueIndex != null && check.status !== 'pass' && (
              <button
                type="button"
                onClick={() => onFocusCue(check.cueIndex!)}
                className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Jump to cue
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        {warnings.length > 0 && !accepted && !blocking && (
          <button
            type="button"
            onClick={onAcceptRemaining}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          >
            Accept remaining warnings
          </button>
        )}
        <button
          type="button"
          disabled={!exportUnlocked}
          onClick={onContinueToExport}
          className="ml-auto inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Export
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {!exportUnlocked && (
          <p className="w-full text-[11px] text-gray-500 dark:text-gray-400">
            Resolve failed checks or accept remaining warnings to unlock Export.
          </p>
        )}
      </div>
    </div>
  )
}
