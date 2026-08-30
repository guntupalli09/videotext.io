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

## POST /api/v1/transcriptions

Multipart file upload — identical validation/quota/enqueue path as the web
app's upload (file type, size, duration, monthly minutes, concurrency).

```
curl -X POST https://videotext.io/api/v1/transcriptions \
  -H "Authorization: Bearer vt_live_..." \
  -F "toolType=video-to-transcript" \
  -F "file=@/path/to/video.mp4"
```

Response — `202 Accepted`:

```json
{ "id": "12345", "status": "queued", "created_at": "2026-08-30T06:00:00.000Z" }
```

Remote `file_url` ingestion (e.g. a Google Drive file URL from a Zapier
step) is **not supported in this version** — see "Known limitations" below.

## GET /api/v1/transcriptions/:id

```
curl https://videotext.io/api/v1/transcriptions/12345 \
  -H "Authorization: Bearer vt_live_..."
```

```json
{
  "id": "12345",
  "status": "completed",
  "tool_type": "video-to-transcript",
  "filename": "a1b2c3d4-my-video_transcript.txt",
  "duration_seconds": 612,
  "txt_url": "/api/download/a1b2c3d4-my-video_transcript.txt?jobToken=...",
  "srt_url": null,
  "vtt_url": null,
  "download_url": null,
  "created_at": "2026-08-30T05:50:00.000Z",
  "completed_at": "2026-08-30T05:52:14.000Z",
  "failure_reason": null
}
```

Only fields the platform durably persists are included. Notably:
**`language` and inline `transcript` text are intentionally omitted** — they
are not stored on the durable Job record today (only in the short-lived
queue result), so rather than invent them this API omits them. The full
transcript text remains available at `txt_url`. Adding durable `language`
storage is a small follow-up, not implemented in this beta.

Returns another user's job as `404 TRANSCRIPTION_NOT_FOUND` (never `403`) —
ownership is enforced, and the API does not reveal that a job with that id
exists for someone else.

## GET /api/v1/transcriptions — polling for Zapier's trigger

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
- Only ever returns jobs owned by the authenticated key's user.

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

- **No remote `file_url` ingestion.** `POST /api/v1/transcriptions` accepts
  only a multipart file upload today. A Zapier step that hands VideoText a
  Google Drive/Dropbox URL is not supported until a dedicated SSRF-safe
  remote-download path is built (deliberately deferred).
- **No REST Hooks / webhook subscriptions.** Use polling
  (`GET /api/v1/transcriptions?status=completed&since=...`). VideoText does
  have a one-shot `webhookUrl` field on some upload endpoints (unrelated to
  this beta), now SSRF-hardened, but there is no subscribe/unsubscribe
  registry yet.
- **No "Create Client-Ready Transcript" action.** The Guidelines/"Make it
  Client Ready" formatting workflow is not exposed via `/api/v1` yet.
- **`language` and inline `transcript` text are not in the GET response** —
  see the note under `GET /api/v1/transcriptions/:id` above.
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
