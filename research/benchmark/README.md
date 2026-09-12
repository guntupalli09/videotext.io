# AI Transcription Accuracy Benchmark — methodology & pipeline

This directory holds the scoring engine and pilot data behind the public
research page at `/research/transcription-accuracy-benchmark-2026`.

## Current status: Phase 1 pilot (this commit)

- **Dataset:** 25 utterances (~4.3 min), 5 speakers, drawn from
  [LibriSpeech test-clean](https://www.openslr.org/12/) — public-domain
  LibriVox audiobook readings with professionally aligned reference
  transcripts. Files: `data/pilot_manifest.jsonl`.
- **Condition tested:** clean, single-speaker, read speech only.
  Noisy audio, accents, multi-speaker conversation, and real-world
  (non-audiobook) recordings are **not** covered yet — see Roadmap.
- **Tool tested:** an open-source Whisper baseline (`faster-whisper`,
  `small` model, int8, CPU) — labeled "Whisper baseline (open-source)" on
  the page. This is **not** VideoText's production output. VideoText's
  pipeline calls OpenAI's hosted Whisper API (`server/src/services/transcription.ts`)
  plus its own chunking/post-processing; producing genuine VideoText output
  requires an `OPENAI_API_KEY`, which was not available when this pilot was
  run. Do not present the baseline numbers as VideoText's numbers.
- **Metric:** corpus-level Word Error Rate (WER), computed with a real
  Levenshtein-alignment implementation (`scripts/wer.py`, unit-tested in
  `scripts/test_wer.py`), not estimated or hand-typed.
- **Result:** 2.52% corpus WER, 2.89x realtime processing (see
  `results/pilot_summary.json` and `results/pilot_results.csv` for full
  per-utterance detail — this is the file linked as the public CSV download).

These are real, reproducible numbers for a narrow slice of the eventual
benchmark. They are intentionally not dressed up as the full "8 tools ×
200 files" study — that would be exactly the kind of unfounded claim this
project exists to avoid making.

## Audit: unsupported claims on existing pages (resolved)

`/transcription-benchmark` and `/accuracy-test` previously stated
specific-looking numbers with no dataset, ground truth, or scoring
methodology behind them. Every quantitative claim on those two pages was
audited and removed or replaced — none of those numbers were reused,
cited, or reconciled with this benchmark's real results. What was removed:

- `/transcription-benchmark`: a full speed table (webinar/interview/meeting/
  podcast processing times with P50/P90 and "12x faster than realtime"
  claims), FAQ answers stating specific minute figures, a "processes long
  videos in ~3–5 minutes" claim, and a "Methodology" section asserting a
  200-clip/18-hour dataset and a March 2026 benchmark batch that did not
  exist anywhere in the repo.
- `/accuracy-test`: an "accuracy by condition" table (99.1% studio audio
  down to 87.4% heavy background noise) and a tool-comparison table making
  unsubstantiated claims about Otter, Descript, and Rev's speed/accuracy —
  the latter also carried competitor-disparagement risk since none of it
  was measured.

Both pages now state plainly that they don't have sourced numbers to
publish for those claims, and link to this benchmark's real (if narrow-
scope) pilot results instead.

## Reproducing this pilot

```
pip install faster-whisper jiwer
# ffmpeg must be on PATH
cd research/benchmark/scripts
python3 prepare_pilot.py        # downloads-free if data/LibriSpeech already extracted
python3 run_whisper_baseline.py
python3 score_pilot.py
python3 test_wer.py             # unit tests for the scorer itself
```

## Scoring engine

| Script | Metric | Status |
|---|---|---|
| `scripts/wer.py` | Word Error Rate | Implemented, unit-tested, run on pilot data |
| `scripts/score_diarization.py` | Diarization Error Rate (speaker attribution) | Implemented, unit-tested, **not yet run** — needs a multi-speaker corpus with speaker-labeled ground truth |
| `scripts/score_timestamps.py` | Timestamp error (mean/median/p90 abs error vs. ground truth) | Implemented, unit-tested, **not yet run** — needs word-level forced-alignment ground truth |

## Roadmap to the full published claim ("8 tools × 200 files")

1. **Expand conditions:** add noisy audio (e.g. MUSAN noise mixed into
   clean speech at controlled SNR), accented speech (e.g. Common Voice
   subsets by accent tag), and multi-speaker audio (AMI Meeting Corpus or
   CALLHOME, which include diarization ground truth) so
   `score_diarization.py` and `score_timestamps.py` have real data to run
   against.
2. **Add real competitor + VideoText runners.** Each is a thin wrapper
   under `scripts/runners/` that takes the same manifest and produces the
   same `{id, hypothesis_text, segments}` JSONL shape `score_pilot.py`
   already consumes:
   - VideoText — via its own transcription service, given `OPENAI_API_KEY`
   - OpenAI Whisper API (`whisper-1`) — given `OPENAI_API_KEY`
   - Deepgram — given `DEEPGRAM_API_KEY`
   - AssemblyAI — given `ASSEMBLYAI_API_KEY`
   - YouTube auto-captions — via `youtube.ts`'s existing caption-fetch path, for videos with known captions
   - Otter.ai / Descript — no public transcription API; requires manual
     export of results from their UIs for the same input files, flagged
     explicitly wherever their results are shown
3. **Scale to ~200 files** across the above conditions once (1) and (2)
   are wired up, with a documented sampling plan (how many files per
   condition, licensing check on every source file).
4. **Human-verify a sample of ground truth** transcripts that aren't
   already professionally verified (i.e., anything beyond LibriSpeech).
5. **Publish per-tool, per-condition, and aggregate tables**, the full CSV,
   and update the page's methodology section to match — including where
   VideoText loses, if it does, per the anti-cherry-picking commitment in
   the page copy.

None of this is scheduled automatically — it requires API keys/budget for
(2) and either licensed or newly-recorded audio + verified transcripts for
noisy/accented/multi-speaker conditions in (1).
