# VideoText MCP Architecture Audit

**Status:** Phase 1 complete — **implementation blocked pending explicit user approval**  
**Branch:** `cursor/mcp-architecture-audit-070e`  
**Date:** 2026-09-14  
**Scope:** Read-only inspection + documentation only. No production application code was modified.

This audit inspects the production VideoText.io repository and proposes a thin MCP integration layer that wraps existing functionality. It does **not** authorize implementation.

---

## 1. Executive summary

VideoText already has a production-grade programmatic facade: **`/api/v1`** (private beta), used by the Zapier integration. That facade:

- Maps public operations → forced internal `toolType` values (`server/src/services/apiOperations.ts`)
- Reuses the same intake → Bull/Redis → worker pipelines as the web app
- Authenticates via DB-backed `vt_live_` API keys (Pro / paid access required)
- Enforces the same plan limits, quotas, concurrency, and success-only usage charging

**Recommended MCP boundary (Option B):** a removable MCP server process that calls existing `/api/v1` HTTP endpoints with the user’s VideoText API key — the same pattern as `/workspace/zapier`.

**Do not** invent a second transcription/subtitle pipeline, a second billing system, or an auth bypass.

**Existing “MCP” artifacts are not a production MCP server:**

| Artifact | Reality |
|----------|---------|
| `client/public/.well-known/mcp/server-card.json` | Static discovery JSON; advertises tools/auth that do **not** match `/api/v1` |
| `client/src/lib/webmcp.ts` | Browser WebMCP: **navigates** to UI pages; does not call processing APIs |
| Repo dependencies | **No** `@modelcontextprotocol` SDK / stdio / SSE MCP runtime |

---

## 2. Current architecture

### 2.1 High-level stack

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | React 18 + Vite + React Router + Tailwind | `client/` |
| Backend API | Express (TypeScript, CommonJS) | `server/src/` |
| Worker | Bull + Redis, same codebase | `server/src/workers/` |
| Database | PostgreSQL via Prisma | `server/prisma/schema.prisma` |
| Auth | JWT sessions (web) + `vt_live_` API keys (`/api/v1`) | `server/src/utils/auth.ts`, `models/ApiKey.ts` |
| Billing | Stripe subscriptions on `User.plan` | `server/src/routes/billing.ts`, `stripeWebhook.ts` |
| ASR | OpenAI Whisper (`whisper-1`) for file jobs | `server/src/services/transcription.ts` |
| Live ASR | Deepgram WebSocket only | `server/src/routes/liveTranscription.ts` |
| Diarization | Replicate (`thomasmol/whisper-diarization`), paid plans | `server/src/services/diarization.ts` |
| Deploy | Vercel (frontend) + Hetzner Docker (API + worker + Redis) | `docs/DEPLOYMENT_VERCEL_HETZNER.md` |

Canonical pipeline (from `docs/ARCHITECTURE.md` and code):

```
Client → Express API → intake validation/quota → Bull (normal/priority) → worker → TEMP_FILE_PATH → download
```

Guideline formatting (“Make It Client Ready”) uses a **separate** Prisma `FormattingJob` + `guidelineQueue` / `guidelineProcessor.ts` — not `videoProcessor.ts`.

### 2.2 Relevant routes

#### Web / first-party

| Route | Role |
|-------|------|
| `POST /api/upload` | Single-file tools → `runTranscriptionIntake` |
| `POST /api/upload/dual` | Fix / burn → dual-file intakes |
| `POST /api/upload/init\|chunk\|complete` | Chunked uploads |
| `POST /api/upload/youtube` | YouTube transcription intake |
| `GET /api/job/:jobId` (+ SSE stream) | Job status (JWT and/or jobToken for poll/claim) |
| `GET /api/download/:filename` | Result download (**authenticated owner required**) |
| `POST /api/guidelines/format` | Make It Client Ready |
| `GET /api/guidelines/jobs/:jobId` | Guideline job status |
| `POST /api/translate-subtitles/` | Sync paste-translate helper (auth required) |
| `POST /api/api-keys` | Create/list/revoke API keys (JWT + paid) |

#### External API (`/api/v1`) — preferred MCP target

| Public operation | Endpoint | Internal pipeline |
|------------------|----------|-------------------|
| `video_to_transcript` | `POST/GET /api/v1/transcriptions` | `video-to-transcript` via `runTranscriptionIntake` |
| `video_to_subtitles` | `POST/GET /api/v1/subtitles` | `video-to-subtitles` |
| `subtitle_translation` | `POST/GET /api/v1/subtitle-translations` | `translate-subtitles` |
| `subtitle_fix` | `POST/GET /api/v1/subtitle-fixes` | `fix-subtitles` via `runFixSubtitlesDualIntake` |
| `subtitle_burn` | `POST/GET /api/v1/subtitle-burns` | `burn-subtitles` (out of MCP Phase 3 target list) |
| `video_compression` | `POST/GET /api/v1/video-compressions` | `compress-video` (out of MCP Phase 3 target list) |
| `guideline_format` | `POST/GET /api/v1/guideline-formats` | `runGuidelineFormatIntake` (no worker toolType) |
| Identity / usage | `GET /api/v1/me` | DB plan + usage |

Authoritative registry: `server/src/services/apiOperations.ts` → `PUBLIC_OPERATIONS`.

Contract documentation: `docs/API_PRIVATE_BETA.md`.

### 2.3 Authentication path

1. **Web JWT:** `Authorization: Bearer <JWT>` → `verifyAuthToken` → `{ userId, plan, ... }` (plan in token is not sole authority; subscription guard reloads DB state).
2. **API keys (external):** `vt_live_…` stored as SHA-256 hash only; `requireApiKeyAuth` on `/api/v1`:
   - Resolve key → load `User` from DB → `enforceSubscriptionState` → require `hasPaidAccess` or `business`
   - Free users get `403 UPGRADE_REQUIRED`
3. Soft `apiKeyAuth` on upload/job/download accepts DB keys (and legacy env keys) and sets `req.apiKeyUser` for `getEffectiveUserId`.

**MCP implication:** reuse **existing** Pro/paid API keys. Do not invent anonymous MCP processing. JWT login advertised in `server-card.json` is **not** the `/api/v1` contract.

### 2.4 User / plan / usage model

- `User.plan`: `free | basic | pro | agency | founding_workflow | business`
- Usage in `User.usageThisMonth` JSON; limits in `User.limits` JSON
- Free: **3 imports/month** (+ bonus credits), not minute metering for gating
- Paid: duration/size/concurrency + minutes (Pro/business effectively unlimited minutes; soft concurrency via daily minutes)
- Source of truth for numeric caps: `server/src/utils/limits.ts` → `getPlanLimits`
- Free monthly imports: `server/src/utils/importQuota.ts`
- Charging: **success-only** in `videoProcessor.ts` (`recordFreePlanImport` / `incrementUserUsage`)

`/api/v1` does **not** bypass these intakes. API keys inherit the owning user’s plan from the DB.

### 2.5 Upload / storage / job / result lifecycle

1. **Upload:** multer disk under `TEMP_FILE_PATH` (default `/tmp`); filename `{uuid}-{sanitized}`; magic-byte validation via `fileValidation.ts`
2. **Validate:** type, size, duration (where known), free imports / minutes, concurrency (`getDailySoftCapConcurrency` + system load), language limits
3. **Enqueue:** `addJobToQueue(plan, …)` → normal or priority Bull queue
4. **Process:** `videoProcessor.processJob` switch on `toolType`
5. **Persist:** Prisma `Job` row (`status`, `resultFilename`, `jobToken`, durations, etc.)
6. **Download:** `GET /api/download/:filename` — ownership by authenticated user; **jobToken alone is insufficient**
7. **Cleanup:** `fileCleanup.ts` ~2.5h max age (faster under disk pressure); active files protected via Redis registry

Remote generic `url` ingestion on upload is **disabled** (`VALIDATION_ERROR`: URL downloads temporarily disabled). YouTube has a dedicated allowlisted path.

### 2.6 Security boundaries (existing)

- Forced `toolType` on `/api/v1` (client cannot pick arbitrary worker ops)
- Ownership checks on job GET (404 not 403 for cross-user)
- Download path traversal guard + ownership
- Webhook SSRF protections (`webhookSsrf.ts`) for outbound webhooks
- Rate limit per API key (default 60/min, Redis; fail-open on Redis errors — operational risk)
- Guest IP import limit (fail-open on Redis errors)
- Prompt/content in transcripts treated as data by workers (no instruction interpreter) — MCP must preserve this

**Known gaps relevant to MCP:**

- `/api/audio/:filename` lacks ownership checks (IDOR while file lives)
- Docs/Zapier vs download auth: relative URLs include `jobToken`, but download requires authenticated identity; MCP must send the API key on download fetches
- Misleading public discovery card (`server-card.json`) vs real API
- Pro/business minute unlimited → MCP can drive high Whisper spend (same as web/Zapier)

---

## 3. Workflow traces (UI → service → result)

### 3.1 Transcription (`transcribe_media`)

| Step | Implementation |
|------|----------------|
| UI | `client/src/pages/VideoToTranscript.tsx` → `toolType: video-to-transcript` |
| Web entry | `POST /api/upload` → `runTranscriptionIntake` |
| v1 entry | `POST /api/v1/transcriptions` → same intake, `forcedToolType: 'video-to-transcript'` |
| Worker | `videoProcessor` case `video-to-transcript` |
| ASR | `transcribeVideo` / `transcribeVideoVerbose` (Whisper) |
| Diarization | `transcribeWithDiarization` if `speakerDiarization` and paid + `REPLICATE_API_TOKEN` |
| Options supported in intake | `language`, `includeSummary`, `includeChapters`, `speakerDiarization`, `numSpeakers`, `diarizationLanguage`, `glossary`, `exportFormats` (`txt|json|docx|pdf`), trim, `uploadMode=audio-only` |
| Output | `.txt` or multi-format zip; durable v1 GET exposes `txt_url` / status, **not** inline transcript text |
| Status | `queued \| processing \| completed \| failed` |

### 3.2 Subtitle generation (`generate_subtitles`)

| Step | Implementation |
|------|----------------|
| UI | `VideoToSubtitles.tsx` |
| v1 | `POST /api/v1/subtitles` → `video-to-subtitles` |
| Worker | Whisper → SRT/VTT; optional `additionalLanguages` → zip |
| Formats | **`srt` (default), `vtt`** via `options.format` |
| QA side-effect | `validateSubtitleFile` warnings: `long_line`, `reading_speed`, `overlap` (attached to job result; **not** durable on v1 GET) |

### 3.3 Fix SRT (`fix_srt`)

| Step | Implementation |
|------|----------------|
| Core | `fixSubtitleFile()` in `server/src/services/subtitles.ts` |
| Behavior | Optional timing normalize + offset; filler removal; AI grammar (`gpt-4o-mini` with regex fallback); line-break fixes; **overlap fix always applied** |
| Web apply path | Single-file upload with fix option flags |
| Web dual path | Scene-aware analyze (`validateAgainstSceneCuts`); UI design does not forward fix checkboxes |
| v1 | `POST /api/v1/subtitle-fixes` → dual intake (`subtitles` required, `video` optional) — **does not currently forward fix checkbox body fields** |
| Output | `_fixed.srt` / `_fixed.vtt` + issues/warnings in worker result |

**MCP must expose only real v1/web behavior.** Full checkbox parity may require an approved API enhancement (public contract change).

### 3.4 Make It Client Ready (`make_client_ready`)

| Step | Implementation |
|------|----------------|
| UI | `GuidelineFormat.tsx` (presets assembled **client-side only**) |
| v1 | `POST /api/v1/guideline-formats` JSON `{ transcriptText, rules[], presetId?, inputFormat?, cues? }` |
| Intake | `runGuidelineFormatIntake` → `FormattingJob` + guideline queue |
| Worker | `enforceGuideline` / `enforceGuidelineCaptions` |
| Output | Inline `formatted_text` on GET — no download file |
| Limitation | No server `presetId → rules` registry; caller must send full `rules[]` |

### 3.5 Translate subtitles (`translate_subtitles`)

| Step | Implementation |
|------|----------------|
| v1 | `POST /api/v1/subtitle-translations` + `targetLanguage` |
| Worker | `translateSubtitleFile` / `translatePreservingLines` |
| Provider | Existing OpenAI-backed translation in production (same as web) |
| QA | `detectLanguageConsistency` issues in worker result |
| Limits | Translated-minute caps for Pro/Agency via metering |

Stable and programmatically callable via `/api/v1`. No new provider required for MCP wrapper.

### 3.6 Subtitle QA (`subtitle_qa`)

**No standalone product tool or `/api/v1` operation exists.**

QA is embedded:

- `validateSubtitleEntries` / `validateSubtitleFile` (timing/reading)
- `fixSubtitleIssues` (during Fix)
- `detectLanguageConsistency` (during Translate)
- Guideline `buildValidationReport`
- YouTube caption quality helpers (YouTube-specific)

**Recommendation:** exclude as a first-class MCP tool until a dedicated, approved, programmatically stable endpoint exists — or expose a **read-only** structured wrapper around `validateSubtitleEntries` only after approval (would be new surface area / potential public API).

### 3.7 Job status (`get_job_status`)

Map MCP status tool → existing durable states:

- Job-backed ops: `GET /api/v1/{transcriptions|subtitles|subtitle-translations|subtitle-fixes}/:id`
- Guideline: `GET /api/v1/guideline-formats/:id`
- Statuses: `queued | processing | completed | failed` (Prisma Job / FormattingJob)

Do **not** invent a parallel job store.

---

## 4. Phase 2 decision — MCP integration boundary

### Options

| Option | Description | Verdict |
|--------|-------------|---------|
| **A** | MCP imports internal services (`runTranscriptionIntake`, workers) in-process | Stronger coupling; risk of skipping middleware; harder to remove; needs shared process with API secrets |
| **B** | MCP HTTP client → `/api/v1` (Zapier pattern) | **Recommended** — least duplication, strongest existing security/quota boundary, removable |
| **C** | Extract shared service abstraction used by web + v1 + MCP | Major refactor; requires approval; unnecessary given `PUBLIC_OPERATIONS` + intakes |

### Decision

**Choose Option B:** thin MCP adapter over `/api/v1`.

```
AI Client
  → VideoText MCP Server (stdio and/or HTTP transport; thin adapter)
    → HTTPS /api/v1 (API key auth)
      → existing intakes / queues / workers
        → VideoText result (+ authenticated download)
```

Mirror Zapier helpers conceptually (`zapier/lib/api.js`, `polling.js`, `files.js`) in a TypeScript MCP package — do not call internal `/api/upload` with client-chosen `toolType`.

---

## 5. Proposed MCP tools (post-approval)

Only where stable production callability exists:

| MCP tool | Maps to | Notes |
|----------|---------|-------|
| `transcribe_media` | `POST /api/v1/transcriptions` + status/download | Multipart file; optional language/diarization fields if forwarded by multipart body into intake |
| `generate_subtitles` | `POST /api/v1/subtitles` | `format`: `srt` \| `vtt` |
| `fix_srt` | `POST /api/v1/subtitle-fixes` | Dual multipart; document v1 option gaps |
| `make_client_ready` | `POST /api/v1/guideline-formats` | Requires full `rules[]` |
| `translate_subtitles` | `POST /api/v1/subtitle-translations` | Requires `targetLanguage` |
| `get_job_status` | `GET /api/v1/<resource>/:id` | Resource derived from operation/job metadata stored by MCP adapter |
| `get_account_usage` (optional helper) | `GET /api/v1/me` | Helps agents respect quotas; not in Phase 3 list but zero new backend |

### Explicitly excluded (initially)

| Tool / capability | Reason |
|-------------------|--------|
| `subtitle_qa` as standalone | No stable public operation |
| YouTube / remote URL ingestion | SSRF / disabled URL downloads; requires explicit approval |
| Burn subtitles / compress | Out of Phase 3 target list (exist on `/api/v1` if later approved) |
| Convert-subtitles | Worker exists; **not** on `/api/v1` |
| Live Deepgram transcription | Different real-time stack |
| Free-plan / guest MCP access | `/api/v1` requires paid API access |
| Marketplace submissions | Separate approval |

### File ingestion strategy (design only)

- Accept MCP-provided file bytes / local paths from the **client host** (Cursor stdio), or base64 in tool args with size caps
- Upload as multipart to `/api/v1` (same as Zapier after it downloads upstream files **client-side**)
- Reuse server validation (MIME/magic, size, duration) on intake
- **Never** implement server-side arbitrary URL fetch in MCP without approval
- Never trust filenames; never return filesystem paths or storage credentials
- MCP temp files: write under OS temp, delete after upload; do not log media/transcripts

### Auth / billing approach (design only)

- Config: `VIDEOTEXT_API_KEY` + `VIDEOTEXT_API_ORIGIN` (default `https://api.videotext.io`)
- Optional later: OAuth / account linking — **blocked until approved**
- Usage: exclusively via `/api/v1` intakes → same entitlements as Zapier/web API
- Do not hard-code plan limits in MCP

### Deployment assumptions (design only — not to execute)

| Mode | Use |
|------|-----|
| Local stdio MCP | Cursor / Claude Desktop for developers |
| Optional remote HTTP/SSE MCP | Only after hosting, auth, and public-exposure approvals |
| Prefer **separate process/package** (`mcp/` or `packages/mcp-server`) | Avoid coupling MCP transport to internal Express process |

Do not modify Docker/Vercel/CI for public MCP exposure without approval.

---

## 6. Exact files proposed for creation or modification

### Create (after approval)

| Path | Purpose |
|------|---------|
| `mcp/package.json` | Isolated MCP package; MCP SDK dependency |
| `mcp/src/index.ts` | Server entry (stdio; optional HTTP later) |
| `mcp/src/client/videotextApi.ts` | Thin `/api/v1` HTTP client |
| `mcp/src/client/polling.ts` | Job polling helper |
| `mcp/src/client/files.ts` | Safe multipart upload helpers |
| `mcp/src/tools/*.ts` | One module per approved tool |
| `mcp/src/schemas/*.ts` | Input/output JSON schemas + validation |
| `mcp/src/security.ts` | Filename sanitization, size caps, prompt-injection-as-data policy, error redaction |
| `mcp/src/logging.ts` | Structured logs without secrets/media/transcripts |
| `mcp/tests/**` | Schema, auth failure, IDOR assumptions, SSRF rejection, entitlement error mapping |
| `docs/MCP_SERVER.md` | Local developer workflow |
| Optional: `mcp/README.md` | Package discovery (no marketplace claims) |

### Modify (after approval — minimize)

| Path | Purpose |
|------|---------|
| Root or `mcp` README cross-link | Point developers to MCP docs |
| Possibly `clientType` analytics tag | Only if approved to add `"mcp"` alongside `generic` \| `zapier` (touches API key model — **auth-adjacent approval**) |

### Explicitly do **not** modify (unless separately approved)

| Path / area | Why |
|-------------|-----|
| `server/src/workers/*` pipelines | No second implementation |
| Billing / Stripe / `limits.ts` values | No pricing/entitlement changes |
| SEO pages / content | Out of scope |
| `docker-compose.yml`, `vercel.json`, production env, CI release | Deployment approval gate |
| Public `/api/v1` contracts | Avoid breaking Zapier/beta clients |
| Retention/cleanup timers | Privacy gate |
| Enabling remote URL ingestion | SSRF gate |
| Merging to `main` / deploying / marketplace publish | Release gates |

### Documentation-only change in this Phase 1 PR

| Path | Purpose |
|------|---------|
| `docs/MCP_ARCHITECTURE_AUDIT.md` | This audit |

---

## 7. Reusable components vs do-not-duplicate

**Reuse:**

- `PUBLIC_OPERATIONS` / `/api/v1` routes
- `runTranscriptionIntake`, dual-file intakes, `runGuidelineFormatIntake`
- `ApiKey` auth + rate limit
- Plan limits / import quota / usage increment paths
- `fileValidation`, subtitle detectors/parsers
- Zapier patterns for multipart + polling (as a reference client)

**Do not duplicate:**

- Whisper / FFmpeg / diarization / translation / guideline enforcer logic
- Plan limit numbers
- Job state machines
- Download authorization rules

---

## 8. Technical risks, blockers, unsupported capabilities

### Blockers before public MCP exposure (P0)

1. **Paid API key required** — free users cannot use `/api/v1`; product decision needed if MCP should ever serve free tier.
2. **Download auth** — MCP must attach API key when fetching `/api/download/...`; docs that imply anonymous `jobToken` download are outdated relative to `download.ts`.
3. **No inline transcript on v1 GET** — agents get URLs; MCP should fetch content with auth and return structured text carefully (size limits; do not log full text).
4. **Misleading discovery card** — updating or removing `server-card.json` / WebMCP claims needs approval (public discovery change).
5. **Guideline presets** — MCP clients must supply full `rules[]` or product must add server registry (API change).
6. **Fix SRT option parity on v1** — checkbox flags not forwarded on dual v1 path.
7. **subtitle_qa** — no endpoint.
8. **Remote URL / YouTube via MCP** — disabled or separate path; SSRF approval required.
9. **Hosting / TLS / secrets for remote MCP** — deployment approval.
10. **Provider marketplace requirements** (ChatGPT/Claude/Perplexity) — unknown until verified; assume **BLOCKED**.

### Dangerous assumptions to avoid

- Assuming `server-card.json` is the live contract
- Assuming jobToken-only download works
- Assuming Pro concurrent jobs = `PlanLimits.maxConcurrentJobs` (enforcement uses soft-cap helper; agency advertised concurrency ≠ gate)
- Assuming Redis rate limits always enforce (fail-open)
- Treating WebMCP navigation tools as processing APIs
- Implementing Option A “just for speed” and accidentally skipping quota middleware

### Privacy

- Temp outputs ~2.5h retention today
- Transcripts may contain sensitive interview/meeting content — MCP must not log them
- Third parties already in path: OpenAI (Whisper/LLM), Replicate (diarization), Stripe, email, PostHog/Sentry as configured
- MCP adds an additional boundary hop (AI client ↔ MCP ↔ API); do not increase retention without approval

---

## 9. Changes that require user approval

Per operating model — **stop before**:

1. Implementing the MCP package / modifying production application code beyond this audit doc  
2. Auth / OAuth / API-key model changes (including new `clientType: mcp`)  
3. Billing / entitlement / quota changes  
4. Adding paid dependencies (e.g. `@modelcontextprotocol/sdk`) or new services  
5. Changing public API routes/contracts  
6. Major refactors (Option C)  
7. Remote URL ingestion  
8. Retention/deletion/privacy changes  
9. Deployment manifests / prod env / CI release  
10. Public MCP exposure  
11. Marketplace submissions  
12. Merge / deploy / release  
13. Product/pricing/plan changes  
14. Proceeding despite unresolved security issues that cannot be isolated  
15. Any approach that changes existing production behavior rather than a removable adapter  

---

## 10. Validation already completed (read-only)

- Repository structure and package manifests inspected
- `docs/ARCHITECTURE.md`, `docs/API_PRIVATE_BETA.md`, `docs/DEPLOYMENT_VERCEL_HETZNER.md` reviewed
- `apiOperations.ts`, `apiV1.ts`, intake/worker/auth/limits/download paths traced in code
- Zapier client pattern reviewed as reference thin client
- Existing WebMCP / server-card divergence confirmed
- Relevant existing tests identified (not executed as a full suite in this audit turn):  
  `apiOperationsSecurity.test.ts`, `apiKeyLifecycle.test.ts`, `apiV1Pagination.test.ts`, `entitlementHardening.test.ts`, `webhookSsrf.test.ts`, etc.
- Granola meeting context: **unavailable** in this environment (MCP auth requires Cursor desktop IDE)

---

## 11. Approval request (required before Phase 2+ implementation)

### Recommended scope

- **Capabilities:** MCP tools that wrap `/api/v1` only (Option B)
- **Tools included:** `transcribe_media`, `generate_subtitles`, `fix_srt`, `make_client_ready`, `translate_subtitles`, `get_job_status` (+ optional `get_account_usage`)
- **Tools excluded:** standalone `subtitle_qa`, YouTube/URL ingest, burn, compress, convert, live ASR, marketplace adapters
- **Integration boundary:** separate `mcp/` package → HTTPS `/api/v1`
- **Authentication:** existing `vt_live_` API keys; no new OAuth
- **File ingestion:** client-provided bytes/paths → multipart upload; **no** server-side URL fetch
- **Usage/billing:** unchanged; all jobs through existing intakes
- **Deployment:** local stdio documented only; no production exposure

### Required yes/no approvals

1. **Approve implementing Option B MCP package** that calls `/api/v1` (no worker/pipeline duplication)?  
2. **Approve adding `@modelcontextprotocol/sdk` (or current official SDK) as a dependency** inside an isolated `mcp/` package?  
3. **Approve tool set** listed above (include/exclude as stated)?  
4. **Confirm authentication = existing API keys only** for v1 (no OAuth/account-linking in this phase)?  
5. **Confirm no remote URL ingestion** in this phase?  
6. **Approve MCP fetching `/api/download` with the same API key** to return result content to the agent (still no anonymous jobToken download change)?  
7. **Defer standalone `subtitle_qa`** until a dedicated approved endpoint exists?  
8. **Defer changes to `server-card.json` / WebMCP** (or approve a follow-up to align discovery with reality)?  
9. **Defer adding `clientType: "mcp"`** on API keys (keep `generic`) unless you want analytics tagging now?  
10. **Confirm no production deploy, public exposure, merge to main, or marketplace submission** in this phase?

### Alternatives considered

- **Option A in-process:** rejected for coupling and bypass risk  
- **Option C shared abstraction refactor:** rejected as unnecessary major change  
- **Expand `/api/v1` first** (inline transcripts, fix options, QA endpoint, jobToken download): possible later, each needs separate approval  

---

## 12. Stop point

**Phase 1 audit is complete.**  

No MCP server implementation, authentication changes, billing changes, deployment changes, or public exposure will proceed until the user answers the approval questions above with explicit approval of scope.
