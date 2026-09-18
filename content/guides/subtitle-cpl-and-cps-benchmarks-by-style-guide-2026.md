---
slug: subtitle-cpl-and-cps-benchmarks-by-style-guide-2026
title: "Subtitle CPL and CPS benchmarks by style guide 2026"
description: "Netflix caps subtitles at 42 CPL/20 CPS; BBC and EBU/ESIST use 37 CPL. Compare subtitle CPL and CPS guidelines by style guide for 2026 delivery specs."
date: 2026-09-18
image: https://gwvckixiegkllthleuyt.supabase.co/storage/v1/object/public/programmatic-articles/ae52d79c-7a0a-4c3f-a2c5-74d8e21880c8/featured.jpg
source_path: /subtitle-cpl-and-cps-benchmarks-by-style-guide
source: ryze
---
# Subtitle CPL and CPS benchmarks by style guide 2026

Netflix caps subtitle lines at 42 characters and reading speed at 20 characters per second for general content. Amazon Prime Video uses the same 42-character line cap but drops reading speed to 17 CPS. BBC and the EBU/ESIST subtitling recommendations run tighter still, at 37 characters per line. If you're formatting for a specific client or platform in 2026, the guideline you're handed determines which of these numbers actually apply to your file — and mixing them up is the most common reason a delivery bounces back from QA.

TL;DR

- Subtitle CPL and CPS guidelines by style guide split into two camps: 42-character lines (Netflix, Amazon, Apple) and 37-character lines (BBC, EBU/ESIST).
- Netflix and Apple allow up to 20 CPS on general content; Amazon Prime Video caps reading speed at 17 CPS on the same 42-character line.
- Children's-content specs are consistently tighter: Netflix drops to 17 CPS, Amazon Prime Video drops to 13 CPS.
- BBC measures reading speed in words per minute rather than CPS, so its number isn't a direct one-to-one match with Netflix or Amazon.

Key numbers

42 CPL

Most common line-length cap

Netflix, Amazon, Apple

20 CPS

Loosest adult reading-speed cap

Netflix and Apple

13 CPS

Tightest children's-content cap

Amazon Prime Video

37 CPL

Shortest line-length cap

BBC and EBU/ESIST

## Why this matters

CPL (characters per line) and CPS (characters per second, also called reading speed) are the two numbers that get a subtitle file rejected in QA more than any other issue. A line that's too long wraps awkwardly or gets cut off on smaller screens. A cue with a reading speed above the guideline's cap flashes on and off faster than a viewer can read it.

Every major platform publishes its own numbers, and they don't match. A file built to Netflix spec at 42 CPL / 20 CPS will fail a BBC QA pass at 37 CPL without a rework. Freelance transcriptionists and subtitle editors working across [AI transcription software for podcasters](https://videotext.io/guides/best-ai-transcription-software-for-podcasters-in-2026) clients and streaming platforms in the same week need the exact ceiling for each job, not a rough industry average.

## The short answer

The most common line-length ceiling across major style guides is **42 characters per line**, used by Netflix, Amazon Prime Video, and Apple. The most common reading-speed range sits between **17 and 20 CPS** for general/adult content, with children's content specs running 4-7 CPS tighter across the platforms that publish a separate number. BBC and the EBU/ESIST recommendations are the outliers on line length, holding to 37 characters — five characters shorter than the Netflix/Amazon/Apple standard.

## Subtitle CPL and CPS benchmarks by style guide

| Style guide | Max CPL | Max CPS (general/adult) | Max CPS (children's) | Notes |
| --- | --- | --- | --- | --- |
| Netflix (Timed Text Style Guide) | 42 | 20 | 17 | 2 lines max per cue |
| Amazon Prime Video (style guide) | 42 | 17 | 13 | Same line cap as Netflix, tighter reading speed |
| Apple (Asset Delivery Style Guide) | 42 | 20 | — | No separate children's-content spec published |
| BBC (Online Subtitle Guidelines) | 37 | ~180 words per minute | — | Measured in words per minute, not CPS |
| EBU / ESIST subtitling recommendations | 37-40 | 12-15 | — | European broadcast standard |
| **All / most common ceiling** | **42** | **17-20** | **13-17** | Reference point for mixed-guideline queues |

## Who's strictest, who's loosest

**Amazon Prime Video and EBU/ESIST are the strictest on reading speed** — Amazon caps adult content at 17 CPS and children's content at 13 CPS, while EBU/ESIST recommends 12-15 CPS across the board. **Netflix and Apple are the loosest**, both permitting up to 20 CPS on general content, a full 3 CPS above Amazon's ceiling on the identical 42-character line length.

On line length, **BBC and EBU/ESIST trail the field at 37 characters**, five characters shorter than the 42-character standard shared by Netflix, Amazon, and Apple. That five-character gap sounds small until you're reformatting a file: a cue that fits cleanly on one 42-character line often needs a second line break to fit 37 characters, which then changes your cue count and timing.

![Comparison of style guides using a 42-character line cap versus a 37-character line cap](https://gwvckixiegkllthleuyt.supabase.co/storage/v1/object/public/programmatic-articles/ae52d79c-7a0a-4c3f-a2c5-74d8e21880c8/body-5c3372eb.jpg)

Five characters separates the two line-length standards, and it changes how often a cue needs a second line break.

## Methodology and limitations

The numbers above come from each platform's own published subtitling or style guide as of 2026: Netflix's Timed Text Style Guide (Partner Help Center), Amazon Prime Video's style guide, Apple's Asset Delivery Style Guide, the BBC's Online Subtitle Guidelines, and the EBU-TT/ESIST subtitling recommendations. These are the specs delivery vendors and freelancers are contractually held to, not third-party estimates.

One limitation worth naming directly: **these guides don't all measure reading speed the same way**. Netflix, Amazon, and Apple use characters per second. BBC uses words per minute. There's no exact conversion between the two because word length varies by language and content, so a BBC file that reads comfortably at 180 wpm isn't automatically safe under a 20 CPS Netflix cap — it needs its own check against whichever number applies.

## How to use these benchmarks in your subtitle QA workflow

- **Match the ceiling to the client, not the platform default.** If you're delivering to Netflix, hold every cue at or under 42 CPL and 20 CPS (17 CPS for children's content) before you submit. Don't assume a YouTube-facing project — see the [subtitle generator tools for YouTube](https://videotext.io/guides/best-subtitle-generator-tools-for-youtube-in-2026) roundup for how those workflows differ — carries the same reading-speed ceiling, since YouTube doesn't publish a hard CPS cap the way Netflix does.
- **Default to the tightest number when a project mixes guidelines.** If your queue has both a Netflix job (42 CPL / 20 CPS) and a BBC job (37 CPL), format to 37 CPL first so you're not re-breaking lines twice.
- **Cut CPS before you cut CPL.** Trimming wording usually fixes reading speed faster than rewrapping lines, and it avoids introducing new line breaks that then need their own CPL check.
- **Check children's-content specs separately.** Every guide that publishes one drops the number for kids' content — Netflix goes from 20 to 17 CPS, Amazon Prime Video goes from 17 to 13. Reusing an adult-content CPS setting on a kids' file is a common QA fail.
- **Run every file through a CPL/CPS check before delivery, not after a rejection.** VideoText's fix subtitles pass flags CPL, CPS, overlap, and timing-drift issues against a set guideline and reformats to match Rev, GoTranscript, Scribie, or a custom client spec, which cuts the manual line-by-line pass most editors still do by hand. If you're weighing tools for this step, the [Descript alternatives](https://videotext.io/guides/best-8-descript-alternatives-in-2026) comparison covers where reformatting and QA workflows differ across platforms.

Check your subtitle file against a guideline

Fix CPL, CPS, and timing drift, then reformat to a specific client spec.

[Open VideoText](https://videotext.io/)

## FAQ

What is the standard CPL for subtitles in 2026?

42 characters per line is the most common cap, used by Netflix, Amazon Prime Video, and Apple. BBC and the EBU/ESIST recommendations use 37 characters per line instead.

What is the maximum CPS for Netflix subtitles?

Netflix's Timed Text Style Guide caps reading speed at 20 characters per second for general content and 17 CPS for children's content.

Is Amazon Prime Video's subtitle guideline stricter than Netflix's?

On reading speed, yes. Amazon caps adult content at 17 CPS versus Netflix's 20 CPS, though both use the same 42-character line length.

Why does BBC use words per minute instead of CPS?

BBC's Online Subtitle Guidelines measure reading speed in words per minute rather than characters per second. The two metrics don't convert directly because word length varies by content.

What CPS should I use for children's content?

Use the tightest published number for the platform: Netflix caps children's content at 17 CPS and Amazon Prime Video caps it at 13 CPS, both below their general-content limits.

What is the EBU/ESIST subtitle line-length guideline?

EBU/ESIST recommendations set line length at 37-40 characters per line and reading speed at roughly 12-15 characters per second, tighter than the Netflix/Amazon/Apple standard.

Does YouTube have an official CPL or CPS limit?

YouTube doesn't publish a hard CPL or CPS cap the way Netflix and Amazon do. Most editors default to the 42-character convention for consistency across platforms.

How do I check a subtitle file against multiple guidelines?

Run the file through a CPL/CPS checker set to the tightest guideline in your queue first, then confirm it against the platform's specific spec before delivery.

## One last thing

Every style guide that publishes a separate children's-content number cuts it below the general-content cap, and the gap isn't small: Netflix drops 3 CPS (20 to 17), Amazon Prime Video drops 4 CPS (17 to 13). If a project's audience skews younger and you're reusing your default adult-content setting, that's the fastest way to fail a reading-speed check on an otherwise clean file.

## Related guides

- [Best speaker diarization software](https://videotext.io/guides/best-speaker-diarization-software-in-2026)
