import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Primary workflow', videotext: 'Upload recorded files after meeting', competitor: 'Live meeting bot joins calls' },
  { label: 'Works without bot/calendar access', videotext: true, competitor: false },
  { label: 'Best for post-recording cleanup', videotext: true, competitor: 'Limited' },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: 'Meeting-notes first' },
  { label: 'Structured output (summary + chapters)', videotext: true, competitor: true },
  { label: 'YouTube URL transcription', videotext: true, competitor: false },
  { label: 'Live meeting auto-join', videotext: false, competitor: true },
]

function Cell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (typeof val === 'string') return <span className={`text-sm font-semibold ${isUs ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300'}`}>{val}</span>
  return val ? <CheckCircle2 className={`w-5 h-5 mx-auto ${isUs ? 'text-emerald-500' : 'text-emerald-400'}`} /> : <XCircle className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-700" />
}

export default function FirefliesAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:via-gray-950 dark:to-indigo-950/20" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">Fireflies alternative for teams that want post-meeting outputs without a bot in the call</h1>
          <p className="text-lg text-gray-500 dark:text-white/50 max-w-3xl mx-auto mb-8">
            This page is for teams deciding between a bot-first meeting assistant and a file-first transcription workflow after the meeting. Fireflies is strong for in-call capture. VideoText is stronger when your priority is what happens next: clean transcript outputs, summaries, chapters, and export files from recordings.
          </p>
          <Link to="/video-to-transcript?source=fireflies-alternative" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25">
            Compare with your next recorded meeting
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-14">
        <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 bg-white dark:bg-gray-900/40">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Switch criteria: Fireflies vs VideoText</h2>
          <div className="grid sm:grid-cols-2 gap-5 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Stay with Fireflies if you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• In-call meeting assistant behavior and live capture workflow.</li>
                <li>• A notes workflow centered on bot participation during meetings.</li>
                <li>• Search and review primarily tied to live-captured sessions.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Switch to VideoText if you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Post-meeting upload flow without bot attendance.</li>
                <li>• Transcript + summary + chapters + subtitle export outputs in one pass.</li>
                <li>• Clean handoff assets from Zoom/Meet/Teams recordings.</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Who Fireflies is good for vs who should switch</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Keep Fireflies if your priority is live call capture with an auto-joining meeting bot. Switch to VideoText if your workflow is mostly post-recording: Zoom/Meet/Teams downloads, webinar replays, interviews, and content repurposing where export quality matters more than live attendance.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Bot-first meeting notes vs file-first deliverables</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Fireflies path</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Optimized for meeting capture during the call. Best when your process is tightly tied to live assistant tooling.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">VideoText path</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Optimized for after-call production: upload recording, get transcript assets you can share, subtitle, or repurpose immediately.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">VideoText vs Fireflies</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Fireflies</div>
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

        <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 bg-white dark:bg-gray-900/40">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Related alternatives</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/otter-alternative" className="text-purple-600 dark:text-purple-400 hover:underline">Otter alternative</Link>
            <Link to="/notta-alternative" className="text-purple-600 dark:text-purple-400 hover:underline">Notta alternative</Link>
            <Link to="/meeting-transcription-tool" className="text-purple-600 dark:text-purple-400 hover:underline">Meeting transcription tool</Link>
            <Link to="/meeting-recording-to-transcript" className="text-purple-600 dark:text-purple-400 hover:underline">Meeting recording to transcript</Link>
            <Link to="/google-meet-transcript" className="text-purple-600 dark:text-purple-400 hover:underline">Google Meet transcript</Link>
            <Link to="/zoom-meeting-transcript" className="text-purple-600 dark:text-purple-400 hover:underline">Zoom meeting transcript</Link>
            <Link to="/transcription-benchmark" className="text-purple-600 dark:text-purple-400 hover:underline">Transcription benchmark</Link>
            <a href="https://blog.videotext.io/best-transcription-software-2026" className="text-purple-600 dark:text-purple-400 hover:underline">Best transcription software 2026</a>
          </div>
        </section>

        <section className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Try a no-bot workflow on your next meeting recording</h2>
          <p className="text-white/75 mb-8 max-w-xl mx-auto">Upload one completed call recording and compare how quickly you get usable transcript, summary, chapter, and export outputs.</p>
          <Link to="/video-to-transcript?source=fireflies-alternative" className="inline-flex items-center gap-2 bg-white text-purple-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
            Start the meeting-file comparison
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  )
}
