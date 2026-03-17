import { Link } from 'react-router-dom'

interface FaqItem {
  q: string
  a: string
}

interface GuideStep {
  step: string
  desc: string
}

interface FreeToolLayoutProps {
  title: string
  description: string
  children: React.ReactNode
  guideTitle?: string
  guideSteps?: GuideStep[]
  faqs?: FaqItem[]
  relatedTools?: { label: string; path: string; desc: string }[]
}

const defaultRelated = [
  { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT from any video with AI' },
  { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'Full transcript with speakers & chapters' },
  { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 50+ languages' },
  { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'Auto-correct timing, overlaps & grammar' },
]

export default function FreeToolLayout({
  title,
  description,
  children,
  guideTitle,
  guideSteps = [],
  faqs = [],
  relatedTools = defaultRelated,
}: FreeToolLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero */}
      <div className="bg-gradient-to-b from-violet-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
            Free Tool — No account needed
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white leading-tight">
            {title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {description}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {/* The actual tool */}
        <section>{children}</section>

        {/* CTA strip */}
        <section className="rounded-2xl bg-violet-600 px-6 py-8 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-2">Need AI-powered subtitles?</p>
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-4">
            Generate subtitles automatically — just upload a video
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/video-to-subtitles"
              className="inline-block rounded-lg bg-white text-violet-700 font-semibold px-5 py-2.5 text-sm hover:bg-violet-50 transition-colors"
            >
              Generate subtitles free
            </Link>
            <Link
              to="/video-to-transcript"
              className="inline-block rounded-lg border border-white/50 text-white font-semibold px-5 py-2.5 text-sm hover:bg-violet-700 transition-colors"
            >
              Transcribe video instantly
            </Link>
          </div>
        </section>

        {/* Mini guide */}
        {guideSteps.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-5">
              {guideTitle ?? `How to use this tool`}
            </h2>
            <ol className="space-y-4">
              {guideSteps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-bold text-sm flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.step}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-5">Frequently Asked Questions</h2>
            <dl className="space-y-5">
              {faqs.map((f, i) => (
                <div key={i} className="border-b border-gray-100 dark:border-gray-700 pb-5 last:border-0 last:pb-0">
                  <dt className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5">{f.q}</dt>
                  <dd className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Related tools */}
        <section>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-5">Related VideoText Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedTools.map((t) => (
              <Link
                key={t.path}
                to={t.path}
                className="block rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors group"
              >
                <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 group-hover:underline">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
