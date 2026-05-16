import { useMemo, useState } from 'react'
import { CheckCircle2, FileText, Linkedin, Share2, Sparkles, Wand2, Youtube, BadgeCheck, Link2, FolderGit2, Clock3 } from 'lucide-react'

type ContextMode = 'podcast' | 'interview' | 'tutorial' | 'talking-head' | 'youtube'

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

const COMMENTS = [
  { user: 'Maya (Editor)', text: 'Can we shorten the section at 02:14 and keep the quote at 02:38?', time: '2m ago', status: 'Open' },
  { user: 'Ari (Founder)', text: 'Approve title set B for YouTube + LinkedIn variant #2.', time: '6m ago', status: 'Resolved' },
  { user: 'Jen (Social)', text: 'Thread format is great. Add one stat in post #4 for credibility.', time: '11m ago', status: 'Open' },
]

const SOURCES = [
  { source: 'YouTube URL', state: 'Imported', eta: 'Done', icon: Youtube },
  { source: 'Loom link', state: 'Imported', eta: 'Done', icon: Link2 },
  { source: 'Google Drive file', state: 'Syncing', eta: '~16s', icon: FolderGit2 },
  { source: 'Zoom cloud recording', state: 'Queued', eta: '~48s', icon: Clock3 },
]

export default function IcpResultsStudio() {
  const [mode, setMode] = useState<ContextMode>('youtube')
  const output = useMemo(() => CONTEXT_OUTPUTS[mode], [mode])

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12 space-y-6">
        <header className="rounded-2xl border border-blue-200/60 dark:border-blue-800/50 bg-white/90 dark:bg-gray-900/70 backdrop-blur p-6 shadow-sm">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <BadgeCheck className="h-3.5 w-3.5" />
            ICP Results Studio — UX concept
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            One transcript. Context-aware outputs. Publish-ready assets.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-3xl">
            This page demonstrates the cleanest post-transcript results UX for all four ideas: context-aware generation,
            multi-asset repurposing, collaboration comments, and drop-anything ingestion.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">1) Context-aware output mode</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Select the goal first, then shape summary and downstream assets automatically.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {CONTEXT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setMode(option.key)}
                className={`rounded-xl border px-3 py-3 text-left transition ${mode === option.key
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
            <h3 className="mt-1 text-base font-bold text-emerald-900 dark:text-emerald-200">{output.headline}</h3>
            <p className="mt-2 text-sm text-emerald-800/90 dark:text-emerald-200/90">{output.summary}</p>
            <ul className="mt-3 grid sm:grid-cols-2 gap-1.5">
              {output.focus.map((item) => (
                <li key={item} className="inline-flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">2) Repurposing asset pack</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">After transcript completion, generate a full distribution pack in one click.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ASSET_PACK.map((asset) => {
                const Icon = asset.icon
                return (
                  <div key={asset.label} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      <Icon className="h-4 w-4 text-blue-600" />
                      {asset.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{asset.value}</p>
                  </div>
                )
              })}
            </div>
            <button type="button" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-semibold">
              Generate 10 publish-ready assets
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">3) Collaboration layer</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inline transcript comments + resolve workflow for editor/team handoff.</p>
            </div>
            <div className="space-y-2.5">
              {COMMENTS.map((comment) => (
                <div key={`${comment.user}-${comment.time}`} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
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
                </div>
              ))}
            </div>
            <button type="button" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
              Open review mode
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/70 p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">4) Drop-anything ingestion</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Paste links from anywhere and queue them without format friction.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SOURCES.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.source} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Icon className="h-4 w-4 text-blue-600" />
                    {item.source}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Status: {item.state}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">ETA: {item.eta}</p>
                </article>
              )
            })}
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500 dark:text-gray-400">
            UX note: ingestion status lives in the same results page so users can keep generating while new sources process in parallel.
          </div>
        </section>
      </div>
    </main>
  )
}
