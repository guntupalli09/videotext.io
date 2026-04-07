import { Link } from 'react-router-dom'
import AnswerBlock from './AnswerBlock'

type ComparisonRow = {
  tool: string
  speed: string
  accuracy: string
  outputQuality: string
  pricing: string
  bestUseCase: string
}

type ConditionRow = {
  label: string
  metric: string
  note: string
}

type BestForRow = {
  audience: string
  bestFor: string
}

interface CitationPageProps {
  title: string
  intro: string
  answerQuestion: string
  answerShort: string
  answerExpanded: string
  answerBullets: string[]
  comparisonRows: ComparisonRow[]
  conditionTitle: string
  conditionRows: ConditionRow[]
  bestForRows: BestForRow[]
  faq: { q: string; a: string }[]
}

export default function CitationPage(props: CitationPageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12">
      <div className="mx-auto max-w-6xl px-6 space-y-8">
        <Link to="/" className="text-sm text-violet-600 hover:text-violet-700">← Back to home</Link>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{props.title}</h1>
        <p className="text-gray-600 dark:text-gray-300">{props.intro}</p>

        <AnswerBlock
          question={props.answerQuestion}
          shortAnswer={props.answerShort}
          expanded={props.answerExpanded}
          bullets={props.answerBullets}
        />

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
                {props.comparisonRows.map((row) => (
                  <tr key={row.tool} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3 font-semibold">{row.tool}</td>
                    <td className="px-4 py-3">{row.speed}</td>
                    <td className="px-4 py-3">{row.accuracy}</td>
                    <td className="px-4 py-3">{row.outputQuality}</td>
                    <td className="px-4 py-3">{row.pricing}</td>
                    <td className="px-4 py-3">{row.bestUseCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{props.conditionTitle}</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Condition</th>
                  <th className="px-4 py-3 text-left">Measured result</th>
                  <th className="px-4 py-3 text-left">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {props.conditionRows.map((row) => (
                  <tr key={row.label} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3">{row.label}</td>
                    <td className="px-4 py-3">{row.metric}</td>
                    <td className="px-4 py-3">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best for</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {props.bestForRows.map((row) => (
              <article key={row.audience} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{row.audience}</h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{row.bestFor}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">FAQ</h2>
          <dl className="space-y-4">
            {props.faq.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold text-gray-900 dark:text-white">{item.q}</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-5 text-sm">
          Related hubs:{' '}
          <Link to="/compare" className="text-violet-700 font-medium hover:underline">Compare</Link> ·{' '}
          <Link to="/transcription-benchmark" className="text-violet-700 font-medium hover:underline">Benchmark</Link> ·{' '}
          <Link to="/accuracy-test" className="text-violet-700 font-medium hover:underline">Accuracy</Link> ·{' '}
          <Link to="/video-to-transcript" className="text-violet-700 font-medium hover:underline">Video to Transcript tool</Link>
        </section>
      </div>
    </div>
  )
}
