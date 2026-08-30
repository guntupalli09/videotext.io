# VideoText — Private Zapier Integration (Private Beta)

This is a private Zapier CLI app for VideoText.io. It is a thin adapter over
the production `/api/v1` facade documented in `docs/API_PRIVATE_BETA.md` —
there is no second processing pipeline here, and the server (not this
integration) always decides which internal operation each request runs
(see "Security model" below). Not published to the Zapier App Directory.

## Setup

```
cd zapier
npm install
npx zapier-platform validate   # structural + integration checks
npm test                       # jest unit tests (mocked HTTP, no live creds needed)
```

Local development against a non-production VideoText deployment: set
`VIDEOTEXT_API_ORIGIN` (default `https://api.videotext.io`).

### Zapier CLI / Platform version

- `zapier-platform-cli` **19.1.0**
- `zapier-platform-core` **19.1.0**

CommonJS (`index.js` entry point), matching the current default CLI
scaffold for this platform version.

### Linking to a real Zapier integration (one-time, when ready to test in the Zapier UI)

```
npx zapier-platform login
npx zapier-platform register "VideoText"   # or: npx zapier-platform link, to attach to an existing (private) integration
npx zapier-platform push
```

`register`/`link` writes a local `.zapierapprc` with the real integration
ID — deliberately **not** committed (see `.gitignore`); each developer/CI
environment links it themselves.

## Authentication

Type: **API Key** (Zapier `type: 'custom'` auth — a single `api_key` field,
masked in the UI).

- The user pastes their `vt_live_...` key, created at
  [videotext.io/settings/api-keys](https://videotext.io/settings/api-keys)
  (client type "Zapier") — Pro-only, per `docs/API_PRIVATE_BETA.md`. The
  auth field's `helpText` (`authentication.js`) links there directly so a
  user never needs DevTools or a manual API call.
- Every request to `${VIDEOTEXT_API_ORIGIN}/api/v1/...` gets
  `Authorization: Bearer <key>` attached by `middleware.js`'s `includeApiKey`
  — and **only** requests to that exact base URL; a file-download request to
  Google Drive/Dropbox/etc. never receives it (see "File handling" below —
  this is unit-tested in `test/files.test.js`).
- The connection test is `GET /api/v1/me`; the connection label is
  `VideoText — {{json.email}}`.
- `middleware.js`'s `handleApiErrors` turns VideoText's
  `{ error: { code, message, request_id } }` envelope into a friendly,
  specific message (`lib/errors.js`) for `INVALID_API_KEY`,
  `API_KEY_REVOKED`, `UPGRADE_REQUIRED`, `QUOTA_EXCEEDED`,
  `TRANSCRIPTION_NOT_FOUND`, `FORBIDDEN`; everything else falls back to the
  API's own message rather than inventing wording. `429` responses are
  handled automatically, before this ever runs, by Zapier's own built-in
  throttling middleware (which honors the API's `Retry-After` header).
- The raw key is never logged and never appears in a thrown error message
  (`lib/errors.js`'s `redactApiKey`, exercised in `test/security.test.js`);
  Zapier's own request-client also auto-scrubs `authData` values from
  request/response logs.

## Actions (creates)

| Zapier action | Endpoint | File field(s) | Other fields | Notes |
|---|---|---|---|---|
| Transcribe Audio or Video | `POST /api/v1/transcriptions` | `file` | — | incl. voice recordings |
| Generate Subtitles | `POST /api/v1/subtitles` | `file` | — | |
| Translate Subtitles | `POST /api/v1/subtitle-translations` | `file` | `targetLanguage` (dropdown, mirrors `client/src/lib/languages.ts`) | |
| Fix Subtitles | `POST /api/v1/subtitle-fixes` | `subtitles` (required), `video` (optional) | — | video enables scene-aware fixes |
| Burn Subtitles Into Video | `POST /api/v1/subtitle-burns` | `video` **and** `subtitles` (both required) | — | only entry point for burn |
| Compress Video | `POST /api/v1/video-compressions` | `file` | — | |

Every one of these is audited directly against
`server/src/routes/apiV1.ts`, `server/src/services/apiOperations.ts`, and
`server/src/services/dualFileIntake.ts` — not guessed. Field names
(`file` vs `video`/`subtitles`, `targetLanguage`) match those files exactly.

**`guideline-formats` ("Make it Client Ready") is intentionally not
exposed** — see "Out of scope" below.

## Trigger

**New Completed Transcription** — polls
`GET /api/v1/transcriptions?status=completed&since=...&cursor=...&limit=...`.
See "Polling architecture" below for how completion is detected without a
webhook, and "Trigger implementation" for pagination/dedup.

## Security model

- **`toolType`/`operation`/`source` are never sent by this integration.**
  No create defines an input field for any of them (asserted in
  `test/security.test.js`), and even if a user could inject one, the server
  always forces the real operation from the route it received
  (`services/apiOperations.ts`, `resolveToolType`) and ignores client input
  — this integration simply doesn't try.
- **Download URLs are never weakened.** `lib/api.js`'s
  `absolutizeDownloadUrl` only prepends the origin to a relative
  `/api/download/...` path — the `jobToken` query string that authorizes
  the download is preserved byte-for-byte, never stripped, re-encoded, or
  generated by this integration. VideoText's existing
  authenticated-owner / anonymous-with-jobToken / anonymous-without-token
  authorization behavior is entirely unchanged.
- **The VideoText API key is scoped to `${VIDEOTEXT_API_ORIGIN}/api/v1`
  only** (see "Authentication" above) — it is structurally impossible for
  it to be sent to a file's source host.

## File handling

`lib/files.js`:

1. A Zapier `type: 'file'` input field's runtime value is (per
   `zapier-platform-schema`) either a URL string or a `{ url, name }`-ish
   object — `resolveFileInput` accepts both. In practice this is almost
   always a URL: either a signed link Zapier hydrated from an upstream
   step (Google Drive, Dropbox, Gmail, ...) or one the user typed.
2. `requestStream` downloads it with Node's raw `http`/`https` (not
   `z.request`, so the VideoText `Authorization` header can never leak to
   it — see "Security model"), following redirects up to a small limit,
   and throws a clear, source-URL-free error for a non-200 status (401/403/
   404/410 get a "private, expired, or no longer exists" message; other
   statuses get a generic "could not download" message) or a network error.
3. `appendFileField` streams that response directly into a `form-data`
   `FormData` field under the exact multipart name the backend expects —
   **the whole file is never buffered in memory.** Filename is taken from
   `Content-Disposition`, falling back to the source URL's path, falling
   back to the field name; Content-Type comes from the response's own
   `Content-Type` header when present.
4. The stream is handed to `form-data` in Node's default *paused*
   (non-flowing) state and deliberately **not** resumed by this code —
   `form-data`'s own combined-stream consumption (triggered when
   `zapier-platform-core`'s request client actually sends the multipart
   body) drives the flow. Calling `.resume()` ourselves right after
   `.append()` was tried first and turned out to be a real bug for
   multi-file actions (Fix/Burn Subtitles): the *next* file's download can
   still be in flight while the first stream starts draining with nothing
   yet subscribed to read it, silently losing bytes. Caught by
   `test/files.test.js`, not shipped.

Remote `file_url` ingestion directly in the VideoText backend (i.e.
VideoText itself fetching a URL server-side) is **not** implemented — see
"Out of scope."

## Polling architecture (why creates don't just "wait for completion")

Every VideoText processing endpoint is asynchronous — `POST` returns `202`
with a `queued` job; the real result only exists once
`GET /api/v1/<resource>/:id` reports a terminal status
(`completed`/`failed` — see `server/prisma/schema.prisma`'s `Job.status`).
Zapier hard-caps a single create/trigger execution at **30 seconds**
(docs.zapier.com "Operating constraints"). A large video transcription,
burn-in, or compression can legitimately run well past that.

There is no way to block inside one execution for an arbitrarily long job
without risking a hard timeout, so `lib/polling.js`'s `runAsyncJob` does a
**bounded, best-effort poll** instead:

1. Submit the job (fast, well inside the window).
2. Poll `GET .../:id` every ~2s for up to ~22s (`POLL_BUDGET_MS`, with
   real margin left for the submit call + Zapier's own overhead —
   configurable via `VIDEOTEXT_ZAPIER_POLL_BUDGET_MS`/`_INTERVAL_MS`, kept
   tiny in tests).
3. If it reaches `completed`/`failed` inside that budget — the common case
   for short clips/small files — return the final result. A `failed` job
   is thrown as an actionable Zapier error including `failure_reason`.
4. **If it does not finish in time, the action still succeeds** — it
   returns the job in whatever non-terminal state it's in
   (`status: "queued"`/`"processing"`, no output URLs yet) rather than
   blocking further or failing the step.

**This is a deliberate two-tier design, not a workaround for large jobs.**
For anything that doesn't finish inside one execution, the supported
pattern is a second Zap step (or a separate Zap) driven by the
**New Completed Transcription** trigger, which polls on Zapier's normal
trigger schedule — minutes, not seconds — well outside any single
execution's budget, and fires once the job is actually `completed`. This
matches the goal workflow exactly:

```
Google Drive/Dropbox → VideoText: Transcribe Audio or Video (submits, and
  returns immediately if the file is large)
        ↓
VideoText: New Completed Transcription (fires once processing is actually done)
        ↓
next Zap step (transcript/output URLs)
```

For a small/quick file, everything can also stay a single Zap step: the
bounded poll usually finishes inside the 30s budget and the create's own
output already has the URLs. Genuinely long-running non-transcription jobs
(e.g. a large burn-in) have no equivalent "new completed X" trigger in this
beta's scope — see "Known limitations."

## Trigger implementation (New Completed Transcription)

`triggers/newCompletedTranscription.js`. Zapier's documented polling-trigger
contract: return items as an array in **reverse-chronological order**;
Zapier deduplicates by each item's `id` across polls on its own — no
cross-poll state is required on our side for correct dedup.

VideoText's `GET /api/v1/transcriptions` feed, however, is **ascending-only**
(`(completedAt, id)` keyset pagination — see `apiV1.ts`), by design, so that
two jobs completed in the same millisecond are never skipped or
double-emitted. Rather than change that backend ordering (used by more than
just this trigger) or invent a persisted cross-poll cursor that isn't part
of Zapier's documented contract, the adapter:

1. Asks for everything completed within a rolling lookback window
   (`VIDEOTEXT_ZAPIER_TRIGGER_LOOKBACK_MS`, default 24h — comfortably larger
   than any realistic gap between polls) instead of trying to remember a
   "last seen" position across separate poll executions.
2. Follows the API's own `next_cursor` forward, within that single
   execution, up to a small page cap (`MAX_PAGES = 4` × `limit = 100`) —
   ordinary same-request pagination, not persisted state.
3. **Reverses** the (ascending) result before returning it, since Zapier
   wants newest-first.
4. Defensively re-filters to `status === 'completed' && !failure_reason`
   even though the query already filters server-side.

**Known, stated trade-off:** if more than `MAX_PAGES × limit` (400) jobs
complete inside one lookback window, the oldest of that burst could be
missed by this trigger. This is not expected to happen at private-beta
volume and is deliberately bounded rather than left as an unbounded fetch;
raise the constants (or shorten the lookback window) if beta usage
approaches that.

## Out of scope for this beta (deliberate, see original spec)

- OAuth (API-key auth only)
- REST Hooks / webhook subscriptions (polling only — VideoText has no
  subscribe/unsubscribe registry yet)
- Generic public `file_url` ingestion in the VideoText backend (every
  upload is multipart from Zapier's side; VideoText itself never
  server-side-fetches an arbitrary URL)
- `Client-Ready` / guideline-formatting action (`POST /api/v1/guideline-formats`
  is out of scope for this integration; it also requires a fully-formed
  `rules` array with no server-side preset registry yet — see
  `docs/API_PRIVATE_BETA.md` "Known limitations")
- Public Zapier Marketplace publication

## No backend changes

This integration required **zero** changes to `server/src/routes/apiV1.ts`
or any other backend file — it consumes `/api/v1` exactly as documented in
`docs/API_PRIVATE_BETA.md`.

## Tests

`npm test` (Jest + `nock`-mocked HTTP — no live VideoText credentials
required, nothing hits the real API):

- `test/authentication.test.js` — valid/invalid/revoked key, upgrade
  required, API key never sent to a non-VideoText host.
- `test/files.test.js` — file download/append, redirects, missing field,
  inaccessible/expired file, source URL never leaked into an error,
  `includeApiKey` middleware's host scoping.
- `test/transcription.test.js` — submit → poll → complete, failure,
  budget-exceeded (still-processing) behavior, missing-file validation.
- `test/subtitles.test.js`, `test/compression.test.js` — submit/completion.
- `test/translation.test.js` — `targetLanguage` sent on the body and
  preserved through a GET response that omits it.
- `test/fix.test.js` — subtitle-only, and with the optional video field.
- `test/burn.test.js` — both files required; both sent.
- `test/completedTranscription.test.js` — newest-first ordering, stable
  IDs, `failure_reason`/non-completed exclusion, bounded pagination.
- `test/security.test.js` — no create can send `toolType`/`operation`/
  `source`; API key redaction.

## Real private-beta smoke test (Google Drive → VideoText)

Do this after `npm test` passes and after `npx zapier-platform push` to a
linked private integration, using a **staging Pro account and API key**
(never production credentials in an automated test):

1. In the Zapier editor, connect the VideoText account (paste the
   `vt_live_...` key) — confirm the connection shows
   `VideoText — <your email>`.
2. Build a Zap:
   - Trigger: **Google Drive → New File in Folder** (pick a folder with a
     small test video/audio file).
   - Action: **VideoText → Transcribe Audio or Video**, map the Drive
     step's file into the **Audio or Video File** field.
3. Test the action step in the Zapier editor. Verify:
   - The Drive file is fetched successfully (no "file inaccessible" error).
   - The request reaches VideoText (check VideoText's Founder Dashboard /
     DB for a new `Job` row with `source = "zapier"`, `apiKeyId` set, and
     `userId` matching the staging account — never `guest_<uuid>`).
   - For a small test file, the step returns `status: "completed"` with a
     populated `txt_url` (and/or `srt_url`/`vtt_url`) that is a full
     `https://api.videotext.io/api/download/...?jobToken=...` URL.
   - Add a third step (e.g. a Formatter or another app) mapping in that
     `txt_url` — confirm it resolves and downloads the transcript.
   - No raw `vt_live_...` key appears anywhere in the Zap's step
     input/output data shown in the editor.
4. Publish/turn on the Zap.
5. **Trigger test**: with the Zap above (or any means) producing a fresh
   completed transcription, create a **second** Zap using
   **VideoText → New Completed Transcription** as the trigger (any
   downstream action, e.g. a Formatter no-op, is fine for the test) and
   turn it on. Confirm it fires **exactly once** for that new
   transcription's `id` — not zero times, not more than once on a
   subsequent poll.

## Deployment / promotion

```
cd zapier
npm ci
npx zapier-platform validate
npm test
npx zapier-platform push        # pushes a new (non-published) version to the linked integration
```

Then, in the Zapier UI for this (private) integration: promote the pushed
version if it should become the one new users/invites see, and share an
invite link for private-beta testers (Manage → Sharing). This beta is
**never** submitted for public App Directory review/publication.

## Rollback

- **A bad push**: in the Zapier UI, go to the integration's Versions page
  and set an earlier (previously working) version as the one shared with
  testers; deprecate the bad version. No user-facing "undo" is needed
  server-side — this integration made no backend changes.
- **A bad backend deploy that breaks this integration**: roll back the
  VideoText API deployment as usual; this integration itself needs no
  changes since it only ever calls the documented `/api/v1` contract.
- **Revoking access entirely** during the beta: have testers (or an admin,
  via `DELETE /api/api-keys/:id`) revoke the specific Zapier API key(s) in
  use — this immediately breaks the connection with a clear
  "API key has been revoked" error, with no caching delay, without
  touching any other integration or the web app.
