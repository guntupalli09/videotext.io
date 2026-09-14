# Chrome Web Store submission checklist

Everything to enter in the Developer Dashboard, in the order the dashboard asks for it.

Values marked **MANUAL INPUT REQUIRED** depend on information that does not exist in this
repository (support inbox, developer account, graphics) — decide those yourself.

Package to upload: **`artifacts/videotext-video-to-transcript-v1.0.0.zip`**
(`manifest.json` is at the root of the archive — verified by the build and by
`tests/bundle.test.mjs`.)

---

## Rejection history — read first

Two rejections, both *Spam and placement in the Store* / keyword stuffing (`Yellow Argon`).

| Date | Reviewer quoted | Cause |
| --- | --- | --- |
| 13 Sept 2026 | `"Video files: MP4, MOV, MKV, AVI, WebM, MPEG, MPG, OGV, 3GP, 3G2, FLV, WMV, TS, M4V"` | The description enumerated all 20 file formats, all 49 named languages, and seventeen near-duplicate "transcribe an X" bullets. |
| 14 Sept 2026 | `"journalists, podcasters, students, researchers, creators, marketers, and professional teams."` | An audience roll-call. **This sentence was never in `store/DESCRIPTION.txt`** — whatever was submitted that day differed from the file in this repo. |

**The lesson from both: this reviewer treats any category enumeration as stuffing** — formats,
languages and audiences alike. `store/DESCRIPTION.txt` now contains none of the three. It is
2,568 characters; the 16,000 limit is a ceiling, not a target.

**Before you resubmit, read what is actually in the dashboard field.** Do not assume it matches this
repo. Select all, delete, and paste the current `store/DESCRIPTION.txt` — then re-read it once to
confirm no list crept back in.

**Resubmitting needs no new package.** Both rejections were listing metadata only; the ZIP, the
manifest and the code were never implicated. No version bump, no rebuild.

`npm run chrome:transcript:test` fails if list-shaped copy returns — `tests/listing.test.mjs` checks
for long comma runs, format names, language names, audience roll-calls, divider bars and repeated
"Transcribe …" lines. Both quoted lines above were used to verify the guard actually trips.

> **Two strikes on one policy.** A third rejection on the same ground is worth avoiding — keep every
> future edit to this field prose-only, and run the tests before pasting.

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
| **Detailed description** | Paste **`store/DESCRIPTION.txt`** verbatim (2,568 of 16,000 characters). **Do not add file-format or language lists** — that is what got v1.0.0 rejected; see `LISTING.md`. |
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

**Every field on this tab has paste-ready text in [`PRIVACY_TAB.txt`](PRIVACY_TAB.txt).** Each block
is under the dashboard's 1,000-character limit; paste them verbatim.

| Field | Characters | Source |
| --- | --- | --- |
| Single purpose description | 902 / 1000 | `PRIVACY_TAB.txt` |
| `storage` justification | 898 / 1000 | `PRIVACY_TAB.txt` |
| Host permission justification | 973 / 1000 | `PRIVACY_TAB.txt` |
| Remote code | Select **No** (justification text included anyway) | `PRIVACY_TAB.txt` |
| Privacy policy URL | — | `https://videotext.io/privacy` |

**Data usage — check exactly three:** Personally identifiable information (the account email the
popup displays), Authentication information (the VideoText session token), and Website content (the
media file the user picks and the transcript made from it). Leave the other six unchecked. Then
check all three certifications — all three are true, because the only destination for any user data
is VideoText's own API. Full reasoning per category: [`../STORE_PRIVACY.md`](../STORE_PRIVACY.md#chrome-web-store-data-disclosures).

> **The host-permission warning is expected.** The dashboard says a host permission may trigger an
> in-depth review and delay publishing. That is normal for an extension that talks to its own API
> and is not a sign of a problem. The justification text is written to answer that reviewer
> directly: one API host, one single-page content script, no wildcards, no `<all_urls>`.

> **Reviewer test account — MANUAL INPUT REQUIRED.** This item is sign-in gated. Create a working
> VideoText account and paste its credentials into "Notes for reviewers", or the reviewer cannot get
> past the first screen. This is one of the most common causes of rejection for account-gated items.

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
