import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'

interface SmartAssistCardProps {
  safeFixesApplied: number
  reviewCueCount: number
  onReviewCues?: () => void
}

export default function SmartAssistCard({
  safeFixesApplied,
  reviewCueCount,
  onReviewCues,
}: SmartAssistCardProps) {
  return (
    <section
      aria-label="Smart Assist"
      className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Smart Assist</h3>
      </div>
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {safeFixesApplied > 0
              ? `${safeFixesApplied} safe fix${safeFixesApplied === 1 ? '' : 'es'} handled automatically`
              : 'Timing looks clean — no safe fixes needed'}
          </span>
        </li>
        <li className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {reviewCueCount > 0 ? (
            <button
              type="button"
              onClick={onReviewCues}
              className="text-left font-medium underline-offset-2 hover:underline"
            >
              {reviewCueCount} cue{reviewCueCount === 1 ? '' : 's'} need your review
            </button>
          ) : (
            <span>Nothing needs your review</span>
          )}
        </li>
      </ul>
    </section>
  )
}
