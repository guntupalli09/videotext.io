# Benchmark v1

Start with [`PROTOCOL.md`](./PROTOCOL.md) for the frozen evaluation
protocol (dataset composition, normalization, metrics, statistical
methodology, inclusion/exclusion criteria) and `protocol.json` for the
machine-readable version.

## Reproducing

```
pip install faster-whisper jiwer remotezip requests
# ffmpeg must be on PATH

cd scripts
python3 test_wer.py && python3 test_bootstrap.py && python3 test_punctuation.py

# Dataset prep (requires network access to openslr.org, datashare.ed.ac.uk)
python3 prepare_clean.py
python3 download_vctk_subset.py && python3 prepare_accented.py
python3 prepare_noisy.py
python3 prepare_mic_quality.py
python3 prepare_multispeaker.py
python3 build_manifest.py   # writes datasets/dataset_manifest.jsonl + dataset_hash.json

# Run systems (each is a no-op with a clear SKIPPED marker if its API key env var is unset)
python3 runner_whisper_baseline.py         # no credentials needed (local model)
OPENAI_API_KEY=... python3 runner_openai.py
DEEPGRAM_API_KEY=... python3 runner_deepgram.py
ASSEMBLYAI_API_KEY=... python3 runner_assemblyai.py
VIDEOTEXT_API_KEY=... python3 runner_videotext.py

# Score + build the report the page renders from
python3 score_system.py
python3 build_report.py     # writes results/aggregate/benchmark_v1_report.json

# Publish into the site (copy into client/, then rebuild)
cp results/aggregate/benchmark_v1_report.json ../../../client/src/data/benchmarkV1Report.json
cp results/scored/*.csv ../../../client/public/research/transcription-accuracy-benchmark-2026-v1-results.csv
cp datasets/dataset_manifest.jsonl ../../../client/public/research/transcription-accuracy-benchmark-2026-v1-dataset-manifest.jsonl
cp protocol.json ../../../client/public/research/transcription-accuracy-benchmark-2026-v1-protocol.json
```

## Status as of this commit

- **Dataset:** 136 files, 5 conditions, 1,278.9s (~21.3 min) — see
  `datasets/dataset_hash.json` for the frozen hash and per-condition counts.
- **Systems executed:** `whisper_baseline_opensource` only. VideoText,
  OpenAI Whisper API, Deepgram, and AssemblyAI runners are implemented,
  unit-verified to fail closed (SKIPPED, not fabricated) without
  credentials, and ready to run the moment API keys are supplied.
- **This is not a finished multi-system benchmark.** Do not cite it as
  one. See `results/aggregate/benchmark_v1_report.json`'s
  `completeness_note` field, which the page also surfaces verbatim.

## Adding a new system

1. Write `runner_<system>.py` following the pattern in
   `runner_openai.py`/`runner_deepgram.py`: read `runner_common.load_manifest()`,
   call the vendor once per utterance, write one raw JSON record per
   utterance via `runner_common.write_raw_result`, and call
   `runner_common.write_skipped` if credentials are missing.
2. Add an extraction case to `extract_hypothesis_text` in `score_system.py`
   if the vendor's response shape isn't already handled.
3. Run `score_system.py <system>` then `build_report.py`.
4. Update `SYSTEM_LABELS` in
   `client/src/pages/TranscriptionAccuracyBenchmark2026.tsx` — the table
   rendering itself needs no other change, since it iterates whatever
   systems appear in the report.

## Adding a new condition

Every condition needs: a `prepare_<condition>.py` script producing
`datasets/prepared/<condition>/manifest.jsonl` with real or documented-
synthetic ground truth (never invented text), added to the `CONDITIONS`
list in `build_manifest.py`. Re-run the full pipeline above afterward —
the dataset hash will change, which is expected and is exactly the point
of freezing it.
