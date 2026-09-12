---
slug: fixing-capitalization-punctuation-across-subtitle-file
title: "Fixing Capitalization and Punctuation Across a Whole Subtitle File"
description: "Lowercase cues, missing periods, and ASR homophone errors make a subtitle file look unprofessional and fail client style checks. Here is how to normalize caption text without breaking timing."
tags:
  - Subtitles
  - Grammar
  - QC
  - Formatting
  - Workflow
---

# Fixing Capitalization and Punctuation Across a Whole Subtitle File

You open the exported SRT and cue 1 already hurts: `and welcome back to the show`. Cue 47 has `its a great day`. Cue 203 ends mid-thought with no period. The timing is usable. The **text** looks like a raw ASR dump — because it is.

Client style guides care about caption **text** as much as timecodes. A file with perfect CPS but lowercase sentences reads as unfinished. Marketplace QC teams flag it under "formatting" or "grammar" even when the words are right.

This is tedious at five cues. At **eight hundred**, it is a weekend unless you approach it systematically.

---

## What "grammar" means in subtitle context (vs transcript grammar)

Transcript grammar rules cover speakers, verbatim mode, and paragraph structure. **Subtitle grammar** in QC usually means:

- Sentence-initial capitalization
- Terminal punctuation on complete thoughts (with exceptions for trailing ellipses and hard cuts)
- Correct homophones (`their` / `there`, `its` / `it's`)
- Consistent spelling locale (US vs UK)
- Preserved **line breaks** that were intentional for readability

It does **not** mean rewriting casual speech into formal prose. "Gonna" stays if the brief says verbatim. You fix errors, not register.

---

## Common ASR text failures

| Pattern | Example | Fix type |
|---------|---------|----------|
| Lowercase cue start | `we left at noon` | Capitalize first grapheme |
| Missing terminal punct | `See you tomorrow` | Add `.` unless style forbids |
| Homophone | `Your going to love it` | Spelling correction |
| Double spaces / odd whitespace | `Wait  here` | Normalize spaces |
| Broken proper nouns | `johnson said` | Title case per client list |
| Speaker label bleed | `SPEAKER_00 um hello` | Label cleanup, not dialogue rewrite |

Sound effects and music cues `[APPLAUSE]` often stay uppercase by convention — check the brief before sentence-casing them.

---

## Manual pass workflow

### Step 1: Normalize encoding and line endings

UTF-8 without BOM, Unix `\n`. Windows Notepad has destroyed many delivery files.

### Step 2: Decide rules in writing

One-page cheat sheet for the project:

- Terminal period on every cue ending a sentence? (Netflix often yes for translation; dialogue rules vary.)
- Ellipsis character `…` vs three ASCII dots?
- Comma before name in vocative?

Apply the same rules to cue 1 and cue 900.

### Step 3: Regex helpers (careful)

Capitalize after period-space within a cue:

```
Find: (?<=[.!?]\s+)([a-z])
Replace: \U\1
```

This misses proper nouns and breaks `i` → `I` only if you add a word list. Regex alone is insufficient for homophones.

### Step 4: Homophones and spelling

Run a spell checker **per cue** in a subtitle-aware editor, or export to a table, fix, and merge back — merge carefully so row order never drifts from timestamps.

### Step 5: Speaker labels

If labels live inside text (`>> John:`), normalize casing on names but do not strip the marker unless the client wants burnt-in style removed from the file.

---

## Why you cannot treat subtitles like Word docs

- **Length sensitivity** — adding `"` or expanding `it's` changes character count and can trigger CPS failures.
- **Line breaks matter** — reflowing a cue changes CPL and on-screen layout.
- **Timing is sacred** — grammar fixes must not split or merge cues unless you also adjust timecodes.

A grammar pass that rephrases "We are going to the store" → "We're heading to the store" might be shorter and **increase** CPS in a tight window. Good subtitle grammar correction preserves **approximate length**.

---

## Batch capitalization without breaking timing

For pure casing and terminal punctuation (no homophones), a deterministic script works:

```python
def normalize_cue(text: str) -> str:
    text = " ".join(text.split())
    if not text:
        return text
    text = text[0].upper() + text[1:]
    if text[-1] not in ".!?…":
        text += "."
    return text
```

That fixes `and welcome back` → `And welcome back.` It does **not** fix `its` → `it's`. Homophones need context — human or model-assisted.

---

## When a manual grammar pass stops scaling

At **300+ cues**, spell-check export loops and regex edge cases eat more time than the original transcription QA. Homophone errors cluster in proper-noun-heavy content (legal, medical) where dumb rules fail.

Model-assisted correction can process batches if constrained: **fix spelling and punctuation only, do not rephrase, keep similar length**. Always diff the output — misaligned cue counts mean the file is trash.

For a full-file pass that respects cue boundaries, upload the SRT or VTT to the [subtitle grammar fixer](https://videotext.io/subtitle-grammar-fixer) with **Grammar fix** enabled (alongside timing/CPL options if those failed too). The pipeline applies spelling, homophone, casing, and punctuation fixes per cue while keeping line length close to the original so timestamps stay stable. Review a random 20-cue sample against the brief; spot-fix proper nouns the model could not know.

---

## QC checklist after bulk grammar fix

1. **Cue count unchanged** — same number of indices as input.
2. **No merged cues** — two sentences still two cues unless you intentionally merged.
3. **CPS re-scan** — punctuation added length; re-run reading-speed report.
4. **Client proper-noun list** — brand names and witness names manually verified.
5. **Forced narrative and songs** — confirm uppercase conventions still match spec.

---

## Bottom line

Capitalization and punctuation errors are **visible** quality signals. Clients infer care from the first cue. Manual fixes work on short files; long files need batch tooling that respects subtitle constraints — length, line breaks, and timing — not a generic grammar checker.

Fix the text like a subtitler, not like an essay editor. Then validate CPS again before you send.
