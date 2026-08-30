# VideoText External API — Private / Beta

**Status: Private Beta. Not publicly announced or documented for third parties yet.**
This API is a thin facade over VideoText's existing web-app transcription
pipeline — same authentication resolution, same DB-authoritative
subscription/quota enforcement, same Bull/Redis queue and worker, same
Whisper transcription. There is no second transcription pipeline.

It exists to support private testing of a future Zapier integration and any
other server-to-server integration during the beta period. Do not publish
this document or these endpoints externally.

## Requirements

- **API access is a Pro feature.** Free-plan accounts get `UPGRADE_REQUIRED`
  on every `/api/v1` and `/api/api-keys` call.
- API keys are created from Settings → Integrations → API Keys (or via
  `POST /api/api-keys`, session-authenticated).

## Authentication

```
Authorization: Bearer vt_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

`X-Api-Key: vt_live_...` is also accepted.

Keys are shown in full exactly once, at creation. VideoText stores only a
SHA-256 hash — a lost key cannot be recovered, only revoked and replaced.
A revoked key stops working immediately (no caching/propagation delay).

## Creating an API key

```
curl -X POST https://videotext.io/api/api-keys \
  -H "Authorization: Bearer <your JWT session token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Zapier testing", "clientType": "zapier"}'
```

`clientType` is `"generic"` (default) or `"zapier"` — a self-declared tag
used only for internal analytics ("how many jobs came through the Zapier
integration"). It never affects your plan, quota, or processing.

Response (secret shown once):

```json
{
  "id": "ck_...",
  "name": "Zapier testing",
  "clientType": "zapier",
  "keyPrefix": "vt_live_ab12cd34",
  "createdAt": "2026-08-30T06:00:00.000Z",
  "key": "vt_live_<...the full secret, only ever shown here...>"
}
```

`GET /api/api-keys` lists your keys (no secret, just prefix/name/timestamps).
`DELETE /api/api-keys/:id` revokes a key immediately.

## Public operations — the authoritative mapping

**You never send an internal `toolType`.** Each endpoint below *is* the
operation — the server decides, and always overwrites, which internal
processing pipeline runs. If you send a `toolType` field anyway (some HTTP
clients/Zapier UIs make it hard not to), it is silently ignored — the route
you called is what runs, always. This is enforced in code, not just
documented: see `server/src/services/apiOperations.ts` (the single
public-operation → internal-operation registry every route reads from) and
`server/src/services/toolTypeResolution.ts` (`resolveToolType`, which a
server-set value always wins).

| Public operation | Endpoint | Runs the exact same pipeline as | Input |
|---|---|---|---|
| Transcription (incl. voice recordings) | `POST /api/v1/transcriptions` | web app's Video-to-Transcript / Voice Recorder | 1 file |
| Subtitle generation | `POST /api/v1/subtitles` | web app's Video-to-Subtitles | 1 file |
| Subtitle translation | `POST /api/v1/subtitle-translations` | web app's Translate Subtitles | 1 file |
| Subtitle auto-fix | `POST /api/v1/subtitle-fixes` | web app's Fix Subtitles | 1 file (`file`), or 2 (`file` + `video`) |
| Subtitle burn-in | `POST /api/v1/subtitle-burns` | web app's Burn Subtitles | 2 files (`video` + `subtitles`) |
| Video compression | `POST /api/v1/video-compressions` | web app's Compress Video | 1 file |
| Guideline formatting | `POST /api/v1/guideline-formats` | web app's "Make it Client Ready" | JSON body |

**Voice Recorder has no separate endpoint.** In production it is just
another input source for the transcription pipeline (see
`client/src/pages/VoiceRecorder.tsx`, which sends the exact same
`toolType: video-to-transcript` the Video-to-Transcript page does) — upload
the recorded audio file to `POST /api/v1/transcriptions` like any other
file.

Every job-producing endpoint below (everything except `/guideline-formats`)
shares one durable status/list contract, described once here rather than
repeated per endpoint.

## POST /api/v1/transcriptions, /subtitles, /subtitle-translations, /video-compressions

Single multipart file upload (`file` field) — identical validation/quota/
enqueue path as the web app's own upload for that operation (file type,
size, duration, monthly minutes, concurrency).

```
curl -X POST https://videotext.io/api/v1/transcriptions \
  -H "Authorization: Bearer vt_live_..." \
  -F "file=@/path/to/video.mp4"
```

Response — `202 Accepted`:

```json
{ "id": "12345", "status": "queued", "operation": "video_to_transcript", "created_at": "2026-08-30T06:00:00.000Z" }
```

`/subtitle-translations` additionally accepts a `targetLanguage` field
(same as the web app) and echoes it back on this response as
`target_language` — see "Known limitations" for why it is POST-only, not
also on the GET response.

Remote `file_url` ingestion (e.g. a Google Drive file URL from a Zapier
step) is **not supported in this version** — see "Known limitations" below.

## POST /api/v1/subtitle-fixes, /subtitle-burns

Two-file operations, using the exact same `POST /api/upload/dual` pipeline
the web app uses (`multipart/form-data`, not JSON).

- `/subtitle-fixes`: `subtitles` field required (the subtitle file to fix).
  `video` field optional — when included, fixes are scene-aware, matching
  the web app's "Auto Fix" flow when a source video is attached.
- `/subtitle-burns`: **both** `video` and `subtitles` fields are required —
  this is the only production entry point for burn-subtitles; there is no
  single-file variant.

```
curl -X POST https://videotext.io/api/v1/subtitle-burns \
  -H "Authorization: Bearer vt_live_..." \
  -F "video=@/path/to/video.mp4" \
  -F "subtitles=@/path/to/captions.srt"
```

Response shape is identical to the single-file operations above
(`{ id, status, operation, created_at }`).

## POST /api/v1/guideline-formats

JSON body — reuses the web app's `POST /api/guidelines/format` pipeline
exactly (`services/guidelineIntake.ts`). This is **not** a file upload and
does **not** go through the video/subtitle worker at all.

```json
{
  "transcriptText": "the raw transcript to reformat...",
  "rules": [
    { "id": "tone", "category": "style", "label": "Tone", "currentValue": "formal" }
  ],
  "presetId": "client-ready-default"
}
```

`rules` must be a non-empty array of `{ id, category, label, currentValue }`
objects — the same shape the web app's UI builds from a preset or a parsed
style guide. **There is currently no server-side `presetId → rules`
registry** (presets are assembled entirely client-side in
`client/src/pages/GuidelineFormat.tsx`), so a caller must already have a
concrete `rules` array; `presetId` is stored for analytics only and does
not resolve anything server-side yet. See "Known limitations."

Response — `202 Accepted`: `{ id, status, operation: "guideline_format", created_at }`.

`GET /api/v1/guideline-formats/:id`:

```json
{
  "id": "abc123",
  "status": "completed",
  "operation": "guideline_format",
  "filename": null,
  "created_at": "2026-08-30T05:50:00.000Z",
  "completed_at": "2026-08-30T05:52:14.000Z",
  "failure_reason": null,
  "formatted_text": "the reformatted transcript..."
}
```

Guideline formatting produces inline text, not a downloadable file — there
is no `download_url` for this operation in production, so none is invented
here.

## GET /api/v1/<resource>/:id

Applies to `/transcriptions`, `/subtitles`, `/subtitle-translations`,
`/subtitle-fixes`, `/subtitle-burns`, `/video-compressions` (guideline
formats have their own shape — see above).

```
curl https://videotext.io/api/v1/transcriptions/12345 \
  -H "Authorization: Bearer vt_live_..."
```

```json
{
  "id": "12345",
  "status": "completed",
  "operation": "video_to_transcript",
  "tool_type": "video-to-transcript",
  "filename": "a1b2c3d4-my-video_transcript.txt",
  "duration_seconds": 612,
  "txt_url": "/api/download/a1b2c3d4-my-video_transcript.txt?jobToken=...",
  "srt_url": null,
  "vtt_url": null,
  "download_url": null,
  "original_size_bytes": 104857600,
  "created_at": "2026-08-30T05:50:00.000Z",
  "completed_at": "2026-08-30T05:52:14.000Z",
  "failure_reason": null
}
```

`download_url` is the field to use for operations without a dedicated
`txt_url`/`srt_url`/`vtt_url` — e.g. `/video-compressions` (compressed
video) and `/subtitle-burns` (video with burned-in captions).

Only fields the platform durably persists are included. Notably:

- **`language`, inline `transcript` text, and `target_language` are
  intentionally omitted from GET responses** — none of these are stored on
  the durable Job record today (only in the short-lived queue result, or
  not at all), so rather than invent them this API omits them. The full
  transcript text remains available at `txt_url`. `target_language` for a
  translation is available on that job's original POST response only.
- **`compressed_size_bytes` is intentionally omitted** for
  `/video-compressions` — only the *original* upload size is persisted
  (`original_size_bytes`, from `Job.fileSizeBytes`); there is no durable
  "compressed output size" column. Adding one is a small follow-up
  (`Job.outputSizeBytes`), not implemented in this beta so as not to invent
  data the pipeline doesn't actually record yet.

You'll only ever see your own jobs at the endpoint matching their
operation — e.g. a burn-subtitles job is never returned by
`GET /api/v1/subtitles/:id`, even though both share the same underlying Job
table. Another user's job (or the wrong resource path for that job's
operation) returns `404 TRANSCRIPTION_NOT_FOUND` (never `403`) — ownership
is enforced, and the API does not reveal that a job with that id exists for
someone else.

## GET /api/v1/<resource> — polling for Zapier's trigger

Same query params and pagination contract on every resource listed above.

```
curl "https://videotext.io/api/v1/transcriptions?status=completed&since=2026-08-30T00:00:00Z&limit=25" \
  -H "Authorization: Bearer vt_live_..."
```

```json
{
  "data": [ { "id": "...", "status": "completed", ... }, ... ],
  "pagination": { "limit": 25, "next_cursor": "MjAyNi0...", "has_more": true }
}
```

- `status` — filter (e.g. `completed`, `processing`, `failed`).
- `since` — ISO 8601 timestamp; combined with `status=completed`, filters on
  `completed_at`.
- `cursor` — pass back `pagination.next_cursor` to get the next page.
  Ordering is `(completedAt, id)` (or `(createdAt, id)` when not filtering
  by completion) — the `id` tiebreak guarantees two jobs completed in the
  same millisecond are never skipped or double-emitted across pages, which
  is what makes this safe for a Zapier polling trigger's deduplication.
- Only ever returns jobs owned by the authenticated key's user, and only
  jobs belonging to that resource's operation (see the mapping table
  above) — `GET /api/v1/transcriptions` includes voice-recorder-sourced
  transcriptions (recorded audio still produces a `video_to_transcript`
  job) but never a subtitle-burn or compression job.

## GET /api/v1/me

```
curl https://videotext.io/api/v1/me -H "Authorization: Bearer vt_live_..."
```

```json
{
  "id": "usr_...",
  "email": "you@example.com",
  "plan": "pro",
  "usage": {
    "minutes_used_this_month": 42,
    "minutes_limit_per_month": 1500,
    "imports_today": 3,
    "video_count_this_month": 5,
    "max_video_duration_minutes": 120,
    "max_file_size_bytes": 10737418240,
    "max_concurrent_jobs": 2,
    "queue_priority": 10
  }
}
```

All values are read from the same DB-authoritative user/plan/usage records
the web app uses — this endpoint never computes its own usage numbers.

## Errors

Every error uses the same envelope:

```json
{ "error": { "code": "QUOTA_EXCEEDED", "message": "...", "request_id": "..." } }
```

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_API_KEY` | 401 | Missing or unrecognized API key |
| `API_KEY_REVOKED` | 401 | Key exists but has been revoked |
| `UPGRADE_REQUIRED` | 403 | Free-plan account; API access requires Pro |
| `QUOTA_EXCEEDED` | 403 | Daily import cap, monthly minutes, or concurrency limit reached |
| `FILE_TOO_LARGE` | 400 | File exceeds your plan's size limit |
| `DURATION_EXCEEDED` | 400 | Video exceeds your plan's duration limit |
| `UNSUPPORTED_FILE` | 400 | File type not recognized/supported |
| `TRANSCRIPTION_NOT_FOUND` | 404 | No such transcription, or it belongs to another user |
| `FORBIDDEN` | 401/403 | Not authenticated, or a specific-action check failed |
| `RATE_LIMITED` | 429 | Too many requests for this API key this minute (see `Retry-After` header) |
| `VALIDATION_ERROR` | 400 | Malformed request (bad `since`, missing `toolType`, etc.) |
| `INTERNAL_ERROR` | 500 | Unexpected server error (never includes a stack trace or path) |

## Rate limits

Requests are limited **per API key**, not per IP — Zapier and other
integrations share outbound IP ranges across many customers, so IP-based
limiting would be the wrong unit. Default: 60 requests/minute per key
(`API_V1_RATE_LIMIT_PER_MIN` env var). A `429` response includes a
`Retry-After` header (seconds).

This is separate from, and does not affect, the first-party web app's own
per-user/per-IP limits.

## Known limitations (this beta)

- **No remote `file_url` ingestion.** Every file-based endpoint accepts
  only a multipart file upload today. A Zapier step that hands VideoText a
  Google Drive/Dropbox URL is not supported until a dedicated SSRF-safe
  remote-download path is built (deliberately deferred).
- **No REST Hooks / webhook subscriptions.** Use polling
  (`GET /api/v1/<resource>?status=completed&since=...`). VideoText does
  have a one-shot `webhookUrl` field on some upload endpoints (unrelated to
  this beta), now SSRF-hardened, but there is no subscribe/unsubscribe
  registry yet.
- **`POST /api/v1/guideline-formats` requires a fully-formed `rules`
  array.** There is no server-side `presetId → rules` registry in
  production today (presets exist only in the web app's client code) — this
  API reuses exactly the same validated input shape the web app's own
  request uses rather than inventing a preset-resolution feature that
  doesn't exist yet. Practically, this means Zapier users need to already
  know which rules they want applied; a `GET /api/v1/guideline-format-presets`
  endpoint that surfaces a server-side preset registry is a natural
  follow-up once one exists, not implemented in this beta.
- **`language`, inline `transcript` text, and per-job `target_language` are
  not in GET responses**, and **`compressed_size_bytes` is not in the
  `/video-compressions` GET response** — see the notes under
  "GET /api/v1/<resource>/:id" above. None of these are durably persisted
  on the Job record today; each is a small, well-scoped follow-up (a new
  Job column) rather than something this beta invents.
- **Filenames created before this beta shipped** have no ownership record
  and will return `404` from `/api/download/:filename` even if you
  previously had the link — this is the intended effect of closing the
  pre-existing "any filename downloads" gap, not a bug.

## Testing notes (for maintainers)

Full HTTP-level integration tests (auth → quota → enqueue → download,
cross-user access, rate limiting under load) require a live Postgres +
Redis + running worker, matching `docker-compose.yml`. They are not part of
this repo's `node:test` suite, which — consistent with the existing test
files under `server/tests/` — covers pure logic only (hashing, SSRF
validation, pagination-cursor encoding, error-envelope shape, response
field mapping). Run the full flow against a local `docker-compose up`
before enabling a real Zapier app against this API.

`server/tests/apiOperationsSecurity.test.ts` covers the public→internal
operation registry itself: every operation maps to a real (never invented)
worker toolType, `resolveToolType` always prefers the server-forced value
over anything a client sends (the regression test for BUG 2 — a client
can never make `POST /api/v1/transcriptions` run `burn-subtitles` by
sending `toolType=burn-subtitles`), and the toolType↔operation mappings
used by the GET endpoints are consistent in both directions. The other
required regression checks (ownership propagation to the real user id and
never `guest_<uuid>` — BUG 1's fix; `apiKeyId`/`source` populated
correctly; free users get `UPGRADE_REQUIRED`; revoked keys are rejected;
cross-user job access returns `404`; the web app's own upload routes are
unaffected) are exercised by the same live-DB path as the rest of
`/api/v1` — see the "Smoke-test checklist" below for the manual/staging
steps that cover them until a live-DB test harness exists in CI.

## Production smoke-test checklist

Run once per exposed operation after deploying this change, against a
staging Pro account and a staging API key:

1. **BUG 1 regression (ownership).** `POST` a small file to the endpoint,
   then immediately `GET` the same resource by the returned `id` using the
   *same* API key. Must return `200`, not `404 TRANSCRIPTION_NOT_FOUND`.
   Then check the `Job` row directly (or the Founder Dashboard): `userId`
   must be the real authenticated user id, never `guest_<uuid>`; `apiKeyId`
   must be set; `source` must be `api` (generic key) or `zapier` (Zapier
   key).
2. **BUG 2 regression (operation forcing).** Repeat the same `POST`, this
   time adding a form field `toolType=burn-subtitles` (or any other
   operation's toolType) alongside the real file. The job must still run as
   the endpoint's own operation — confirm via the `operation`/`tool_type`
   field on the `GET` response, and confirm no `burn-subtitles` job (no
   video+subtitle output) was produced.
3. **Cross-operation isolation.** Take a job id from one operation (e.g. a
   `/subtitle-burns` job) and `GET` it from a *different* resource path
   (e.g. `/api/v1/subtitles/:id`). Must return `404`, not the job.
4. **Cross-user isolation.** Using a second API key (different user),
   `GET` the first user's job id. Must return `404`.
5. **Free-plan gating.** Repeat step 1 with a free-plan account's API key
   (or a Pro key after downgrading the account). Must return `403
   UPGRADE_REQUIRED` before any file is even validated.
6. **Revoked key.** Revoke the key via `DELETE /api/api-keys/:id`, then
   repeat step 1 with the same (now-revoked) key. Must return `401
   API_KEY_REVOKED` immediately (no caching delay).
7. **Web app parity.** Confirm the corresponding first-party web page
   (e.g. Compress Video for `/video-compressions`) still works end-to-end
   and produces the same kind of output — the intake pipelines are shared,
   so this is the fastest way to catch a regression in the extraction.
8. **Guideline formatting specifically.** `POST /api/v1/guideline-formats`
   with a small `transcriptText` + a real `rules` array (copy one from a
   browser DevTools capture of the web app's own request, since there is no
   server-side preset registry yet — see "Known limitations"), then
   `GET /api/v1/guideline-formats/:id` until `status: "completed"` and
   confirm `formatted_text` is populated.
