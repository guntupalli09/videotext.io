import React from 'react'
import { Link } from 'react-router-dom'
import AnswerBlock from '../components/AnswerBlock'
void React

export default function AccuracyTest() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12">
      <div className="mx-auto max-w-5xl px-6 space-y-8">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">← Back to home</Link>
        <h1 className="text-4xl font-medium text-gray-900 dark:text-white">Transcription accuracy test</h1>
        <p className="text-gray-600 dark:text-gray-300">
          This page previously listed accuracy percentages by audio condition and a tool-comparison
          table that were not backed by a published dataset, ground truth, or scoring methodology —
          including claims about other vendors (Otter, Descript, Rev) we could not substantiate. We
          removed them rather than let unverified numbers stand next to evidence-based research.
        </p>

        <AnswerBlock
          question="Which transcription tool is most accurate?"
          shortAnswer="We publish a real, sourced answer on our accuracy benchmark page — not on this one."
          expanded="Accuracy claims are only meaningful when every number traces back to a dataset, a ground-truth transcript, and a scoring script someone else can re-run. This page used to state specific percentages without any of that; that was a mistake we've corrected."
          bullets={[
            'See our accuracy benchmark for real, reproducible results with published dataset, methodology, and raw output',
            'Results there are scoped explicitly to the exact condition and tool tested — no claim is generalized beyond its evidence',
            'We have not yet benchmarked VideoText itself, or any competitor tool, against that methodology',
          ]}
        />

        <section className="rounded-xl border border-blue-300 bg-blue-50/80 p-5 text-sm dark:border-blue-800 dark:bg-blue-950/30">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Where to find real accuracy data</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Our{' '}
            <Link to="/research/transcription-accuracy-benchmark-2026" className="text-blue-700 hover:underline">
              AI Transcription Accuracy Benchmark
            </Link>{' '}
            publishes the audio sample set, ground-truth transcripts, scoring code, raw model outputs, and
            aggregate results — plus a downloadable CSV. It is an early-stage pilot (one clean-speech
            condition, one open-source baseline model) and states its limitations plainly rather than
            implying broader coverage than what was tested.
          </p>
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
            <Link to="/research/transcription-accuracy-benchmark-2026" className="text-blue-700 hover:underline">Accuracy benchmark (evidence-based)</Link>
            <Link to="/best-transcription-tool" className="text-blue-700 hover:underline">Best transcription tool</Link>
            <Link to="/video-to-transcript" className="text-blue-700 hover:underline">Video to transcript</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
