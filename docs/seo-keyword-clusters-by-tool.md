# SEO keyword clusters by tool (VideoText)

High-intent and long-tail cluster ideas aligned with **core revenue tools** (`client/src/lib/revenueTools.ts`) and **programmatic tool keys** (`SeoToolKey` in `client/src/lib/seoRegistry.ts`).

## How to use this doc

- **Intent clusters** help copy, H2s, FAQ, and internal linking—not guaranteed rankings.
- **“Long-tail / niche”** usually targets clearer job-to-be-done and *often* relatively less SERP crowding than single-word head terms (e.g. “video transcription”). **True difficulty and volume** require Keyword Planner, Ahrefs/Semrush/Moz, or **Google Search Console** for your own URLs.
- **Validate** with: GSC (Performance → Queries per page), Google Trends, Keyword Planner.

---

## 1. Video → transcript — `/video-to-transcript` (`video-to-transcript`)

**Strong purchase / action intent**

- Transcribe video to text, MP4 to transcript, recording file to transcript, transcript with timestamps

**Long-tail / niche clusters**

- **Meetings / platforms:** Google Meet recording to transcript, Zoom MP4 transcript, Teams recording transcript, Loom transcript, Panopto / webinar-style paths (match existing SEO pages).
- **Use cases:** Podcast MP4 transcript, interview transcription, lecture / sermon / research interview to text.
- **Output / quality:** Transcript with speaker labels (diarization), timestamped transcript for editing, TXT / SRT / JSON export.
- **Workflow differentiators:** YouTube URL to transcript without downloading, long video transcription.

**Notes:** Head term “video transcription” is broadly competitive; platform + use-case pages are the main realistic wedge alongside brand.

---

## 2. Voice → text — `/voice-recorder` (`voice-to-text`)

**High intent**

- Record and transcribe online, voice memo to text, in-browser dictation to transcript

**Long-tail**

- Browser voice recorder + transcript, no install; voice note to text; microphone to transcript for quick capture

**Notes:** Competes with OS dictation and apps; emphasize browser workflow and export (e.g. text / downstream subtitles) where true.

---

## 3. Translate subtitles — `/translate-subtitles` (`translate-subtitles`)

**High intent**

- Translate SRT file, translate VTT online, bilingual subtitle file, keep timecodes when translating

**Long-tail**

- Translate SRT to [language], subtitle file translation preserving timing, YouTube / Vimeo subtitle file translate

**Notes:** Split messaging: **SRT** (broad platform) vs **VTT** (web / HTML5) if both are first-class.

---

## 4. Batch processing — `/batch-process` (`batch-process`)

**High intent**

- Batch transcribe videos, multiple files to transcripts, ZIP of transcripts

**Long-tail**

- Bulk MP4 transcription, many URLs / files in one job, agency / editor workflow

**Notes:** Typically lower volume, **high intent** (prosumer / small teams).

---

## 5. Video → subtitles — `/video-to-subtitles` and related SEO pages (`video-to-subtitles`)

**High intent**

- Auto subtitles from video, generate SRT from video, AI captions, MP4 to SRT

**Long-tail / trend-style (validate in Trends)**

- Auto captions for short-form / vertical video; muted viewing contexts—only claim what the product supports (length, platforms, formats).

**Notes:** Pair with “generate SRT from link,” “download VTT,” etc., for specificity.

---

## 6. Fix subtitles — `/fix-subtitles` (`fix-subtitles`)

**High intent / problem-aware**

- Fix SRT timing, subtitle sync, overlapping cues, grammar / cleanup of subtitle files, SRT validation

**Notes:** Lower volume, **sharp intent**—good for tool landing + FAQPage-style answers.

---

## 7. Burn / hardcode subtitles — `/burn-subtitles` (`burn-subtitles`)

**High intent**

- Burn subtitles into video online, hardcode captions MP4, permanent on-screen captions

**Long-tail**

- Burn SRT into MP4 online, hardcoded vs soft subtitles (education content), simple workflow vs FFmpeg

---

## 8. Compress video — `/compress-video` (`compress-video`)

**High intent**

- Compress MP4 online, reduce file size for upload, smaller video for sharing

**Long-tail**

- Compress for specific caps (platform / email)—only if accurate for the tool

**Notes:** Generic “compress video” is crowded; tie to **post-caption / post-edit workflow** when true.

---

## Validation checklist (quarterly)

1. **GSC:** Per core path, export queries; sort by **impressions** where **position** is 11–50 (improve snippets and on-page match first).
2. **Trends:** Compare 2–4 phrasings per high-value cluster (region = primary market).
3. **Planner / SEO suite:** Record volume + competition for phrases you add to titles or new pages—avoid duplicate thin URLs.

---

*Last updated: aligned with repo tool list and keyword research discussion (2026).*
