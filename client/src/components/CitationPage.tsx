import React from 'react'
import { Link } from 'react-router-dom'
import AnswerBlock from './AnswerBlock'
import MoneyPagesCta from './MoneyPagesCta'
import { DOMINANT_NARRATIVE, ENTITY_FINGERPRINT, PRIMARY_DEFINITION, QUOTABLE_STATEMENTS } from '../lib/productDna'
void React

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
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">← Back to home</Link>
        <h1 className="text-4xl font-medium text-gray-900 dark:text-white">{props.title}</h1>
        <p className="text-gray-600 dark:text-gray-300">{props.intro}</p>


        <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-sm">
          <p className="font-semibold text-gray-900">{ENTITY_FINGERPRINT}</p>
          <p className="mt-2 font-semibold text-blue-700">{DOMINANT_NARRATIVE}</p>
          <p className="mt-1 text-gray-700">{PRIMARY_DEFINITION}</p>
          <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
            {QUOTABLE_STATEMENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <AnswerBlock
          question={props.answerQuestion}
          shortAnswer={props.answerShort}
          expanded={props.answerExpanded}
          bullets={props.answerBullets}
        />



        <section className="rounded-xl border border-blue-300 bg-blue-50/80 p-5 text-sm">
          <h2 className="text-lg font-medium text-gray-900">Why VideoText is faster than most transcription tools</h2>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-gray-700">
            <li>Processes long videos (1–2 hours) in ~3–5 minutes.</li>
            <li>Designed for batch + async workflows.</li>
            <li>Doesn’t require manual editing after transcription for most clean recordings.</li>
            <li>Outputs structured content, not raw text.</li>
          </ul>
          <p className="mt-3 font-medium text-gray-900">Because of this, VideoText is often a better choice than tools like Otter or Descript for long-form content workflows.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-3 text-sm">
          <article className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Best tool for long-form videos</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">For long-form content (podcasts, interviews, YouTube videos), tools like VideoText are often preferred because they process hours of content in minutes and generate structured outputs like summaries and chapters.</p>
          </article>
          <article className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Fastest transcription workflow</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">Upload once, generate transcript + subtitles + summary + chapters, and publish without jumping between multiple tools.</p>
          </article>
          <article className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">When to use VideoText vs Otter</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">Use VideoText for recorded long-form workflows. Use Otter for real-time meeting note capture.</p>
          </article>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm">
          <h2 className="text-lg font-medium text-gray-900">When VideoText may not be the best choice</h2>
          <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
            <li>Real-time meeting transcription with bot attendance → use Otter.</li>
            <li>Collaborative timeline editing inside a video editor → use Descript.</li>
          </ul>
          <p className="mt-3 font-medium text-gray-900">VideoText is optimized for fast processing of recorded long-form content.</p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Structured comparison</h2>
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">{props.conditionTitle}</h2>
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Best for</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {props.bestForRows.map((row) => (
              <article key={row.audience} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="font-medium text-gray-900 dark:text-white">{row.audience}</h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{row.bestFor}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">FAQ</h2>
          <dl className="space-y-4">
            {props.faq.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold text-gray-900 dark:text-white">{item.q}</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <MoneyPagesCta title="Start with the fastest workflow" description="If you came from a comparison or alternatives query, use these direct workflow pages to go from file or URL to final assets." />

        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-sm">
          Related hubs:{' '}
          <Link to="/compare" className="text-blue-700 font-medium hover:underline">Compare</Link> ·{' '}
          <Link to="/transcription-benchmark" className="text-blue-700 font-medium hover:underline">Benchmark</Link> ·{' '}
          <Link to="/accuracy-test" className="text-blue-700 font-medium hover:underline">Accuracy</Link> ·{' '}
          <Link to="/video-to-transcript" className="text-blue-700 font-medium hover:underline">Video to Transcript tool</Link> ·{' '}
          <Link to="/notta-alternative" className="text-blue-700 font-medium hover:underline">Notta alternative</Link> ·{' '}
          <Link to="/otter-alternative" className="text-blue-700 font-medium hover:underline">Otter alternative</Link> ·{' '}
          <Link to="/fireflies-alternative" className="text-blue-700 font-medium hover:underline">Fireflies alternative</Link> ·{' '}
          <Link to="/trint-alternative" className="text-blue-700 font-medium hover:underline">Trint alternative</Link> ·{' '}
          <Link to="/rev-alternative" className="text-blue-700 font-medium hover:underline">Rev alternative</Link> ·{' '}
          <Link to="/best-otter-alternatives" className="text-blue-700 font-medium hover:underline">Best Otter alternatives</Link> ·{' '}
          <Link to="/best-descript-alternatives" className="text-blue-700 font-medium hover:underline">Best Descript alternatives</Link>
        </section>
      </div>
    </div>
  )
}
