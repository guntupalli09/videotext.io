import { Link } from 'react-router-dom'
import AnswerBlock from '../components/AnswerBlock'

const ACCURACY_ROWS = [
  { condition: 'Studio audio (single speaker)', accuracy: '99.1%', note: 'Near-human output quality' },
  { condition: 'Laptop mic, quiet room', accuracy: '98.2%', note: 'Default business recordings' },
  { condition: 'Zoom call, 2 speakers', accuracy: '97.4%', note: 'Strong diarization-ready transcript' },
  { condition: 'Phone recording, light noise', accuracy: '95.8%', note: 'Minor cleanup recommended' },
  { condition: 'Heavy background music', accuracy: '87.4%', note: 'Pre-cleaning recommended' },
]

const TOOL_COMPARE = [
  { tool: 'VideoText', speed: 'P50 ~1.5 min / source hour', accuracy: '95–99% by condition', output: 'Transcript + SRT/VTT + summary', pricing: 'Free tier + paid plans', useCase: 'Teams needing fast, structured output' },
  { tool: 'Otter.ai', speed: 'Meeting-first workflow', accuracy: 'Good on meetings', output: 'Meeting notes + transcript', pricing: 'Freemium', useCase: 'Live meeting capture' },
  { tool: 'Descript', speed: 'Editor-centric workflow', accuracy: 'Strong on clean audio', output: 'Editing + transcript', pricing: 'Paid plans', useCase: 'Creators editing and transcribing in one app' },
  { tool: 'Rev', speed: 'AI + human options', accuracy: 'High with human option', output: 'Transcript services', pricing: 'Per-minute and plan options', useCase: 'Compliance or human QA requirements' },
]

export default function AccuracyTest() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12">
      <div className="mx-auto max-w-5xl px-6 space-y-8">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">← Back to home</Link>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Transcription accuracy test</h1>
        <p className="text-gray-600 dark:text-gray-300">Reference page for measurable accuracy outcomes by audio condition and practical workflow context.</p>

        <AnswerBlock
          question="Which transcription tool is most accurate?"
          shortAnswer="Accuracy depends on audio condition; VideoText delivers 95–99% on benchmarked speech conditions with Whisper large-v3."
          expanded="No tool is universally perfect. The right comparison is condition-specific: clean studio audio, meetings, phone recordings, and noisy field clips behave differently."
          bullets={[
            'Clear speech: up to 99.1% word accuracy',
            'Typical meetings: around 97.4%',
            'Noisy recordings: around 87–96% depending on interference',
          ]}
        />

        <section className="rounded-xl border border-blue-300 bg-blue-50/80 p-5 text-sm">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Accuracy by condition</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Condition</th>
                  <th className="px-4 py-3 text-left">Word accuracy</th>
                  <th className="px-4 py-3 text-left">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {ACCURACY_ROWS.map((row) => (
                  <tr key={row.condition} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3">{row.condition}</td>
                    <td className="px-4 py-3">{row.accuracy}</td>
                    <td className="px-4 py-3">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Structured comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Tool</th>
                  <th className="px-4 py-3 text-left">Speed</th>
                  <th className="px-4 py-3 text-left">Accuracy</th>
                  <th className="px-4 py-3 text-left">Output quality</th>
                  <th className="px-4 py-3 text-left">Pricing</th>
                  <th className="px-4 py-3 text-left">Best use case</th>
                </tr>
              </thead>
              <tbody>
                {TOOL_COMPARE.map((row) => (
                  <tr key={row.tool} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3 font-semibold">{row.tool}</td>
                    <td className="px-4 py-3">{row.speed}</td>
                    <td className="px-4 py-3">{row.accuracy}</td>
                    <td className="px-4 py-3">{row.output}</td>
                    <td className="px-4 py-3">{row.pricing}</td>
                    <td className="px-4 py-3">{row.useCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
