# Chrome Web Store submission checklist

Everything to enter in the Developer Dashboard, in the order the dashboard asks for it.

Values marked **MANUAL INPUT REQUIRED** depend on information that does not exist in this
repository (support inbox, developer account, graphics) — decide those yourself.

Package to upload: **`artifacts/videotext-video-to-transcript-v1.0.0.zip`**
(`manifest.json` is at the root of the archive — verified by the build and by
`tests/bundle.test.mjs`.)

---

## 0 — Before you upload

- [ ] **Deploy the web app change.** The `/extension-auth` route
      (`client/src/pages/ExtensionAuth.tsx`) must be live on `https://videotext.io`, or sign-in from
      the extension will 404.
- [ ] **Build fresh:** `npm run chrome:transcript:build` from the repo root. It type-checks,
      compiles, packages, and runs the bundle security audit; any finding fails the build.
- [ ] **Tests green:** `npm run chrome:transcript:test` (44 tests).
- [ ] **Smoke-test unpacked** using `TESTING.md` — at minimum: sign in, transcribe a short clip,
      copy, download.
- [ ] One-time: register a Chrome Web Store developer account and pay the one-off registration fee.
      **MANUAL INPUT REQUIRED** (account + payment).

---

## 1 — Package

| Field | Value |
| --- | --- |
| Upload | `artifacts/videotext-video-to-transcript-v1.0.0.zip` |
| Manifest version | 3 (set in the package) |
| Extension version | `1.0.0` (set in the package) |

## 2 — Store listing

| Field | Value |
| --- | --- |
| **Name** | `Video to Transcript — VideoText` |
| **Short description** | See `LISTING.md` → *Short description* (116 chars) |
| **Detailed description** | Paste **`store/DESCRIPTION.txt`** verbatim (12,184 of 16,000 characters) |
| **Category** | Productivity |
| **Language** | English (United States) |

### Graphics — **MANUAL INPUT REQUIRED** (assets must be produced)

| Asset | Spec | Status |
| --- | --- | --- |
| Store icon | 128×128 PNG | Use `chrome-extensions/video-to-transcript/icons/icon-128.png` (already generated from the production VideoText mark) |
| Screenshots | 1280×800 or 640×400, PNG/JPEG, 1–5 required | **Produce.** Captions suggested in `LISTING.md` |
| Small promo tile | 440×280 PNG/JPEG | Optional but recommended — layout suggested in `LISTING.md` |
| Marquee promo tile | 1400×560 PNG/JPEG | Optional |

### URLs and additional fields

| Field | Value |
| --- | --- |
| **Official URL** | Select **videotext.io** from the dropdown. The list only shows sites verified in Google Search Console **under the same Google account as this developer account** — if it is not there, verify it first (`Add a new site`). Selecting it gets the listing a verified-publisher attribution. |
| **Homepage URL** | `https://videotext.io` (the canonical origin — `client/src/lib/seo.ts` and the sitemap both use the apex, not `www`). |
| **Support URL** | `https://videotext.io/faq` — the only existing http support-ish page. The real support channel is **`support@videotext.io`** (`client/src/components/UserMenu.tsx:15`, also on `/docs/api` and the Zapier page); `mailto:support@videotext.io` works here if the dashboard accepts a non-http URL. **See the note below.** |
| **Mature content** | Off. Nothing in the extension is mature content. |

> **Note on the Support URL.** `/faq` (`client/src/pages/Faq.tsx`) currently publishes no contact
> address, so a user who lands there from the Store has no way to reach anyone. Either point the
> Support URL at `mailto:support@videotext.io`, or add the support address to the FAQ page before
> submitting. Do not leave Support URL blank — Google's own hint on the field says support pages
> make an item's ratings and comments more meaningful, and reviewers notice its absence on an item
> that requires an account.

> **www vs apex.** `.env.example` sets the Search Console property to `https://www.videotext.io/`
> while the site's canonical origin is the apex `https://videotext.io`. Verify **both** in Search
> Console so the apex appears in the Official URL dropdown and matches the Homepage URL.

## 3 — Privacy practices tab

**Single purpose description** — paste verbatim:

```
This extension lets a signed-in VideoText user upload an audio or video file and receive a text transcript of it, which they can read, copy, or download as a .TXT file. It is a client for the VideoText transcription service at videotext.io and does nothing else.
```

**Permission justifications** — paste these; the full reasoning is in
`docs/chrome-extension-permissions.md`.

| Permission | Justification to paste |
| --- | --- |
| `storage` | `Stores the user's VideoText sign-in session and the id of a transcription job that is still running, so the user is not signed out every time the popup closes and does not lose a job in progress. No media files and no transcript text are stored.` |
| `host_permissions` — `https://api.videotext.io/*` | `The VideoText API. The extension uploads the user's file to it, polls the transcription job's status, reads the account's plan and remaining allowance, and downloads the finished transcript. It is the only host the extension contacts.` |
| Content script on `https://videotext.io/extension-auth*` | `VideoText signs users in with a token held by the website, not a cookie, so the extension cannot inherit the signed-in state. This script runs on one page only — the VideoText sign-in hand-off page — and does one thing: receive the user's existing session token from that page and store it for the extension. It reads no other page content and runs on no other site.` |
| Remote code | `No. All code is included in the package; nothing is fetched or evaluated at runtime.` |

**Data usage disclosures** — the full table, including every "Yes"/"No" and the three
certifications, is in [`../STORE_PRIVACY.md`](../STORE_PRIVACY.md#chrome-web-store-data-disclosures).
In summary, declare collection of: **personally identifiable information (email)**,
**authentication information**, and **website content (the user's media file and its transcript)`**;
declare nothing else. Then check all three certifications.

## 4 — Distribution

| Field | Value |
| --- | --- |
| **Visibility** | Public |
| **Distribution** | All regions (no geographic restriction is needed) — or restrict if you have a business reason. **MANUAL INPUT REQUIRED** if restricting. |
| **Pricing** | Free. The extension itself costs nothing; VideoText plans are sold on videotext.io. |
| **In-app purchases / payments** | No. The extension takes no payment and links to `https://videotext.io/pricing` for plan changes. |
| **Ads** | No |
| **Mature content** | No |
| **Publish** | Immediately after review (or choose "Publish later" to stage it). |

## 5 — Immediately after the reviewer assigns an extension ID

The published extension gets a permanent 32-character ID. Two follow-ups:

1. **Allow the extension origin on the API.** Set, on the API service (Hetzner/Docker env for
   `server/`):

   ```
   EXTENSION_ORIGINS=chrome-extension://<your-32-char-extension-id>
   ```

   This is read by `server/src/utils/allowedOrigins.ts`. Unset, the variable allows nothing, so this
   must be set before the published build can talk to the API from a Chrome extension origin.
   Restart the API after setting it. **MANUAL INPUT REQUIRED** — the ID does not exist until the
   first upload.

   *(Note: for a self-hosted/unpacked install the ID differs from the published one. Add both,
   comma-separated, while testing.)*

2. **Optional hardening.** With the ID known, the content script can be replaced by
   `externally_connectable`, removing the "read your data on videotext.io" install warning
   altogether. See the last section of `docs/chrome-extension-permissions.md`.

## 6 — Things Google commonly asks that are already answered

| Question | Answer |
| --- | --- |
| Does the item use remote code? | No — see the CSP and the bundle audit report in `SECURITY_AUDIT.md`. |
| Why is each permission needed? | `docs/chrome-extension-permissions.md`, summarised in §3 above. |
| Is the requested permission set minimal? | Yes — one API permission, one storage permission, one single-page content script. |
| Does the item collect user data? | Yes — see `STORE_PRIVACY.md`. Media and transcript, plus the session token and account email. |
| Is a privacy policy published? | Yes — `https://videotext.io/privacy`. |
| Does the item require an account? | Yes, a free VideoText account. This is stated in the listing description. |
| Are there test credentials for the reviewer? | **MANUAL INPUT REQUIRED.** Google's review of a sign-in-gated item usually needs a working test account. Create one and paste the credentials into the "Notes for reviewers" field. |

## 7 — Version bumps

Update **both** `manifest.json` and `package.json` — the build refuses to run if they disagree —
then re-run `npm run chrome:transcript:build` and upload the new ZIP
(`artifacts/videotext-video-to-transcript-v<version>.zip`).
