import { Link } from 'react-router-dom'
import AnswerBlock from '../components/AnswerBlock'

const CSV_PATH = '/research/transcription-accuracy-benchmark-2026-pilot.csv'

const PILOT_SUMMARY = {
  dataset: 'LibriSpeech test-clean (public domain, professionally aligned reference transcripts)',
  condition: 'Clean, single-speaker, read speech',
  model: 'Whisper baseline — open-source "small" model (faster-whisper, int8, CPU)',
  utterances: 25,
  speakers: 5,
  audioMinutes: '4.3',
  corpusWer: '2.52%',
  realtimeFactor: '2.9x',
}

const PLANNED_CONDITIONS = [
  { condition: 'Clean speech (single speaker)', status: 'Measured — Phase 1 pilot', detail: '25 LibriSpeech utterances, 5 speakers' },
  { condition: 'Noisy / background-music speech', status: 'Not yet measured', detail: 'Requires a noise-augmented corpus (e.g. MUSAN-mixed speech)' },
  { condition: 'Accented speech', status: 'Not yet measured', detail: 'Requires an accent-labeled corpus (e.g. Common Voice)' },
  { condition: 'Multi-speaker conversation (diarization)', status: 'Not yet measured', detail: 'Requires speaker-labeled ground truth (e.g. AMI, CALLHOME)' },
  { condition: 'Timestamp accuracy', status: 'Not yet measured', detail: 'Requires word-level forced-alignment ground truth' },
]

const PLANNED_TOOLS = [
  { tool: 'VideoText', status: 'Not yet tested', note: 'Requires running our production pipeline against the shared dataset' },
  { tool: 'Whisper (open-source baseline)', status: 'Tested — Phase 1', note: '2.52% corpus WER on clean speech (this pilot)' },
  { tool: 'OpenAI Whisper API', status: 'Not yet tested', note: 'Requires an API key' },
  { tool: 'Deepgram', status: 'Not yet tested', note: 'Requires an API key' },
  { tool: 'AssemblyAI', status: 'Not yet tested', note: 'Requires an API key' },
  { tool: 'YouTube auto-captions', status: 'Not yet tested', note: 'Requires captioned video sources' },
  { tool: 'Otter.ai', status: 'Not yet tested', note: 'No public transcription API — requires manual export' },
  { tool: 'Descript', status: 'Not yet tested', note: 'No public transcription API — requires manual export' },
]

export default function TranscriptionAccuracyBenchmark2026() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12">
      <div className="mx-auto max-w-5xl px-6 space-y-10">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">← Back to home</Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Research · Phase 1 pilot · Updated 2026</p>
          <h1 className="mt-2 text-4xl font-medium text-gray-900 dark:text-white">
            AI Transcription Accuracy Benchmark
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-3xl">
            An open, reproducible study measuring transcription accuracy across tools using identical
            audio, ground-truth transcripts, and a public scoring methodology. This page publishes
            our dataset, our code, our results — including where we underperform — not a marketing
            comparison.
          </p>
        </div>

        <AnswerBlock
          question="How accurate is AI transcription today?"
          shortAnswer={`On clean, single-speaker speech, an open-source Whisper baseline scored ${PILOT_SUMMARY.corpusWer} word error rate in our Phase 1 pilot.`}
          expanded="This is one data point from a small, reproducible pilot — not a finished 8-tool study. We're publishing it now, with full methodology and the underlying data, and will expand it condition-by-condition and tool-by-tool as described below. Treat every number on this page as scoped to exactly the condition and tool it's labeled with."
          bullets={[
            `Dataset: ${PILOT_SUMMARY.dataset}`,
            `Condition tested so far: ${PILOT_SUMMARY.condition}`,
            `Sample: ${PILOT_SUMMARY.utterances} utterances, ${PILOT_SUMMARY.speakers} speakers, ${PILOT_SUMMARY.audioMinutes} minutes of audio`,
          ]}
        />

        <section className="rounded-xl border border-amber-300 bg-amber-50/80 p-5 text-sm dark:border-amber-700 dark:bg-amber-950/30">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">What this page is — and isn't — right now</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            This is a <strong>Phase 1 pilot</strong>, not the full "8 tools × 200 files" benchmark. So far we've
            validated the scoring pipeline end-to-end on one clean-speech condition using an open-source
            Whisper model as a baseline — VideoText itself has not been run through this pipeline yet, and
            neither have Deepgram, AssemblyAI, Otter, Descript, or YouTube captions. We're publishing the
            pilot rather than waiting, because every number here is real, sourced, and reproducible, and we'd
            rather show partial honest progress than a complete but unverifiable comparison. See{' '}
            <a
              href="https://github.com/guntupalli09/videotext.io/tree/main/research/benchmark"
              className="text-blue-700 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              the benchmark source code and README
            </a>{' '}
            for exactly what's measured and what isn't yet.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Phase 1 results (measured)</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Metric</th>
                  <th className="px-4 py-3 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Model tested', PILOT_SUMMARY.model],
                  ['Condition', PILOT_SUMMARY.condition],
                  ['Dataset', PILOT_SUMMARY.dataset],
                  ['Utterances / speakers', `${PILOT_SUMMARY.utterances} / ${PILOT_SUMMARY.speakers}`],
                  ['Audio tested', `${PILOT_SUMMARY.audioMinutes} minutes`],
                  ['Corpus word error rate (WER)', PILOT_SUMMARY.corpusWer],
                  ['Processing speed', `${PILOT_SUMMARY.realtimeFactor} realtime (CPU, no GPU)`],
                ].map(([k, v]) => (
                  <tr key={k} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{k}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            <a href={CSV_PATH} className="text-blue-700 hover:underline" download>
              Download the per-utterance results CSV
            </a>{' '}
            — every row includes the reference transcript, the hypothesis transcript, and the exact
            error counts used to compute WER.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">What's tested vs. planned</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Conditions:</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 mb-6">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Condition</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Detail</th>
                </tr>
              </thead>
              <tbody>
                {PLANNED_CONDITIONS.map((row) => (
                  <tr key={row.condition} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3">{row.condition}</td>
                    <td className={`px-4 py-3 ${row.status.startsWith('Measured') ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-500'}`}>{row.status}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Tools:</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Tool</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {PLANNED_TOOLS.map((row) => (
                  <tr key={row.tool} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">{row.tool}</td>
                    <td className={`px-4 py-3 ${row.status.startsWith('Tested') ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-500'}`}>{row.status}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">Methodology</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
            <li>
              <strong>Metric:</strong> Word Error Rate (WER) — substitutions + deletions + insertions, divided
              by reference word count — computed via a real Levenshtein-alignment implementation, not
              estimated. Text is lowercased and stripped of punctuation before scoring (standard practice,
              since not every engine outputs punctuation).
            </li>
            <li>
              <strong>Ground truth:</strong> LibriSpeech test-clean reference transcripts, which are
              professionally aligned to public-domain LibriVox audiobook recordings.
            </li>
            <li>
              <strong>Reproducibility:</strong> every script (dataset prep, transcription runner, scorer,
              unit tests) is public in the VideoText.io repository, alongside the raw per-utterance results.
            </li>
            <li>
              <strong>Planned additions:</strong> Diarization Error Rate (DER) for speaker attribution and
              timestamp mean-absolute-error are implemented and unit-tested in the scoring engine already,
              but have not been run yet — they need multi-speaker and forced-alignment ground truth we
              don't have wired up yet (see Limitations).
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">Limitations</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
            <li>Small sample: 25 utterances, one condition, one model. Not statistically representative of
              real-world audio diversity.</li>
            <li>Read audiobook speech is easier to transcribe than spontaneous speech, meetings, or phone
              calls — this pilot's low WER should not be read as a general-purpose accuracy claim.</li>
            <li>VideoText has not yet been benchmarked here. When it is, we will publish the result
              regardless of how it compares to other tools, including any categories where VideoText
              performs worse.</li>
            <li>Diarization and timestamp accuracy are not yet measured against any tool.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Citation</p>
          <p className="text-gray-700 dark:text-gray-300">
            VideoText.io, "AI Transcription Accuracy Benchmark" (Phase 1 pilot), 2026.{' '}
            <span className="text-gray-500">videotext.io/research/transcription-accuracy-benchmark-2026</span>
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Related pages</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/best-transcription-tool" className="text-blue-700 hover:underline">Best transcription tool</Link>
            <Link to="/video-to-transcript" className="text-blue-700 hover:underline">Video to transcript</Link>
            <Link to="/ai-transcription-tools" className="text-blue-700 hover:underline">AI transcription tools</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
