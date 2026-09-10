import { Check } from 'lucide-react'

export type StudioPhase = 'generate' | 'review' | 'translate' | 'final' | 'export'

const PHASES: { id: StudioPhase; label: string }[] = [
  { id: 'generate', label: 'Generate' },
  { id: 'review', label: 'Review' },
  { id: 'translate', label: 'Translate' },
  { id: 'final', label: 'Final QA' },
  { id: 'export', label: 'Export' },
]

interface SubtitleStudioPhaseRailProps {
  active: StudioPhase
  completed: StudioPhase[]
  onSelect?: (phase: StudioPhase) => void
}

export default function SubtitleStudioPhaseRail({
  active,
  completed,
  onSelect,
}: SubtitleStudioPhaseRailProps) {
  return (
    <nav
      aria-label="Subtitle workflow"
      className="flex flex-wrap items-center gap-1"
    >
      {PHASES.map((phase, index) => {
        const isDone = completed.includes(phase.id)
        const isActive = active === phase.id
        return (
          <div key={phase.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect?.(phase.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : isDone
                    ? 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              {isDone && !isActive ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              ) : isActive ? (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              ) : null}
              {phase.label}
            </button>
            {index < PHASES.length - 1 && (
              <span className="mx-0.5 hidden text-gray-300 sm:inline dark:text-gray-600" aria-hidden>
                ·
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
