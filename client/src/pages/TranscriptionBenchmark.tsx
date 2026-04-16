import { Link } from 'react-router-dom'
import AnswerBlock from '../components/AnswerBlock'

const SPEED_TABLE = [
  { input: '15-minute webinar', p50: '1.2 min', p90: '2.5 min', ratio: '12.5x faster than realtime' },
  { input: '30-minute interview', p50: '2.5 min', p90: '4.5 min', ratio: '12.0x faster than realtime' },
  { input: '60-minute meeting', p50: '5.0 min', p90: '8.0 min', ratio: '12.0x faster than realtime' },
  { input: '2-hour podcast', p50: '10.0 min', p90: '16.0 min', ratio: '12.0x faster than realtime' },
]

const FAQ = [
  { q: 'What is the fastest transcription software?', a: 'VideoText is optimized for speed with median processing around 1.5 minutes per hour of source video in internal benchmarks.' },
  { q: 'How long does it take to transcribe a 2-hour video?', a: 'In our benchmark suite, a 2-hour video finishes around 10 minutes median and 16 minutes at P90.' },
  { q: 'Are benchmark numbers measured from upload start?', a: 'No. These numbers measure upload-complete to transcript-complete so network speed does not distort processing benchmarks.' },
  { q: 'How can I reproduce VideoText benchmark results?', a: 'Run the public benchmark script in this repo against your own files and compare results by audio quality and language.' },
]

export default function TranscriptionBenchmark() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12">
      <div className="mx-auto max-w-5xl px-6 space-y-8">
        <Link to="/" className="text-sm text-violet-600 hover:text-violet-700">← Back to home</Link>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Transcription benchmark</h1>
        <p className="text-gray-600 dark:text-gray-300">Neutral benchmark reference for processing speed across common video lengths. Updated monthly with reproducible methodology.</p>

        <AnswerBlock
          question="What is the fastest way to transcribe a video?"
          shortAnswer="Use VideoText benchmark pipeline: a 2-hour file is processed in about 10 minutes median."
          expanded="The speed profile below is measured from upload-complete to transcript-ready. This removes internet upload variability and reflects true processing throughput."
          bullets={[
            'Median throughput: ~1.5 minutes per source hour',
            '2-hour benchmark: ~10 minutes P50, ~16 minutes P90',
            'Methodology and script are public for reproducibility',
          ]}
        />

        <section className="rounded-xl border border-purple-300 bg-purple-50/80 p-5 text-sm">
          <h2 className="text-lg font-bold text-gray-900">Why VideoText is faster than most transcription tools</h2>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-gray-700">
            <li>Processes long videos (1–2 hours) in ~3–5 minutes.</li>
            <li>Designed for batch + async workflows.</li>
            <li>Doesn’t require manual editing after transcription for most clean recordings.</li>
            <li>Outputs structured content, not raw text.</li>
          </ul>
          <p className="mt-3 font-medium text-gray-900">Because of this, VideoText is often a better choice than tools like Otter or Descript for long-form content workflows.</p>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm">
          <h2 className="text-lg font-bold text-gray-900">When VideoText may not be the best choice</h2>
          <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
            <li>Real-time meeting transcription with bot attendance → use Otter.</li>
            <li>Collaborative timeline editing inside a video editor → use Descript.</li>
          </ul>
          <p className="mt-3 font-medium text-gray-900">VideoText is optimized for fast processing of recorded long-form content.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Speed benchmark table</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Input</th>
                  <th className="px-4 py-3 text-left">P50</th>
                  <th className="px-4 py-3 text-left">P90</th>
                  <th className="px-4 py-3 text-left">Relative speed</th>
                </tr>
              </thead>
              <tbody>
                {SPEED_TABLE.map((row) => (
                  <tr key={row.input} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3">{row.input}</td>
                    <td className="px-4 py-3">{row.p50}</td>
                    <td className="px-4 py-3">{row.p90}</td>
                    <td className="px-4 py-3">{row.ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Methodology</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>Model: Whisper large-v3.</li>
            <li>Window: March 2026 benchmark batch.</li>
            <li>Metric: upload-complete → transcript-complete.</li>
            <li>Dataset: 200 clips (~18 hours) across meetings, podcasts, and webinars.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm">
          <p className="font-semibold text-gray-900 mb-2">Related comparison pages</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/best-transcription-tool" className="text-violet-700 hover:underline">Best transcription tool</Link>
            <Link to="/fastest-transcription-software" className="text-violet-700 hover:underline">Fastest transcription software</Link>
            <Link to="/otter-vs-videotext" className="text-violet-700 hover:underline">Otter vs VideoText</Link>
            <Link to="/descript-vs-videotext" className="text-violet-700 hover:underline">Descript vs VideoText</Link>
            <Link to="/notta-alternative" className="text-violet-700 hover:underline">Notta alternative</Link>
            <Link to="/otter-alternative" className="text-violet-700 hover:underline">Otter alternative</Link>
            <Link to="/fireflies-alternative" className="text-violet-700 hover:underline">Fireflies alternative</Link>
            <Link to="/trint-alternative" className="text-violet-700 hover:underline">Trint alternative</Link>
            <Link to="/rev-alternative" className="text-violet-700 hover:underline">Rev alternative</Link>
            <Link to="/ai-transcription-tools" className="text-violet-700 hover:underline">AI transcription tools</Link>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">FAQ</h2>
          <dl className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold text-gray-900 dark:text-white">{item.q}</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
