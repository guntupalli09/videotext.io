---
slug: real-workflow-behind-qa-review
title: "The Real Workflow Behind Transcript QA Review"
description: "QA review is not just re-reading a transcript. Here is the structured workflow professional agencies and freelancers actually use — and why most ad-hoc review processes miss the errors that matter most."
tags:
  - QA
  - Transcription
  - Operations
  - Freelancers
  - Workflow
---

# The Real Workflow Behind Transcript QA Review

*QA review is a specific, structured process. Most people are doing a slower, less effective version of it without realizing it.*

---

When most people say "QA review," they mean: read through the transcript, fix anything that looks wrong, submit.

That process is not QA. It is a hope-based single pass that catches obvious errors and misses the errors that actually trigger rejections and client disputes.

Real QA review is a structured sequence of targeted checks — different checks, done in a specific order, designed to catch different categories of errors that a combined read-through systematically misses.

This is what that sequence looks like, why the order matters, and what each pass is designed to catch.

---

## Why a Single Combined Pass Fails

The fundamental problem with "read through and fix things" is cognitive load distribution.

A combined QA pass asks the reviewer to simultaneously:
- Verify content accuracy (did the words match the audio?)
- Check speaker attribution (is each line correctly assigned?)
- Apply formatting rules (does number formatting match the style guide?)
- Verify tag compliance (are inaudibles, cross-talk, and non-verbals tagged correctly?)
- Check structural integrity (are paragraphs broken correctly?)

Each of these is a different cognitive mode. Checking formatting while tracking audio is slower and less accurate than doing either separately. The brain allocates attention to one task and partially drops the other.

The practical result: combined-pass reviewers catch content errors at higher rates and formatting errors at lower rates than structured-pass reviewers. Formatting errors are what trigger most platform rejections. The combined pass optimizes for the wrong thing.

---

## The Structured QA Sequence

### Step 1: Client Requirements Re-Read (2 minutes, every job)

Before any QA work begins, re-read the job brief.

Not because you did not read it before — because the requirements you skim at the start of a job are not the ones your brain is checking at the end of the job. Working memory does not retain details reliably across a 2-hour transcription session.

What to specifically re-read:
- Verbatim mode (clean vs. full verbatim)
- Speaker label format requirements
- Timestamp placement and format
- Any client-specific terminology or glossary
- Special handling instructions for inaudibles, cross-talk, or non-verbal sounds

The cost of this step: 2 minutes. The cost of missing a requirement this step would have caught: a full rejection and redo.

---

### Step 2: Structural Integrity Check (read-only, no audio)

Before doing any line-level review, scan the transcript for macro-level structural issues.

**What to check:**

**Timestamp coverage:** Does the transcript have timestamps at the required intervals? If the job requires timestamps every paragraph, check that every paragraph starts with a timestamp. Check the first, last, and several middle timestamps to verify format (zero-padded, correct position).

**Speaker label consistency:** Scan the document for every unique speaker label used. If you see "Speaker 1," "speaker 1," and "SPEAKER 1" in the same document, that is a formatting failure that needs correction before anything else. Use find-and-replace to normalize.

**Document completeness:** Does the transcript length make sense for the audio length? A 60-minute recording should produce approximately 8,000-9,000 words. Significant shortfall suggests skipped content. Excess suggests a processing artifact that doubled a segment.

**Paragraph break logic:** Scan for speaker-change paragraphs (mandatory) and topic-shift paragraphs (recommended). A wall of text with no paragraph breaks in a 10-minute speaker segment is a structural flag.

This step finds problems that need bulk correction. Fixing them now, before line-level review, means you do not correct individual words in sections you are about to restructure.

**Time: 5-10 minutes per 30 minutes of audio.**

---

### Step 3: Tag Compliance Pass (read-only, no audio)

Scan the entire document specifically for non-verbal markers and tags.

**What to check:**
- Every [inaudible] is lowercase and bracketed (not [Inaudible], not [unclear], not blank)
- Every [crosstalk] is correctly formatted and used consistently
- Non-verbal tags ([laughs], [cries], [applause]) match the platform's required format
- No invented tags that are not part of the platform's tag vocabulary

**Use find-and-replace for tag verification:** Search for variations you know are common errors: "[Inaudible]", "[INAUDIBLE]", "[unclear]", "inaudible" (no brackets). If any exist, correct in bulk.

This step is fast and highly mechanical. It is also the step most reviewers skip, and the tags they skip are exactly what graders check on platforms like Rev.

**Time: 3-5 minutes per 30 minutes of audio.**

---

### Step 4: Glossary and Proper Noun Pass (read-only, no audio)

Using the glossary from the job brief (or built during setup), verify that all expected proper nouns appear consistently and correctly throughout the document.

**Method:**
1. List every proper noun you expect to see in the transcript (people's names, company names, product names, technical terms)
2. Search the document for each one
3. Verify every instance is spelled correctly and formatted consistently

**Flag but don't immediately fix:** If you find a proper noun that is consistently mis-transcribed in a way you can correct without audio, correct it now with find-and-replace. If you find a proper noun that is uncertain or inconsistent in ways that require audio verification, flag it for the listen pass.

**Common pattern:** AI models substitute phonetically similar common words for unfamiliar proper nouns. The substitution is consistent — the same wrong word appears every time. Catching this in a read-pass and batch-correcting it is faster than catching each instance individually in a listen pass.

**Time: 5-10 minutes per 30 minutes of audio, depending on vocabulary density.**

---

### Step 5: Formatting and Style Compliance Pass (read-only, no audio)

Before any audio, do a dedicated formatting pass against the style guide.

**What to check:**

**Number formatting:** Does the document follow the style guide's number rules? (Common: spell out 1-10, digits for 11+.) Search for single digits (1, 2, 3... through 9) that appear as numerals in contexts where they should be words. Search for numbers 11+ that appear spelled out when they should be digits.

**Punctuation:** For clean verbatim, verify no filler words crept in. For full verbatim, verify filler words are present and correct (trailing dashes for false starts, commas for natural pauses, ellipses for trailing sentences).

**Speaker label format:** Final verification that all speaker labels follow the exact required format (capitalization, punctuation, spacing).

**Timestamp format:** Verify a sample of timestamps throughout the document for correct format and reasonable position.

**Line-level formatting:** If the style guide specifies line length, character limits, or other micro-format rules (common for subtitle formats), check them now.

**Time: 8-15 minutes per 30 minutes of audio, depending on rule complexity.**

---

### Step 6: The Targeted Listen Pass (audio)

This is the only step that involves audio. It is also the most time-expensive step and the most important to scope correctly.

**What you are listening for:**

Based on the previous passes, you should have a list of:
- Flagged uncertain words
- Proper nouns you could not verify from reading
- Segments identified in the structural pass as potentially problematic (timestamp gaps, unusual word count)
- Segments with heavy cross-talk or background noise where AI accuracy is lowest

**What you are NOT doing in this pass:**

Full-document listen-along verification. If your previous passes were thorough, the majority of the document is verified without audio. Spending full playback time on clean segments is wasted time.

**Listen pass approach:**
1. Work from your flagged list — navigate to each flagged segment directly
2. Use 1.25x-1.5x speed on moderately clean segments you are verifying
3. Use normal speed on noisy, fast, or heavily flagged segments
4. Flag but do not stop playback for corrections — fix in bulk after the listen pass
5. For segments where cross-talk made the content unrecoverable, use [inaudible] — do not guess

**The single biggest listen pass mistake:** Stopping audio for every correction. Every stop-to-fix interrupts audio context. You lose what was said before and after the error. The correct behavior is to flag (keyboard shortcut or notation), continue audio, and fix in a separate edit pass.

**Time: 0.4x-0.6x audio length for a targeted listen pass. Full-length (1:1) listen passes on clean AI transcripts indicate an unstructured process.**

---

### Step 7: Final Edit Pass (no audio)

After the listen pass, you have a list of flagged items to correct. Address them all in a single editing pass — no audio, no new review. Pure execution.

Then: one final read of the first and last paragraph. Beginnings and endings are where reviewers' attention is highest. They are also where transcriptionists are most and least focused, respectively — maximum care at the start, minimum care at the end.

Check the final timestamp. Verify the last speaker label. Verify the document ends cleanly.

**Time: 5-10 minutes per 30 minutes of audio.**

---

## QA Time by Audio Length (Structured Process)

| Audio Length | Steps 1-5 | Listen Pass | Final Edit | Total QA Time |
|---|---|---|---|---|
| 30 min | 26 min | 12-18 min | 7 min | **~45-51 min** |
| 60 min | 40 min | 24-36 min | 12 min | **~76-88 min** |
| 90 min | 55 min | 36-54 min | 16 min | **~107-125 min** |

These estimates assume good AI accuracy (94%+) and a clear job brief. Difficult audio or sparse job briefs add time across Steps 3, 4, and 6.

---

## The Shortcut That Eliminates Two Passes

Steps 3 (Tag Compliance) and 5 (Formatting and Style Compliance) are where structured rule-checking tools earn their value.

If your transcript is already run through a guideline formatting layer before QA — where a documented set of rules has been applied to the raw AI output — you are verifying compliance in Steps 3 and 5, not discovering what the rules require and applying them cold.

Verification is faster than application. Checking that every [inaudible] tag is correct takes 2 minutes when you know they have been normalized. Fixing every [inaudible] tag that was not normalized takes 8 minutes.

[Apply formatting rules before the QA pass](https://videotext.io/guideline-format)

[Start from the cleanest possible AI transcript](https://videotext.io/video-to-transcript)

The structured QA process works. It works faster when the formatting work has already been done.
