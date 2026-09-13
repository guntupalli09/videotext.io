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
as-is. It is **12,184 characters**, leaving headroom for edits.

What it covers, in order: what the extension does · how it works in six steps · what you get ·
every supported file format · the 72 languages (49 named) · twelve audience sections
(journalists, podcasters, students, researchers, sales/support, product teams, marketers, course
creators, legal, medical, accessibility, and everyone else) · a list of concrete tasks people come
looking for · why VideoText · account and plans · privacy and permissions · what the extension
deliberately does not do · getting started.

**On keywords.** High-intent search terms — *convert video to text*, *transcribe MP4*, *audio to
text*, *meeting transcript*, *transcribe interview*, *podcast transcription*, *transcribe lecture*,
*MP3 to text*, *voice memo to text* and so on — are carried by the use-case and "things people use
it for" sections, phrased the way someone would actually search. They are not listed as a keyword
block: the Chrome Web Store's **Keyword Spam** policy rejects listings with repetitive or irrelevant
keyword lists, and a rejection on those grounds is slow to appeal.

**Every claim is verified against this repository.** Formats come from
`server/src/utils/fileValidation.ts`; the language names are checked one by one against
`client/src/lib/languages.ts`; the permission and privacy statements match `manifest.json` and the
bundle audit. Limits are described as "whatever your plan allows" rather than quoted, because they
are per-plan and read live from the account. There is no accuracy percentage, no speed claim and no
"unlimited", because nothing in the repository substantiates a specific number.

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
