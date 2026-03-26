/**
 * Static mock of the planned unified transcript results workspace.
 * Visit /preview/transcript-results — not linked from production nav (design preview only).
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Search,
  Download,
  Copy,
  Share2,
  Pencil,
  ChevronDown,
  Play,
  Volume2,
  Settings,
  FileText,
} from 'lucide-react'
import { ToolLayout } from '../components/figma/ToolLayout'
import { Checkbox } from '../components/figma/FormControls'

type Lang = 'original' | 'translated'

const MOCK_SEGMENTS = [
  {
    start: 0,
    end: 4,
    speaker: 'Speaker 1',
    original: 'Welcome everyone. Today we will cover the ergonomic setup for long sessions.',
    translated: 'Bienvenidos a todos. Hoy cubriremos la configuración ergonómica para sesiones largas.',
  },
  {
    start: 4,
    end: 12,
    speaker: 'Speaker 2',
    original: 'Thanks. First, adjust your seat height so your feet rest flat on the floor.',
    translated: 'Gracias. Primero, ajuste la altura del asiento para que los pies apoyen en el suelo.',
  },
  {
    start: 12,
    end: 22,
    speaker: 'Speaker 1',
    original: 'Memory foam cushions can help with posture. Let us know if you have questions.',
    translated: 'Los cojines de espuma viscoelástica pueden ayudar con la postura. Avísenos si tienen preguntas.',
  },
]

function formatTs(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function TranscriptResultWorkspaceMock() {
  const [lang, setLang] = useState<Lang>('original')
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [showSpeakers, setShowSpeakers] = useState(true)
  const [search, setSearch] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [exportKind, setExportKind] = useState<'txt' | 'srt' | 'vtt'>('txt')

  const plainText = useMemo(() => {
    return MOCK_SEGMENTS.map((s) => (lang === 'translated' ? s.translated : s.original)).join('\n\n')
  }, [lang])

  const filteredSegments = useMemo(() => {
    if (!search.trim()) return MOCK_SEGMENTS
    const q = search.toLowerCase()
    return MOCK_SEGMENTS.filter((s) => {
      const t = lang === 'translated' ? s.translated : s.original
      return t.toLowerCase().includes(q)
    })
  }, [lang, search])

  return (
    <ToolLayout
      breadcrumbs={[{ label: 'Video → Transcript', href: '/video-to-transcript' }]}
      title="Transcript results (preview)"
      subtitle="Mock layout — toggles, translation, and exports are interactive; downloads are inert."
      icon={<FileText className="w-5 h-5 text-violet-600" />}
      tags={['Preview', 'Mock data']}
    >
      <div className="max-w-6xl mx-auto space-y-4 pb-28">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/25 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          <span className="font-semibold">Design preview only.</span>{' '}
          This page shows the planned unified workspace.{' '}
          <Link to="/video-to-transcript" className="underline font-medium">
            Open the real tool →
          </Link>
        </div>

        {/* Status strip */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Check className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="font-semibold text-gray-900 dark:text-white">Transcript ready</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            demo-video.mp4 · 106 words · 7 segments · ~1 min read · 32s audio
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] items-start">
          {/* Main column */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col min-h-[420px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50/80 dark:bg-gray-950/50">
              <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setLang('original')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    lang === 'original'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setLang('translated')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    lang === 'translated'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  Spanish
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Checkbox checked={showTimestamps} onChange={setShowTimestamps} label="Show timestamps" />
                <Checkbox checked={showSpeakers} onChange={setShowSpeakers} label="Show speakers" />
              </div>
            </div>

            <div className="p-4 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Find in transcript…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <Share2 className="w-4 h-4" />
                Share transcript
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 max-h-[min(52vh,560px)] bg-white dark:bg-gray-900">
              {!showTimestamps && !showSpeakers ? (
                <p className="text-[17px] leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {plainText}
                </p>
              ) : (
                <div className="space-y-5 max-w-[52rem]">
                  {filteredSegments.map((seg, i) => (
                    <p key={i} className="text-[17px] leading-relaxed text-gray-900 dark:text-gray-100">
                      {showTimestamps && (
                        <span className="mr-2 inline-block shrink-0 align-baseline text-xs font-mono tabular-nums text-gray-500">
                          ({formatTs(seg.start)})
                        </span>
                      )}
                      {showSpeakers && (
                        <span className="font-semibold text-violet-600 dark:text-violet-400 mr-2">{seg.speaker}:</span>
                      )}
                      {lang === 'translated' ? seg.translated : seg.original}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex flex-wrap gap-2 bg-gray-50/50 dark:bg-gray-950/40">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-sm font-medium text-violet-800 dark:text-violet-200"
                >
                  Export
                  <ChevronDown className="w-4 h-4" />
                </button>
                {exportOpen && (
                  <div className="absolute bottom-full left-0 mb-1 z-20 min-w-[220px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-2 text-sm">
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Language
                    </div>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setLang('original')}
                    >
                      Original {lang === 'original' ? '✓' : ''}
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setLang('translated')}
                    >
                      Spanish {lang === 'translated' ? '✓' : ''}
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Format
                    </div>
                    {(['txt', 'srt', 'vtt'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 uppercase"
                        onClick={() => setExportKind(fmt)}
                      >
                        {fmt} {exportKind === fmt ? '✓' : ''}
                      </button>
                    ))}
                    <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100 dark:border-gray-700">
                      Selected: {lang === 'original' ? 'Original' : 'Spanish'} · {exportKind.toUpperCase()} (mock)
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold ml-auto"
              >
                <Download className="w-4 h-4" />
                Download {lang === 'original' ? 'original' : 'translated'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick download</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium"
                >
                  Download transcript · Original
                </button>
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm font-medium text-blue-800 dark:text-blue-200"
                >
                  Download transcript · Spanish
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Summary</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Mock AI summary: discussion covers ergonomic seating and cushion options for office use.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">More tools</p>
              <ul className="text-xs text-violet-600 dark:text-violet-400 space-y-1">
                <li>Speakers</li>
                <li>Chapters</li>
                <li>Highlights</li>
                <li>Keywords</li>
              </ul>
            </div>
          </aside>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Tip: Export as SRT to use in Premiere / YouTube subtitles.
        </p>
      </div>

      {/* Mock pinned audio bar (visual only) */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5"
        aria-hidden
      >
        <div className="pointer-events-none flex w-full max-w-5xl items-center gap-2 sm:gap-4 rounded-2xl border border-[#2a2840] bg-[#0a0a1a] px-3 py-3 sm:px-5 shadow-[0_-8px_40px_rgba(0,0,0,0.4)] opacity-90">
          <button type="button" className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white" tabIndex={-1}>
            <Play className="h-5 w-5 ml-0.5" />
          </button>
          <span className="text-xs tabular-nums text-white min-w-[2.75rem]">0:08</span>
          <div className="flex-1 h-1.5 rounded-full bg-[#3d3555] min-w-0">
            <div className="h-full w-[25%] rounded-full bg-violet-600" />
          </div>
          <span className="text-xs tabular-nums text-white min-w-[2.75rem] text-right">0:32</span>
          <Volume2 className="w-5 h-5 text-white shrink-0" />
          <div className="hidden sm:block w-24 h-1.5 rounded-full bg-[#3d3555]">
            <div className="h-full w-[70%] rounded-full bg-violet-600" />
          </div>
          <Settings className="w-5 h-5 text-white shrink-0" />
        </div>
      </div>
    </ToolLayout>
  )
}
