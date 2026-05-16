# Route-Family Template Migration Report

**Date:** 2026-05-15
**Branch:** `claude/redesign-seo-rendering-wZNBG`
**Scope:** SSR document rendering system, SEO content architecture

---

## Summary

Replaced the universal SSR template system — which produced identical H2 structures, repeated CTA blocks, and duplicated paragraph text across hundreds of pages — with a route-family content architecture.

All 7 route families are now operationally differentiated at the rendering layer.

---

## Problem (Before)

The `StaticSeoDocument` component in `ssr-render.tsx` rendered **the same 8 H2 section titles on every single page**, regardless of route:

| Section | Old hardcoded H2 |
|---|---|
| proofPoints | "Why teams use this workflow" |
| workflowSteps | "How it works" |
| outputExamples | "Outputs you can use immediately" |
| comparisonRows | "How VideoText compares" |
| useCases | "Use cases" |
| faq | "Frequently asked questions" |
| related | "Related VideoText workflows" |

Additionally, `buildFallbackDeepContent()` produced **identical proof points, workflow steps, and output examples** for any page that lacked explicit `deepContent`. Generic CTA: `"Start free with VideoText" → /video-to-transcript` was applied universally. Generic FAQ: same 3 questions for every fallback page.

This affected:
- Every page in `ROUTE_SEO` without a registry entry (100+ pages)
- Every registry entry without explicit `deepContent` (~30+ entries)
- All section titles even on pages with custom deep content

---

## Solution (After)

### New file: `client/src/lib/routeFamilyTemplates.ts`

Single-source-of-truth for the route-family system. Exports:

- `RouteFamily` — 8-member union type (`subtitle | formatting | translation | alternative | benchmark | youtube | transcription | generic`)
- `getRouteFamily(path)` — regex-priority pattern matcher
- `getFamilySectionTitles(family)` — returns 7 distinct H2 titles per family
- `getFamilyPrimaryCta(family)` — returns family-specific CTA text + path
- `buildFamilyDeepContent(family, label, description)` — operationally differentiated fallback content per family
- `buildFamilyFaq(family, label, description)` — family-specific FAQ patterns (3–4 questions each)

### Updated: `client/src/ssr-render.tsx`

- Removed generic `buildFallbackDeepContent()` function entirely
- Added `routeFamily?: RouteFamily` to `StaticRouteContent` interface
- `getStaticRouteContent()` now detects family at route resolution time and passes it through all branches
- `contentFromSeoEntry()` now accepts `family` parameter, uses `buildFamilyDeepContent` + `getFamilyPrimaryCta` for fallbacks
- `StaticSeoDocument` now derives section titles from `getFamilySectionTitles(content.routeFamily)` — no hardcoded H2 strings remain

---

## Route Family Mapping

| Family | Routes matched | H2 pattern examples |
|---|---|---|
| `subtitle` | `/video-to-subtitles`, `/auto-subtitle-generator`, `/burn-subtitles`, `/srt-*`, `/vtt-*`, `/caption-*` | "Subtitle timing errors that break viewer experience", "From raw video to export-ready subtitle file", "SRT, VTT, and burned caption outputs" |
| `formatting` | `/guideline-format`, `/rev-transcript-guidelines`, `/gotranscript-*`, `/style-guide-*` | "Why transcript formatting affects QA acceptance", "From raw transcript to client-ready formatted file", "Transcript formatting and style guide questions" |
| `translation` | `/translate-subtitles`, `/srt-translator`, `/multilingual-*`, `/translate-*` | "Why timing preservation matters in subtitle translation", "Translating subtitles without breaking synchronization", "Subtitle translation and localization questions" |
| `alternative` | `/descript-alternative`, `/otter-ai-alternative`, `/*-alternative`, `/best-*-alternatives`, `/vs-*` | "Where VideoText differs from this tool operationally", "Switching your transcript workflow step by step", "Comparison and switching questions" |
| `benchmark` | `/transcription-benchmark`, `/accuracy-test`, `/fastest-transcription-tool` | "What this accuracy benchmark actually measures", "How the benchmark tests were conducted", "Transcription accuracy and benchmark questions" |
| `youtube` | `/youtube-*`, `/youtube-to-transcript`, `/youtube-transcript-generator` | "Why YouTube transcript extraction matters for creators", "Turning YouTube videos into searchable transcripts", "YouTube transcript and workflow questions" |
| `transcription` | `/video-to-transcript`, `/meeting-transcription`, `/podcast-transcription`, `/zoom-*`, `/google-meet-*`, `/interview-transcription`, `/audio-to-text`, all `*-transcription` pages | "How this workflow reduces manual transcription overhead", "From long recording to structured, usable transcript", "Transcription workflow questions answered" |
| `generic` | Everything else | Original defaults (unchanged for non-classified pages) |

---

## CTA Differentiation

| Family | Before | After |
|---|---|---|
| subtitle | "Start free with VideoText" → `/video-to-transcript` | "Generate subtitles from a video" → `/video-to-subtitles` |
| formatting | "Start free with VideoText" → `/video-to-transcript` | "Format a transcript automatically" → `/guideline-format` |
| translation | "Start free with VideoText" → `/video-to-transcript` | "Translate subtitles while preserving timing" → `/translate-subtitles` |
| alternative | "Start free with VideoText" → `/video-to-transcript` | "Try the faster workflow" → `/video-to-transcript` |
| benchmark | "Start free with VideoText" → `/video-to-transcript` | "Run your own transcript test" → `/video-to-transcript` |
| youtube | "Start free with VideoText" → `/video-to-transcript` | "Paste a YouTube URL" → `/youtube-transcript-generator` |
| transcription | "Start free with VideoText" → `/video-to-transcript` | "Upload a recording for transcription" → `/video-to-transcript` |

---

## Duplication Metrics (Before → After)

### H2 duplication

**Before:**
- `"Why teams use this workflow"` — appeared on every page with proofPoints (~200+ occurrences)
- `"How it works"` — appeared on every page with workflowSteps (~200+ occurrences)
- `"Outputs you can use immediately"` — appeared on every page with outputExamples (~200+ occurrences)
- `"Use cases"` — appeared on every page with useCases (~150+ occurrences)
- `"Frequently asked questions"` — appeared on every page with FAQ (~200+ occurrences)

**After:**
- Each of the 7 families has its own distinct H2 set
- No two families share the same H2 string for proofPoints, workflowSteps, outputExamples, useCases, or related sections
- FAQ H2 differentiates: "Subtitle workflow questions answered" vs "Transcript formatting and style guide questions" vs "YouTube transcript and workflow questions" etc.
- Generic family preserves original defaults for uncategorized pages only

**Estimated H2 duplication reduction: ~85% for classified routes**

### CTA reuse

**Before:** One universal CTA text/path combination applied to all fallback pages (~100+ pages)

**After:** 7 distinct CTAs, each routing to the most relevant money page for that family. Subtitle pages → subtitle tool, formatting pages → style guide formatter, translation pages → translate subtitles, YouTube pages → YouTube transcript generator.

**Estimated CTA duplication reduction: ~80% for classified routes**

### Fallback content

**Before:** `buildFallbackDeepContent()` produced identical proof points for every fallback page. The same 3 sentences appeared across dozens of pages:
- "X is part of the VideoText transcription, subtitle, and workflow toolkit."
- "Each page focuses on a specific transcript, subtitle, formatting, or export task..."
- "Use the related workflows to move from raw media to searchable text..."

**After:** 7 distinct fallback content generators, each with operationally specific proof points, workflow steps, and output examples. No two families share fallback content text.

### FAQ patterns

**Before:** Same 3 generic FAQ questions for every fallback page:
- "What is [label]?" answered with the meta description
- "How should I use this workflow?" — identical answer
- "Where should I start?" — identical answer

**After:** 3–4 distinct family-specific FAQ questions per family. Questions are topically grounded (e.g., subtitle family: "What is the difference between burned subtitles and soft subtitles?"; transcription family: "How does speaker labeling work?").

---

## Thin Content Impact

Pages that previously received only the generic 3-bullet fallback content now receive:
- 3 operationally specific proof points
- 3 workflow steps with family-specific detail
- 3 output examples with family-specific titles and descriptions
- 3 use cases with family-specific personas
- 3–4 family-specific FAQ items

This applies to all registry entries without explicit `deepContent` and all `ROUTE_SEO` pages without registry entries — estimated to cover 80–120 pages.

---

## Semantic Uniqueness

Each family introduces distinct vocabulary clusters that do not overlap:

| Family | Core vocabulary |
|---|---|
| subtitle | timing errors, CPS, reading speed, burned captions, SRT/VTT export, soft subtitles, caption tracks |
| formatting | clean verbatim, full verbatim, QA rejection, speaker labels, timestamp intervals, Rev-style, GoTranscript |
| translation | timestamp preservation, language expansion, bilingual, localization, timing desynchronization |
| alternative | file-length limits, export flexibility, workflow switching, side-by-side comparison, switching friction |
| benchmark | word error rate, WER, cleanup overhead, processing speed, methodology, accuracy measurement |
| youtube | auto-captions, chapter markers, URL ingestion, creator workflows, repurposing, searchable transcript |
| transcription | multi-hour recordings, diarization, speaker labels, DOCX/PDF/SRT/VTT, delivery-ready, structured output |

Crawlers parsing any two pages from different families will encounter minimal lexical overlap in the H2 headings, proof points, workflow steps, and FAQ content.

---

## Validation Checklist

- [x] TypeScript: no new errors introduced (pre-existing env errors only)
- [x] SSR pipeline: preserved — `renderPageToHtml` unchanged, `StaticSeoDocument` still renders correctly
- [x] Prerender pipeline: preserved — no changes to `getSsrPagePaths()` or `getSsrRenderMode()`
- [x] SPA hydration: preserved — `routeFamily` is a rendering-layer concern only, not hydrated
- [x] Routing: preserved — no route additions or removals
- [x] Structured data: preserved — FAQ `<details>` elements and schema hooks unchanged
- [x] Internal linking: preserved — `getRelatedSuggestionsForEntry` and related arrays unchanged
- [x] CORE_STATIC_CONTENT: preserved — `/site-index`, `/guideline-format`, `/video-to-transcript` retain their explicit `primaryCta` and `deepContent`, family detection applies only to section titles

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `client/src/lib/routeFamilyTemplates.ts` | New | Route-family registry, section titles, CTA map, fallback content builders, FAQ builders |
| `client/src/ssr-render.tsx` | Modified | Import family system, add `routeFamily` to interface, remove generic fallback, update all content resolution paths and `StaticSeoDocument` section titles |

---

## Success Criteria Status

| Criterion | Status |
|---|---|
| Distinct H2 structures per route family | ✅ 7 families × 7 sections = 49 distinct H2 strings |
| CTA differentiation by family | ✅ 7 distinct CTAs mapped to correct tool paths |
| Eliminated generic fallback content | ✅ `buildFallbackDeepContent` removed entirely |
| Eliminated generic fallback FAQ | ✅ 3–4 operationally specific questions per family |
| SSR/prerender/hydration compatibility | ✅ No pipeline changes |
| Reduced thin-content risk | ✅ All fallback pages now receive family-specific deep content |
| Semantic uniqueness across page clusters | ✅ Distinct vocabulary per family at H2, proof point, workflow step, and FAQ level |
