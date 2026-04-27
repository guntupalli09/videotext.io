import { CheckCircle2, Circle, Sparkles } from 'lucide-react'
import { trackAppEvent } from '../lib/feedbackEvents'

interface ActivationWizardCardProps {
  completed: boolean
}

export default function ActivationWizardCard({ completed }: ActivationWizardCardProps) {
  const steps = [
    'Upload a short sample clip (30–90s).',
    'Run transcript + summary in one click.',
    'Export TXT or SRT to complete activation.',
  ]

  return (
    <div className="mb-4 rounded-2xl border border-violet-700/40 bg-gradient-to-br from-violet-950/60 to-zinc-900 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-violet-300/80">Activation Wizard</p>
          <h3 className="text-sm font-semibold text-white mt-1">Ship your first output in under 2 minutes</h3>
        </div>
        <Sparkles className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
      </div>

      <div className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2 text-xs text-zinc-200">
            {completed && i < 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-zinc-500" />}
            <span>{step}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-400">Goal: move free-user activation from 10% to 25%.</p>
      {completed && (
        <button
          type="button"
          onClick={() => trackAppEvent('activation_wizard_completed', { source: 'video_to_transcript' })}
          className="mt-3 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300"
        >
          Mark wizard complete
        </button>
      )}
    </div>
  )
}
