# Chrome Extension — "Video to Transcript" · Codebase Audit & Integration Design

Audit of the existing VideoText production Video-to-Transcript workflow, and the design of a
Chrome MV3 extension that acts as a thin client for it. Every statement below is sourced from a
file in this repository — nothing about the API contract is assumed.

Scope of the extension: **upload an audio/video file → get a text transcript**. Nothing else.

---

## 1. Canonical Video to Transcript page/route

| Thing | Where |
| --- | --- |
| Route | `client/src/App.tsx:640` — `<Route path="/video-to-transcript" element={<VideoToTranscript …>} />` |
| Page component | `client/src/pages/VideoToTranscript.tsx` (6,311 lines) |
| Production URL | `https://videotext.io/video-to-transcript` (site origin from `client/.env.example` → `VITE_SITE_URL=https://videotext.io`) |

This is the canonical flow the extension mirrors. The page also carries SEO content, sharing,
translation, speaker panels, embeds, batch, and YouTube ingestion — **none of which the extension
reproduces**.

## 2. File upload implementation

Client entry point: `uploadFileWithProgress(file, options, progressOptions)` —
`client/src/lib/api.ts:838`.

It branches on size (`client/src/lib/api.ts:220`):

* `file.size <= 15 MB` (`CHUNK_THRESHOLD`) → single `POST /api/upload` as `multipart/form-data`
  via `XMLHttpRequest` (for upload progress events).
* `file.size > 15 MB` → resumable chunked upload: `uploadFileChunked()` (`client/src/lib/api.ts:398`),
  which drives `POST /api/upload/init` → `POST /api/upload/chunk` (×N) → `POST /api/upload/complete`.

Server:

* `POST /api/upload` → `server/src/routes/upload.ts:110`, multer single-file (`upload.single('file')`),
  delegating to the shared intake pipeline `runTranscriptionIntake()`
  (`server/src/services/transcriptionIntake.ts:101`).
* Chunked endpoints → `server/src/routes/upload.ts:179` (`/init`), `:305` (`handleUploadChunk`),
  `:348` (`/complete`). `/chunk` is mounted with `express.raw({type:'application/octet-stream', limit:'10mb'})`
  in `server/src/index.ts:239`.

There is **no presigned/direct-to-S3 upload flow**. All bytes go to the VideoText API, which writes
them to `TEMP_FILE_PATH || /tmp` (`server/src/routes/upload.ts:37`).

### Exact wire contract (verified)

`POST /api/upload` — `multipart/form-data`
```
file:      <binary>                (required)
toolType:  "video-to-transcript"   (required; BACKEND_TOOL_TYPES, client/src/lib/api.ts:77)
language:  "English" | ""          (optional; omit/"" ⇒ auto-detect)
uploadMode: "audio-only"           (optional; set for audio input)
originalFileName / originalFileSize (optional, audio-only naming)
```
→ `202 { jobId, status: "queued", jobToken }` · error → `{ message }` with the HTTP status.

`POST /api/upload/init` — `application/json`
```
{ filename, totalSize, totalChunks, toolType, language?, uploadMode?, … }
```
→ `200 { uploadId }`

`POST /api/upload/chunk` — raw `application/octet-stream`, headers `x-upload-id`, `x-chunk-index`
→ `200`. Max **10 MB per chunk** (`server/src/index.ts:240`); `totalChunks` must be 1..2000
(`MAX_CHUNKS`, `server/src/routes/upload.ts:44` and mirrored client-side at `client/src/lib/api.ts:226`).

`POST /api/upload/complete` — `application/json` `{ uploadId }`
→ `202 { jobId, status, jobToken }` (`server/src/routes/upload.ts` complete handler).

## 3. Supported audio/video file types

Authoritative list — `server/src/utils/fileValidation.ts:6` (`ALLOWED_MIME_TYPES`) and `:34`
(`ALLOWED_VIDEO_EXT`). Validation is magic-byte based (`file-type`) with an extension fallback.

* **Video**: `.mp4 .mov .avi .webm .mkv .mpeg .mpg .ogv .3gp .3g2 .flv .wmv .ts .m4v`
* **Audio**: `.mp3 .wav .ogg .m4a .flac .aac`

Rejection message (server): `"Please upload a supported video or audio file (MP4, MOV, MKV, AVI, WebM, MP3, WAV, etc.)"`.

Note: `server/src/utils/fileValidation.ts:41` also exports a legacy `validateFileSize()` with a
100 MB constant — it is **not** used by the transcription intake path (`transcriptionIntake.ts`
enforces `limits.maxFileSize` instead), so the extension must not use 100 MB as a limit.

## 4. File-size and duration validation

Plan limits are authoritative server-side — `getPlanLimits()`, `server/src/utils/limits.ts:5`:

| Plan | maxFileSize | maxVideoDuration | maxConcurrentJobs |
| --- | --- | --- | --- |
| free | 2 GB | 30 min | 1 |
| basic | 5 GB | 45 min | 1 |
| pro | 10 GB | 120 min | 4 |
| agency | 20 GB | 240 min | 3 |
| founding_workflow | 10 GB | 120 min | 2 |
| business | 20 GB | 240 min | 8 |

Enforcement points:

* Size — `transcriptionIntake.ts:223` (`file.size > limits.maxFileSize` → 400 `FILE_TOO_LARGE`,
  *"File exceeds plan limit. Upgrade for larger files."*); chunked path re-checks `totalSize` at
  `upload.ts:262`.
* Duration — `transcriptionIntake.ts:325..355`: `ffprobe` (`probeVideoDurationResult`) → over
  `maxVideoDuration * 60` seconds ⇒ 400 `DURATION_EXCEEDED` with the exact minutes in the message.
  If duration is *unknown* and plan is free ⇒ 400 `UNSUPPORTED_FILE`.

Client-side pre-flight (advisory only, never authoritative): `checkVideoPreflight()`
in `client/src/lib/uploadPreflight.ts` reads `maxFileSize` / `maxVideoDuration` from
`GET /api/usage/current` and reads duration from a `<video preload="metadata">` element.

**The extension reuses exactly this model**: advisory pre-flight from the live `/api/usage/current`
values, with the server as the source of truth.

## 5. Language selection / detection

* UI list — `client/src/lib/languages.ts` (`LANGUAGES`, 72 entries, full English names as both
  `value` and `label`).
* The select renders `<option value="">Auto-detect</option>` first — `client/src/pages/VideoToTranscript.tsx:3880`.
* The client sends the **language name** (e.g. `"English"`); the server normalises it to an ISO 639-1
  code with `normalizeLanguageCode()` (`server/src/utils/normalizeLanguage.ts`), and `undefined`
  (empty/unknown) means Whisper auto-detects.

The extension ships the same `LANGUAGES` list and the same "Auto-detect" default.

## 6/7/8. Transcription API, upload endpoints, job creation

There is **one** transcription pipeline. Both the web app (`POST /api/upload`) and the public API
(`POST /api/v1/transcriptions`) funnel into `runTranscriptionIntake()`
(`server/src/services/transcriptionIntake.ts`), which performs, in order:

1. identity resolution (`getEffectiveUserId`) and guest-UUID spoof guard,
2. subscription-state enforcement + plan resolution (`server/src/utils/subscriptionGuard.ts`),
3. guest-IP daily cap (`checkAndRecordGuestIpImport`),
4. per-user upload rate limit (`checkAndRecordUpload`),
5. queue hard/soft-limit guards,
6. free-plan import quota (`assertCanImport`),
7. per-plan concurrency check,
8. file-type validation, file-size check, duration probe + minute limits,
9. duplicate/cache lookup (`checkDuplicateProcessing`),
10. `addJobToQueue()` → Bull job on the `fileQueue` (`server/src/workers/videoProcessor.ts`).

The extension adds **no new endpoint and no new pipeline** — it calls `POST /api/upload` with
`toolType=video-to-transcript`, which is step 0 of exactly this list.

## 9. Job IDs and job state model

`jobId` is the Bull job id (string). Every job also carries a crypto-random `jobToken`
(`generateJobToken()`, `server/src/utils/auth.ts`) used for anonymous status polling.

Statuses are derived from Bull state in `buildJobStatusPayload()` (`server/src/routes/jobs.ts:27`):
`completed → "completed"`, `failed → "failed"`, `active → "processing"`, otherwise `"queued"`.

## 10. Job status / polling

* `GET /api/job/:jobId[?jobToken=…]` → `server/src/routes/jobs.ts:228`.
* `GET /api/job/:jobId/stream` → SSE, same payload, 400 ms tick (`jobs.ts:154`).
* Client: `getJobStatus()` (`client/src/lib/api.ts:1344`), `subscribeJobStatus()` (SSE with automatic
  polling fallback, `:1384`), poll interval `JOB_POLL_INTERVAL_MS = 1500`
  (`client/src/lib/jobPolling.ts:4`).
* The lifecycle state machine is documented and centralised in
  `client/src/lib/jobPolling.ts::getJobLifecycleTransition` — **only `status` drives lifecycle**;
  a network error or a missing `result` must never be treated as failure.

Progress: `payload.progress` is `job.progress()` from the worker — a **real** number, not synthetic.
`queuePosition` is the index in the Bull waiting list. The extension surfaces both and **invents no
percentage of its own**.

Authorization on status: owner-by-JWT (`allowedByUser`) reveals results; `jobToken`-only access
returns status but `{ requiresAuth: true }` instead of results (`jobs.ts:78`).

## 11/12. Transcript result retrieval and data structure

`JobStatus.result` (`client/src/lib/api.ts:99`):
```ts
{
  downloadUrl: string            // "/api/download/<filename>"
  fileName?: string
  segments?: { start: number; end: number; text: string; speaker?: string }[]
  summary?, chapters?, audioUrl?, warnings?, issues?, consistencyIssues?
}
```
Also present while `status === 'processing'`: `partialVersion`, `partialSegments`,
`partialTranscript` (pseudo-streaming, `jobs.ts:87`).

How the production page turns that into text — `client/src/pages/VideoToTranscript.tsx:1013`:
1. if `result.segments` is non-empty → `segments.map(s => s.text).join("\n\n")`;
2. else fetch `getAbsoluteDownloadUrl(result.downloadUrl)` and read it as text.

The extension uses the same two-step resolution.

## 13. TXT / download / copy functionality

* `GET /api/download/:filename` → `server/src/routes/download.ts`. `authorizeDownload()` maps the
  filename back to its `Job` row and is **strictly ownership-bound**: unauthenticated ⇒ 401
  *"Authentication required."*; different user ⇒ 404.
* Free-plan downloads get a watermark applied server-side (`shouldApplyFreeWatermark` +
  `applyWatermark`, `server/src/utils/watermark.ts`).
* Client-side export naming helpers: `client/src/lib/exportFileNames.ts`
  (`transcriptExportName`, `exportFileStem`).

The extension's **Download .TXT** writes the transcript text the user is already looking at
(same content the page shows), using `chrome.downloads` — and the underlying transcript came from
an authenticated, ownership-checked API response.

## 14. Authentication / session implementation

* Mechanism: **JWT bearer token**, `HS256`, 30-day expiry — `signAuthToken()`,
  `server/src/utils/auth.ts:47`. Payload: `{ userId, stripeCustomerId?, plan, isDemo? }`.
* Sent as `Authorization: Bearer <token>` by the single client entry point `api()`
  (`client/src/lib/api.ts:57`).
* Stored by the web app in `localStorage` under `authToken` (`client/src/lib/auth.ts:5`,
  `storeLoginResult()`).
* Server reads it with `getAuthFromRequest()` / `getEffectiveUserId()`; **`x-user-id` and `x-plan`
  headers are explicitly not trusted for identity** (`server/src/utils/auth.ts:80`).
* Sign-in routes: `POST /api/auth/login`, `/send-otp`, `/verify-otp`, `/complete-signup`,
  `/google`, `/magic-login`, `/demo` (`server/src/routes/auth.ts`).
* Web pages: `/login` (`client/src/App.tsx:549`), `/signup` (`:556`).

**There is no cookie session** — which is why the extension cannot simply rely on ambient
credentials and needs an explicit token handoff (see §25).

## 15/16/17/18. Free limits, paid limits, usage accounting, paywall

* Free plan: **3 imports per calendar month**, reset on the 1st (UTC) —
  `FREE_MONTHLY_IMPORT_LIMIT`, `server/src/utils/limits.ts:141`. Blocked message:
  *"You've used all 3 free imports this month. They reset on the 1st — or upgrade to Pro for
  unlimited processing."* Referral bonus credits (`bonusImportCredits`, +3 per referral) are consumed
  after the monthly cap (`server/src/utils/importQuota.ts`).
* Guests (no account): 3 imports/day **per IP** (`GUEST_DAILY_IMPORT_QUOTA_MESSAGE`,
  `server/src/utils/guestIpLimit.ts`).
* Paid: minute quotas via `enforceUsageLimits()` (`limits.ts:163`); pro/business bypass minute caps
  and instead get a daily soft cap on concurrency (`getDailySoftCapConcurrency`, `isProSoftCapActive`).
* Accounting: `user.usageThisMonth` (`importCount`, `importCountToday`, `totalMinutes`,
  `dailyMinutesToday`) on the `User` row; free-plan imports recorded atomically by
  `recordFreePlanImport()` (`importQuota.ts:23`), called from `server/src/routes/jobs.ts` on
  completion/claim.
* Read model: `GET /api/usage/current` (`server/src/routes/usage.ts:126`) →
  `{ plan, quotaType: 'imports'|'unlimited'|'minutes', used, limit, remaining, bonusImportCredits,
  resetDate, email?, limits: { maxFileSize, maxVideoDuration, maxLanguages, batchEnabled }, usage, overages }`.
* Paywall UI: `client/src/components/PaywallModal.tsx` → `/pricing` (`client/src/App.tsx:548`);
  checkout via `client/src/components/ProCheckoutLink.tsx` → `POST /api/billing/...`.

**Every one of these checks is server-side and runs before the job is enqueued.** The extension calls
the same endpoint with the same token, so it inherits all of them; it renders the server's message and
links to `https://videotext.io/pricing`. No entitlement arithmetic is done in the extension.

## 19. Error handling

Server returns `{ message }` with a meaningful status. Notable mappings from the intake pipeline:

| Status | Cause | Message source |
| --- | --- | --- |
| 400 | unsupported file / no file / too large / duration exceeded | `transcriptionIntake.ts` |
| 401 | guest-UUID spoof / session expired | `transcriptionIntake.ts:113` |
| 403 | free quota exhausted, guest IP cap, language cap, minutes cap | `importQuota.ts`, `limits.ts` |
| 429 | upload rate limit (`Retry-After: 60`), `MAX_CONCURRENT_JOBS_REACHED` | `uploadRateLimit.ts` |
| 503 | queue at hard/soft limit, storage full (`Retry-After: 30/60`) | `queueConfig.ts`, `upload.ts` |

Client conventions worth reusing: `SessionExpiredError` on a 404 from `/api/job/:id`
(`client/src/lib/api.ts:1317`), `isNetworkError()`, `getUserFacingMessage()`, and
`POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS = 5` (`:1332`).

## 20. Rate limiting

* Per-user uploads: Redis sorted set, **3 uploads / 60 s** in production
  (`UPLOAD_RATE_LIMIT_PER_MIN`, `server/src/utils/uploadRateLimit.ts:13`); fails open if Redis is down.
* Guest IP daily import cap: `server/src/utils/guestIpLimit.ts`.
* Global express-rate-limit on `/api` (`generalLimiter`, `server/src/index.ts:252`), plus
  route-specific limiters for OTP/demo/Google auth (`server/src/routes/auth.ts`).

## 21. CSRF / CORS / security assumptions

* No CSRF tokens — the API is **stateless bearer-token**, not cookie-session, so CSRF does not apply.
* CORS allowlist: `server/src/utils/allowedOrigins.ts` — `https://videotext.io`,
  `https://www.videotext.io`, `https://us.posthog.com`, anything in `CORS_ORIGINS`, any
  `https://*.vercel.app` preview, plus localhost in non-production. Applied in
  `server/src/index.ts:162` with `credentials: true` and an explicit `allowedHeaders` list
  (`Content-Type, Authorization, X-User-Id, X-Plan, X-Upload-Id, X-Chunk-Index, X-Api-Key, X-Job-Token`).
* A request with **no** `Origin` header is always allowed (`isAllowedOrigin()` returns `true` for
  undefined) — server-to-server/curl.
* `chrome-extension://<id>` is **not** currently allowed. → see §25.

## 22. Existing analytics / events

`client/src/lib/analytics.ts` (PostHog via `VITE_POSTHOG_KEY`), `trackEvent`, `trackAppEvent`
(`client/src/lib/feedbackEvents.ts`), `upload_started` / `upload_completed`
(`client/src/lib/api.ts:22`), plus `@sentry/react` and `@vercel/analytics`.

**The extension deliberately ships none of this.** No PostHog, no Sentry, no Vercel Analytics, no
telemetry of any kind — it keeps the Chrome Web Store privacy disclosure to "no data collected by
the extension itself" and avoids bundling a third-party analytics SDK into a reviewed artifact.
Server-side job accounting still happens, exactly as it does for the website.

## 23. Branding / design tokens / components reusable

* App icon: `client/public/icons/icon-192.png` / `icon-512.png` — purple rounded square, white play
  triangle. **Reused** as the source for the extension icons (downscaled, same artwork).
* Logo mark: `client/public/logo.svg` — indigo gradient `#818CF8 → #6366F1`.
* Tailwind tokens: `client/tailwind.config.js`; the product's primary is indigo/violet
  (`#6366F1` family).
* React components (`ToolLayout`, `UploadZone`, `ProcessingInterface`, `PaywallModal`, …) are tightly
  coupled to `react-router`, Tailwind's build, PostHog and the page's 6k-line state machine, so they
  are **not** reusable in a popup without dragging the whole app in. The extension re-implements the
  same *visual language* (colours, radii, copy) in ~7 KB of hand-written CSS instead.

Copy reused verbatim: `"Auto-detect"`, the plan-limit and quota messages (rendered from the server
response), and the product name.

## 24. Privacy policy and terms URLs

* Privacy: `https://videotext.io/privacy` — `client/src/App.tsx:564`, page `client/src/pages/Privacy.tsx`.
* Terms: `https://videotext.io/terms` — `client/src/App.tsx:572`.

Retention claims that may be repeated (they are the product's own published text,
`client/src/pages/Privacy.tsx:24,38`): uploads and outputs are processed then deleted by automated
cleanup and are not retained longer than needed to deliver the result; account/usage data (email,
plan, uploads used) is stored for billing and limits; content is not used for model training.

## 25. Server changes required for a Chrome extension origin

Two, both additive and off by default.

**(a) CORS — allow the extension origin.** *(Superseded — already solved on `main`.)*
A popup/service-worker `fetch` sends `Origin: chrome-extension://<id>`, which this audit originally
proposed allowlisting via a new `EXTENSION_ORIGINS` env var. Before this branch merged, `main`
solved the same problem for the Fix SRT extension with `isChromeExtensionOrigin()` /
`isCorsAllowedOrigin()` in `server/src/utils/allowedOrigins.ts`, which accepts any well-formed
`chrome-extension://[a-p]{32}` origin for CORS while keeping `isAllowedOrigin()` — used for Stripe
redirect URLs and WebSocket upgrades — extension-free. That mechanism is used instead; no env var
and no second implementation.

**(b) A sign-in handoff page, `/extension-auth`.**
Auth is a `localStorage` JWT with no cookie session, so the extension cannot "already be signed in".
New client route `/extension-auth` (`client/src/pages/ExtensionAuth.tsx`): if the visitor has a
session it posts `{ source: 'videotext-extension-auth', token, plan, email }` via `window.postMessage`
to its own window and shows a "you can close this tab" confirmation; if not, it bounces to
`/login?returnTo=/extension-auth`. The extension's content script — matched **only** on
`https://videotext.io/extension-auth*` — relays that message to the service worker, which stores the
token in `chrome.storage.local`. No other page is readable by the extension.

Nothing else changes: no new API endpoint, no auth model change, no limit change, no new
`toolType`, no schema migration.

---

## Proposed extension integration (what was built)

```
chrome-extensions/video-to-transcript/
  manifest.json         MV3
  src/background.ts     service worker: owns upload + polling, survives popup close
  src/popup.ts          UI state machine (idle → uploading → processing → done/error)
  src/content-auth.ts   content script, videotext.io/extension-auth only
  src/lib/{config,api,languages,validation,transcript,errors}.ts
  public/popup.html|.css
  icons/                16/32/48/128 downscaled from client/public/icons/icon-192.png
```

Flow, end to end:

1. Popup reads `chrome.storage.local.authToken`. No token (or expired `exp`) → **"Sign in to VideoText"**,
   which opens `https://videotext.io/extension-auth`; the handoff above returns the token and the popup
   re-renders signed-in.
2. Popup calls `GET /api/usage/current` with the bearer token → renders plan + remaining imports, and
   uses `limits.maxFileSize` / `limits.maxVideoDuration` for **advisory** pre-flight.
3. File picked → extension validates extension/MIME against the §3 list and size/duration against the
   values from step 2, then hands the file to the service worker.
4. Service worker uploads: `POST /api/upload` for ≤15 MB, or `init`/`chunk`/`complete` above 15 MB with
   8 MB chunks (server cap 10 MB), matching `client/src/lib/api.ts` thresholds.
5. Service worker polls `GET /api/job/:jobId?jobToken=…` every 1500 ms, applying
   `getJobLifecycleTransition`'s rules (status-only lifecycle; network errors never mean failure; stop
   after 5 consecutive network errors). Job state is persisted in `chrome.storage.local`, so closing and
   reopening the popup resumes the same job.
6. On `completed`: transcript text from `result.segments` (joined with `\n\n`) else from
   `result.downloadUrl`. Rendered in the popup with **Copy transcript**, **Download .TXT**,
   **New transcription**.
7. Any 401/403/429/503 is rendered as the server's own `message`; quota exhaustion additionally shows
   **Upgrade** → `https://videotext.io/pricing`.

Limit enforcement is unchanged and unbypassable: the extension holds the same user's JWT and hits the
same `runTranscriptionIntake()` pipeline, so import quota, rate limit, concurrency, size, duration and
subscription state are all decided by the server before a job exists.
