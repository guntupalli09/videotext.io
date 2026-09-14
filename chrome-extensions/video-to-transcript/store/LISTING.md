# Chrome Web Store listing copy

Paste-ready text for the Developer Dashboard. Character counts are against the Store's current
limits and are noted next to each field.

---

## Extension name

*(Limit: 75 characters · this is 33)*

```
Video to Transcript — VideoText
```

## Short description

*(Limit: 132 characters · this is 116)*

```
Turn audio or video into an accurate, editable transcript with VideoText. Copy it or download it as a .TXT file.
```

## Category

**Productivity**

## Language

**English (United States)**

---

## Detailed description

*(Limit: 16,000 characters)*

The full text lives in **[`DESCRIPTION.txt`](DESCRIPTION.txt)** — paste it into the Description field
as-is. It is **3,048 characters**. That is deliberate: the limit is a ceiling, not a target.

### Read this before editing the description

**Version 1.0.0 was rejected on 13 Sept 2026** under *Spam and placement in the Store* — keyword
stuffing (notification ID `Yellow Argon`). The reviewer quoted one line of the previous draft:

> `"Video files: MP4, MOV, MKV, AVI, WebM, MPEG, MPG, OGV, 3GP, 3G2, FLV, WMV, TS, M4V"`

The policy's own example of this violation is "including in an extension's metadata a long list of
the different sites on which the extension works". **An exhaustive list of file formats is the same
shape**, and so was the 49-language list and the seventeen near-duplicate "Transcribe an MP4… /
Transcribe an MP3… / Transcribe a WAV…" bullets in that draft.

Rules for this field, enforced by `tests/listing.test.mjs`:

* **No enumerations.** Name at most a handful of formats in a sentence ("including MP4, MOV, MP3 and
  WAV"); never the full set. State the language *count* ("72 languages"); never the list.
* **No comma runs longer than five items**, anywhere.
* **No repeated verb phrases as pseudo-features.** One "transcribe your X" line, not twelve.
* **No ASCII divider bars.** The same policy line covers "improperly formatted" metadata.
* **Prose over bullets** wherever a sentence will do.

The exhaustive format list still belongs in the product — the popup's dropzone shows it, and so does
videotext.io. It just must not appear in Store metadata.

### What the copy covers

What the extension does · how it works in six steps · what you get · plan-driven limits · job
persistence · who it is for · account and plans · privacy · what it deliberately does not do ·
getting started.

**Every claim is verified against this repository.** Limits are described as "whatever your plan
allows" rather than quoted, because they are per-plan and read live from the account. There is no
accuracy percentage, no speed claim and no "unlimited", because nothing in the repository
substantiates a specific number.

---

## Suggested screenshot captions

Screenshots must be **1280×800** or **640×400** PNG or JPEG (see `SUBMISSION_CHECKLIST.md`).
Capture the popup at 380 px wide and place it on a clean, light backdrop.

1. **"Drop in a file — or pick one."**
   The idle popup: VideoText branding, the drop area, the language picker, the Transcribe button.

2. **"Choose the spoken language, or let it detect one."**
   The language dropdown open, with Auto-detect at the top.

3. **"Real progress, no guesswork."**
   The processing state showing "Transcribing your file…" with the queue or processing detail line.

4. **"Read your transcript right in the extension."**
   The result view with transcript text and the word count.

5. **"Copy it, or download a .TXT."**
   The result view with the Copy Transcript and Download .TXT buttons in focus.

6. *(optional)* **"Your VideoText plan, your limits."**
   The idle view with the plan pill and remaining-allowance line visible.

## Suggested small promo tile text (440×280)

Headline: **Video to Transcript**
Sub-line: **by VideoText**
Use the existing purple VideoText mark (`icons/icon-128.png`) on the brand indigo (`#6366F1`).

## Notes on the copy

* No keyword stuffing: the description names the task, the formats and the audiences once each.
* Only verified claims. Supported formats come from `server/src/utils/fileValidation.ts`; the 72
  languages from `client/src/lib/languages.ts`; limits are deliberately described as "whatever your
  plan allows" rather than quoted, because they are per-plan and read live from the account.
* No accuracy percentage, no speed claim and no "unlimited" is stated, because nothing in the
  repository substantiates a specific number.
