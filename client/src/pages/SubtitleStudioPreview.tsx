/**
 * Design preview of Subtitle Studio post-generate landing.
 * Visit /preview/subtitle-studio — not linked from production nav.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { ToolLayout } from '../components/figma/ToolLayout'
import SubtitleStudioPhaseRail, { type StudioPhase } from '../components/subtitleStudio/SubtitleStudioPhaseRail'
import StudioWorkspaceToolbar from '../components/subtitleStudio/StudioWorkspaceToolbar'
import BilingualCueStudio from '../components/subtitleStudio/BilingualCueStudio'
import ReviewEditingDesk from '../components/subtitleStudio/ReviewEditingDesk'
import FinalQaCheckpoint from '../components/subtitleStudio/FinalQaCheckpoint'
import StudioExportScreen from '../components/subtitleStudio/StudioExportScreen'
import type { SubtitleRow } from '../components/SubtitleEditor'
import { chipsByCueIndex } from '../lib/subtitleQaAssist'
import { LANGUAGES } from '../lib/languages'

const SOURCE: SubtitleRow[] = [
  { index: 1, startTime: '00:00:04,000', endTime: '00:00:08,000', text: 'We should probably start with the first example.' },
  { index: 2, startTime: '00:00:08,000', endTime: '00:00:12,000', text: "I agree, but there's one thing we should clarify first." },
  { index: 3, startTime: '00:00:12,200', endTime: '00:00:16,000', text: 'Sure — what did you have in mind?' },
  { index: 4, startTime: '00:00:16,200', endTime: '00:00:20,000', text: 'If we keep the timing locked, translation stays easy.' },
  { index: 5, startTime: '00:00:20,200', endTime: '00:00:24,000', text: 'Exactly. Then we can focus on the wording itself.' },
  { index: 6, startTime: '00:00:24,200', endTime: '00:00:28,000', text: 'This cue is intentionally a bit long so Smart Assist can flag hard-to-read pacing for the preview.' },
  { index: 7, startTime: '00:00:28,200', endTime: '00:00:30,000', text: 'Short.' },
]

const TRANSLATIONS: Record<string, SubtitleRow[]> = {
  Spanish: SOURCE.map((r, i) => ({
    ...r,
    text: [
      'Probablemente deberíamos empezar con el primer ejemplo.',
      'Estoy de acuerdo, pero hay algo que deberíamos aclarar primero.',
      'Claro — ¿qué tenías en mente?',
      'Si mantenemos el tiempo bloqueado, traducir es fácil.',
      'Exacto. Entonces podemos centrarnos en el texto.',
      'Esta pista es intencionalmente un poco larga.',
      'Corto.',
    ][i],
  })),
}

const PREVIEW_LANG_OPTIONS = LANGUAGES.filter((l) =>
  ['Spanish', 'French', 'German', 'Portuguese', 'Italian'].includes(l.value)
)

const TIMING_ADJUSTED = [1]
const REVIEW_FOCUS = 5

export default function SubtitleStudioPreview() {
  const [phase, setPhase] = useState<StudioPhase>('review')
  const [sourceRows, setSourceRows] = useState<SubtitleRow[]>(SOURCE)
  const [lanes, setLanes] = useState<Record<string, SubtitleRow[]>>({})
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null)
  const [focusCue, setFocusCue] = useState<number | null>(null)
  const [finalQaAccepted, setFinalQaAccepted] = useState(false)
  const [revision, setRevision] = useState(0)
  const [lastExportRevision, setLastExportRevision] = useState<number | null>(null)

  const completed = useMemo(() => {
    const list: StudioPhase[] = ['generate']
    if (phase !== 'review') list.push('review')
    if (Object.keys(lanes).length > 0) list.push('translate')
    if (phase === 'export') list.push('final')
    return list
  }, [phase, lanes])

  const cueChips = useMemo(() => chipsByCueIndex(sourceRows, TIMING_ADJUSTED), [sourceRows])
  const reviewItemCount = useMemo(() => {
    let n = 0
    cueChips.forEach((chips) => {
      if (chips.some((c) => c.kind === 'needs-review' || c.kind === 'hard-to-read')) n += 1
    })
    return n
  }, [cueChips])

  const targetRows = activeLanguage ? lanes[activeLanguage] ?? [] : []
  const showTranslateDesk =
    (phase === 'translate' || phase === 'final') && !!activeLanguage && targetRows.length > 0
  const exportUnlocked = reviewItemCount === 0 || finalQaAccepted
  const exportStale = lastExportRevision != null && revision > lastExportRevision

  const bump = () => {
    setRevision((n) => n + 1)
    setFinalQaAccepted(false)
  }

  const addLanguage = (lang: string) => {
    setLanes((prev) => ({
      ...prev,
      [lang]: prev[lang] ?? TRANSLATIONS[lang] ?? SOURCE.map((r) => ({ ...r, text: `[${lang}] ${r.text}` })),
    }))
    setActiveLanguage(lang)
    setPhase('translate')
  }

  const cueDesk = showTranslateDesk ? (
    <BilingualCueStudio
      videoSrc={null}
      sourceRows={sourceRows}
      targetRows={targetRows}
      sourceLabel="English"
      targetLabel={activeLanguage!}
      editable
      onTargetRowsChange={(next) => {
        setLanes((prev) => ({ ...prev, [activeLanguage!]: next }))
        bump()
      }}
    />
  ) : (
    <ReviewEditingDesk
      videoSrc={null}
      rows={sourceRows}
      editable
      onRowsChange={(rows) => {
        setSourceRows(rows)
        bump()
      }}
      cueChips={cueChips}
      focusCueIndex={focusCue}
    />
  )

  return (
    <ToolLayout
      breadcrumbs={[{ label: 'Video → Subtitles', href: '/video-to-subtitles' }]}
      title="Subtitle Studio (preview)"
      subtitle="Mock of Generate → Review → Translate → Final QA → Export"
      icon={<FileText className="h-5 w-5 text-blue-600" />}
      tags={['Preview', 'Mock data']}
    >
      <div className="mx-auto max-w-6xl space-y-4 pb-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-100">
          <span className="font-semibold">Design preview only.</span>{' '}
          Production flow lives on{' '}
          <Link to="/video-to-subtitles" className="font-medium underline">
            Video → Subtitles
          </Link>
          .
        </div>

        <div className="sticky top-0 z-30 space-y-0 overflow-hidden rounded-xl border border-gray-200 bg-white/95 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h1 className="mb-2 text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              Recording #16
            </h1>
            <SubtitleStudioPhaseRail
              active={phase}
              completed={completed}
              onSelect={(next) => {
                if (next === 'export' && !exportUnlocked) {
                  setPhase('final')
                  return
                }
                setPhase(next)
              }}
            />
          </div>
          {phase !== 'export' && (
            <StudioWorkspaceToolbar
              sourceLanguageLabel="English"
              activeLanguage={activeLanguage}
              languages={Object.keys(lanes)}
              languageOptions={PREVIEW_LANG_OPTIONS}
              onSelectLanguage={(lang) => {
                setActiveLanguage(lang)
                setPhase('translate')
              }}
              onAddLanguage={addLanguage}
              reviewItemCount={reviewItemCount}
              safeFixesApplied={8}
              onReviewItems={() => {
                setPhase('review')
                setFocusCue(REVIEW_FOCUS)
              }}
            />
          )}
        </div>

        {phase === 'export' ? (
          <StudioExportScreen
            lanes={[
              { id: 'source', label: 'English', rows: sourceRows },
              ...Object.entries(lanes).map(([lang, rows]) => ({ id: lang, label: lang, rows })),
            ]}
            exportStale={exportStale}
            exportUnlocked={exportUnlocked}
            onExportLane={() => setLastExportRevision(revision)}
          />
        ) : phase === 'final' ? (
          <div className="space-y-4">
            <FinalQaCheckpoint
              sourceRows={sourceRows}
              translatedRows={targetRows}
              translationLanguage={activeLanguage}
              accepted={finalQaAccepted}
              onAcceptRemaining={() => setFinalQaAccepted(true)}
              onFocusCue={(idx) => setFocusCue(idx)}
              onContinueToExport={() => {
                if (exportUnlocked) setPhase('export')
              }}
              exportUnlocked={exportUnlocked}
            />
            {cueDesk}
          </div>
        ) : (
          <div className="space-y-4">
            {cueDesk}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setPhase(
                    phase === 'review' && Object.keys(lanes).length > 0 ? 'translate' : 'final'
                  )
                }
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {phase === 'review' && Object.keys(lanes).length === 0
                  ? 'Continue to Final QA'
                  : phase === 'review'
                    ? 'Continue to Translate'
                    : 'Continue to Final QA'}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
