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

```
Turn audio or video into an accurate, editable transcript — without leaving your browser.

Video to Transcript is the official Chrome extension for VideoText (videotext.io). Pick a file, choose the spoken language or let it detect one, and get a clean, readable transcript you can copy or save as a .TXT file.

HOW IT WORKS

1. Click the VideoText icon and sign in with your VideoText account.
2. Drop in an audio or video file, or use Select File.
3. Optionally choose the spoken language — or leave it on Auto-detect.
4. Click Transcribe. The file is sent to VideoText for processing.
5. Read the transcript in the popup, then Copy Transcript or Download .TXT.

WHAT YOU GET

• A full transcript, shown right in the extension
• One-click Copy Transcript
• Download .TXT for the file you just transcribed
• Auto-detect, or pick from 72 spoken languages
• New Transcription to start the next file straight away
• Close the popup while a file is processing and reopen it later — the job carries on

SUPPORTED FILE TYPES

Video: MP4, MOV, MKV, AVI, WebM, MPEG, MPG, OGV, 3GP, 3G2, FLV, WMV, TS, M4V
Audio: MP3, WAV, OGG, M4A, FLAC, AAC

File size and length limits are whatever your VideoText plan allows — the extension reads them from your account, so what works on videotext.io works here.

WHO IT IS FOR

• Journalists and researchers turning interviews into quotable text
• Podcasters who need show notes and searchable episodes
• Students and academics transcribing lectures and field recordings
• Support, sales and product teams turning recorded calls into notes
• Course creators and marketers repurposing video into written content
• Anyone who would rather read a recording than sit through it

YOUR ACCOUNT, YOUR LIMITS

This extension is a client for VideoText — it is not a separate product and not a second account. It uses the VideoText account you already have, with the same plan, the same allowance and the same limits as the website. Sign in once and the extension uses that session; manage your plan at videotext.io whenever you like.

PRIVACY

The file you choose and your VideoText session are sent to VideoText and nowhere else. The extension includes no analytics, no tracking and no third-party code. It cannot read your tabs, your history or your other websites — it asks for one host permission, for the VideoText API, and one page, the VideoText sign-in hand-off.

Privacy policy: https://videotext.io/privacy
Terms: https://videotext.io/terms

A free VideoText account is required. Full tool at https://videotext.io/video-to-transcript
```

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
