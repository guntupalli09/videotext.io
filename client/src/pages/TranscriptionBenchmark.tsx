import { Link } from 'react-router-dom'
import AnswerBlock from '../components/AnswerBlock'

const FAQ = [
  {
    q: 'What is the fastest transcription software?',
    a: 'We don’t have a published, sourced processing-speed benchmark yet. See our evidence-based research page for methodology and current results as they become available.',
  },
  {
    q: 'How long does it take to transcribe a 2-hour video?',
    a: 'This depends on file length, audio quality, and server load, and we don’t have a verified, dataset-backed number to publish yet. Try it directly on your own file to see actual processing time.',
  },
  {
    q: 'Are benchmark numbers measured from upload start?',
    a: 'Any speed numbers we publish going forward will state exactly what they measure (e.g. upload-complete to transcript-complete) and link to the dataset and script used to produce them.',
  },
  {
    q: 'How can I see real benchmark data?',
    a: 'Our evidence-based accuracy benchmark publishes its dataset, methodology, raw results, and a downloadable CSV. A speed benchmark built the same way is on the roadmap.',
  },
]

export default function TranscriptionBenchmark() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12">
      <div className="mx-auto max-w-5xl px-6 space-y-8">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">← Back to home</Link>
        <h1 className="text-4xl font-medium text-gray-900 dark:text-white">Transcription benchmark</h1>
        <p className="text-gray-600 dark:text-gray-300">
          This page previously displayed processing-speed figures that were not backed by a published
          dataset or methodology. We removed them rather than let unverified numbers stand next to our
          evidence-based research. See below for what we can currently substantiate.
        </p>

        <section className="rounded-xl border border-blue-300 bg-blue-50/80 p-5 text-sm dark:border-blue-800 dark:bg-blue-950/30">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Evidence-based accuracy research</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            We publish a reproducible transcription accuracy study — dataset, ground truth, scoring code,
            raw results, and a downloadable CSV — at{' '}
            <Link to="/research/transcription-accuracy-benchmark-2026" className="text-blue-700 hover:underline">
              our transcription accuracy benchmark
            </Link>
            . It's an early-stage pilot (one condition, one open-source baseline model so far), and it says
            so plainly. A processing-speed study built to the same standard is planned; until it exists, we
            won't publish speed numbers here that we can't trace back to a dataset and script.
          </p>
        </section>

        <AnswerBlock
          question="How fast is VideoText, really?"
          shortAnswer="We don't have a published, sourced speed benchmark yet — see above for what we do have."
          expanded="VideoText is built for batch and async processing of long-form recordings (meetings, podcasts, webinars). We'd rather say that plainly than publish specific minute-by-minute figures we can't trace to a dataset and script."
          bullets={[
            'Designed for recorded, file-based workflows rather than live/real-time capture',
            'Built for batch processing of long-form content (podcasts, webinars, meetings)',
            'A sourced, reproducible speed benchmark is on the roadmap — see the accuracy benchmark for the standard it will follow',
          ]}
        />

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 text-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">What VideoText is built for</h2>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Processing recorded long-form video and audio (meetings, podcasts, webinars).</li>
            <li>Batch and async workflows rather than live transcription.</li>
            <li>Structured export output (transcript, subtitles, summary) rather than raw text alone.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm dark:border-amber-800 dark:bg-amber-950/20">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">When VideoText may not be the best choice</h2>
          <ul className="mt-2 list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
            <li>Real-time meeting transcription with bot attendance → tools built for live capture are a better fit.</li>
            <li>Collaborative timeline editing inside a video editor → an editor-integrated tool is a better fit.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/20">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Related pages</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/best-transcription-tool" className="text-blue-700 hover:underline">Best transcription tool</Link>
            <Link to="/research/transcription-accuracy-benchmark-2026" className="text-blue-700 hover:underline">Accuracy benchmark (evidence-based)</Link>
            <Link to="/video-to-transcript" className="text-blue-700 hover:underline">Video to transcript</Link>
            <Link to="/ai-transcription-tools" className="text-blue-700 hover:underline">AI transcription tools</Link>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">FAQ</h2>
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
