---
slug: how-do-you-check-subtitle-cpl-and-reading-speed-before-delivery
title: "How do you check subtitle CPL and reading-speed before delivery?"
description: "Netflix TTSC caps CPL at 42 characters, 17 CPS. BBC caps CPL at 37. Learn the exact steps to check subtitle CPL and reading speed before delivery in 2026."
date: 2026-09-18
image: https://gwvckixiegkllthleuyt.supabase.co/storage/v1/object/public/programmatic-articles/7fbc6731-387b-4ffb-9a12-1af7fc6ac03f/featured.jpg
source_path: /how-do-you-check-subtitle-cpl-and-reading-speed-before-delivery
source: ryze
---
# How do you check subtitle CPL and reading-speed before delivery?

Checking subtitle CPL and reading speed before delivery means running two separate counts on every cue: characters per line against your style guide's CPL ceiling, and characters per second (CPS) against that same guide's reading-speed limit. Netflix TTSC caps English lines at 42 characters and adult-content reading speed at 17 CPS; BBC caps lines at 37 characters. Miss either check and a file that looks fine on a file-wide average can still fail on individual cues where a long line lands on a short shot.

TL;DR

- Check subtitle CPL and reading speed per cue, not as a file average — a single long cue can still fail even when the average looks clean.
- Netflix TTSC: 42 characters per line, 17 CPS for adult content, 20 CPS for children's content.
- BBC guidelines cap lines at 37 characters, tighter than Netflix TTSC.
- CPS = total characters in the cue divided by cue duration in seconds — calculate it before export, not after a client rejection.
- VideoText's Subtitle QA review flags CPL and CPS violations automatically inside the cue editor before export.

Style guide limits at a glance

42 characters

Netflix TTSC max CPL

17 CPS

Netflix TTSC max reading speed, adult content

37 characters

BBC max CPL

20 CPS

Netflix TTSC max reading speed, children's content

## Why this matters

A client rejection on CPL or reading speed costs more than the fix itself. It costs the re-review cycle, because once a QA reviewer flags one overset cue, they re-check the whole file. Freelance subtitle editors who catch CPL and CPS problems before delivery skip that cycle entirely.

[VideoText](https://videotext.io/) builds CPL and CPS checks into the subtitle QA workflow so the count happens automatically as cues are generated, not as a manual pass at the end. That doesn't replace understanding the math — it just means you're not counting characters by hand on a 45-minute file.

## How do you check subtitle CPL and reading speed before delivery?

Run both checks on every cue in this order:

1. **Count characters per line**, including spaces and punctuation, for both lines in a two-line cue.
2. **Compare that count to your style guide's CPL max** — 42 for Netflix TTSC, 37 for BBC, or whatever the client brief specifies.
3. **Calculate CPS**: total characters in the cue (both lines combined) divided by the cue's duration in seconds.
4. **Compare CPS to the guide's reading-speed limit** — 17 CPS for Netflix adult content, 20 CPS for children's content.
5. **Flag any cue that fails either check** and either shorten the text, split the cue, or extend the duration if the shot allows it.

![Five-step process for checking subtitle CPL and reading speed before delivery](https://gwvckixiegkllthleuyt.supabase.co/storage/v1/object/public/programmatic-articles/7fbc6731-387b-4ffb-9a12-1af7fc6ac03f/body-47e46a88.jpg)

Run both checks per cue — a file-wide average hides individual overset lines.

Here's how the major style guides compare on the two numbers that matter most:

| Style guide | Max CPL | Max CPS | Best for |
|---|---|---|
| Netflix TTSC | 42 characters | 17 CPS (adult), 20 CPS (kids) | Streaming deliverables, Netflix originals |
| BBC guidelines | 37 characters | Not fixed at a single CPS number | UK broadcast, tighter line-length markets |
| Custom client brief | Set by the client | Set by the client | Agency work where the client overrides defaults |

When a brief doesn't specify a number, default to the Netflix TTSC figures — they're the most widely referenced baseline in the industry in 2026, and most client guideline templates trace back to them.

## Netflix TTSC: 42 characters per line, 17 CPS

Netflix's Timed Text Style Guide sets 42 characters per line as the hard ceiling for English subtitles, with a maximum of two lines per cue. Reading speed for adult content tops out at 17 CPS. Go past either number and the cue reads as too dense for the average viewer to finish before the next cut.

This is the guide most freelance subtitle editors default to when a client doesn't hand over their own spec, because it's documented publicly and widely adopted across streaming delivery work.

## Netflix TTSC for children's content: 20 CPS

Netflix TTSC raises the reading-speed ceiling to 20 CPS for children's programming, on the assumption that kids' dialogue tends to run shorter and simpler per cue even though young readers process text more slowly than adults. The CPL max stays at 42 characters regardless of audience.

If you're subtitling a mixed-audience file — animated content aimed at families, for instance — check which spec the client's brief actually calls for before you set your reading-speed target. Don't assume kids' content automatically means the looser number.

## BBC guidelines: 37 characters per line

BBC subtitle guidelines cap line length at 37 characters, five characters tighter than Netflix TTSC. That difference matters more than it sounds: a line that clears Netflix's 42-character limit can still fail a BBC delivery spec outright.

If you're working across both UK broadcast and streaming clients in the same week, don't run one CPL check and assume it covers both — check against the actual delivery guide named in the brief. The [subtitle CPL and CPS benchmarks by style guide](https://videotext.io/guides/subtitle-cpl-and-cps-benchmarks-by-style-guide-2026) breakdown covers more guides side by side if you need a reference beyond Netflix and BBC.

## Why CPL and reading-speed limits vary

Style guides don't converge on one number because the underlying variables differ:

- **Audience age** — children's content gets a higher CPS ceiling than adult content under Netflix TTSC.
- **Broadcast vs streaming delivery** — BBC's 37-character cap reflects UK broadcast conventions, not streaming defaults.
- **Dialogue density** — fast-paced dialogue (interviews, panel shows) forces shorter cues to stay under any CPS limit, regardless of guide.
- **Language** — CPL limits are set for the source language; translated subtitles often need different character counts to say the same thing, which is why translation work needs its own CPL pass, not a reused count from the original.
- **Client override** — many agency briefs specify their own numbers, tighter or looser than any published guide, and those override the default every time.

## Does CPL differ for burned-in captions vs SRT files?

CPL limits themselves don't change between burned-in captions and SRT delivery — a 42-character line is still 42 characters either way. What changes is how forgiving the format is of a violation: an SRT file with an overset line still displays it correctly on any player, but a burned-in caption locks that overset line into the video permanently, so a CPL miss on burn-in delivery can't be fixed without re-rendering the whole file.

## Can subtitle QA tools catch CPL and CPS automatically?

Subtitle QA tools that check CPL and CPS automatically scan every cue in a file and flag violations against a chosen style guide, cutting out the manual character-count pass entirely. VideoText's Subtitle QA review does this inside the cue editor, synced to the video, so a flagged cue shows both the violation and the exact playback moment it applies to. The [best subtitle QA tools](https://videotext.io/guides/best-subtitle-qa-tools-in-2026) comparison covers how several tools handle this check if you're evaluating more than one option.

## What's the formula to calculate subtitle reading speed (CPS)?

The CPS formula is total characters in the cue divided by the cue's duration in seconds — a 60-character cue lasting 3 seconds runs at 20 CPS. Spaces and punctuation count toward the character total in most style guides, including Netflix TTSC, so a rough word-count estimate will usually undercount the real figure.

Cut CPL and CPS QA time

See the workflow freelancers use to catch drift before client delivery.

[See the QA workflow](https://videotext.io/guides/how-do-you-reduce-qa-time-on-subtitles-before-client-delivery)

## FAQ

How do you check subtitle CPL before delivery?

Count the characters on each line, including spaces and punctuation, and compare that count to the style guide's max — 42 for Netflix TTSC, 37 for BBC. Run this per cue, since a file-wide average can hide individual overset lines.

What is a good subtitle reading speed?

A good subtitle reading speed stays at or under 17 CPS for adult content under Netflix TTSC, or 20 CPS for children's content. CPS is total characters in a cue divided by the cue's duration in seconds.

Is Netflix's CPL limit the same as BBC's?

No. Netflix TTSC caps lines at 42 characters, while BBC guidelines cap lines at 37 characters, five characters tighter. Always check the delivery guide named in the client brief rather than assuming one default.

Does CPS change for different content types?

Yes, under Netflix TTSC. Adult content tops out at 17 CPS while children's content is allowed up to 20 CPS, on the assumption that kids' dialogue runs simpler per cue.

Can subtitle QA software catch CPL and CPS issues automatically?

Yes. Subtitle QA tools scan every cue against a chosen style guide and flag violations without a manual character count. VideoText's Subtitle QA review does this inside a cue editor synced to the video.

Do translated subtitles need a separate CPL check?

Yes. Translated text often runs longer or shorter than the source language per idea, so a CPL check run on the original file doesn't carry over — recheck CPL and CPS after translation, not before.

What happens if a subtitle fails the CPS check?

A cue that fails the CPS check needs either shorter text, a split into two cues, or a longer on-screen duration if the shot allows it. Delivering it unchanged risks a client rejection during QA review.

## One last thing

The five-character gap between Netflix's 42-CPL max and BBC's 37-CPL max is the single most common cause of a "passed one client, failed another" subtitle file in 2026 — the text itself didn't change, only the ruler it got measured against. Check the delivery guide named in the brief before you check anything else.

## Related guides

- [How do you know an AI transcript is clean enough for delivery?](https://videotext.io/guides/how-do-you-know-an-ai-transcript-is-clean-enough-for-delivery)
- [Can subtitles be translated without losing timing sync?](https://videotext.io/guides/can-subtitles-be-translated-without-losing-timing-sync)
