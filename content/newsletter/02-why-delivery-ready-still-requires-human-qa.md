---
issue: 2
title: "Why Delivery-Ready Transcripts Still Require Human QA"
newsletter: "Beyond ASR"
date: 2026-06-03
status: draft
---

# Why Delivery-Ready Transcripts Still Require Human QA

"AI handles the transcription, so we don't need reviewers anymore."

That sentence has cost more agencies than I can count.

---

## The Problem

There's a category of error that AI cannot catch — not because the model is bad, but because catching it requires understanding context the model doesn't have.

Call it semantic plausibility: a transcribed word that is acoustically correct, phonetically reasonable, and grammatically valid — but factually wrong.

**Example:** A speaker says "the Larson deposition." The model transcribes "the Carson deposition." Both sound similar. Both are grammatically valid. Both look like correct proper nouns. The AI has no way to know which one is right without external context.

A human reviewer with the job brief — who knows this is a legal deposition involving someone named Larson — catches it in a single pass.

This is why human QA is still in the loop. Not because AI is bad at transcription. Because a specific class of high-stakes error requires contextual knowledge that lives outside the audio.

---

## Why "AI-Only" Breaks in Production

The failure mode is subtle. AI QA is excellent at structural validation:
- Finding formatting violations
- Flagging timestamp gaps
- Detecting line length issues in SRT
- Catching obvious spelling errors

What it cannot do:
- Know that "Carson" should be "Larson"
- Know that "$14 million" should be "$40 million"
- Know that "anti-corrosion" was misheard as "anti-corruption" in an engineering context
- Know that the client's custom proper noun list wasn't applied

These errors look correct. They pass automated validation. They reach clients.

Every agency that has tried to eliminate human review entirely has discovered this through a complaint, not through their QA process.

---

## What the Review Layer Should Actually Do

The question isn't whether to use human review. It's how to scope it so it's not re-transcribing from scratch.

Efficient human review means:
1. AI handles structural validation (timestamps, formatting, reading speed)
2. Human handles semantic review (proper nouns, context-sensitive accuracy, client-specific requirements)
3. Rules handle delivery compliance (style guide enforcement, export format validation)

When each layer does what it's good at, review time drops without increasing miss rate.

The worst outcome is a human reviewer doing structural validation manually — checking line lengths, counting characters — because the tools didn't do it. That's expensive, slow, and adds no value a human should be adding.

---

## Tactical Takeaway

Before eliminating human QA, map what your reviewers actually spend time on.

If it's structural — formatting, timing, reading speed — that should be automated. You're paying humans to do something software can do more consistently.

If it's semantic — proper nouns, context accuracy, client-specific requirements — that's irreplaceable. Don't eliminate it. Right-size it.

The goal is hybrid: fast structural pass by tools, targeted semantic pass by humans who have context.

---

This is the exact architecture we use at VideoText.io. We didn't set out to replace reviewers. We set out to make reviewers' time go further.

—Santhosh
