/**
 * SEO landing page: /notta-alternative
 * Targets: "notta alternative", "notta ai alternative", "free notta alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $10 Creator Pro', competitor: 'Free (3 files) / $13.99/mo Pro' },
  { label: 'Video file transcription (MP4, MOV)', videotext: true, competitor: true },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (50+ languages)', videotext: true, competitor: true },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'No account needed to start', videotext: true, competitor: false },
  { label: 'Speaker detection', videotext: true, competitor: true },
  { label: 'AI meeting summary', videotext: true, competitor: true },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '5–10 min' },
  { label: 'Whisper AI accuracy', videotext: '98.5%', competitor: '~95%' },
]

const FAQ = [
  {
    q: 'What is a good free Notta alternative for video transcription?',
    a: 'VideoText is a strong free Notta alternative if you need to transcribe video files (MP4, MOV, WebM) or YouTube videos, or if you need SRT/VTT subtitle exports. Notta\'s free plan is limited to 120 minutes of transcription per month with a 3-minute file cap — VideoText offers 3 full-length imports per month with no per-file minute limit.',
  },
  {
    q: 'How does VideoText compare to Notta for video files?',
    a: 'Both tools transcribe video and audio files. VideoText goes further by generating SRT and VTT subtitle files, burning captions into video, and supporting YouTube URL input with no upload required. Notta focuses on meeting notes and real-time transcription and does not produce subtitle files.',
  },
  {
    q: 'Can VideoText replace Notta for meeting transcription?',
    a: 'VideoText transcribes recorded meeting files (Zoom, Teams, Google Meet MP4 exports) with speaker labels and AI-generated summaries. It does not join live meetings as a bot — that is Notta\'s primary use case. For post-meeting transcription of recorded files, VideoText is faster and produces subtitle-ready output in addition to text.',
  },
  {
    q: 'Why do people look for Notta alternatives?',
    a: 'Common reasons: Notta\'s free tier is very restricted (3-minute file cap per recording), users need SRT files for video editing and Notta doesn\'t produce them, users want to transcribe YouTube videos without downloading them first, or users need bulk video processing rather than one-at-a-time recording.',
  },
  {
    q: 'Does VideoText have a free tier?',
    a: 'Yes. VideoText has a free tier with 3 imports per month (resets on the 1st). No credit card required. No per-file minute limit — a 90-minute video uses one of your 3 free imports, just like a 5-minute clip.',
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
            for video &amp; subtitles
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Notta caps free recordings at 3 minutes and doesn't export subtitle files. VideoText transcribes full-length videos, exports SRT and VTT, translates to 50+ languages, and burns captions directly into video — all from one tool.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · No file size limit</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people leave Notta */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why users search for a Notta alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Notta is a capable meeting transcription tool, but it has limitations that push video creators, editors, and content teams toward alternatives:
          </p>
          <ul className="space-y-3">
            {[
              'Free tier caps each recording at 3 minutes — unusable for most real-world videos.',
              'No SRT or VTT subtitle export on any plan — transcripts only.',
              'Cannot burn subtitles into video files.',
              'YouTube URLs cannot be transcribed directly — you must download and re-upload.',
              'No batch processing — each video must be imported individually.',
              'Files are stored in Notta\'s cloud; no on-demand deletion.',
              'Free plan limits: 120 minutes transcription per month.',
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
            Notta excels at <strong>real-time meeting transcription</strong> and building a searchable archive of live recordings. If your core need is a meeting bot that automatically joins Zoom, Teams, or Google Meet calls and syncs notes across your team, Notta's calendar integration and real-time features are strong. VideoText is purpose-built for <em>recorded video files</em> — it doesn't join live calls but is far more capable for post-production subtitle workflows.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'No 3-minute cap', body: 'Notta\'s free tier cuts off recordings at 3 minutes. VideoText has no per-file length limit — a 90-minute keynote counts as one import, same as a 2-minute clip.' },
            { icon: Shield, title: 'SRT & VTT export', body: 'VideoText exports SRT and VTT subtitle files with frame-accurate timestamps. Notta produces only plain text transcripts — no subtitle file formats on any plan.' },
            { icon: DollarSign, title: 'YouTube URL input', body: 'Paste a YouTube URL and get a transcript or subtitle file immediately — no downloading, no re-uploading. Notta requires you to download the video first.' },
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

        {/* Related tools internal links */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">What VideoText can do for you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'Full transcript with speakers, chapters, and AI summary' },
              { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT files from any video in under 2 minutes' },
              { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate transcripts or subtitle files to 50+ languages' },
              { label: 'Burn Subtitles Into Video', path: '/burn-subtitles-into-video', desc: 'Permanently embed captions into your video file' },
              { label: 'Zoom Recording Transcript', path: '/zoom-recording-transcript', desc: 'Upload a Zoom MP4 and get a full transcript with speaker labels' },
              { label: 'YouTube Transcript Generator', path: '/youtube-transcript-generator', desc: 'Paste a YouTube URL — get transcript, no upload needed' },
            ].map((t) => (
              <Link
                key={t.path}
                to={t.path}
                className="block rounded-xl border border-gray-200 dark:border-white/[0.06] p-4 hover:border-purple-300 dark:hover:border-purple-500/40 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors group"
              >
                <p className="font-semibold text-sm text-purple-600 dark:text-purple-400 group-hover:underline">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</p>
              </Link>
            ))}
          </div>
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Transcribe your first video free — no 3-minute cap</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload any video or paste a YouTube URL. Get a full transcript, SRT subtitle file, and AI summary. No meeting bot required — just the recording.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-white text-purple-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <Link to="/pricing">
              <span className="inline-flex items-center gap-2 border border-white/30 text-white/90 px-7 py-3.5 rounded-xl font-semibold text-[15px] hover:bg-white/10 transition-all">
                See pricing
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
