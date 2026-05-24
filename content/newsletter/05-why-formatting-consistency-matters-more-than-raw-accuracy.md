---
issue: 5
title: "Why Formatting Consistency Matters More Than Raw Accuracy"
newsletter: "Beyond ASR"
date: 2026-06-24
status: draft
---

# Why Formatting Consistency Matters More Than Raw Accuracy

A 98% accurate transcript with inconsistent formatting is a quality problem. A 97% accurate transcript that's formatted correctly every time is a professional deliverable.

---

## The Problem

Transcription vendors compete on accuracy. 98.5% vs 97.3% vs 96.8%.

Those numbers aren't meaningless — but for most professional workflows, the accuracy gap between top-tier ASR models is smaller than the formatting variance on a single output from the same model on the same content type.

In other words: the model that gets 0.5% more words right is less important to your delivery quality than the system that ensures every transcript leaves formatted identically to your client's specification.

Formatting variance is a client relationship problem. It is how a client learns not to trust your QA process.

---

## What Formatting Inconsistency Looks Like

It's subtle. On any individual job, most of it goes unnoticed.

Over 20 jobs with the same client, it becomes a pattern:
- Numbers: "five" on some jobs, "5" on others
- Honorifics: "Dr. Smith" sometimes, "Doctor Smith" sometimes
- Filler words: cleaned in some transcripts, left in others
- Ellipses: "..." vs "…" vs " — " — all three appearing in a single deliverable
- Paragraph breaks: inconsistent across similar content types
- Speaker labels: "SPEAKER 1:" vs "Speaker 1:" vs "John:" with no clear rule

None of these are errors in the conventional sense. The words are right. The timestamps are right. But the client sent back a note asking why things look different from last month's batch.

That note is expensive. It erodes trust. It generates re-work. It makes the client wonder what else is inconsistent.

---

## Why This Happens

Formatting decisions are made at output time by whichever team member processes the job. If those decisions aren't codified into a rule set that runs before delivery, they vary by person, by day, by how much time is left before the deadline.

The problem isn't that your team doesn't know the client's preferences. It's that client preferences aren't enforced at the system level. They live in a shared doc, or a Slack message from six months ago, or in the head of the one person who's been handling that client.

When that person is out, the inconsistency happens.

---

## The Fix: Deterministic Formatting Rules

The solution isn't better humans or better prompting. It's deterministic rules that run on every output before it's downloadable.

A rule set for a client looks like:
```
numbers: digits (1–9 as digits, not words)
filler_words: remove
honorifics: abbreviated (Dr., Mr., Prof.)
ellipsis_style: em_dash
speaker_format: ALL_CAPS_COLON
line_breaks: sentence_boundary
```

Every transcript processed for that client runs through those rules. Every time. No variance.

Formatting consistency is then a system property, not a human discipline.

---

## Tactical Takeaway

Build a formatting rule set for each client before the next job batch.

Even a short checklist — numbers, honorifics, fillers, punctuation style — that's enforced manually before delivery is better than relying on memory. The real goal is a system that enforces it automatically, but even a manual checklist cuts variance significantly.

Track client feedback on formatting separately from feedback on accuracy. If you're getting more formatting notes than accuracy notes, your QA layer has the wrong priority.

---

Guideline enforcement for client-specific formatting rules is one of the core tools we built at VideoText.io. If you want to see how that works in practice, the tool is at videotext.io/guideline-format.

—Santhosh
