---
slug: rev-style-guide-formatting-errors
title: "Rev Style Guide Formatting Errors We See Repeatedly"
description: "These are the Rev style guide formatting mistakes that show up in rejected transcripts again and again. Fix them before your listen pass, not after rejection."
tags:
  - Freelancers
  - Transcription
  - Style Guide
  - Rev
  - QA
---

# Rev Style Guide Formatting Errors We See Repeatedly

*Rejection notices from Rev almost always cite the same dozen formatting errors. Here is what they are, why they happen, and how to fix them before submission.*

---

Rev's style guide is specific. It is also long, dense, and written in a way that makes the common errors easy to miss until a reviewer catches them on a completed job.

The formatting mistakes that trigger rejections are not usually accuracy problems. They are compliance problems: a transcript that is mostly correct but formatted in a way that violates documented style rules. The distinction matters because formatting errors are preventable in a way that accuracy errors are not.

This post covers the formatting errors that show up most frequently in Rev rejections, explains why they happen, and shows exactly what the correct output looks like.

---

## Error 1: Wrong Verbatim Mode Application

**What happens:** The transcriptionist applies clean verbatim rules (removing filler words, false starts, repetitions) to a job that requires full verbatim, or vice versa.

**Why it happens:** Rev's job listings specify verbatim mode, but the UI places this information in a way that is easy to miss when moving quickly through the job board. Transcriptionists in a rhythm from previous jobs sometimes carry over the wrong verbatim mode.

**What clean verbatim looks like:**
> So the meeting is scheduled for Thursday.

**What full verbatim looks like:**
> So, uh — so the meeting is, uh, it's scheduled for Thursday.

**The rule:** Every Rev job specifies its verbatim requirement in the job brief. That specification overrides any default you have developed from previous jobs. Check it for every job before you start.

**How to catch it:** If you are working on a full verbatim job and your transcript reads cleanly with no filler words, you have likely applied the wrong mode. Filler words in speech are almost universal — their absence in a "full verbatim" transcript is a red flag.

---

## Error 2: Incorrect Inaudible Tag Format

**What happens:** Transcriptionists use non-standard tags for inaudible segments, or omit the tag entirely and leave a blank.

**Wrong:**
> The contract was signed on [unclear] and the terms were [inaudible words] in the appendix.

**Wrong:**
> The contract was signed on _____ and the terms were _____ in the appendix.

**Correct Rev format:**
> The contract was signed on [inaudible] and the terms were [inaudible] in the appendix.

**Why it happens:** Different clients use different tag conventions. If you work across multiple platforms or have worked with clients who used "[unclear]" or blank underscores, those habits persist.

**The rule:** Rev uses [inaudible] — all lowercase, in brackets, no additional qualifier. Any variation from this exact format is a formatting error regardless of whether the transcription itself is accurate.

**Additional Rev tag formats to know:**
- Cross-talk between speakers: [crosstalk]
- Laughing: [laughs]
- Crying: [cries]
- Applause: [applause]
- Music: [music]

Each of these has a specific format. Variations (like [laughter] instead of [laughs]) will trigger a formatting error in review.

---

## Error 3: Speaker Label Formatting Violations

**What happens:** Speaker labels appear in formats that differ from Rev's required style — wrong capitalization, wrong punctuation, inconsistent naming across the transcript.

**Wrong:**
> Speaker 1: The project timeline is—
> Speaker_1: What did you say about the timeline?

**Wrong:**
> John Smith: The project timeline is—
> John: What did you say about the timeline?

**Correct:**
> Speaker 1: The project timeline is—
> Speaker 2: What did you say about the timeline?

Or, if names are provided in the job brief:

> John: The project timeline is—
> Sarah: What did you say about the timeline?

**The rule:** Speaker labels must be consistent throughout the transcript. The label established at first instance is the label used for every subsequent occurrence. Case, spelling, and punctuation must match exactly. If you use "Speaker 1:" in paragraph 3, you cannot use "speaker 1:" or "Speaker 1 -" anywhere else in the document.

**Why it happens:** Transcriptionists often identify speakers mid-transcript (a speaker introduces themselves in minute 12 after being labeled "Speaker 1"). Going back to update all prior instances of that label is a step that gets skipped under time pressure.

**How to fix it:** Use find-and-replace to update speaker labels globally. Never update them one by one — consistency errors are inevitable.

---

## Error 4: Timestamp Placement Errors

**What happens:** Timestamps appear at wrong intervals, in wrong formats, or are missing from required locations.

**Rev's timestamp rules (standard):**
- Timestamps appear at the start of each new paragraph or speaker turn
- Format: [00:00:00] — hours, minutes, seconds, always zero-padded
- Timestamps must correspond to the actual audio position, not estimated or rounded

**Wrong:**
> [0:5:30] So the proposal was submitted last week.

**Wrong:**
> [00:05] So the proposal was submitted last week.

**Correct:**
> [00:05:30] So the proposal was submitted last week.

**Why it happens:** The zero-padding requirement is easy to forget. [0:5:30] looks correct until you compare it against the required [00:05:30]. Automated timestamp insertion tools sometimes produce non-standard formats.

**The rule:** Every digit position must be present and zero-padded. A transcript with 47 correctly formatted timestamps and one [0:12:04] will receive a formatting error on that timestamp.

---

## Error 5: Paragraph Break Placement

**What happens:** Paragraphs are broken in ways that violate Rev's formatting expectations — either broken too frequently (every sentence), not broken often enough (long walls of text), or broken at semantically wrong points.

**Rev's paragraph guidance:**
- New paragraph on speaker change (always)
- New paragraph on significant topic shift within a speaker's turn
- New paragraph approximately every 3-5 sentences in extended single-speaker segments

**Wrong (too frequent):**
> Speaker 1: We have three agenda items today.
>
> The first is the Q3 budget review.
>
> The second is the hiring plan.

**Wrong (insufficient):**
> Speaker 1: We have three agenda items today. The first is the Q3 budget review. The second is the hiring plan. For the budget review, I want to walk through the variance report line by line. Starting with personnel costs, which came in over by about twelve percent. That's primarily driven by the two senior hires we made in August and September. The hiring plan connects to this directly. We're targeting three additional positions in Q4. All in engineering. The timeline depends on the budget outcome from this conversation.

**Why it happens:** Transcriptionists developing rhythm often forget to track paragraph breaks separately from content accuracy. If the focus is entirely on getting the words right, formatting choices default to "whatever felt natural."

---

## Error 6: Handling Crosstalk and Interruption

**What happens:** Cross-talk between speakers is handled inconsistently — sometimes tagged, sometimes guessed, sometimes partially transcribed.

**Wrong:**
> Speaker 1: The deadline is absolutely —
> Speaker 2: [interrupting] But we haven't finalized the —
> Speaker 1: Right, I know, I know, but —

**Correct:**
> Speaker 1: The deadline is absolutely —
> Speaker 2: [crosstalk]
> Speaker 1: [crosstalk] Right, I know, I know, but —

**The rule:** When two speakers are talking simultaneously and both cannot be clearly understood, use [crosstalk] for each speaker's turn during the overlap. Do not attempt to transcribe cross-talk that is not clearly audible. Do not use [interrupting] or other descriptive tags.

**Why it happens:** Cross-talk is uncomfortable to leave as [crosstalk] — it feels like giving up. The instinct is to try to catch something useful from both voices. Rev's rules are clear: accuracy requires certainty. If you cannot clearly understand both voices, tag the cross-talk.

---

## Error 7: Punctuation Inside vs. Outside Quotation Marks

**What happens:** Punctuation placement relative to quotation marks follows non-standard conventions.

**Wrong (UK convention, not accepted on Rev):**
> He said "the meeting is tomorrow", and she agreed.

**Correct (US convention, Rev standard):**
> He said "the meeting is tomorrow," and she agreed.

**The rule:** Rev follows US punctuation conventions. Commas and periods go inside closing quotation marks, not outside. This is the rule regardless of whether the content being transcribed uses UK conventions or the transcriptionist's native style differs.

---

## Error 8: Number Formatting Inconsistencies

**What happens:** Numbers are formatted inconsistently — sometimes as words, sometimes as digits — in ways that violate Rev's style guidelines.

**Rev's number formatting rules:**
- Numbers one through ten: spell out (one, two, three)
- Numbers 11 and above: use digits (11, 12, 47)
- Exceptions: always use digits for percentages (5%), time (3:00), measurements (8 inches), and ages when used as adjectives (a 7-year-old child)

**Wrong:**
> We have 3 options, and the second option has eleven sub-components.

**Correct:**
> We have three options, and the second option has 11 sub-components.

**Why it happens:** In normal writing, number formatting is inconsistently applied even by careful writers. Transcriptionists working at speed often do not apply systematic rules — they write numbers however they come out.

---

## Error 9: Capitalization of Non-Proper Nouns

**What happens:** Words that are not proper nouns appear capitalized, often because they sound important in context or because the speaker emphasized them.

**Wrong:**
> The key takeaway from the Board Meeting was that the Company needs a Strategy.

**Correct:**
> The key takeaway from the board meeting was that the company needs a strategy.

**The rule:** Capitalization follows standard English rules, not speaker emphasis. A speaker who says "Strategy" with special emphasis still produces a lowercase "strategy" in the transcript.

**Why it happens:** Transcriptionists sometimes capitalize words to reflect the weight or emphasis in the speaker's voice. This is incorrect on Rev. Transcripts are a record of what was said, not a record of how it was said (unless using full verbatim tags for emphasis).

---

## Error 10: Failing to Flag Uncertain Words

**What happens:** Transcriptionists guess at words they cannot hear clearly and transcribe the guess as if it were certain.

**Wrong:**
> The parameter was set to [inaudible], which triggered the cascade.

Wait — that one is actually correct (using [inaudible]). Here is the actual wrong version:

**Wrong:**
> The parameter was set to fortuitous, which triggered the cascade.

(When the actual word was a proper noun the transcriptionist could not hear clearly and guessed at phonetically.)

**Correct:**
> The parameter was set to [inaudible], which triggered the cascade.

**The rule:** If you are not certain a word is correct, do not transcribe it. Use [inaudible]. A guessed word that is wrong is worse than an honest [inaudible] tag, because a wrong word corrupts the record while an [inaudible] tag tells the reviewer exactly what happened.

**Why it happens:** Guessing feels productive. Using [inaudible] feels like failure. Rev's graders disagree — an [inaudible] on a word you genuinely could not hear is correct; a wrong word confidently typed is a transcription error.

---

## Eliminating These Errors Before Submission

The most efficient way to eliminate these errors is not to fix them after writing — it is to have a structured checklist you run before submitting every job.

A checklist-based final review catches formatting errors that a free-form "read through" misses. The human eye autocorrects and skips patterns it expects to see correctly. A checklist forces you to actively check each rule rather than passively reading for it.

The structure that works:

1. Verify verbatim mode before starting
2. Run find-and-replace to normalize all speaker labels
3. Confirm all inaudible/tag formats are lowercase and in brackets
4. Check timestamp format on first and last occurrence
5. Verify number formatting on a sample (search for digits 1-9 at word boundaries)
6. Confirm punctuation inside quotes throughout

That is 6 checks. Each takes under two minutes. Combined, they eliminate the majority of formatting-triggered rejections before submission.

---

**Stop fixing Rev rejections after the fact.**

[Format your transcript against Rev's style rules before you submit](https://videotext.io/guideline-format)

The guideline format tool maintains Rev-aligned rule cards that you apply during your final review pass — not after a rejection tells you what you missed.

[Transcribe your audio first, then bring it to the formatting layer](https://videotext.io/video-to-transcript)
