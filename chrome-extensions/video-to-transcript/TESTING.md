# Testing — Video to Transcript — VideoText

## Build it

From the repository root:

```bash
npm run chrome:transcript:build
```

This installs the extension's two dev dependencies, type-checks, compiles `src/` with `tsc`, copies
the manifest/HTML/CSS/icons into `dist/`, writes
`artifacts/videotext-video-to-transcript-v1.0.0.zip`, and runs the bundle security audit (writing
`SECURITY_AUDIT.md`). Any audit finding fails the build.

Automated tests:

```bash
npm run chrome:transcript:test
```

## Load it in Chrome

1. Open **`chrome://extensions`**.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select **`chrome-extensions/video-to-transcript/dist/`** — the folder, not the ZIP, and not the
   `video-to-transcript` folder above it.
5. The card reads **Video to Transcript — VideoText 1.0.0** with the purple VideoText icon. Pin it
   from the puzzle-piece menu so the icon is visible in the toolbar.

**After any rebuild**, press the ↻ reload button on the extension's card in `chrome://extensions`.

### Pointing an unpacked build at a local API

`API_ORIGIN` is a compile-time constant (`src/lib/config.ts`) — deliberately, so a shipped build
cannot be redirected. To test against a local backend, edit that constant, add
`http://localhost:3001/*` to `host_permissions` in `manifest.json`, rebuild, and reload. **Revert
both before packaging** — the build audit fails on a localhost URL in the bundle, which is the
safety net.

---

## Already verified in headless Chromium

The following were driven automatically against a real Chromium instance with the extension loaded
unpacked and the VideoText API stubbed at the network layer, so the UI paths below are known to work
before you start. They are still in the matrix because the stub is not the real backend.

* extension loads with **zero console errors**; popup renders the signed-out view
* signing in (storage seeded) → idle view, plan pill `free`, "2 transcriptions left on your plan"
  from `/api/usage/current`
* unsupported file (`.pdf`) rejected inline with no upload attempted
* valid file selected → name + size shown; language switched to German
* `POST /api/upload` → `GET /api/job/:id` polling → "Queued — 2 jobs ahead of you" →
  "Processing — 55%" → result
* transcript rendered from `result.segments`, "11 words · 2 segments"
* **Download .TXT** produced `sample-clip-transcript.txt` (confirming the download works without the
  `downloads` permission)
* **New Transcription** returned to idle and refreshed the allowance
* quota exhaustion (`403`) rendered the backend's own message verbatim with a **See plans** button
  linking to `https://videotext.io/pricing`, and **Try again** recovered to idle
* language picker offers 73 options (72 languages + Auto-detect)

Not covered automatically, and therefore the cases to pay most attention to below: the real sign-in
hand-off (#12, needs the deployed `/extension-auth` page), real uploads and real backend limits
(#3–#6, #13–#15, #19), and network interruption (#17).

## End-to-end test matrix

Preconditions: the `/extension-auth` route is deployed to `https://videotext.io` (or your dev
front-end), and you have a free account and a paid account to hand.

| # | Case | Steps | Expected |
| --- | --- | --- | --- |
| 1 | **Extension installs** | Load unpacked as above | Card shows name, version 1.0.0, purple icon; **no errors** button on the card; `chrome://extensions` shows permissions "Read and change your data on api.videotext.io and videotext.io" and nothing broader |
| 2 | **Popup opens** | Click the toolbar icon | Popup opens ~380 px wide; VideoText wordmark, "Video to Transcript", drop area, language picker, footer with Open VideoText / Privacy / Terms |
| 3 | **Valid short video** | Sign in, drop a ~30 s MP4, Transcribe | Uploading → "Transcribing your file…" → transcript appears; word count shown |
| 4 | **Valid audio** | Drop an MP3 or M4A, Transcribe | Same as #3. (Check the network tab: the request carries `uploadMode=audio-only`) |
| 5 | **Unsupported file** | Drop a `.pdf` or `.srt` | Inline red message: "…isn't a supported media file. Upload MP4, MOV, MKV, AVI, WebM, MP3, WAV, M4A, FLAC or AAC." No upload is attempted |
| 6 | **Oversized / over-limit media** | On a free account, pick a file larger than the plan's max file size, or longer than 30 minutes | Blocked before upload with the size in GB or the length and the plan's limit. If the local check cannot read duration, the upload proceeds and the **server** rejects it — the popup then shows the server's own message ("Video is N minutes — your plan allows up to M…") |
| 7 | **Language selection** | Pick "German" (or any language), Transcribe | Upload carries `language=German`; leaving it on **Auto-detect** sends no `language` field |
| 8 | **Successful transcription** | Any valid short file | Result view: transcript text, "N words · M segments", three buttons |
| 9 | **Copy transcript** | Click **Copy Transcript** | Button reads "Copied" for ~1.5 s; pasting elsewhere yields the full transcript |
| 10 | **TXT download** | Click **Download .TXT** | A file named `<source-name>-transcript.txt` lands in Downloads with the same text |
| 11 | **New transcription** | Click **New Transcription** | Returns to the idle view with no file selected; the allowance line refreshes |
| 12 | **Logged-out user** | Remove the extension's storage (`chrome://extensions` → Details → Site settings, or reinstall) and open the popup | "Sign in to VideoText" view. Clicking it opens `https://videotext.io/extension-auth` in a new tab; if not signed in there, it redirects to `/login?returnTo=/extension-auth`. After signing in, the tab says "Extension connected"; reopen the popup (or click "I've signed in — check again") → idle view with your plan pill |
| 13 | **Logged-in free user** | Sign in with a free account | Plan pill reads "free"; the line under Transcribe reads "N transcriptions left on your plan", matching `/api/usage/current` |
| 14 | **Free allowance exhausted** | Use all 3 monthly imports, then try again | Error view showing the server's own message ("You've used all 3 free imports this month. They reset on the 1st — or upgrade to Pro…") plus a **See plans** button opening `https://videotext.io/pricing` |
| 15 | **Paid user** | Sign in with a Pro account | Plan pill reads "pro"; allowance line reads "Unlimited transcriptions on your plan"; larger/longer files are accepted up to that plan's limits |
| 16 | **Backend failure** | With DevTools open on the popup, use request blocking or point at an API that 500s | Error view with the server's message or "Something went wrong. Please try again."; **Try again** returns to idle. A 429 shows the rate-limit message with the Retry-After hint; a 503 shows the "High demand" message |
| 17 | **Network interruption** | Start a transcription, then go offline (DevTools → Network → Offline) | Polling keeps retrying quietly. After 5 consecutive failures: "Lost connection to VideoText. Your transcription may still be running — reopen this window to check." Going back online and reopening the popup resumes the same job |
| 18 | **Reopen while processing** | Start a transcription, click away to close the popup, reopen it | Popup returns straight to "Transcribing your file…" for the same file and resumes polling; the finished transcript appears. *(Known limit: this applies once the job exists. Closing the popup **during the upload** cancels the upload — the popup says "Keep this window open until the upload finishes.")* |
| 19 | **No usage-limit bypass** | On an exhausted free account, try again from the extension; try a file above the plan size limit; upload 4+ files inside a minute | Each is refused by the API before a job is created (403 quota, 400 size/duration, 429 rate limit). The extension holds only the user's own JWT, so it inherits every check in `runTranscriptionIntake()`. Signing out and back in does not reset anything — quota lives on the account |
| 20 | **No secrets in the bundle** | `npm run chrome:transcript:build` (audit runs automatically), or `cd chrome-extensions/video-to-transcript && npm run audit`; then read `SECURITY_AUDIT.md`; then `grep -rniE 'sk-\|sk_live\|whsec_\|AKIA\|postgres://\|JWT_SECRET' dist/` | Audit reports PASS with 0 findings; the grep returns nothing. `dist/*.js` is unminified, so this is verifiable by reading it |

### Checking the wire traffic

To inspect requests from the popup: right-click inside the popup → **Inspect**, then use the
**Network** tab. The popup is a normal page with its own DevTools; closing the popup closes them,
so open DevTools first, then interact.

### Resetting extension state between runs

In the popup's DevTools console:

```js
chrome.storage.local.clear()
```

That signs the extension out and drops any remembered job.
