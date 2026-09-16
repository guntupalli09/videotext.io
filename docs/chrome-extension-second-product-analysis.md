# Chrome extension #2: Video to Subtitles vs Fix SRT

**Decision date:** 2026-09-13  
**Repository inspected:** VideoText production codebase (this repo).  
**Recommendation:** **FIX SRT**

This document is the product + engineering record for choosing the second Chrome Web Store extension. It is based on implementation, not marketing copy. Meeting notes were not available (Granola MCP unauthenticated). No Chrome extension existed in-repo at decision time (`chrome-extensions/` was absent).

---

## 1. Video to Subtitles — what the product actually does

### Canonical surface

| Item | Location |
|------|----------|
| Canonical route | `/video-to-subtitles` in `client/src/App.tsx` |
| Same component aliases | `/free-captions-and-subtitles`; SEO slugs via `SeoToolPage` + `seoRegistry.ts` (`/video-to-srt`, `/mp4-to-srt`, `/subtitle-generator`, `/auto-subtitle-generator`, …) |
| Page | `client/src/pages/VideoToSubtitles.tsx` |
| Upload UI | `client/src/components/figma/UploadZone.tsx` |
| Result UI | Subtitle Studio (`client/src/components/subtitleStudio/*`) |

### Input

- **Local video/audio file only.** `VideoToSubtitles.tsx` never calls URL or YouTube upload.
- Server rejects URL jobs for this tool: `transcriptionIntake.ts` (`URL downloads are temporarily disabled.`) and `videoProcessor.ts` case `'video-to-subtitles'`.
- Client accept list: MP4, MOV, MKV, AVI, WebM, MPEG, M4V, FLV, WMV, 3GP, MP3, WAV, M4A, FLAC, AAC (`UploadZone` defaults).
- Server MIME/extension allowlist: `server/src/utils/fileValidation.ts`.
- Files ≤ 15 MB: `POST /api/upload`. Files > 15 MB: chunked `init` / `chunk` / `complete` (`client/src/lib/api.ts`).

### Processing

- Job type: `toolType: 'video-to-subtitles'`.
- Intake: `runTranscriptionIntake()` in `server/src/services/transcriptionIntake.ts`.
- Worker: `server/src/workers/videoProcessor.ts` case `'video-to-subtitles'` (~1731).
- Pipeline: optional FFmpeg trim → duration check → extract audio → **OpenAI Whisper-1** `verbose_json` (`transcribeVideoVerbose` in `server/src/services/transcription.ts`) → `toSRT()` / `toVTT()`.
- **No speaker diarization** on this tool (transcript/batch only).
- UI always generates SRT; SRT/VTT chosen at Studio export.
- Multi-language ZIP exists on the backend (`additionalLanguages`) but is **not exposed in the UI**.

### Auth / limits / paywall

- Guests may upload; completed jobs return `requiresAuth: true` until signup (`server/src/routes/jobs.ts`).
- Server download requires a logged-in owner (`server/src/routes/download.ts`).
- Free: 3 imports/month, 30 min duration, 2 GB, watermarked server downloads, 2 client-side exports/session, no inline edit.
- Paid: longer duration, unlimited imports (plan-dependent), Studio edit.
- Authoritative usage: worker `recordFreePlanImport` / `incrementUserUsage`.
- Paywalls: `FREE_DAILY_LIMIT_REACHED`, `VIDEO_TOO_LONG`, `INLINE_EDIT` (`PaywallModal`).

### Cost and ops

- Whisper + FFmpeg on every job. Same intake, queue, and transcription engine as Video to Transcript.
- Typical runtime: tens of seconds to many minutes (audio length + queue).
- Duplicate-result cache exists (default 7 days) in intake.

### Tests

- `server/scripts/verify-video-upload.js` (anon + auth smoke).
- `server/tests/apiOperationsSecurity.test.ts`, `apiV1Pagination.test.ts`.
- No dedicated worker-case unit tests.

---

## 2. Fix SRT — what the product actually does

There is **no `/fix-srt` route**. Internal paywall slug is `fix-srt`. Production tool type and route are `fix-subtitles` / `/fix-subtitles`.

### Canonical surface

| Item | Location |
|------|----------|
| Canonical route | `/fix-subtitles` (`client/src/App.tsx`) |
| SEO aliases (same component) | `/subtitle-grammar-fixer`, `/subtitle-timing-fixer`, `/subtitle-line-break-fixer`, `/subtitle-validation` via `slugToPrimary.ts` + `SeoToolPage` |
| Page | `client/src/pages/FixSubtitles.tsx` |
| Engine | `server/src/services/subtitles.ts` → `fixSubtitleFile()` |
| Worker | `videoProcessor.ts` case `'fix-subtitles'` (~2225) |
| Analyze (optional video) | `POST /api/upload/dual` via `runFixSubtitlesDualIntake()` |

### Input

- Required: `.srt` or `.vtt` (content-detected; MIME not trusted).
- Optional analyze-only video for scene-cut **warnings** (not sent again on auto-fix).
- UI label “10 MB”; server multer cap is far higher; plan file-size limits apply.
- Server gate: `validateSubtitleFile()` / `detectSubtitleFormatFromContent()` — first 32 KB must contain an SRT timestamp pattern or a `WEBVTT` header (`server/src/utils/subtitleDetector.ts`).

### Two web flows

1. **Analyze** — upload with no fix flags (or dual upload). Returns `issues` / `warnings`. Still consumes an import on complete.
2. **Auto-fix** — `POST /api/upload` with `toolType: 'fix-subtitles'` plus `fixTiming`, `grammarFix`, `lineBreakFix`, `removeFillers`. Login required in the UI before the CTA.

### Actual corrections (verified in `subtitles.ts`)

| Correction | Implemented? | Gate | Deterministic? |
|------------|--------------|------|----------------|
| Overlap trim (earlier cue end = next start − 0.1s, min 0.5s) | Yes | Always on | Yes |
| Re-index cues 1…N after sort by start | Yes | Always | Yes |
| Line wrap at 42 characters (word boundaries) | Yes | `lineBreakFix` | Yes |
| Invalid duration ≤ 0 → extend toward readable duration | Yes | `fixTiming` | Yes |
| Fast reading (duration < 1.5s and text > 20 chars) → extend toward 1.5s | Yes | `fixTiming` | Yes |
| Timing normalize: optional offset, clamp duration to 10s, min 0.5s, overlap trim | Yes | `fixTiming` | Yes |
| Filler-word strip (`um`, `uh`, `like`, `you know`, …) + empty-cue merge | Yes | `removeFillers` | Yes |
| Grammar/spelling via OpenAI `gpt-4o-mini` (25 cues/batch) | Yes | `grammarFix` | AI-assisted |
| Regex fallback: trim, collapse space, sentence case, trailing `.` | Yes | When AI fails | Yes |
| Large gap > 5s | Detected only | Never mutated | — |
| Scene-cut span | Warning only if video attached on analyze | Never mutated | — |
| Malformed timestamp **repair** | **No** — invalid blocks skipped in `parseSRT`/`parseVTT` | — | — |
| Encoding / BOM repair | **No** — UTF-8 read only | — | — |
| Duplicate-cue dedup | **No** | — | — |
| Global sync / drift correction | **No** (`timingOffsetMs` exists in API, not in UI) | — | — |

Default UI checkboxes are **all off**. A default auto-fix still **always** resolves overlaps and re-indexes, then reconstructs a new SRT/VTT via `toSRT`/`toVTT`. The original upload is not patched in place.

### Result / report

`GET /api/job/:id` (not `/api/jobs`) returns:

```json
{
  "status": "completed",
  "progress": 100,
  "result": {
    "downloadUrl": "/api/download/{file}_subtitles_fixed.srt",
    "fileName": "…_subtitles_fixed.srt",
    "issues": [{ "type": "overlap|long_line|fast_reading|invalid_timing|large_gap", "index": 1, "message": "…" }],
    "warnings": [{ "type": "long_line|reading_speed|overlap|scene_cut", "message": "…", "line": 1 }]
  }
}
```

Issues/warnings live in the Bull job return value, **not** on the Prisma `Job` row. API v1 `GET /api/v1/subtitle-fixes/:id` does **not** return them.

### Auth / limits / paywall

- Same import quota as other tools (free: 3/month; guest IP 3/day).
- Auto-fix UI requires login; guest completed jobs hide results (`requiresAuth`).
- Free: watermark on server `.srt`/`.vtt` download; 2 client exports/session; no inline QA edit; PDF/Word paywalled.
- Rate limit: 3 uploads/min/user in production (`uploadRateLimit.ts`).
- Usage increment on worker complete (`recordFreePlanImport` / `incrementUserUsage`).

### Cost and ops

- Default path: parse + deterministic CPU. Typically sub-second to a few seconds.
- `grammarFix`: 1 `gpt-4o-mini` call per 25 cues (or regex fallback).
- Scene cuts: FFmpeg only when a video is attached on analyze (not the extension’s planned path).
- **No Whisper.**

### Tests

- Operation mapping only (`apiOperationsSecurity.test.ts`).
- **No** unit tests for `fixSubtitleIssues` / parser edge cases.
- Conversion-nudge structure checks in `client/tests/freePlanConversion.test.ts`.

### Meaning risk

- Overlap/timing: can shorten or lengthen on-screen time; does not rewrite words.
- Line wrap: inserts `\n` only.
- Fillers: deletes words; can merge/drop empty cues.
- Grammar: instructed not to rephrase, but LLM output can still drift; fallback changes punctuation/casing.

---

## 3. Chrome extension fit

### Video to Subtitles as an extension

Realistic end-to-end: **yes, but poorly in a popup.** Users would upload media, wait through Whisper, then preview/download SRT. That reuses `POST /api/upload` + job polling + download, plus chunked upload for large files.

Reuse: high (same as Video to Transcript). New work: media picker, trim UI, long-running job UX, Subtitle Studio is too large for a popup.

Popup/extension-page constraints: large binaries, minutes of wait, chunked upload, queueing. Functionally a second Video to Transcript with SRT output.

### Fix SRT as an extension

Realistic end-to-end: **yes, and naturally popup-sized.**

1. Open extension  
2. Drop `.srt`  
3. Optional fix checkboxes (same flags as the website)  
4. Existing `fix-subtitles` job  
5. Surface `issues` / `warnings`  
6. Preview reconstructed SRT  
7. Download via existing `/api/download` + account limits  

Input is text, typically KB–low MB. No chunked upload. No FFmpeg/Whisper. Safer to keep running in a service worker if the popup closes.

Local-safe ops (overlap/CPL checks) exist in `client/src/lib/subtitleUtils.ts` / `subtitleQaAssist.ts` but are **not** the production fix engine. The extension must call the backend so usage, watermarks, and grammar stay authoritative.

---

## 4. Business-value evidence (repo only)

| Signal | Video to Subtitles | Fix SRT | Notes |
|--------|--------------------|---------|-------|
| Product maturity | High (Studio, batch, Zapier, API v1) | High engine; simpler UI | Both shipped production tools |
| Founder metrics | `PerToolMetrics.tsx` labels both | Same dashboard | **Live job counts UNKNOWN** (no production DB in this environment) |
| Analytics events | `file_selected`, `job_completed`, `result_downloaded`, … | Same family + `tool="fix-srt"` paywall copy | Event *names* exist; volumes UNKNOWN |
| Conversion | Paywall, nudges, watermark | Same pattern (`upgradeCopy.ts` case `fix-srt`) | Both aligned to Pro |
| SEO clusters | Broader head terms (`docs/seo-keyword-clusters-by-tool.md`) | “Lower volume, sharp intent” | Doc opinion, not traffic |
| GSC snapshot `Pages.csv` (repo) | `/auto-subtitle-generator`: 1 click / 31 impr; canonical `/video-to-subtitles` **absent from clicked pages** | `/subtitle-grammar-fixer`: **8 clicks** (www+apex), pos ~6.3; `/fix-subtitles`: 0 clicks / 22 impr | Snapshot only; date not labeled in file header beyond export name |
| GSC queries | “video to subtitle generator” 3 impr; several 1-impr variants | “fix subtitle(s)” 1 impr each | Not a traffic winner for either |
| Customer artifacts | None found naming this tool | User stated a paying customer; **not found in repo** | UNKNOWN in-repo |
| Pricing | Same import/minute system | Same | Grammar adds LLM cost only when opted in |

Do not treat GSC CSV snapshots as current revenue. They are the only quantitative acquisition clue in-repo: Fix SRT’s grammar-fixer alias already ranks and converts clicks; Video to Subtitles’ head URL does not appear as a clicked page in that export.

---

## 5. Scoring (1–10)

Justification is implementation- and repo-evidence based.

| # | Criterion | Video to Subtitles | Fix SRT | Why |
|---|-----------|-------------------:|--------:|-----|
| 1 | Existing product maturity | **9** | **8** | Subtitles has Studio, batch, Zapier, smoke tests. Fix SRT engine is complete but has no engine unit tests and a web/API options split. |
| 2 | Chrome extension suitability | **4** | **9** | Media + Whisper is a bad popup; SRT text is a natural utility. |
| 3 | Engineering simplicity | **3** | **8** | Subtitles needs chunked upload, long jobs, Studio-or-subset UI. Fix SRT is one upload + poll + preview. |
| 4 | Expected processing cost | **3** | **9** | Whisper+FFmpeg vs CPU (+ optional mini LLM). |
| 5 | User problem clarity | **7** | **9** | “Video → captions” is clear but crowded. “This SRT is broken” is sharper. |
| 6 | Standalone utility | **8** | **7** | More people have video than a broken SRT; Fix SRT is more complete *as a single job*. |
| 7 | Differentiation vs Video to Transcript | **3** | **9** | Subtitles shares intake + Whisper. Fix SRT input/output/job are different. |
| 8 | Value without opening the website | **5** | **8** | Subtitles’ value is Studio; a thin extension is a downgrade. Fix SRT’s value *is* the file out. |
| 9 | Existing monetization alignment | **8** | **8** | Same import quota, watermark, upgrade nudges. |
| 10 | Convert extension users → VideoText | **8** | **7** | Subtitles is a broader top-of-funnel; Fix SRT converts problem-aware caption users (GSC alias already clicks). |
| 11 | CWS single-purpose clarity | **5** | **9** | “Generate captions from video” overlaps extension #1 and many store listings. “Fix SRT files” is one job. |
| 12 | CWS rejection risk | **5** | **8** | Large-media extensions invite extra permissions and “just a website wrapper” scrutiny. Fix SRT can stay host-scoped to the API. |
| 13 | Reuse existing backend | **9** | **9** | Both are first-class `toolType`s. |
| 14 | Maintenance burden | **4** | **8** | Subtitles tracks Whisper/FFmpeg/Studio. Fix SRT tracks a small text pipeline. |
| 15 | Overall strategic value **as extension #2** | **5** | **8** | Weighted toward differentiation, ops cost, and shippable polish—not raw TAM. |

**Totals (sum / 15):** Video to Subtitles **86 / 150**. Fix SRT **125 / 150**.

---

## 6. Duplication / overlap (store lineup)

Planned/possible listings: Video to Transcript, Fix SRT, Video to Subtitles, Translate Subtitles.

| | Video to Transcript | Video to Subtitles | Fix SRT |
|--|---------------------|--------------------|---------|
| Input | Audio/video | Audio/video | Existing SRT/VTT |
| Output | Transcript text (+ extras) | Timed SRT/VTT | Corrected SRT/VTT |
| Engine | Whisper | Whisper (same service) | `fixSubtitleFile` |
| Primary job | Speech → text | Speech → captions | Subtitle repair |

The Transcript vs Subtitles distinction is **output format**, not a different pipeline. Shipping those as the first two store listings would look like two wrappers around one transcription product.

Fix SRT vs Transcript is an accurate, implementation-backed split: different file type, different worker case, no speech recognition.

Translate Subtitles (future) also takes an SRT in and a new SRT out, but the job is **language change**, not structural repair. Distinct enough if copy stays honest.

---

## 7. Security / permissions comparison

| | Video to Subtitles | Fix SRT |
|--|--------------------|---------|
| `permissions` | `storage`; likely none else if blob download is used | `storage` |
| `host_permissions` | `https://api.videotext.io/*` (same) | `https://api.videotext.io/*` |
| File handling | Large video/audio; may want `file_system` later | Small text `.srt` via `<input type=file>` |
| Auth | Same JWT `/api/auth/login` | Same |
| Downloads | Blob or `downloads` API | Blob download |
| Extra risk | Accidental `<all_urls>` if “pick video from tab”; tab capture | None required |
| CORS | Extension fetch with host permission; **no** `allowedOrigins` change | Same |

`<all_urls>` is not required for either. Fix SRT’s data footprint is a subtitle text file, not media.

---

## 8. Shared architecture (recommendation only)

`chrome-extensions/video-to-transcript/` did not exist at decision time. **Do not create `chrome-extensions/shared/` yet.** Premature sharing would freeze APIs before the first extension exists.

Genuine future reuse (extract only after the second copy appears):

- API origin + `Authorization` header helper
- Login / `chrome.storage.session` session
- Job poller (`GET /api/job/:id`, 1500 ms)
- Usage + quota error mapping
- Brand CSS tokens

Keep separate: file pickers, option panels, result preview, store listings, manifests.

Independent packages: each listing is its own `dist/` + zip. Shared code, if added later, is a build-time copy, not a runtime cross-extension dependency.

---

## 9. Decision

**RECOMMENDATION: FIX SRT**

Video to Subtitles is the larger website product and a broader top-of-funnel keyword. It is the **wrong second Chrome extension** after Video to Transcript because it is the same ingestion + Whisper path with a different export, is expensive to operate, and does not fit a popup.

Fix SRT is a real production workflow (`fixSubtitleFile` + `fix-subtitles` jobs + account metering), is text-in/text-out, is cheap unless the user opts into grammar, and is a different user intent from speech-to-text. GSC snapshot evidence shows the grammar-fixer alias already attracting clicks; live job/revenue split remains UNKNOWN.

This is **not** agreement-by-default with a preference for Fix SRT. If VideoText’s first store listing were *not* Video to Transcript, Video to Subtitles would score higher on acquisition. Given extension #1, Fix SRT is the correct #2.

---

## 10. Implementation follow-through

If this document is accompanied by `chrome-extensions/fix-srt/`, that package is the second production extension. It must call the existing backend and must not reimplement `fixSubtitleFile`.
