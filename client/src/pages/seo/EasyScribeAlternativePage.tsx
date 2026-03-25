/**
 * SEO landing page: /easyscribe-alternative
 * Targets: "easyscribe alternative", "easy scribe alternative", "alternative to easyscribe"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $10 Creator Pro', competitor: 'Paid plans only' },
  { label: 'Free tier (no credit card)', videotext: true, competitor: false },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'Video file transcription (MP4, MOV)', videotext: true, competitor: true },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'Speaker detection', videotext: true, competitor: false },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '5–15 min' },
  { label: 'Whisper AI accuracy', videotext: '98.5%', competitor: '~93%' },
]

const FAQ = [
  {
    q: 'What is a good EasyScribe alternative for video transcription?',
    a: 'VideoText is the most fully-featured EasyScribe alternative. Where EasyScribe focuses on basic audio transcription, VideoText handles video files natively, supports YouTube URL input, generates SRT/VTT subtitle files, translates to 70+ languages, and burns subtitles into video — all from a single tool.',
  },
  {
    q: 'Is VideoText free unlike EasyScribe?',
    a: 'Yes. VideoText has a permanent free tier — 3 imports per month with no credit card required. You can transcribe your first video right now without entering any payment information.',
  },
  {
    q: 'Can VideoText generate subtitle files that EasyScribe cannot?',
    a: 'Yes. VideoText generates industry-standard SRT and VTT subtitle files with accurate timestamps. These can be uploaded directly to YouTube, Vimeo, or any video platform. EasyScribe produces plain-text transcripts without subtitle timing data.',
  },
  {
    q: 'How accurate is VideoText compared to EasyScribe?',
    a: 'VideoText uses OpenAI Whisper large-v3, one of the most accurate open-source speech recognition models available. It achieves approximately 98.5% word accuracy on clean audio. This is higher than most basic transcription services that use older or smaller models.',
  },
  {
    q: 'Can I transcribe YouTube videos with VideoText?',
    a: 'Yes. Paste any YouTube URL and VideoText streams and transcribes the audio directly — no need to download the video first. EasyScribe requires you to download and upload audio files manually.',
  },
  {
    q: 'What makes VideoText better for content creators than EasyScribe?',
    a: 'VideoText is purpose-built for video content workflows: YouTube transcription, SRT generation for captions, subtitle translation for international audiences, burning subtitles into video for social media, and batch processing for high-volume creators. EasyScribe is a simpler tool without these video-specific features.',
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

export default function EasyScribeAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:via-gray-950 dark:to-indigo-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20 mb-6">
            <span className="text-[12px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">EasyScribe Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              EasyScribe alternative
            </span>{' '}
            for video &amp; subtitles
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            EasyScribe handles basic audio transcription. VideoText goes further — upload any video or paste a YouTube URL, get a transcript, SRT subtitle file, translation, or burned-in captions. Free tier available.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · Files deleted after processing</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for EasyScribe alternative */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why users look for an EasyScribe alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            EasyScribe covers basic transcription needs — but as soon as workflows involve video files, subtitle formats, or multiple languages, its limitations become clear:
          </p>
          <ul className="space-y-3">
            {[
              'No SRT or VTT subtitle export — transcripts are plain text only, with no timestamp data.',
              'No YouTube URL input — audio or video must be downloaded and uploaded manually.',
              'No subtitle translation — useful only for English-language output.',
              'No subtitle burning — cannot hard-code captions into a video file.',
              'No batch processing — every file must be submitted individually.',
              'No speaker detection — transcripts are a single undivided block of text.',
              'No free tier — paid plans required from the start.',
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">VideoText vs EasyScribe — feature comparison</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">EasyScribe</div>
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

        {/* When EasyScribe is better */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">When EasyScribe might suit you</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            EasyScribe may be suitable if you need <strong>simple audio-to-text transcription</strong> with a very minimal interface and no subtitle or video requirements. If you're transcribing voice memos or short audio clips into plain text and don't need SRT files, translation, or YouTube support, a basic tool can get the job done. VideoText is the better choice the moment your workflow involves any video file, subtitle format, multiple languages, or YouTube content.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'Full subtitle workflow', body: 'VideoText generates SRT and VTT files with accurate timestamps, translates them to 70+ languages, and can burn them directly into video. EasyScribe produces plain text only.' },
            { icon: DollarSign, title: 'Free tier included', body: 'Start with 3 free imports per month — no credit card, no trial expiry. EasyScribe requires payment to get started.' },
            { icon: Shield, title: 'YouTube URL support', body: 'Paste any YouTube link and VideoText transcribes it directly. No need to download the video. EasyScribe has no YouTube integration.' },
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Go beyond basic transcription</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload any video or paste a YouTube URL. Transcript, SRT file, subtitle translation, or burned-in captions — all from one tool. Free tier, no credit card.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 bg-white text-purple-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
              Transcribe my first video free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
