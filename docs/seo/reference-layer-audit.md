# Reference-layer audit (Phase 0)

Audit date: 2026-09-13  
Scope: existing VideoText SEO architecture before adding a citation hub and glossary.  
Rule applied: existing indexed URLs are protected assets. No existing title, H1, canonical, metadata, structured data, route, or internal-link target was changed unless explicitly justified below.

## What exists

### Framework and routing

VideoText is a production React SPA (Vite + React Router) with post-build prerendering (`scripts/prerender.ts`) and selective React SSR (`client/src/ssr-render.tsx`). It is not Next.js App Router.

- Client routes: `client/src/App.tsx`
- Head tags: `react-helmet-async` via `client/src/components/Seo.tsx`
- Global meta assembly: `AppSeo()` in `App.tsx` → `ROUTE_SEO` / `ROUTE_BREADCRUMB` from `client/src/lib/seoMeta.ts`
- Programmatic landings: `client/src/lib/seoRegistry.ts` (264 entries; indexable subset rendered by `SeoToolPage`)
- Canonical map: `client/src/lib/primaryUrls.ts` + `getCanonicalUrlForPath()` in `client/src/lib/seo.ts`
- Site origin: `https://videotext.io` (non-www)

### SEO utilities already in place (reuse)

| Concern | Existing implementation | Decision |
|---|---|---|
| Title / description | `STATIC_ROUTE_SEO` + registry merge in `seoMeta.ts` | Reuse. Add new keys only. |
| Canonical | `getCanonicalUrlForPath()` + `getCanonicalPathForRoute()` | Reuse. Self-canonical new URLs. |
| Open Graph / Twitter | `Seo.tsx` | Reuse. |
| Robots | `client/public/robots.txt` already allows `/` and citation crawlers | No change. New URLs are not Disallowed. |
| JSON-LD | BreadcrumbList, FAQPage, Article/AEO, Organization, SoftwareApplication | Add Article / BreadcrumbList / DefinedTerm / ItemList **only on new routes**. |
| Sitemap | `scripts/seo/generate-sitemap.ts` + `CORE_PATHS` / `getSitemap2Paths()` | Add new indexable paths to registry helpers. Do not rewrite existing URL set. |
| Prerender | `STATIC_META` + registry parser + `renderPageToHtml()` | New pages use full React SSR so statistics/definitions exist in HTML without JS. |
| Validation | `seo:validate-registry`, `seo:validate-sitemap`, `seo:validate-discoverability`, `seo:content-audit` | Extend with citation-hub and reference-layer validators. |
| Author / byline | Organization-only (`VideoText`). No Person byline system. | Do not invent a named expert. Use editorial-team / Organization authorship. |

### Content surfaces that already exist

- Core commercial tools: `/video-to-transcript`, `/video-to-subtitles`, `/video-to-srt`, `/translate-subtitles`, `/fix-subtitles`, `/burn-subtitles`, `/compress-video`, `/voice-recorder`, `/guideline-format`
- Product transparency: `/open`
- First-party research: `/research/transcription-accuracy-benchmark-2026`
- Speed/accuracy stubs: `/transcription-benchmark`, `/accuracy-test`
- Commercial comparison: `/best-transcription-tool`, `/fastest-transcription-tool`, `/fastest-transcription-software`, `/compare`, vs/alternative pages
- Definitional / hybrid pages: `/open-captions-vs-closed-captions`, `/subtitles-vs-closed-captions`, `/sdh-subtitles`, `/how-to-create-srt-file`, `/video-accessibility`, `/ada-video-captions`, `/faq`, `/guide`
- Blog (canonical on Hashnode): `blog.videotext.io/*`, including `what-is-transcript-qa`, `srt-vs-vtt-subtitle-formats`, `clean-verbatim-vs-full-verbatim`
- Legal: `/terms` (Terms of Service — not a glossary)
- First-party benchmark code: `research/benchmark/` (Phase 1 LibriSpeech pilot only)

### GSC / keyword inventories in the repo

Present: root `Queries.csv`, `Pages.csv`, `videoptext gsc 05-06-26/`, `gsc-april272026/`, `docs/Performance-extracted/`, `reports/gsc-predeploy-*.csv`.

Observed (do not treat as live baselines for the new URLs):

- Existing demand clusters toward SRT how-to, converters, and commercial tool queries.
- Almost no GSC rows for `statistics`, `glossary`, `word error rate`, or `dictionary` in the checked exports.
- Search volume for new terms: **UNKNOWN**. No Keyword Planner / Ahrefs API figures were fabricated.

### Missing

- No `/glossary` hub or `/glossary/{term}` definition layer
- No industry-wide citation hub for third-party transcription/caption statistics
- No `DefinedTerm` schema
- No person-level byline component
- No structured statistic data model
- No citation-quality validation gate
- `/research/transcription-accuracy-benchmark-2026` is prerendered but is not in `CORE_PATHS` (existing indexation gap; **not changed in this project**)

## Routes that must not be cannibalized

| Existing URL | Intent | Conflict if we created… | Decision |
|---|---|---|---|
| `/open` | First-party VideoText operational stats | A page restating 127k videos / 98.5% accuracy as industry facts | Keep `/open`. Citation hub is **third-party industry data only**. Cross-link, do not copy numbers. |
| `/research/transcription-accuracy-benchmark-2026` | First-party WER methodology + pilot | A stats page presenting VideoText/Whisper pilot WER as industry truth | Keep research page. Hub may *cite* the public Whisper paper and *link* to the VideoText study; it will not blend first-party results into third-party tables. |
| `/transcription-benchmark`, `/accuracy-test` | First-party speed/accuracy placeholders | `/transcription-benchmark-2026` or renaming those URLs | Do not rename, redirect, or replace. Different intent from industry statistics. |
| `/best-transcription-tool`, `/fastest-transcription-*` | Commercial comparison | A “best tools” stats article | Out of scope. |
| `/speech-to-text`, `/voice-to-text` | Commercial / workflow | Glossary targeting the same transactional query | Glossary uses `/glossary/speech-to-text` for **definition** intent only. |
| `/video-to-srt`, `/srt-generator` | Transactional “make SRT” | Glossary “video to SRT” | Do not create a glossary term for the workflow. Create `/glossary/srt-file` (what an SRT file is). |
| `/how-to-create-srt-file` | How-to | Duplicate how-to | Keep how-to. Glossary answers “what is SRT?” |
| `/open-captions-vs-closed-captions`, `/subtitles-vs-closed-captions` | Comparison | Another vs page | Keep comparisons. Glossary publishes single-entity definitions and links to the vs pages. |
| `/sdh-subtitles` | Create SDH workflow | `/glossary/sdh-subtitles` targeting “create SDH” | Glossary slug is `/glossary/sdh` (“What is SDH?”). Product page keeps commercial intent. |
| `/video-accessibility`, `/ada-video-captions` | Compliance / workflow | Glossary pages titled as ADA caption generators | Glossary covers `wcag`, `caption-accessibility`, `audio-description` as definitions. |
| `/faq` | Support Q&A | Replacing FAQ definitions | Keep FAQ. Glossary is the durable definition layer; FAQ can later link out (one inbound link added, answers not rewritten). |
| `/terms` | Legal Terms of Service | `/glossary` confusion | Distinct URL and labeling: “Glossary of transcription terms”. |
| `/subtitle-resources` | Legacy; redirects to `/subtitle-tools` | Reviving `/subtitle-resources` as glossary | Do not revive. |
| Hashnode `what-is-transcript-qa`, `srt-vs-vtt`, `clean-verbatim-vs-full-verbatim` | Off-site editorial | On-site glossary for the same terms | Allowed: different host and format. On-site glossary is the site definition layer; blog remains narrative. Cross-link where useful. Do not canonicalize commercial pages to glossary. |

**When uncertain, the existing URL is preserved.** No redirects of indexed commercial URLs were created.

## Proposed architecture

### Citation hub

- URL: `/transcription-statistics/`
- Intent: research / data / citation (industry-wide, third-party)
- Why this URL: it matches the query class (“transcription statistics”) and is not currently registered. It is adjacent to — not a replacement for — `/transcription-benchmark` (VideoText speed benchmark stub) and `/open` (VideoText operational stats).
- Implementation: hand-authored React page, full SSR, structured statistic records in `client/src/data/referenceLayer/`.

### Glossary

- Hub: `/glossary/`
- Terms: flat `/glossary/{slug}/`
- Intent: informational / definition only
- Inventory: ~150–250 terms in `docs/seo/glossary-inventory.csv` + TypeScript inventory
- Published now: highest-priority terms only (production quality)
- Unpublished terms: inventory only, not routed, not prerendered, not in sitemap

### Original VideoText research

Verified first-party benchmark data exists only as the Phase 1 LibriSpeech pilot. It stays on `/research/transcription-accuracy-benchmark-2026`. A brief for a future `/transcription-benchmark/` results expansion is documented separately. No invented benchmark results.

## Implementation decisions

1. **Reuse, do not replace** existing `Seo`, canonical helpers, sitemap generator, prerender pipeline, and registry validation.
2. **New pages are static informational routes**, not `seoRegistry` tool landings. They must not render uploaders or inherit tool-page template copy.
3. **Full SSR** for hub + glossary so numbers and definitions are in the HTML DOM.
4. **Inbound links** from Footer, `/transcription-tools`, `/subtitle-tools`, `/open`, and the research page are justified to prevent orphans (`validate-discoverability` requires ≤3 hops from `/`). Existing titles/H1s/metadata on those pages are unchanged; only additive links.
5. **Noindex unfinished terms.** Unpublished inventory slugs have no route HTML.
6. **Schema restraint:** Article + BreadcrumbList + ItemList on the hub; DefinedTerm + BreadcrumbList + Article on glossary terms. No Dataset schema (this is an aggregation, not an original dataset).
7. **Author:** VideoText editorial team (Organization). Named-person bylines are not invented.
8. **Search volume:** left UNKNOWN wherever no reliable first-party/tool export exists.
9. **First-party numbers** from `/open` and the Phase 1 pilot are excluded from the citation hub body except as clearly labeled pointers to those pages.

## Existing architecture left untouched

- All current `STATIC_ROUTE_SEO` titles/descriptions for pre-existing paths
- All registry `intentKey` / canonical groups
- `robots.txt` rules
- Money-core SoftwareApplication schema
- Hashnode blog canonicals
- Pricing, auth, and product upload behavior
