import React from 'react'
import { Link } from 'react-router-dom'
import AnswerBlock from '../components/AnswerBlock'
import report from '../data/benchmarkV1Report.json'
void React

const CSV_PATH = '/research/transcription-accuracy-benchmark-2026-v1-results.csv'
const MANIFEST_PATH = '/research/transcription-accuracy-benchmark-2026-v1-dataset-manifest.jsonl'
const PROTOCOL_JSON_PATH = '/research/transcription-accuracy-benchmark-2026-v1-protocol.json'
const REPO_URL = 'https://github.com/guntupalli09/videotext.io/tree/main/research/benchmark/v1'

type ConditionSummary = { n_utterances: number; total_duration_sec: number }
type SystemEntry =
  | { status: 'not_evaluated'; reason: string }
  | { status: 'evaluated'; results: SystemResults }
type SystemResults = {
  n_scored_utterances: number
  n_failures: number
  conditions: Record<string, ConditionAggregate>
}
type ConditionAggregate = {
  n_utterances: number
  total_audio_sec: number
  wer: {
    corpus_pct: number
    ci95_low_pct: number
    ci95_high_pct: number
    mean_utterance_pct: number
    median_utterance_pct: number
  }
  rtf_mean: number | null
  punctuation: string | { terminal_f1_mean: number | null }
  diarization: string
  timestamp_error?: string
  cost_per_audio_hour_usd?: string
}

const SYSTEM_LABELS: Record<string, string> = {
  videotext_production: 'VideoText (production)',
  whisper_baseline_opensource: 'Whisper baseline (open-source)',
  openai_whisper_api: 'OpenAI Whisper API',
  deepgram: 'Deepgram',
  assemblyai: 'AssemblyAI',
}

const CONDITION_LABELS: Record<string, string> = {
  clean_read_speech: 'Clean read speech',
  noisy_speech_synthetic: 'Noisy speech (synthetic, additive noise)',
  accented_speech: 'Accented speech',
  reduced_mic_quality_synthetic: 'Reduced mic quality (synthetic)',
  multi_speaker_sequential_synthetic: 'Multi-speaker (synthetic, sequential)',
}

function formatMinutes(sec: number): string {
  return (sec / 60).toFixed(1)
}

export default function TranscriptionAccuracyBenchmark2026() {
  const systems = report.systems as Record<string, SystemEntry>
  const evaluatedSystems = Object.entries(systems).filter(([, s]) => s.status === 'evaluated') as [string, { status: 'evaluated'; results: SystemResults }][]
  const pendingSystems = Object.entries(systems).filter(([, s]) => s.status === 'not_evaluated') as [string, { status: 'not_evaluated'; reason: string }][]
  const conditionOrder = Object.keys(report.dataset_summary.conditions)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12">
      <div className="mx-auto max-w-5xl px-6 space-y-10">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">← Back to home</Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Research · Protocol {report.protocol_version} (frozen, tag {report.protocol_git_tag}) · Generated {report.report_generated_at_utc.slice(0, 10)}
          </p>
          <h1 className="mt-2 text-4xl font-medium text-gray-900 dark:text-white">
            AI Transcription Accuracy Benchmark
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-3xl">
            How much does audio condition affect AI transcription accuracy? We built a frozen,
            versioned evaluation protocol — dataset, ground truth, normalization rules, and scoring
            code — and are running the same audio through multiple transcription systems as access
            allows. Every number below is generated directly from{' '}
            <code className="text-xs bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">benchmark_v1_report.json</code>,
            not typed into this page.
          </p>
        </div>

        <section className="rounded-xl border border-amber-300 bg-amber-50/80 p-5 text-sm dark:border-amber-700 dark:bg-amber-950/30">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">This benchmark is not complete</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{report.completeness_note}</p>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            {report.systems_evaluated_count} of {report.systems_total_planned} planned systems have been run:
          </p>
          <ul className="mt-2 list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
            {evaluatedSystems.map(([key]) => (
              <li key={key}><strong>{SYSTEM_LABELS[key] || key}</strong> — evaluated</li>
            ))}
            {pendingSystems.map(([key, s]) => (
              <li key={key}>{SYSTEM_LABELS[key] || key} — not yet evaluated ({s.reason})</li>
            ))}
          </ul>
        </section>

        <AnswerBlock
          question="How much does audio condition affect AI transcription accuracy?"
          shortAnswer="In our Phase 1 pilot data (one open-source Whisper baseline, not a multi-system result yet), word error rate roughly doubled going from clean read speech to synthetic background noise."
          expanded="This is a single-system data point across multiple conditions, generated from the frozen protocol below — not a finished cross-vendor study. See the per-condition table for exact figures with 95% confidence intervals and sample sizes."
          bullets={[
            `Dataset: ${report.dataset_summary.n_files} audio files across ${report.dataset_summary.n_conditions} conditions`,
            `Protocol frozen as ${report.protocol_git_tag}, dataset hash ${report.dataset_hash.slice(0, 12)}…`,
            'Every reference transcript is verbatim from a licensed source or a documented synthetic transform of one — none were generated by an ASR system or by us',
          ]}
        />

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Dataset composition</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Condition</th>
                  <th className="px-4 py-3 text-left">Utterances</th>
                  <th className="px-4 py-3 text-left">Audio (min)</th>
                </tr>
              </thead>
              <tbody>
                {conditionOrder.map((cond) => {
                  const c = report.dataset_summary.conditions[cond as keyof typeof report.dataset_summary.conditions] as ConditionSummary
                  return (
                    <tr key={cond} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="px-4 py-3">{CONDITION_LABELS[cond] || cond}</td>
                      <td className="px-4 py-3">{c.n_utterances}</td>
                      <td className="px-4 py-3">{formatMinutes(c.total_duration_sec)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {evaluatedSystems.map(([systemKey, systemEntry]) => (
          <section key={systemKey}>
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-1">
              {SYSTEM_LABELS[systemKey] || systemKey} — results by condition
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {systemEntry.results.n_scored_utterances} utterances scored, {systemEntry.results.n_failures} failures excluded from aggregates.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left">Condition</th>
                    <th className="px-4 py-3 text-left">n / duration</th>
                    <th className="px-4 py-3 text-left">Corpus WER (95% CI)</th>
                    <th className="px-4 py-3 text-left">RTF</th>
                    <th className="px-4 py-3 text-left">Punctuation F1</th>
                    <th className="px-4 py-3 text-left">Diarization</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(systemEntry.results.conditions).map(([cond, agg]) => (
                    <tr key={cond} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="px-4 py-3">{CONDITION_LABELS[cond] || cond}</td>
                      <td className="px-4 py-3">{agg.n_utterances} / {formatMinutes(agg.total_audio_sec)} min</td>
                      <td className="px-4 py-3 font-medium">
                        {agg.wer.corpus_pct}% <span className="text-gray-500 font-normal">({agg.wer.ci95_low_pct}–{agg.wer.ci95_high_pct}%)</span>
                      </td>
                      <td className="px-4 py-3">{agg.rtf_mean ? `${agg.rtf_mean}x` : '—'}</td>
                      <td className="px-4 py-3">
                        {typeof agg.punctuation === 'string' ? agg.punctuation : (agg.punctuation.terminal_f1_mean ?? '—')}
                      </td>
                      <td className="px-4 py-3">{agg.diarization}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">Methodology (frozen protocol {report.protocol_version})</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
            <li><strong>Primary metric:</strong> Word Error Rate (WER), computed corpus-level as sum(errors)/sum(reference words) — never averaged as per-utterance ratios, and never collapsed with other metrics into one "accuracy score."</li>
            <li><strong>Confidence intervals:</strong> 95% CI via 2000-resample percentile bootstrap over utterances, reported alongside every corpus WER figure.</li>
            <li><strong>Separate metrics:</strong> diarization (DER), timestamp error, punctuation F1, real-time factor, and API cost per audio-hour are tracked as independent fields — reported only where valid ground truth or system output exists, marked "not applicable" otherwise rather than defaulted to a number.</li>
            <li><strong>Dataset hash:</strong> <code className="text-xs bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{report.dataset_hash}</code> — any change to any audio file or transcript changes this hash.</li>
            <li>Full protocol, normalization rules, inclusion/exclusion criteria, and per-system settings: <a href={PROTOCOL_JSON_PATH} className="text-blue-700 hover:underline">protocol.json</a> and <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">PROTOCOL.md in the repository</a>.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">Limitations and known gaps</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
            {report.known_gaps_not_fabricated.map((gap) => (
              <li key={gap}>{gap.replace(/_/g, ' ')} — not sourced in v1, disclosed rather than fabricated.</li>
            ))}
            <li>Multi-speaker condition is a synthetic, non-overlapping, two-speaker concatenation — not a natural conversation and not overlapping speech.</li>
            <li>Noisy-speech and reduced-mic-quality conditions are documented synthetic transforms of clean speech, not independently recorded noisy/low-quality audio.</li>
            <li>Only one system (an open-source Whisper baseline) has been executed as of this report. VideoText, OpenAI, Deepgram, and AssemblyAI runners are implemented and tested against the missing-credential path, but have not produced results yet.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Reproducibility &amp; downloads</p>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li><a href={CSV_PATH} className="text-blue-700 hover:underline" download>Per-utterance results (CSV)</a></li>
            <li><a href={MANIFEST_PATH} className="text-blue-700 hover:underline" download>Dataset manifest with per-file SHA256 hashes (JSONL)</a></li>
            <li><a href={PROTOCOL_JSON_PATH} className="text-blue-700 hover:underline" download>Frozen protocol (JSON)</a></li>
            <li><a href={REPO_URL} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Full source: dataset prep scripts, scorers, runners, unit tests</a></li>
          </ul>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Citation</p>
          <p className="text-gray-700 dark:text-gray-300">
            VideoText.io, "AI Transcription Accuracy Benchmark" (protocol {report.protocol_git_tag}), 2026.{' '}
            <span className="text-gray-500">videotext.io/research/transcription-accuracy-benchmark-2026</span>
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Related pages</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/transcription-benchmark" className="text-blue-700 hover:underline">Transcription benchmark (speed)</Link>
            <Link to="/accuracy-test" className="text-blue-700 hover:underline">Accuracy test</Link>
            <Link to="/best-transcription-tool" className="text-blue-700 hover:underline">Best transcription tool</Link>
            <Link to="/video-to-transcript" className="text-blue-700 hover:underline">Video to transcript</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
