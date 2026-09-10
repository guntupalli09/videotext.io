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
import ReviewEditingDesk from '../components/subtitleStudio/ReviewEditingDesk'
import LanguageLaneBar from '../components/subtitleStudio/LanguageLaneBar'
import type { SubtitleRow } from '../components/SubtitleEditor'
import { LANGUAGES } from '../lib/languages'

const SOURCE: SubtitleRow[] = [
  { index: 1, startTime: '00:00:04,000', endTime: '00:00:08,000', text: 'We should probably start with the first example.' },
  { index: 2, startTime: '00:00:08,000', endTime: '00:00:12,000', text: "I agree, but there's one thing we should clarify first." },
  { index: 3, startTime: '00:00:12,200', endTime: '00:00:16,000', text: 'Sure — what did you have in mind?' },
  { index: 4, startTime: '00:00:16,200', endTime: '00:00:20,000', text: 'If we keep the timing locked, translation stays easy.' },
  { index: 5, startTime: '00:00:20,200', endTime: '00:00:24,000', text: 'Exactly. Then we can focus on the wording itself.' },
]

const TRANSLATIONS: Record<string, SubtitleRow[]> = {
  Spanish: [
    { index: 1, startTime: '00:00:04,000', endTime: '00:00:08,000', text: 'Probablemente deberíamos empezar con el primer ejemplo.' },
    { index: 2, startTime: '00:00:08,000', endTime: '00:00:12,000', text: 'Estoy de acuerdo, pero hay algo que deberíamos aclarar primero.' },
    { index: 3, startTime: '00:00:12,200', endTime: '00:00:16,000', text: 'Claro — ¿qué tenías en mente?' },
    { index: 4, startTime: '00:00:16,200', endTime: '00:00:20,000', text: 'Si mantenemos el tiempo bloqueado, traducir es fácil.' },
    { index: 5, startTime: '00:00:20,200', endTime: '00:00:24,000', text: 'Exacto. Entonces podemos centrarnos en el texto.' },
  ],
  French: [
    { index: 1, startTime: '00:00:04,000', endTime: '00:00:08,000', text: 'On devrait probablement commencer par le premier exemple.' },
    { index: 2, startTime: '00:00:08,000', endTime: '00:00:12,000', text: "Je suis d'accord, mais il y a une chose à clarifier d'abord." },
    { index: 3, startTime: '00:00:12,200', endTime: '00:00:16,000', text: "Bien sûr — qu'est-ce que tu avais en tête ?" },
    { index: 4, startTime: '00:00:16,200', endTime: '00:00:20,000', text: 'Si on garde le timing verrouillé, la traduction reste simple.' },
    { index: 5, startTime: '00:00:20,200', endTime: '00:00:24,000', text: 'Exactement. On peut alors se concentrer sur le texte.' },
  ],
  German: [
    { index: 1, startTime: '00:00:04,000', endTime: '00:00:08,000', text: 'Wir sollten wahrscheinlich mit dem ersten Beispiel beginnen.' },
    { index: 2, startTime: '00:00:08,000', endTime: '00:00:12,000', text: 'Ich stimme zu, aber es gibt eine Sache, die wir zuerst klären sollten.' },
    { index: 3, startTime: '00:00:12,200', endTime: '00:00:16,000', text: 'Klar — was hattest du im Sinn?' },
    { index: 4, startTime: '00:00:16,200', endTime: '00:00:20,000', text: 'Wenn wir das Timing sperren, bleibt Übersetzen einfach.' },
    { index: 5, startTime: '00:00:20,200', endTime: '00:00:24,000', text: 'Genau. Dann können wir uns auf den Text konzentrieren.' },
  ],
}

const PREVIEW_LANG_OPTIONS = LANGUAGES.filter((l) =>
  ['Spanish', 'French', 'German', 'Portuguese', 'Italian'].includes(l.value)
)

export default function SubtitleStudioPreview() {
  const [phase, setPhase] = useState<StudioPhase>('review')
  const [sourceRows, setSourceRows] = useState<SubtitleRow[]>(SOURCE)
  const [lanes, setLanes] = useState<Record<string, SubtitleRow[]>>({})
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null)

  const completed = useMemo(() => {
    const list: StudioPhase[] = ['generate']
    if (phase !== 'review') list.push('review')
    if (Object.keys(lanes).length > 0) list.push('translate')
    if (phase === 'export') list.push('final')
    return list
  }, [phase, lanes])

  const targetRows = activeLanguage ? lanes[activeLanguage] ?? [] : []
  const showTranslateDesk = phase === 'translate' && activeLanguage && targetRows.length > 0

  const addLanguage = (lang: string) => {
    setLanes((prev) => ({
      ...prev,
      [lang]: prev[lang] ?? TRANSLATIONS[lang] ?? SOURCE.map((r) => ({ ...r, text: `[${lang}] ${r.text}` })),
    }))
    setActiveLanguage(lang)
    setPhase('translate')
  }

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
            {showTranslateDesk ? (
              <BilingualCueStudio
                videoSrc={null}
                sourceRows={sourceRows}
                targetRows={targetRows}
                sourceLabel="English"
                targetLabel={activeLanguage!}
                editable
                onTargetRowsChange={(next) =>
                  setLanes((prev) => ({ ...prev, [activeLanguage!]: next }))
                }
              />
            ) : (
              <ReviewEditingDesk
                videoSrc={null}
                rows={sourceRows}
                editable
                onRowsChange={setSourceRows}
                reviewCueIndices={[1, 3]}
              />
            )}

            <SmartAssistCard
              safeFixesApplied={8}
              reviewCueCount={2}
              onReviewCues={() => setPhase('review')}
            />

            <LanguageLaneBar
              activeLanguage={activeLanguage}
              languages={Object.keys(lanes)}
              languageOptions={PREVIEW_LANG_OPTIONS}
              onSelectLanguage={(lang) => {
                setActiveLanguage(lang)
                setPhase('translate')
              }}
              onAddLanguage={addLanguage}
            />
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
