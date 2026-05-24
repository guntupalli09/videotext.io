---
issue: 1
title: "ASR Is Not the Bottleneck Anymore"
newsletter: "Beyond ASR"
date: 2026-05-27
status: draft
---

# ASR Is Not the Bottleneck Anymore

Most transcription tools are solving last decade's problem.

---

## The Problem

For years, the hard part of transcription was accuracy. Word error rates were bad enough that human review wasn't optional — it was mandatory, full-stop. You couldn't skip it. The model was wrong too often.

That problem is largely solved.

Whisper large-v3 hits 98.5% word accuracy on clean audio. Deepgram Nova-2 isn't far behind. For most professional use cases — interviews, webinars, meetings, standard studio recordings — ASR accuracy is no longer the reason transcripts require review.

But review times haven't dropped proportionally.

That's the tell.

---

## Why Existing Tools Miss This

Every major transcription vendor optimizes for the demo.

The demo is: upload a clean audio file, get a clean transcript, celebrate accuracy.

The production workflow is: get a transcript, format it to client spec, validate timestamps, fix speaker labels, check segment lengths, confirm it matches style guide requirements, export in the right format, deliver.

ASR accuracy is step 1. Everything after it is invisible in the demo, but it's where 60–70% of actual turnaround time goes.

Tools that optimize for step 1 and ignore the rest aren't building for production. They're building for procurement.

---

## What Actually Breaks in Real Workflows

Here's what teams actually spend time on after ASR:

**Formatting inconsistencies.** The model doesn't know your client's style guide. Whether numbers are spelled out or digits, whether filler words are removed, whether "uh" becomes a dash — none of that is standardized.

**SRT segmentation.** Auto-generated subtitles frequently violate readability rules: lines too long, splits mid-phrase, reading speeds too fast or slow for the target audience. Every one of those requires manual correction.

**Speaker verification.** Speaker diarization assigns labels like "Speaker 1" and "Speaker 2." Someone has to map those to actual names. In a 60-minute recording with 4 speakers, that's a non-trivial review pass.

**Delivery format compliance.** Different platforms, clients, and broadcasters have different requirements. The transcript that works for one deliverable doesn't work for another without additional processing.

None of this is an ASR problem. All of it happens after ASR.

---

## The Tactical Takeaway

If you're evaluating transcription tools based on word accuracy alone, you're measuring the wrong thing.

The right questions are:
- Does it enforce formatting rules before delivery?
- Does it flag SRT segments that violate reading speed standards?
- Does it reduce reviewer touch time, not just transcription time?

Accuracy gets you a transcript. The rest of the workflow gets you a deliverable.

---

We've been building around this exact bottleneck at VideoText.io. If you're dealing with delivery workflow friction, reply — happy to compare notes.

—Santhosh
