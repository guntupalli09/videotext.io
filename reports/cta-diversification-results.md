# CTA Diversification Results

Generated: 2026-05-15 from local prerendered HTML in `dist/`.

## Implementation summary

VideoText now uses a route-family CTA registry plus deterministic contextual selection instead of a universal CTA phrase. The new system selects CTAs by:

- route family: transcription, subtitle, formatting, translation, YouTube, alternative/comparison, benchmark, or generic
- workflow stage: hero, proof, workflow, output, comparison, validation, and footer
- intent: converter, generator, cleanup, switching, validation, repurposing, or accessibility
- route tokens: page-specific labels are injected into comparison, subtitle, transcription, formatting, and YouTube CTAs to prevent large clusters
- semantic uniqueness score: CTAs are penalized for banned generic signup language and rewarded for operational workflow terms

## Before vs after CTA duplication

| Metric | Before | After |
| --- | ---: | ---: |
| Largest repeated CTA cluster | 289 pages for the global static shortcut CTA (`Transcribe video online`) / universal static CTA footprint | 5 pages |
| Repeated generic signup CTA cluster | Universal static fallback (`Start free`) on non-SSR fallback pages | 0 pages detected |
| Repeated `Start this workflow` fallback | Generic fallback in family CTA map | Removed |
| CTA duplication listed as top audit issue | Yes | No — no longer in the top five thin-content issues |
| Pages audited | 289 | 289 |
| Thin-content high-risk pages | 8 | 0 |
| Healthy pages | 26 | 101 |

## Top CTA clusters eliminated or collapsed

| Previous duplicate pattern | Previous footprint | Replacement behavior |
| --- | ---: | --- |
| `Transcribe video online` global shortcut | 289 pages | Route-family stage CTAs from `getWorkflowStageCtas()` |
| `Start free` fallback button | broad static fallback | Route-family hero CTAs from `getContextualCta()` |
| `Start this workflow` generic family CTA | generic fallback | Removed from registry; generic pages route to tool-selection language |
| Alternative/comparison generic CTA | 60+ pages | Route-aware labels such as `Compare Rev exports against structured VideoText output` |
| Subtitle generic CTA | 20+ pages | Route-aware labels such as `Fix Auto Subtitle timing and reading-speed issues` |

## Current repeated CTA clusters

Only one repeated CTA cluster remains above the audit threshold:

| CTA | Count | Pages |
| --- | ---: | --- |
| `upload a long recording to compare outputs` | 5 | `/best-transcription-tool`, `/best-transcription-tool-for-journalists`, `/best-transcription-tool-for-students`, `/fastest-transcription-software`, `/fastest-transcription-tool` |

## Route-family CTA examples

| Family | Example CTA |
| --- | --- |
| Transcription | `Process Transcribe Audio To Text with speaker labels and timestamps` |
| Meeting / podcast transcription | `Turn Meeting recordings into structured transcripts` |
| Subtitle | `Fix Auto Subtitle timing and reading-speed issues` |
| Subtitle output | `Export Caption Video captions without timestamp drift` |
| Formatting | `Apply Rev Style formatting rules before delivery` |
| Translation | `Translate subtitles without breaking timing` |
| YouTube | `Extract YouTube transcript, summary, and chapters` |
| Alternative / comparison | `Compare Otter exports against structured VideoText output` |
| Benchmark | `Compare cleanup time across workflows` |

## Pages with strongest CTA uniqueness improvements

- `/adobe-premiere-captions-alternative` now receives a page-specific switching CTA instead of a shared alternative CTA.
- `/auto-subtitle-generator` now receives timing and reading-speed CTAs instead of generic subtitle generation language.
- `/caption-video-online` now receives caption export/timestamp-drift CTAs.
- `/blog/how-to-get-youtube-transcript` now receives a YouTube transcript + summary + chapters CTA.
- `/blog/how-to-transcribe-audio-to-text-free` now receives speaker-label/timestamp workflow language.
- `/rev-style-guide` now receives delivery-focused formatting CTA language.

## Validation commands run

- `npx tsx scripts/prerender.ts`
- `npm run seo:content-audit`
- `npm run ssr:audit`
- `npm run build` from `client/`

## Audit outputs

- `reports/duplication-clusters.md`
- `reports/content-audit.json`
- `reports/content-audit-summary.md`
- `reports/thin-content-risk.md`
- `reports/ssr-summary.md`
