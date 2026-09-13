# Chrome Extension Permissions — "Video to Transcript — VideoText"

Every permission declared in
[`chrome-extensions/video-to-transcript/manifest.json`](../chrome-extensions/video-to-transcript/manifest.json),
why it exists, where it is used, and whether it can be removed.

**Single purpose:** *Allow users to upload audio/video and create a text transcript using VideoText.*

Anything that does not serve that sentence is not requested. The permission set is enforced by
`tests/manifest.test.mjs` and by the build's bundle audit (`scripts/audit-bundle.mjs`), so widening it
breaks the build rather than slipping through review.

---

## `permissions`

### `storage`

| | |
| --- | --- |
| **Why required** | The extension must remember two things between popup sessions: the signed-in user's VideoText session token, and the id of a transcription job that is still running. A popup is destroyed the moment it loses focus, so without persistent storage the user would be signed out on every click and would lose a job in progress. |
| **Where used** | `src/lib/session.ts` (`getSession`, `clearSession`, `updateSessionDetails`, `getActiveJob`, `setActiveJob`, `clearActiveJob`); `src/content-auth.ts` writes the token once after sign-in; `src/popup.ts` reads both on open. Keys are namespaced `videotext:*` (see `STORAGE_KEYS` in `src/lib/config.ts`). |
| **Data stored** | The VideoText session JWT, the plan name, the account email, and `{ jobId, jobToken, fileName, language, startedAt }` for an in-flight job. `chrome.storage.local` is per-profile and is not readable by web pages or by other extensions. No media, no transcript text and no password is ever stored. |
| **Can it be removed?** | **No.** Without it there is no way to stay signed in or to resume a job after the popup closes. `chrome.storage.session` was considered, but it is cleared when the browser restarts, which would force a sign-in every session. |

---

## `host_permissions`

### `https://api.videotext.io/*`

| | |
| --- | --- |
| **Why required** | This is the VideoText API. The extension must call it to upload the file, poll job status, read the account's plan and remaining allowance, and fetch the finished transcript. It is the only network host the extension talks to. |
| **Where used** | `src/lib/api.ts` — the only place `fetch` is called. Endpoints: `POST /api/upload` (and `POST /api/upload/init` · `/chunk` · `/complete` for files over 15 MB), `GET /api/job/:jobId`, `GET /api/usage/current`, `GET /api/download/:filename`. |
| **Scope** | Exactly one host, `https` only. Not `*://*/*`, not `<all_urls>`, not `*.videotext.io`. |
| **Can it be removed?** | **No.** The product is a client for this API. Narrowing it further is not possible — Chrome host-permission patterns cannot express "these five paths". |

---

## `content_scripts`

### `https://videotext.io/extension-auth*` → `content-auth.js`

| | |
| --- | --- |
| **Why required** | VideoText authenticates with a bearer JWT held in the website's `localStorage` (`client/src/lib/auth.ts`), not with a cookie session, so an extension cannot inherit the signed-in state. This content script is the hand-off: the user signs in on videotext.io as usual, and the dedicated `/extension-auth` page (`client/src/pages/ExtensionAuth.tsx`) posts the existing token to its own window; the content script relays it into `chrome.storage.local`. |
| **Where used** | `src/content-auth.ts`, 40 lines. It adds one `message` listener, checks `event.source === window`, `event.origin === location.origin` and a fixed message marker, and writes three keys to storage. It reads no page content, touches no DOM, and sends nothing to any server. |
| **Scope** | **One page.** The match pattern covers `https://videotext.io/extension-auth` and nothing else — not `videotext.io/*`, not the transcription pages, not any third-party site. `all_frames` and `match_about_blank` are both off. |
| **Alternative considered** | `externally_connectable` + `chrome.runtime.sendMessage` from the page, which avoids a content script entirely. It requires the extension's published ID to be hardcoded into the web app, which is not known before the first Web Store submission. It remains the preferred follow-up once the ID is assigned — see "After the first publish" below. |
| **Can it be removed?** | **Not today.** Removing it would mean either asking users to paste a token by hand (worse security and worse UX) or building a second auth system, which the product explicitly must not have. |

---

## Permissions deliberately NOT requested

| Permission | Why it is not needed |
| --- | --- |
| `<all_urls>` / `*://*/*` | The extension never reads or modifies arbitrary pages. It has one host permission, for its own API. |
| `tabs` | `chrome.tabs.create()` — the only tab API used, to open the sign-in page — requires no permission. The extension never reads tab URLs, titles or contents. |
| `downloads` | "Download .TXT" is a `Blob` URL and an `<a download>` click inside the popup (`downloadTranscript()` in `src/popup.ts`). The file is produced locally from text already on screen; the download API would add a permission warning for no functional gain. |
| `clipboardWrite` / `clipboardRead` | `navigator.clipboard.writeText()` works in an extension popup without a permission, with a `document.execCommand('copy')` fallback. The extension never *reads* the clipboard. |
| `scripting` | No code is injected into any page. The one content script is declared statically in the manifest. |
| `cookies` | Auth is a bearer token, not a cookie. The extension never reads a cookie. |
| `webRequest`, `declarativeNetRequest`, `proxy` | No request interception, blocking or redirection of any kind. |
| `identity` | Sign-in reuses the VideoText website session; there is no OAuth flow in the extension. |
| `alarms`, `background` service worker | Nothing runs when the popup is closed. The extension has no background page at all. |
| `history`, `bookmarks`, `topSites`, `browsingData`, `management` | Unrelated to transcription. |
| `unlimitedStorage` | Stored data is a few hundred bytes. |
| `notifications` | No notifications are shown. |

## Other policy-relevant manifest facts

* **No remotely hosted code.** Every script in the package is local. The extension-pages CSP is
  `script-src 'self'; object-src 'self'; base-uri 'none'`, and there is no `unsafe-eval` or
  `unsafe-inline`.
* **No `eval()`, no `new Function()`, no string-bodied timers, no `innerHTML`.** Enforced by the
  build audit; all DOM text goes through `textContent`.
* **No minifier or bundler.** `dist/*.js` is readable `tsc` output, so a reviewer can verify the
  above by reading the package.
* **No analytics or telemetry.** The extension bundles no PostHog, Sentry, Google Analytics or any
  other SDK, and sends no events of its own. Asserted by `tests/bundle.test.mjs`.
* **No `web_accessible_resources`, no `externally_connectable`, no `sandbox`.**

## After the first publish

Once the Web Store assigns the extension its permanent ID, one **optional** hardening step becomes
available: add the ID to the web app's `/extension-auth` page and use `externally_connectable` +
`chrome.runtime.sendMessage` instead of the content script. That would remove the
`content_scripts` entry — and its "read your data on videotext.io" install warning — entirely. It is
a follow-up, not a blocker: the current scope is already a single page.

The extension ID is also what must be set in the API's `EXTENSION_ORIGINS` environment variable
(`server/src/utils/allowedOrigins.ts`) — see the deployment note in
`chrome-extensions/video-to-transcript/store/SUBMISSION_CHECKLIST.md`.
