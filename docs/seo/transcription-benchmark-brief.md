# Original VideoText research architecture (unpublished results)

This brief exists so first-party findings are never blended into `/transcription-statistics`.

## Existing verified material

| Asset | Status | May be cited as VideoText original research? |
|---|---|---|
| `research/benchmark/` Phase 1 pilot | Verified. 25 LibriSpeech test-clean utterances, Whisper **small** baseline, 2.52% corpus WER | Yes, on `/research/transcription-accuracy-benchmark-2026` only |
| `/api/stats/public` | Operational job/minute counts | Yes, on `/open` |
| `/open` condition-level accuracy and P50/P90 speed tables | Not reconciled with the benchmark audit | No — do not import into the citation hub |
| Marketing copy (“98.5%”, “3–5 minutes for a 2-hour video”) | Product claims | No |

## Future public URL

Keep using the existing research URL for accuracy work:

`/research/transcription-accuracy-benchmark-2026`

Do **not** publish a new `/transcription-benchmark/` results page until a completed study exists. `/transcription-benchmark` already exists as a speed-benchmark landing and must not be overwritten.

If a later study needs a dedicated results URL, prefer a dated research path under `/research/…` rather than minting a second “benchmark” commercial lookalike.

## Required fields for any future original study

Before results may be published:

- Dataset name, license, and split
- Sample size (utterances, speakers, minutes)
- Audio conditions (clean, noise, overlap, accent, telephony)
- Methodology and scoring script location
- Models/providers compared (including VideoText production, if tested)
- Metrics (WER, CER, timestamp error, diarization error — specify each)
- Limitations
- Date of run and software versions
- Reproducibility: public CSV + scoring code, as the Phase 1 pilot already does

## Separation rule

Third-party citation hub = `/transcription-statistics`  
First-party VideoText study = `/research/…` or `/open`  
Do not average them. Do not invent results to fill this brief.
