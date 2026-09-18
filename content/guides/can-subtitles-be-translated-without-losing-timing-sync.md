---
slug: can-subtitles-be-translated-without-losing-timing-sync
title: "Can subtitles be translated without losing timing sync?"
description: "Subtitles can be translated without losing sync if timecodes stay locked to cues; text expansion and CPL limits cause drift in 2026, not translation itself."
date: 2026-09-18
image: https://gwvckixiegkllthleuyt.supabase.co/storage/v1/object/public/programmatic-articles/c42abb4c-0cf8-48a0-91e3-e83a3c1174ac/featured.jpg
source_path: /can-subtitles-be-translated-without-losing-timing-sync
source: ryze
---
# Can subtitles be translated without losing timing sync?

Subtitles can be translated without losing timing sync — but only when the translation step locks target-language text to the existing timecodes and reflows line breaks inside the same in/out points as the source cues. The failure point isn't the translation itself; it's target text that runs longer or shorter than the original and blows past the character-per-line or reading-speed limit for that cue.

TL;DR

- Subtitles stay in sync when translation preserves timecodes and reflows text inside the existing cue duration.
- German, Finnish, and Polish translations often run 20-35% longer than English source text, forcing line breaks to shift.
- Netflix's public subtitle style guide caps Latin-script lines at 42 characters and roughly 20 characters per second.
- VideoText locks cue timing during translation into 70+ languages, so lines get reflowed instead of retimed from scratch.
- Pasting translated text into a raw SRT file without checking CPL is the most common way sync breaks in 2026 workflows.

## Why this matters

Freelance subtitle editors deliver multilingual work constantly in 2026 — a client sends one English SRT and asks for Spanish, German, and Japanese versions by Friday. If the translated file keeps the source timecodes but the text no longer fits, the cue still starts and ends on time, but the words on screen no longer match the reading speed a viewer can process. That's a **sync failure that looks like a translation failure**, and it's the reason QA passes on translated subtitles take longer than QA on the original.

The fix isn't retiming from zero. It's controlling text length and line breaks at translation time so the original timecodes hold.

## Can subtitles be translated without losing sync?

Yes, when the workflow keeps timecodes locked and only rewrites the text inside each cue. The table below compares the three common methods freelancers actually use in 2026.

| Method | Timecodes preserved? | Common risk | Best for |
| --- | --- | --- | --- |
| Manual copy-paste into a new SRT | Only if you don't touch the timecode lines | Line breaks and CPL ignored after translation | Single short files, careful editors |
| Raw machine translation pasted over source text | Yes, timecodes untouched | Text runs 20-35% longer, breaks CPL/CPS limits | Draft passes, not client-ready delivery |
| Timing-locked translation tool (e.g. [VideoText](https://videotext.io/)) | Yes, by design | Still needs a CPL/CPS check per target language | Batch jobs, multiple target languages |

The middle row is where most sync complaints originate: the timecodes are technically fine, but the subtitle is unreadable at the cue's original duration.

### Latin-script languages: 42 characters per line

Netflix's public Timed Text Style Guide sets 42 characters per line as the practical ceiling for Latin-script languages (English, Spanish, French, German, Portuguese). A source-language cue that fits comfortably at 38 characters can push to 48-50 characters after translating into German, which forces a second line or a shortened phrase — and that edit has to happen without moving the timecode.

### CJK languages (Chinese, Japanese, Korean): 16-20 characters per line

CJK subtitle guidelines run far tighter — roughly 16-20 characters per line, since each character carries more visual weight and reading time than a Latin letter. A cue timed for four seconds of English reading speed does not automatically give a Japanese viewer enough time to read a full-density line; the character count, not the timecode, is what needs adjusting.

## How to translate subtitles without breaking sync

1. **Start from a validated source file.** Fix overlaps, gaps, and CPL issues in the original SRT or VTT before translating — errors compound once text changes.
2. **Translate cue by cue, not paragraph by paragraph.** Each cue's translation should map to that cue's timecode, never spill into the next one.
3. **Check character count per language.** Apply the 42 CPL (Latin) or 16-20 CPL (CJK) ceiling to the translated line, not the source line.
4. **Recalculate reading speed (CPS).** A cue with a longer translated line needs either a shorter phrase or, rarely, a small timing adjustment — not a full retime.
5. **Re-run subtitle QA on the translated file.** Sync issues introduced during translation show up as CPL violations and reading-speed flags, not as broken timecodes.
6. **Export in the target format.** SRT and VTT both carry timecodes as plain text lines, so translation tools that respect that structure won't touch them.

VideoText's subtitle translation feature applies this exact sequence: it translates cues into 70+ languages while keeping the original timecodes fixed, then flags any line that now exceeds CPL or CPS for that language during subtitle QA review.

## Why sync breaks during subtitle translation

- **Text expansion.** Target languages like German, Finnish, and Polish commonly run 20-35% longer than English source text for the same meaning.
- **CPL limit mismatch.** A line built for 42 characters (Latin script) doesn't automatically resize for 16-20 characters (CJK script).
- **Manual copy-paste errors.** Editing translated text directly inside a raw SRT file risks deleting or shifting a timecode line by accident.
- **Reading speed (CPS) drift.** Longer translated lines packed into the same duration push characters-per-second above the 20 CPS ceiling common in style guides.
- **Line-break reflow.** A two-line cue that breaks cleanly in English can break mid-word or mid-phrase once translated, hurting readability even with sync intact.
- **Format conversion loss.** Converting between SRT, VTT, and TTML mid-workflow can strip or reformat timecodes if the converter isn't built for subtitle files specifically.

![Diagram showing five causes of subtitle sync loss during translation](https://gwvckixiegkllthleuyt.supabase.co/storage/v1/object/public/programmatic-articles/c42abb4c-0cf8-48a0-91e3-e83a3c1174ac/body-450b6497.jpg)

Timecodes rarely break during translation — text length and line breaks do.

Translate subtitles without retiming

Lock cue timing across 70+ languages and flag CPL issues automatically.

[Try VideoText](https://videotext.io/)

## Does Google Translate keep subtitle timing?

Google Translate keeps subtitle timing only if you paste text back into an unedited SRT or VTT file without touching the timecode lines. It does not check CPL, CPS, or line breaks for the target language, so the file plays on schedule but may be unreadable at the translated line length.

## What's the difference between SRT and VTT when translating?

Both SRT and VTT store timecodes as plain text separate from the caption text, so translating either format carries the same sync risk: **the risk lives in text length, not the file format.** VTT additionally supports styling and positioning tags that SRT doesn't, which matters for burned-in or embedded captions but not for basic timing sync.

## How long should translated captions be to stay in sync?

Translated captions should stay inside 42 characters per line for Latin-script languages and 16-20 characters per line for CJK languages, matched to a reading speed around 20 characters per second for adult content. Going over either limit is what causes a technically-in-sync cue to feel out of sync to the viewer.

## FAQ

Can subtitles be translated without losing sync?

Yes, subtitles can be translated without losing sync when the translation process keeps the original timecodes fixed and only rewrites the text inside each cue. Sync problems after translation almost always trace back to text length, not the timecodes themselves.

What causes translated subtitles to fall out of sync?

Text expansion is the main cause — German, Finnish, and Polish translations often run 20-35% longer than English source text. That extra length pushes lines past CPL or CPS limits even though the timecode hasn't moved.

Do I need to re-time subtitles after translation?

Usually no — the timecodes stay valid; only the character count and line breaks need adjusting for the target language's CPL limit. Full retiming is only needed when a translated phrase genuinely can't fit within the reading-speed limit at the original duration.

Is machine translation accurate enough for subtitles?

Machine translation handles most straightforward dialogue reliably in 2026, but idioms, humor, and cultural references still need a human pass. Accuracy and sync are separate problems: even a perfect translation can break CPL if line length isn't checked.

What's the safest file format for translating subtitles?

SRT and VTT are both safe because they store timecodes as plain text lines separate from the caption text. The risk isn't the format — it's whether the translation workflow respects those timecode lines during editing.

How much longer does translated text run compared to the source?

Text expansion from English commonly runs 20-35% for languages like German, Finnish, and Polish. CJK languages often run shorter in character count but require tighter CPL limits of 16-20 characters per line.

What reading speed should translated subtitles target?

Netflix's public style guide targets roughly 20 characters per second for adult content and a lower rate for children's programming. Translated cues that exceed this reading speed feel out of sync even when the timecode is correct.

Can I translate subtitles directly from a YouTube video?

Yes, if the tool generates an SRT or VTT file from the video first and then translates that file while keeping the timecodes locked. Translating YouTube's auto-generated captions directly often carries over existing timing errors from the source captions.

## One last thing

Netflix's published Timed Text Style Guide sets reading speed at roughly 20 characters per second for adult content and 17 characters per second for children's content — a detail most freelancers apply to English subtitles but forget to re-check after translation, even though the target language's character density changes the math entirely.

## Related guides

- [Speaker diarization software compared](https://videotext.io/guides/best-speaker-diarization-software-in-2026)
- [AI transcription software for podcasters](https://videotext.io/guides/best-ai-transcription-software-for-podcasters-in-2026)
