# VideoText Transcription Benchmark — Protocol v1.0.0 (frozen)

This document freezes the evaluation protocol for Benchmark v1. Any change
to normalization rules, scoring implementation, dataset composition,
inclusion criteria, or aggregation methodology requires a new protocol
version (v1.1.0, v2.0.0, etc.) — it must never silently change what v1.0.0
measured. The frozen state is anchored by:

- **Git tag:** `benchmark-protocol-v1.0.0`
- **Dataset hash:** see `datasets/dataset_hash.json` (SHA256 over every
  audio file plus its condition/id — regenerate with `build_manifest.py`
  and compare; any difference means the dataset changed)
- **Machine-readable copy:** `protocol.json` in this directory

## 1. Dataset composition

| Condition | Source | License | Utterances | Duration | Ground truth |
|---|---|---|---|---|---|
| `clean_read_speech` | LibriSpeech test-clean | CC BY 4.0 (Panayotov 2014) | 40 | 418.1s | Verbatim corpus `.trans.txt` |
| `noisy_speech_synthetic` | LibriSpeech + RIRS_NOISES pointsource_noises, additive mix at 10dB/0dB SNR | CC BY 4.0 + Apache 2.0 | 32 | 338.4s | Identical to source clean utterance (documented synthetic augmentation) |
| `accented_speech` | VCTK Corpus v0.92 (7 speakers: English, Scottish, NorthernIrish, Irish, Indian, American, Australian — accent labels from the corpus's own speaker-info.txt) | CC BY 4.0 (U. Edinburgh CSTR) | 42 | 238.2s | Verbatim corpus prompt text |
| `reduced_mic_quality_synthetic` | LibriSpeech, bandpass 300-3400Hz + 8kHz resample (telephony simulation) | CC BY 4.0 | 16 | 169.2s | Identical to source clean utterance (documented synthetic degradation) |
| `multi_speaker_sequential_synthetic` | Two LibriSpeech speakers concatenated with a fixed 0.5s gap (non-overlapping turns) | CC BY 4.0 | 6 | 114.0s | Concatenation of both speakers' verbatim transcripts; diarization reference computed exactly from known clip durations + gap |

**Total: 136 files, 1,278.9s (~21.3 minutes) of audio.**

**No ground truth in this dataset was generated or edited by an ASR system,
by us, or by any LLM.** Every reference transcript is either verbatim from
the source corpus, or (for the two synthetic-augmentation conditions) is
provably identical to a verbatim source transcript because the
transformation applied (additive noise, channel filtering) cannot change
what was said.

### Known gaps (not in v1, disclosed — not fabricated to fill)

- **Spontaneous/conversational speech**: not sourced. Read speech
  (LibriSpeech, VCTK) only.
- **Natural multi-speaker dialogue**: not sourced. `multi_speaker_sequential_synthetic`
  is a synthetic, non-overlapping construction, not a real conversation or
  meeting recording, and does not include overlapping speech.
- **Technical/domain-specific vocabulary**: not sourced.
- **Dedicated names/numbers/dates corpus**: not sourced as a separate
  condition. `accented_speech` (VCTK) ground truth retains natural casing
  and punctuation and can be stratified post-hoc by entity/number presence,
  but this is not a purpose-built condition.

A benchmark claim about these categories will not be published until they
are actually sourced and executed. See `README.md` roadmap.

## 2. Text normalization (frozen, v1.0.0)

Implemented in `scripts/wer.py::normalize_text`. Before scoring:
1. Lowercase.
2. Strip all characters except word characters, whitespace, and apostrophe.
3. Collapse whitespace.

This is applied identically to reference and hypothesis before WER
alignment. Punctuation scoring (`scripts/punctuation.py`) is the one
exception: it operates on the un-normalized text specifically to measure
punctuation, and is only computed on conditions whose ground truth retains
real punctuation (`accented_speech`; LibriSpeech-derived conditions have no
punctuation in their source transcripts at all, so punctuation scoring is
not computed for them — reported as `not_applicable`, never as 100% or 0%).

## 3. Metrics (frozen implementations, reported separately — never collapsed)

| Metric | Module | Version | Applies to |
|---|---|---|---|
| Word Error Rate (WER) | `scripts/wer.py` | 1.0.0 | All conditions |
| Diarization Error Rate (DER) | `scripts/score_diarization.py` | 1.0.0 | Conditions with a diarization reference (`multi_speaker_sequential_synthetic`); only for systems that emit speaker labels |
| Timestamp error (mean/median/p90 abs error, matched words) | `scripts/score_timestamps.py` | 1.0.0 | Conditions with word-level or segment-level timing ground truth |
| Punctuation restoration (terminal + comma F1) | `scripts/punctuation.py` | 1.0.0 | `accented_speech` only (only condition with punctuated ground truth) |
| Real-time factor (audio duration / processing time) | computed in each runner | — | All conditions, all systems |
| API cost per audio-hour | computed from each vendor's public list pricing, cited by source URL in `results/aggregate/*.json`; `null` when a system has no public per-minute price (e.g. local open-source baseline) | — | All conditions, all systems |

**There is no combined "accuracy score."** WER, DER, timestamp error,
punctuation, RTF, and cost are reported as separate rows/columns for every
(system, condition) pair where they apply. A metric that does not apply to
a condition or a system is marked `not_applicable`, never defaulted to a
number.

## 4. Statistical reporting

Corpus-level WER (and DER, where applicable) is computed as
`sum(errors) / sum(reference_units)` across all utterances in a condition —
**not** the mean of per-utterance ratios, which over-weights short
utterances. 95% confidence intervals are computed by percentile bootstrap
(`scripts/bootstrap.py`, 2000 resamples, utterance-level resampling with
replacement) — see `scripts/test_bootstrap.py` for correctness tests.

Every published number states its condition, its system, its sample count
(utterances), and its total audio duration. A number without those four
things attached is not published.

## 5. Inclusion / exclusion criteria

- An utterance is included if: its ground truth traces to a cited source
  or a documented synthetic transformation of a cited source, its audio
  file hash matches the frozen `dataset_manifest.jsonl`, and it produced a
  successful (non-error) response from the system under test.
- A system run that fails (timeout, HTTP error, empty response, rate limit)
  is **excluded from the aggregate metric** for that utterance and
  recorded in `results/raw/<system>/failures.json` with the error, not
  silently dropped and not scored as 0% or 100% error.
- A system/condition pair is reported as "not evaluated" (not as a 0 or a
  blank) if the system was never run against that condition — e.g. no API
  credentials available in a given session.

## 6. Model / API settings (frozen per system; recorded per run)

- **Whisper baseline (open-source)**: `faster-whisper`, model size `small`,
  `device=cpu`, `compute_type=int8`, `beam_size=5`, `language=en`. Exact
  library versions recorded per run in `results/raw/whisper_baseline/*/experiment_metadata.json`.
- **VideoText (production)**: `POST /api/v1/transcriptions` per
  `docs/API_PRIVATE_BETA.md` — the same pipeline the web app uses. No
  parameters are set beyond the default production configuration (this
  benchmark tests VideoText as a real user would use it, not a tuned
  configuration).
- **OpenAI Whisper API**: model `whisper-1`, default response format
  `verbose_json` for segment timing, `language=en`.
- **Deepgram**: model `nova-2` (current general-purpose default at time of
  writing), `punctuate=true`, `diarize=true`, `smart_format=true`.
- **AssemblyAI**: default model, `punctuate=true`, `speaker_labels=true`.

Any future change to these settings is a new protocol version.

## 7. Failure handling

Every runner writes one record per utterance attempt to
`results/raw/<system>/<condition>/<id>.json` containing: request timestamp,
HTTP status (or exception), model/version string as exposed by the vendor,
the settings above, and either the raw vendor response or the error. A
system with no credentials available writes a single
`results/raw/<system>/SKIPPED.json` explaining why, and is excluded from
all aggregate tables for that run — never backfilled with placeholder
numbers.

## 8. Timing methodology

Processing time is measured wall-clock, from the moment the audio file is
submitted (upload/API call start) to the moment the final transcript
response is received (job marked complete, for async APIs — polling
overhead is excluded by recording `completed_at - created_at` from the
vendor's own timestamps where available, else request-to-response wall
time for synchronous APIs). Real-time factor = audio duration ÷ processing
time; RTF > 1 means faster than real time.

## 9. Aggregation methodology

For each (system, condition) pair: corpus-level WER/DER via
sum-of-errors/sum-of-reference (§4), mean and median utterance-level WER
for distribution context, bootstrap 95% CI, sample count, and total audio
duration. A cross-condition rollup exists only as a side-by-side table —
conditions are never pooled into one number, since they are deliberately
heterogeneous (that heterogeneity is the point of the study).

## Version history

- **v1.0.0** (this document) — initial freeze. Dataset: 136 files / 5
  conditions / 1,278.9s. Systems executed: Whisper baseline (open-source)
  only. VideoText/OpenAI/Deepgram/AssemblyAI runners implemented but not
  yet executed (no credentials available at freeze time) — see
  `results/aggregate/benchmark_v1_report.json` for exactly what ran.
