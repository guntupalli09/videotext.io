# Fix SRT Chrome extension — permissions

Minimum set for a signed-in VideoText job. `<all_urls>` is not used.

## manifest.permissions

| Permission | Why |
|------------|-----|
| `storage` | Persist the VideoText JWT and lightweight job state (`chrome.storage.session` / `local`). |

Not requested: `tabs`, `downloads`, `cookies`, `identity`, `scripting`, `webRequest`, `activeTab`, `unlimitedStorage`.

File download uses a blob URL + `<a download>` inside the popup, so the `downloads` API is unnecessary.

## manifest.host_permissions

| Host | Why |
|------|-----|
| `https://api.videotext.io/*` | Login, usage, upload, job poll, and download. Same API origin as the production website client. |

Not requested: `http://localhost:*`, preview hosts, `<all_urls>`.

Opening https://videotext.io/login or /pricing uses `chrome.tabs.create` and does not need a host permission.

## content_scripts

| Match | Why |
|-------|-----|
| `https://videotext.io/*` | Read the existing website session keys so users who already signed in (including Google login) can use the extension without retyping a password. |
| `https://www.videotext.io/*` | Same, apex/www. |

The script does not inject UI and does not run on other sites.

## File handling

Standard hidden `<input type="file" accept=".srt,…">` plus drag-and-drop in the popup. No File System Access API.

## Auth / backend / storage / downloads / navigation

| Concern | Behavior |
|---------|----------|
| Authentication | Email/password against `/api/auth/login`, or website session sync |
| Backend domains | `api.videotext.io` only for XHR/fetch |
| Storage | Extension `storage` + in-memory File object; SRT text is sent to VideoText on Fix SRT |
| Downloads | Blob in the popup; no `downloads` permission |
| External navigation | User-initiated links/buttons to videotext.io login, pricing, privacy, and the full Fix Subtitles page |

## Justification for Chrome Web Store

Single purpose: repair an SRT using the user’s VideoText account. Host access is limited to the official API. The content script is limited to VideoText origins and exists only to reuse the account the user already created on the website.
