---
slug: how-do-you-know-an-ai-transcript-is-clean-enough-for-delivery
title: "How do you know an AI transcript is clean enough for delivery?"
description: "Know if an AI transcript is clean enough for delivery: under 5% WER, correct speaker labels, subtitles inside 42 CPL and 20 CPS limits, 2026 standard."
date: 2026-09-18
image: https://gwvckixiegkllthleuyt.supabase.co/storage/v1/object/public/programmatic-articles/c9cf4c1f-cd94-4319-aae8-c9e2d993469d/featured.jpg
source_path: /how-do-you-know-an-ai-transcript-is-clean-enough-for-delivery
source: ryze
---
# How do you know an AI transcript is clean enough for delivery?

An AI transcript is clean enough for delivery when it clears three checks at once: word error rate (WER) under 5%, every speaker turn labeled correctly, and subtitle cues sitting inside the character and reading-speed limits your client's guideline sheet sets - commonly 42 characters per line and 20 characters per second under the Netflix Timed Text Style Guide. Raw ASR output almost never clears all three on the first pass; speaker diarization drifts on cross-talk, punctuation needs a clean-verbatim pass, and cue timing needs a fix pass before export. The gap between "transcribed" and "client-ready" is the QA step most freelancers underestimate in 2026, and it's the part clients actually reject work over.

TL;DR

- Checking whether an AI transcript is clean enough for delivery means running WER, CPL, CPS, and speaker-label checks, not eyeballing it.
- A transcript is delivery-ready at under 5% WER, correct speaker labels, and CPL/CPS inside guideline limits.
- Netflix's Timed Text Style Guide caps subtitles at 42 characters per line and 20 characters per second reading speed.
- Raw ASR output most often fails QA on timing drift, overlapping cues, and unresolved [inaudible] tags.
- VideoText's subtitle QA review flags overlaps, CPL breaches, and timing drift before you export.

Delivery-ready thresholds

5% WER

Delivery-ready accuracy threshold

42 characters

Max CPL, Netflix standard

20 CPS

Max reading speed, adult content

## Why This Matters

Clients don't reject transcripts because a handful of words are wrong - they reject them because errors compound into billing disputes and timecode complaints. Running raw ASR output through [VideoText](https://videotext.io/) gets you a first-pass transcript or subtitle file fast, but speed isn't the same as delivery-ready. A transcript that's 95% accurate sounds fine until the 5% lands on a proper name, a figure, or a legal term the client flags in review.

Subtitle work fails for a different reason. Cues that violate CPL or CPS render fine on your own screen but stall, get cut off, or crawl too fast on the client's playback device. In 2026, most agencies still hand freelancers a written guideline sheet instead of a QA tool, which means the checklist below stays manual work unless something in your pipeline automates it.

## How Do You Know an AI Transcript Is Clean Enough for Delivery?

Run the file against four checks side by side. Raw ASR output and a delivery-ready file differ on every one of them, and a transcript that passes three out of four still isn't ready to send.

| Check | Raw ASR output | Delivery-ready |
| --- | --- | --- |
| WER | Commonly 10-20% on noisy or overlapping audio | Under 5% |
| Speaker labels | Misattributed on cross-talk and fast turn-taking | Every turn correctly labeled |
| CPL | Unbounded - lines often run 50+ characters | 42 characters max (Netflix TTSC) |
| CPS (reading speed) | Unbounded - can exceed 25 characters/second | 20 characters/second max |
| Filler words / [inaudible] | Left in, tags unresolved | Removed (clean verbatim) or resolved on a second listen |

VideoText's subtitle QA review runs this comparison inside the cue editor, flagging CPL breaches, CPS overruns, overlaps, and gaps against the video timeline before you export a file. That doesn't remove the need to check WER on the transcript side, but it closes the timing gap that raw ASR output leaves open.

![Five-step subtitle and transcript QA checklist diagram](https://gwvckixiegkllthleuyt.supabase.co/storage/v1/object/public/programmatic-articles/c9cf4c1f-cd94-4319-aae8-c9e2d993469d/body-024d9fb2.jpg)

Formatting to the client's guideline sheet is the last step, not an afterthought.

### Full Verbatim Transcripts: Under 5% WER, Fillers Included

Full verbatim keeps every "um," false start, and repeated word exactly as spoken, so the WER target still sits under 5% but every filler counts as a real word, not noise to filter out. Legal and research transcripts usually require full verbatim because the fillers themselves carry evidence of hesitation or emphasis, and cutting them counts as an error, not a cleanup win.

### Clean Verbatim Transcripts: Under 5% WER, Fillers Removed

Clean verbatim holds the same under-5%-WER bar but strips fillers, false starts, and repeated words for readability, which is what most podcast and media clients actually order. See how accuracy requirements compare across tools built specifically for podcast audio in this rundown of [AI transcription software for podcasters](https://videotext.io/guides/best-ai-transcription-software-for-podcasters-in-2026). The risk on clean verbatim isn't accuracy, it's over-editing: cutting a word the client wanted kept pushes the file back into a second WER check.

### Subtitles: 42 Characters Per Line, 20 CPS Maximum

Subtitle delivery adds two numeric limits transcripts don't carry: 42 characters per line and 20 characters per second reading speed, both set by the Netflix Timed Text Style Guide and adopted by most streaming clients as a baseline in 2026. A subtitle file can be 100% accurate on words and still fail delivery if a cue reads too fast for a viewer to finish before the cut, which is why CPS gets checked separately from WER, not folded into it.

Run the QA checklist before you deliver

Catch CPL, CPS, and timing drift before your client does.

[Try VideoText QA](https://videotext.io/)

## Why the "Clean Enough" Bar Varies

- **Audio quality and background noise** - noisy or overlapping audio pushes WER well past 5% before any manual cleanup starts.
- **Number of speakers and overlap** - three or more speakers talking over each other is exactly where diarization drifts; running the file through [speaker diarization software](https://videotext.io/guides/best-speaker-diarization-software-in-2026) built for cross-talk catches mislabeled turns before a human does.
- **The client's own guideline sheet** - Rev, GoTranscript, Scribie, and in-house style guides each layer their own CPL, CPS, and formatting rules on top of the baseline thresholds.
- **Delivery format** - a plain transcript only needs WER and speaker labels checked; a subtitle file adds CPL, CPS, and timing drift on top of that.
- **Language** - translated subtitles carry the same CPL/CPS limits, but timing has to survive the length change between source and target language.
- **Content type** - broadcast and legal work tolerate less deviation from the numbers above than social clips, where a slightly fast cue rarely gets flagged by a viewer.

### What Word Error Rate Is Acceptable for Client Delivery?

A word error rate under 5% is the accepted target for client-ready delivery in 2026. Anything above 10% on the raw ASR pass usually means a second manual listen before the file goes out, not just a spot check of a few lines.

### How Many Characters Per Line Should a Subtitle Have?

42 characters per line is the Netflix Timed Text Style Guide maximum most streaming clients still reference in 2026. Some in-house guideline sheets cut that down to 32-37 characters for readability on smaller screens.

### Is a Transcript With [inaudible] Tags Ready to Deliver?

No - unresolved [inaudible] tags mean the file failed the audio-quality pass, not just the accuracy pass. Most guideline sheets require a second listen on flagged sections before the transcript counts as delivery-ready.

## FAQ

What word error rate is acceptable for professional transcription in 2026?

A word error rate under 5% is the accepted target for client-ready delivery in 2026. Anything above 10% on the raw ASR pass usually needs a second manual pass, not spot-checking.

How many characters per line should a subtitle have?

42 characters per line is the Netflix Timed Text Style Guide maximum most streaming clients reference. Some in-house guideline sheets cut that to 32-37 characters for smaller screens.

What is the maximum reading speed for subtitles?

20 characters per second is the Netflix TTSC cap for adult content. Family and kids content often caps lower, closer to 17 characters per second.

What's the difference between full verbatim and clean verbatim for delivery QA?

Full verbatim keeps every filler, false start, and repeated word; clean verbatim removes them while holding the same under-5%-WER threshold. The choice depends on the client's order, not on accuracy.

How do you check for subtitle timing drift before delivery?

Timing drift shows up when a cue's start or end no longer lines up with the speech onset in the waveform. Playing the cue track against the video inside a subtitle QA review catches it before export.

Do AI transcripts need speaker diarization before delivery?

Yes, when the source has two or more speakers, speaker diarization needs to run before delivery. A misattributed turn fails QA the same way a wrong word does.

What formats does a client-ready transcript need to export to?

It depends on the client's guideline sheet, but SRT, VTT, TXT, DOCX, and PDF are the common formats. Timecodes or speaker labels get included per the client's spec, not by default.

Is a transcript with [inaudible] tags ready for delivery?

No, unresolved [inaudible] tags mean the transcript failed the audio-quality pass. Most guideline sheets require a second listen on flagged sections first.

## One Last Thing

Most freelancers check WER carefully and skip CPS almost entirely, because reading speed isn't visible in a text editor - it only shows up when the cues play against the video. A transcript that reads perfectly on the page can still fail delivery in 2026 if nobody plays the subtitle track against picture before export, and that single missed check is the most common reason a "clean" file bounces back from QA.

## Related Guides

- [subtitle generator tools for YouTube](https://videotext.io/guides/best-subtitle-generator-tools-for-youtube-in-2026)
- [Descript alternatives](https://videotext.io/guides/best-8-descript-alternatives-in-2026)
