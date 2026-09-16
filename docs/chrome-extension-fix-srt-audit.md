# Fix SRT Chrome extension — security and product audit

**Package:** `chrome-extensions/fix-srt/`  
**Version:** 1.0.0  
**Manifest:** V3  
**Zip:** `artifacts/videotext-fix-srt-v1.0.0.zip`

## What ships

The extension is a client for the existing VideoText `fix-subtitles` pipeline. It does not contain a second subtitle-repair engine.

| Step | Implementation |
|------|----------------|
| Local file gates | `src/srtValidate.js` (extension, empty, timestamps) |
| Auth | `POST https://api.videotext.io/api/auth/login` or site session sync |
| Usage | `GET /api/usage/current` |
| Job | `POST /api/upload` `toolType=fix-subtitles` |
| Status | `GET /api/job/:id` |
| File | `GET /api/download/...` with bearer token |

Optional flags match the website: `fixTiming`, `grammarFix`, `lineBreakFix`, `removeFillers`. Overlap repair remains server-side and always on.

## Security checklist

| Check | Result |
|-------|--------|
| OpenAI keys in bundle | Absent |
| Stripe secrets | Absent |
| Database credentials | Absent |
| Privileged backend tokens | Absent (user JWT only, in `chrome.storage`) |
| Remote executable code | None. No remotely hosted scripts |
| `eval()` | Forbidden by build + `tests/bundleAudit.test.js` |
| localhost URLs | Forbidden in `dist` JS/HTML/CSS/JSON |
| Unnecessary permissions | Only `storage` + `https://api.videotext.io/*` |
| Broad CORS changes | None. `allowedOrigins.ts` unchanged |
| Hidden tracking | No analytics SDK, pixels, or third-party tags |
| `<all_urls>` | Not requested |

## Auth storage

The user JWT is stored in `chrome.storage.session` and `chrome.storage.local` so the popup can survive a browser restart. This is the same class of credential the website keeps in `localStorage.authToken`. Passwords are not stored.

`content-auth.js` reads `authToken`, `userId`, `plan`, and `userEmail` from videotext.io pages only, then sends them to the service worker. It does not alter the page.

## Usage enforcement

Quota is checked before upload. The worker still records the import (`recordFreePlanImport` / `incrementUserUsage`). Downloads go through `/api/download`, which applies free-plan watermarking.

## Residual risks

- A stolen extension store token is equivalent to a stolen website session.
- Optional grammar uses VideoText’s OpenAI key **on the server**, never in the extension.
- Site session sync will refresh an extension session when the user visits videotext.io after signing out of the popup.
- Issues/warnings are only as durable as the live job payload (same as the website).
