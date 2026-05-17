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
  CheckCircle2,
  Youtube,
  Linkedin,
  Wand2,
  Sparkles,
  Link2,
  FolderGit2,
  Clock3,
  BadgeCheck,
} from 'lucide-react'
import { ToolLayout } from '../components/figma/ToolLayout'
import { Checkbox } from '../components/figma/FormControls'

type Lang = 'original' | 'translated'
type ContextMode = 'podcast' | 'interview' | 'tutorial' | 'talking-head' | 'youtube'

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

const CONTEXT_OPTIONS: Array<{ key: ContextMode; label: string; hint: string }> = [
  { key: 'podcast', label: 'Podcast notes', hint: 'Long-form show notes + listener CTA' },
  { key: 'interview', label: 'Interview recap', hint: 'Guest-centric takeaways + quotes' },
  { key: 'tutorial', label: 'Tutorial summary', hint: 'Steps, outcomes, prerequisites' },
  { key: 'talking-head', label: 'Talking-head clip', hint: 'Opinion-led short-form copy' },
  { key: 'youtube', label: 'YouTube SEO', hint: 'Search-friendly description + chapters' },
]

const CONTEXT_OUTPUTS: Record<ContextMode, { headline: string; summary: string; focus: string[] }> = {
  podcast: {
    headline: 'Podcast-ready show notes',
    summary: 'This episode breaks down practical AI workflows for creators, including transcription, repurposing, and faster publishing loops.',
    focus: ['Episode TL;DR', 'Guest quote highlights', 'Resources + links', 'Listener CTA'],
  },
  interview: {
    headline: 'Interview recap optimized for authority',
    summary: 'A structured recap focused on the guest perspective, key frameworks, and quotable moments for social distribution.',
    focus: ['Guest bio angle', 'Top 5 insights', 'Direct quote pullouts', 'Follow-up question prompts'],
  },
  tutorial: {
    headline: 'Step-by-step tutorial brief',
    summary: 'A clean walkthrough with prerequisites, setup steps, expected outputs, and troubleshooting notes.',
    focus: ['Prerequisites', 'Step list with timestamps', 'Expected result', 'Troubleshooting'],
  },
  'talking-head': {
    headline: 'Talking-head script packaging',
    summary: 'High-retention framing for personal-brand videos with a stronger hook, opinion ladder, and end CTA.',
    focus: ['3-second hook', 'Contrarian angle', 'Proof/credibility line', 'Comment CTA'],
  },
  youtube: {
    headline: 'YouTube description + chapters',
    summary: 'SEO-aware copy with intent-matched opening lines, keyword clusters, and timestamp chapters.',
    focus: ['Primary keyword in first lines', 'Chapters block', 'Related keywords', 'Subscribe + lead magnet CTA'],
  },
}

const ASSET_PACK = [
  { label: 'YouTube titles', value: '7 generated', icon: Youtube },
  { label: 'SEO description', value: '1 publish-ready', icon: FileText },
  { label: 'X/Twitter thread', value: '12 posts', icon: Share2 },
  { label: 'LinkedIn post', value: '2 variants', icon: Linkedin },
  { label: 'Blog draft', value: '950 words', icon: Wand2 },
  { label: 'Shorts/Reels scripts', value: '3 hooks + timestamps', icon: Sparkles },
]

const COLLAB_COMMENTS = [
  { user: 'Maya (Editor)', text: 'Can we shorten the section at 02:14 and keep the quote at 02:38?', time: '2m ago', status: 'Open' },
  { user: 'Ari (Founder)', text: 'Approve title set B for YouTube + LinkedIn variant #2.', time: '6m ago', status: 'Resolved' },
  { user: 'Jen (Social)', text: 'Thread format is great. Add one stat in post #4 for credibility.', time: '11m ago', status: 'Open' },
]

const INGESTION_SOURCES = [
  { source: 'YouTube URL', state: 'Imported', eta: 'Done', icon: Youtube },
  { source: 'Loom link', state: 'Imported', eta: 'Done', icon: Link2 },
  { source: 'Google Drive file', state: 'Syncing', eta: '~16s', icon: FolderGit2 },
  { source: 'Zoom cloud recording', state: 'Queued', eta: '~48s', icon: Clock3 },
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
  const [contextMode, setContextMode] = useState<ContextMode>('youtube')
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
  const contextOutput = useMemo(() => CONTEXT_OUTPUTS[contextMode], [contextMode])

  return (
    <ToolLayout
      breadcrumbs={[{ label: 'Video → Transcript', href: '/video-to-transcript' }]}
      title="Transcript results (preview)"
      subtitle="Mock layout — toggles, translation, and exports are interactive; downloads are inert."
      icon={<FileText className="w-5 h-5 text-blue-600" />}
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
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
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
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col min-h-[420px]">
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
                        <span className="font-semibold text-blue-600 dark:text-blue-400 mr-2">{seg.speaker}:</span>
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-sm font-medium text-blue-800 dark:text-blue-200"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold ml-auto"
              >
                <Download className="w-4 h-4" />
                Download {lang === 'original' ? 'original' : 'translated'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
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
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Summary</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Mock AI summary: discussion covers ergonomic seating and cushion options for office use.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">More tools</p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <li>Speakers</li>
                <li>Chapters</li>
                <li>Highlights</li>
                <li>Keywords</li>
              </ul>
            </div>
          </aside>
        </div>

        <section className="space-y-6 rounded-xl border border-blue-200/70 dark:border-blue-900/50 bg-gradient-to-b from-blue-50/70 to-white dark:from-blue-950/20 dark:to-gray-900 p-4 sm:p-6">
          <header>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              Final results UX layer (all 4 ideas)
            </p>
            <h2 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">Post-transcript advantage workspace</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              This section appears under the original transcript output above and gives immediate publish + collaboration workflows.
            </p>
          </header>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-4 space-y-4">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">1) Context-aware output mode</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select the goal first, then shape summary and downstream assets automatically.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {CONTEXT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setContextMode(option.key)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${contextMode === option.key
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{option.label}</p>
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">{option.hint}</p>
                </button>
              ))}
            </div>
            <article className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Generated output</p>
              <h4 className="mt-1 text-base font-medium text-emerald-900 dark:text-emerald-200">{contextOutput.headline}</h4>
              <p className="mt-2 text-sm text-emerald-800/90 dark:text-emerald-200/90">{contextOutput.summary}</p>
              <ul className="mt-3 grid sm:grid-cols-2 gap-1.5">
                {contextOutput.focus.map((item) => (
                  <li key={item} className="inline-flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-4 space-y-4">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white">2) Repurposing asset pack</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">One click to generate publish-ready assets.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ASSET_PACK.map((asset) => {
                  const Icon = asset.icon
                  return (
                    <div key={asset.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <Icon className="h-4 w-4 text-blue-600" />
                        {asset.label}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{asset.value}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-4 space-y-4">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white">3) Collaboration layer</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inline comments + resolve workflow for editor/team handoff.</p>
              </div>
              <div className="space-y-2.5">
                {COLLAB_COMMENTS.map((comment) => (
                  <article key={`${comment.user}-${comment.time}`} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{comment.user}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${comment.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                        {comment.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{comment.text}</p>
                    <p className="mt-1 text-xs text-gray-400">{comment.time}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-4 space-y-3">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">4) Drop-anything ingestion</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paste links from anywhere and continue creating while ingestion runs in parallel.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {INGESTION_SOURCES.map((source) => {
                const Icon = source.icon
                return (
                  <article key={source.source} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      <Icon className="h-4 w-4 text-blue-600" />
                      {source.source}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Status: {source.state}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ETA: {source.eta}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Tip: Export as SRT to use in Premiere / YouTube subtitles.
        </p>
      </div>

      {/* Mock pinned audio bar (visual only) */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5"
        aria-hidden
      >
        <div className="pointer-events-none flex w-full max-w-5xl items-center gap-2 sm:gap-4 rounded-xl border border-[#2a2840] bg-[#0a0a1a] px-3 py-3 sm:px-5 shadow-[0_-8px_40px_rgba(0,0,0,0.4)] opacity-90">
          <button type="button" className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white" tabIndex={-1}>
            <Play className="h-5 w-5 ml-0.5" />
          </button>
          <span className="text-xs tabular-nums text-white min-w-[2.75rem]">0:08</span>
          <div className="flex-1 h-1.5 rounded-full bg-[#1e3a5f] min-w-0">
            <div className="h-full w-[25%] rounded-full bg-blue-600" />
          </div>
          <span className="text-xs tabular-nums text-white min-w-[2.75rem] text-right">0:32</span>
          <Volume2 className="w-5 h-5 text-white shrink-0" />
          <div className="hidden sm:block w-24 h-1.5 rounded-full bg-[#1e3a5f]">
            <div className="h-full w-[70%] rounded-full bg-blue-600" />
          </div>
          <Settings className="w-5 h-5 text-white shrink-0" />
        </div>
      </div>
    </ToolLayout>
  )
}
