---
slug: cps-violations-rejected-at-platform-qc
title: "CPS Violations Rejected at Platform QC — What the Real Limits Are"
description: "Your subtitle file failed QC for reading speed — not timing, not spelling. Here is how CPS and CPL limits differ by platform, why auto-captions fail them, and how to bring a file into spec."
tags:
  - Subtitles
  - CPS
  - QC
  - Accessibility
  - Workflow
---

# CPS Violations Rejected at Platform QC — What the Real Limits Are

The rejection email is three words long: **"Reading speed exceeded."** No line numbers. No cue index. Just a failed QC gate between you and payment.

You checked spelling. You fixed overlaps. The times look plausible in Subtitle Edit. But the platform's validator measures something you cannot eyeball in a text editor: **how many characters a viewer must read per second of on-screen time**.

That metric — **CPS**, characters per second — is one of the most common hard fails on professional caption delivery.

---

## CPS vs CPL: two different limits

Teams confuse these constantly:

| Metric | Measures | Typical fail mode |
|--------|----------|-------------------|
| **CPL** (characters per line) | Longest row in a multi-line cue | Line wraps off screen on mobile |
| **CPS** (characters per second) | `character count ÷ cue duration` | Viewer cannot finish reading before the cue disappears |

A cue can pass CPL — two short lines under 42 characters — and still fail CPS because the **total** character count is high in a **1.2 s** window.

Example:

```
00:02:10,000 --> 00:02:11,200   (1.2 s duration)
We're going to need additional authorization from compliance.
```

52 characters ÷ 1.2 s ≈ **43 CPS**. Many platforms cap between 17 and 21 CPS for adult programming.

---

## What the major specs actually say (approximate)

Always read the **current** client brief — these numbers shift by genre and service tier:

- **Netflix** — often cited around **17 CPS** maximum for most languages; stricter for kids. CPL commonly **42** per line, **84** per cue (two lines).
- **BBC / Ofcom-style** — **17 CPS** guidance for live and pre-recorded; emphasis on readable minimum display **1.5 s** for short cues.
- **Amazon Prime / studio deliverables** — frequently **20–21 CPS** in QC tooling; CPL **42**.
- **YouTube auto-captions** — no hard upload CPS gate for creator uploads, but **readability** complaints map to the same math; many internal QC tools use **21 CPS** as a warning threshold.
- **SDH broadcast US** — **15–20 CPS** depending on network; children's lower.

Your validator might use 21 CPS as a **warning** and 17 as a **fail**. Know which side of that gap your file sits on before submission.

---

## Why auto-generated files fail CPS so often

ASR systems optimize for **word accuracy**, not **reading ergonomics**. They emit:

- Long run-on cues tied to breath groups instead of semantic units.
- Short durations on dense clauses — especially lists and numbers.
- Translated text **longer** than source language in the same time window.

A perfect transcript of an auctioneer is unreadable as subtitles. CPS failure is a **design** problem, not a transcription mistake.

---

## Manual remediation strategies

### 1. Extend display time (when room exists)

If the next cue starts late enough, push `end` forward to reach ≥1.5 s and target CPS ≤21:

```
needed duration ≥ char_count / 21
```

Watch for **overlaps** — extending into the next cue recreates the overlap failure you just fixed.

### 2. Split the cue

Break at a natural phrase boundary; duplicate or adjust timing so each half gets its own window. This is the correct fix for lists:

Before (1 cue, 58 chars, 2.0 s → 29 CPS):
```
...authorization, billing, and shipping departments.
```

After (2 cues, ~29 chars each, 2.0 s + 2.0 s → ~14 CPS each):
```
...authorization and billing,
and shipping departments.
```

### 3. Rewrite for subtitle brevity (with approval)

Remove filler, use numerals, drop parentheticals — **only** when the brief allows linguistic editing. News and legal often forbid paraphrase.

### 4. Drop to two lines with CPL wrap

Wrapping alone does not fix CPS if duration stays constant. Wrap **plus** extend, or wrap **plus** split.

---

## Measuring CPS across a whole file

Spot-checking ten cues is not enough. Export a CSV from Subtitle Edit's "Statistics" or run a script:

```python
for cue in cues:
    dur = cue.end - cue.start
    if dur <= 0:
        flag("invalid timing", cue)
    elif len(cue.text.replace("\n", "")) / dur > 21:
        flag("CPS", cue)
```

Sort by CPS descending; fix the top twenty offenders first — usually clears 80% of failures.

---

## When manual CPS passes stop scaling

A feature-length file with **400 CPS warnings** needs iterative extend-split-wrap. Each extension checks the neighbor; each split re-indexes cues. Do that by hand and you will introduce overlaps in act three.

Automated repair follows the same order a senior QC tech uses: fix overlaps first, extend durations where the timeline allows, wrap lines over 42 characters. Upload the rejected file to the [subtitle grammar fixer](https://videotext.io/subtitle-grammar-fixer), enable **Fix timing** and **Line breaks (CPL)**, and download the corrected track. Re-run your CPS report — cues still above a **client-specific** 17 CPS ceiling need human splits or approved rewrites, but the bulk mechanical work should drop from hours to minutes.

---

## Negotiating false positives

Some validators count **spaces**; others do not. SDH sound labels `[PHONE RINGING]` inflate counts — check whether the brief excludes non-dialogue elements from CPS math.

Kids' programming and **forced subtitles** (foreign on-screen text) often have separate rules. Flag exceptions in your delivery notes instead of silently stripping labels.

---

## Takeaway

CPS rejection means **too much text in too little time** — not that your file is corrupt. Know your client's number (17 vs 21), measure the whole file, fix worst cues first with extend-or-split logic, and automate the repetitive extend/trim/wrap cycle so human time goes to the lines that need rewriting approval.

Pass QC on math before anyone argues about comma placement.
