/**
 * Design preview of Subtitle Studio post-generate landing.
 * Visit /preview/subtitle-studio — not linked from production nav.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { ToolLayout } from '../components/figma/ToolLayout'
import SubtitleStudioPhaseRail, { type StudioPhase } from '../components/subtitleStudio/SubtitleStudioPhaseRail'
import SmartAssistCard from '../components/subtitleStudio/SmartAssistCard'
import BilingualCueStudio from '../components/subtitleStudio/BilingualCueStudio'
import type { SubtitleRow } from '../components/SubtitleEditor'
import { LANGUAGES } from '../lib/languages'

const SOURCE: SubtitleRow[] = [
  { index: 1, startTime: '00:00:04,000', endTime: '00:00:08,000', text: 'We should probably start with the first example.' },
  { index: 2, startTime: '00:00:08,000', endTime: '00:00:12,000', text: "I agree, but there's one thing we should clarify first." },
  { index: 3, startTime: '00:00:12,200', endTime: '00:00:16,000', text: 'Sure — what did you have in mind?' },
]

const SPANISH: SubtitleRow[] = [
  { index: 1, startTime: '00:00:04,000', endTime: '00:00:08,000', text: 'Probablemente deberíamos empezar con el primer ejemplo.' },
  { index: 2, startTime: '00:00:08,000', endTime: '00:00:12,000', text: 'Estoy de acuerdo, pero hay algo que deberíamos aclarar primero.' },
  { index: 3, startTime: '00:00:12,200', endTime: '00:00:16,000', text: 'Claro — ¿qué tenías en mente?' },
]

export default function SubtitleStudioPreview() {
  const [phase, setPhase] = useState<StudioPhase>('review')
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null)
  const [targetRows, setTargetRows] = useState<SubtitleRow[]>([])

  const completed = useMemo(() => {
    const list: StudioPhase[] = ['generate']
    if (phase !== 'review') list.push('review')
    if (targetRows.length > 0) list.push('translate')
    if (phase === 'export') list.push('final')
    return list
  }, [phase, targetRows.length])

  return (
    <ToolLayout
      breadcrumbs={[{ label: 'Video → Subtitles', href: '/video-to-subtitles' }]}
      title="Subtitle Studio (preview)"
      subtitle="Mock of the Natalia continuous workflow after Generate."
      icon={<FileText className="h-5 w-5 text-blue-600" />}
      tags={['Preview', 'Mock data']}
    >
      <div className="mx-auto max-w-5xl space-y-4 pb-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-100">
          <span className="font-semibold">Design preview only.</span>{' '}
          Production flow lives on{' '}
          <Link to="/video-to-subtitles" className="font-medium underline">
            Video → Subtitles
          </Link>
          .
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="mb-3 text-xl font-medium tracking-tight text-gray-900 dark:text-white">Recording #16</h1>
          <SubtitleStudioPhaseRail active={phase} completed={completed} onSelect={setPhase} />

          <div className="mt-4 space-y-4">
            {targetRows.length > 0 && translationLanguage ? (
              <BilingualCueStudio
                videoSrc={null}
                sourceRows={SOURCE}
                targetRows={targetRows}
                sourceLabel="English"
                targetLabel={translationLanguage}
                editable
                onTargetRowsChange={setTargetRows}
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-1 lg:grid-cols-[38%_1fr]">
                  <div className="flex aspect-video items-center justify-center bg-gray-950 text-sm text-gray-400 lg:aspect-auto lg:min-h-[320px]">
                    VIDEO
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {SOURCE.map((cue) => (
                      <div key={cue.index} className="px-4 py-3">
                        <div className="mb-1 font-mono text-[11px] tabular-nums text-gray-400">
                          {cue.startTime.replace(',', '.')} → {cue.endTime.replace(',', '.')}
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-100">{cue.text}</p>
                        {cue.index === 1 && (
                          <p className="mt-1 text-[11px] font-medium text-emerald-600">✓ Saved</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <SmartAssistCard safeFixesApplied={8} reviewCueCount={2} onReviewCues={() => setPhase('review')} />

            {!translationLanguage ? (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium text-gray-800 dark:text-gray-100">+ Add translation</label>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) return
                    setTranslationLanguage(v)
                    setTargetRows(v === 'Spanish' ? SPANISH : SPANISH.map((r) => ({ ...r, text: `[${v}] ${r.text}` })))
                    setPhase('translate')
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Choose language…</option>
                  {LANGUAGES.filter((l) => ['Spanish', 'French', 'German', 'English'].includes(l.value)).map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
