# Privacy — Video to Transcript — VideoText

What this extension handles, what it sends, and where it goes. Everything below describes
behaviour that exists in this repository today; nothing is aspirational.

**VideoText Privacy Policy:** https://videotext.io/privacy
**VideoText Terms:** https://videotext.io/terms

---

## What the extension is

A thin client for the VideoText account the user already has. It uploads a media file to the
VideoText API, waits for the transcription job, and shows the result. It performs no transcription
locally, stores nothing on any server of its own, and has no backend of its own — there is only
VideoText.

## Data the extension handles

| Data | Handled how | Sent where | Why it is required |
| --- | --- | --- | --- |
| **The audio/video file you select** | Read from disk only after you pick or drop it. Held in memory for the upload. | Uploaded to `https://api.videotext.io` (`POST /api/upload`, or the chunked `init`/`chunk`/`complete` endpoints for files over 15 MB). | Transcription runs on VideoText's servers; there is no way to produce a transcript without sending the audio. |
| **File name, size and duration** | Name and size come from the file; duration is read locally by the browser's media decoder for the pre-flight check. | Name and size are sent with the upload (they are part of the multipart body / init payload and are used for output naming and limit checks). Duration is **not** sent — the server measures it itself with ffprobe. | Shown in the popup so you can confirm the right file; used to warn you before a doomed upload. |
| **Chosen spoken language** | A value from the picker, or empty for auto-detect. | Sent with the upload. | Improves transcription accuracy. Optional. |
| **Your VideoText session token (JWT)** | Received once from `https://videotext.io/extension-auth` after you sign in on the website, and kept in `chrome.storage.local`. | Sent as an `Authorization: Bearer` header to `https://api.videotext.io` on every request. | Identifies your account so your plan, allowance and limits apply, and so only you can read your own transcripts. |
| **Your plan name and account email** | Read from `GET /api/usage/current` and cached in `chrome.storage.local`. | Not sent anywhere; display only. | Shows which plan you are on and how much allowance is left. |
| **In-flight job id and job token** | Kept in `chrome.storage.local` while a transcription runs. | Sent to `https://api.videotext.io` when polling `GET /api/job/:jobId`. | Lets you close and reopen the popup without losing a running job. |
| **The transcript** | Received from the API and rendered in the popup. Held in memory only. | Not sent anywhere. Copying puts it on your clipboard; "Download .TXT" writes it to your computer. | It is the product. |

## What the extension does NOT do

* **No analytics, no telemetry, no tracking.** The extension bundles no analytics SDK (no PostHog,
  no Sentry, no Google Analytics) and sends no usage events of its own. This is verified on every
  build by `tests/bundle.test.mjs` and `scripts/audit-bundle.mjs`.
* **No third parties.** The only network host it contacts is `https://api.videotext.io`. Enforced by
  the manifest's single host permission and re-checked by the bundle audit.
* **No browsing data.** It cannot read your tabs, history, cookies or bookmarks — it does not request
  those permissions. Its one content script runs on exactly one page,
  `https://videotext.io/extension-auth`, and only to receive the sign-in hand-off.
* **No passwords.** Sign-in happens on videotext.io. The extension never sees, handles or stores a
  password.
* **No selling or sharing of data**, and no use of your content for advertising or profiling.
* **No remote code.** Everything it runs ships in the package.

## What VideoText does with what is sent

The extension is a client; the handling of uploads and transcripts is the VideoText product's own
behaviour, stated in its published policy at https://videotext.io/privacy and implemented in this
repository (`client/src/pages/Privacy.tsx`, `server/src/routes/upload.ts`,
`server/src/routes/download.ts`):

* **Uploads and outputs are processed and then deleted.** Temporary files created during processing
  are removed by automated cleanup; source files and generated outputs are not retained longer than
  needed to deliver the result. Job metadata (job id, status) may be kept briefly for debugging.
* **Account and usage data is retained** while you have an account — email, plan, and counters such
  as uploads used — because billing and plan limits require it.
* **Your content is not used to train models** and not used for any purpose other than producing the
  output you asked for.
* **Transcripts are access-controlled.** Downloads are ownership-bound server-side: a request without
  your session is refused, and a request from another account cannot see your files
  (`authorizeDownload` in `server/src/routes/download.ts`).

If those published behaviours change, this file must change with them — it must never claim more
than https://videotext.io/privacy does.

## Where data lives on your machine

`chrome.storage.local`, in your Chrome profile, under keys prefixed `videotext:`:

* `videotext:authToken` — your VideoText session JWT
* `videotext:plan`, `videotext:email` — for the popup header
* `videotext:activeJob` — the running job's id, token, and source file name

This area is not readable by web pages or by other extensions. It is cleared when you remove the
extension, and the extension clears the token itself when it expires or when the API rejects it.
Media files and transcript text are never written to it.

## Chrome Web Store data disclosures

The answers to give in the Developer Dashboard's Privacy tab:

| Category | Collected? | Notes |
| --- | --- | --- |
| Personally identifiable information | **Yes** — email address | The account email is read from the VideoText API for display; the session token identifies the account. |
| Health information | No | |
| Financial and payment information | No | Billing happens on videotext.io; the extension never handles payment data. |
| Authentication information | **Yes** | The VideoText session token. Never a password. |
| Personal communications | No | |
| Location | No | |
| Web history | No | |
| User activity | No | No clicks, no events, no analytics. |
| Website content | **Yes** — user-supplied media and its transcript | The file the user chooses to transcribe and the resulting text. |

Certifications to check:

* ☑ I do not sell or transfer user data to third parties, apart from the approved use cases
* ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
* ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

Data is transmitted only to `https://api.videotext.io` (the item's own backend), over HTTPS, to
perform the single purpose the user invoked.
