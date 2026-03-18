/**
 * SEO landing page: /notta-alternative
 * Targets: "notta alternative", "notta ai alternative", "notta vs videotext",
 *          "free notta alternative", "notta 3 minute limit alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $10/mo', competitor: 'Free / $13.99/mo' },
  { label: 'Max duration per file (free tier)', videotext: 'No limit', competitor: '3 minutes' },
  { label: 'Monthly allowance (free tier)', videotext: '3 full imports', competitor: '120 min/month' },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (50+ languages)', videotext: true, competitor: false },
  { label: 'Burn captions into video', videotext: true, competitor: false },
  { label: 'Chapter auto-generation', videotext: true, competitor: false },
  { label: 'Keyword index across transcript', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'No account needed to try', videotext: true, competitor: false },
  { label: 'Speaker detection', videotext: true, competitor: true },
  { label: 'YouTube URL → transcript', videotext: true, competitor: true },
  { label: 'Live meeting bot integration', videotext: false, competitor: true },
  { label: 'Whisper accuracy', videotext: '~98.5%', competitor: '~91%' },
]

const FAQ = [
  {
    q: 'What is Notta\'s 3-minute limit and how does VideoText avoid it?',
    a: 'Notta\'s free tier limits each individual transcription to 3 minutes of audio. A 60-minute meeting would only produce the first 3 minutes as a transcript. VideoText has no per-file duration cap on the free tier — upload a 2-hour lecture or a 90-minute meeting and get the full transcript.',
  },
  {
    q: 'Does VideoText have a monthly transcription limit like Notta?',
    a: 'VideoText free tier gives you 3 full-length imports per month — no per-minute cap. Notta free tier gives 120 minutes per month but caps each file at 3 minutes. For most users, VideoText\'s model is more practical for real-world recording lengths.',
  },
  {
    q: 'Does VideoText support the same file formats as Notta?',
    a: 'Yes. VideoText accepts MP4, MOV, AVI, WebM, MKV (video) and MP3, WAV, M4A, AAC, OGG, FLAC (audio) — all the formats Notta supports, plus more video container formats.',
  },
  {
    q: 'Can VideoText replace Notta for meeting transcription?',
    a: 'For file-based transcription (uploaded recordings) — yes. VideoText transcribes downloaded Zoom, Teams, Google Meet, or any other meeting recordings with speaker labels and summary. Notta also has a live meeting bot that joins calls in real time — VideoText does not offer that feature.',
  },
  {
    q: 'Does VideoText export SRT files like Notta?',
    a: 'Yes — and unlike Notta, VideoText exports SRT and VTT subtitle files on the free tier. Notta only exports plain text on its free plan; SRT export requires a Pro subscription.',
  },
  {
    q: 'Is VideoText free to try without creating an account?',
    a: 'Yes. VideoText offers 3 free imports without requiring an account. Notta requires account creation before you can try transcription.',
  },
]

function Cell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (typeof val === 'string') {
    return <span className={`text-sm font-semibold ${isUs ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300'}`}>{val}</span>
  }
  return val
    ? <CheckCircle2 className={`w-5 h-5 mx-auto ${isUs ? 'text-emerald-500' : 'text-emerald-400'}`} />
    : <XCircle className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-700" />
}

export default function NottaAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:via-gray-950 dark:to-indigo-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20 mb-6">
            <span className="text-[12px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Notta Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Notta alternative
            </span>{' '}
            — no 3-minute file limit
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Notta's free tier caps every transcription at 3 minutes. VideoText has no per-file duration limit — upload a 2-hour interview or 90-minute lecture and get the full transcript. Free tier, SRT export included.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · No per-file time limit</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for a Notta alternative */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why users search for a Notta alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Notta is a capable meeting transcription tool, but its free tier limitations frustrate users who work with real-world recording lengths:
          </p>
          <ul className="space-y-3">
            {[
              'Free tier hard-caps each transcription at 3 minutes — a 60-minute meeting produces only the first 3 minutes.',
              'Monthly limit of 120 minutes total on the free plan — roughly 2 full meetings per month.',
              'SRT and VTT subtitle export locked behind paid plans.',
              'No chapter generation or keyword indexing on the free tier.',
              'Transcripts stored in Notta\'s cloud — not immediately deleted after processing.',
              'Account required before any transcription can be tested.',
              'Paid plans start at $13.99/month — higher than comparable tools.',
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* Comparison table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">VideoText vs Notta — feature comparison</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Notta</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/[0.03] bg-white dark:bg-gray-900/50">
              {COMPARE_ROWS.map((row) => (
                <div key={row.label} className="grid grid-cols-3 px-5 py-3.5 items-center">
                  <span className="text-sm text-gray-700 dark:text-white/60">{row.label}</span>
                  <div className="text-center"><Cell val={row.videotext} isUs /></div>
                  <div className="text-center"><Cell val={row.competitor} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* When Notta is better */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">When Notta is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Notta is the right tool if you need a <strong>live meeting bot</strong> that joins your Zoom, Teams, or Google Meet calls automatically via calendar integration, transcribes in real time, and builds a searchable archive of all past meetings. Its team collaboration features and meeting search across an entire organisation are also strong. VideoText is better for <strong>file-based transcription</strong> of individual recordings — especially when you need SRT export, subtitle translation, or longer files than Notta's free tier permits.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'No per-file duration limit', body: 'Notta free tier caps files at 3 minutes. VideoText has no cap — upload a 3-hour recording and get the full transcript on the free tier.' },
            { icon: DollarSign, title: 'SRT export on free tier', body: 'VideoText includes SRT and VTT export at no cost. Notta locks subtitle export behind paid plans starting at $13.99/month.' },
            { icon: Shield, title: 'Files deleted after processing', body: 'VideoText deletes your file immediately after transcription. Notta keeps your transcripts and recordings in its cloud storage.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">{q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Transcribe the full recording, not just 3 minutes</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload any length of video or audio. Get a complete speaker-labelled transcript with SRT export — no per-file time cap, no credit card.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 bg-white text-purple-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
              Try VideoText free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
