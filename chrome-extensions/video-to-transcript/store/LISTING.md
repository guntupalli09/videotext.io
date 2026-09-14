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
as-is. It is **2,297 characters**. That is deliberate: the limit is a ceiling, not a target.

### Read this before editing the description

**Version 1.0.0 was rejected twice** under *Spam and placement in the Store* — keyword stuffing
(`Yellow Argon`). On **13 Sept 2026** the reviewer quoted a file-format list; on **14 Sept 2026**,
an audience roll-call ("journalists, podcasters, students, researchers, creators, marketers, and
professional teams") that was never in this file.

The policy's own example of the violation is "including in an extension's metadata a long list of
the different sites on which the extension works". **Any category enumeration is the same shape** —
formats, languages, audiences. The copy now contains none of them.

Rules for this field, enforced by `tests/listing.test.mjs`:

* **No enumerations of anything** — not formats, not languages, not professions. State the language
  *count* ("72 languages") and let the popup show the formats.
* **No audience roll-call.** Describe the job the tool does; do not list who does it.
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

## Screenshots

Per Google's listing guidance (developer.chrome.com/docs/webstore/best-listing):

* **One minimum, five preferred.** Six is over the recommended count — drop the weakest.
* **1280×800 or 640×400**, PNG or JPEG.
* **Square corners and no padding — full bleed.** The image must fill the frame.
* **Show the real product**, at current functionality. Nothing blurry, distorted or upscaled.

> **Correction to earlier advice in this file:** "place the popup on a clean, light backdrop" is
> wrong if the backdrop leaves the shot letterboxed or the corners rounded. The popup is only 380 px
> wide, so compose each shot as a full-bleed 1280×800 frame — the popup open over a realistic
> browser window — rather than a small popup floating in empty space.

Suggested five:

1. **"Drop in a file — or pick one."**
   The idle popup: VideoText branding, the drop area, the language picker, the Transcribe button.
2. **"Choose the spoken language, or let it detect one."**
   The language dropdown open, with Auto-detect at the top.
3. **"Real progress, no guesswork."**
   The processing state with the queue or processing detail line.
4. **"Read your transcript right in the extension."**
   The result view with transcript text and the word count.
5. **"Copy it, or download a .TXT."**
   The result view with both buttons in focus.

## Promo tiles

Small promo tile **440×280**; marquee **1400×560** (homepage carousel only). Google's guidance:
avoid too much text, make sure it still reads at half size, and prefer saturated colours — the brand
indigo `#6366F1` with the existing purple mark (`icons/icon-128.png`) fits that.

Do not imply status the item does not have ("Editor's Choice", "#1", "Featured").

## After the listing is approved

Google's guidance asks for **"an overview paragraph followed by a short list of main features."**
The current description is deliberately all prose, because a live keyword-spam strike is the wrong
moment to reintroduce list formatting. Once the item is approved, a **short list of four or five
genuinely distinct features** is both allowed and what Google asks for — the earlier violation was
seventeen near-duplicate "transcribe an X" bullets and category roll-calls, which is a different
thing. Re-run `npm test` after any such edit.

## Notes on the copy

* No keyword stuffing: the description names the task, the formats and the audiences once each.
* Only verified claims. Supported formats come from `server/src/utils/fileValidation.ts`; the 72
  languages from `client/src/lib/languages.ts`; limits are deliberately described as "whatever your
  plan allows" rather than quoted, because they are per-plan and read live from the account.
* No accuracy percentage, no speed claim and no "unlimited" is stated, because nothing in the
  repository substantiates a specific number.
