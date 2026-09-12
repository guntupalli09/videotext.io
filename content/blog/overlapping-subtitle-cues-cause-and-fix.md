---
slug: overlapping-subtitle-cues-cause-and-fix
title: "Overlapping Subtitle Cues: The Cause, and How to Clean 200 of Them at Once"
description: "When cue 87 ends after cue 88 starts, players stack lines and platform validators fail the upload. Learn why overlaps appear and how to bulk-fix them without hand-editing every timestamp."
tags:
  - Subtitles
  - SRT
  - Timing
  - QC
  - Workflow
---

# Overlapping Subtitle Cues: The Cause, and How to Clean 200 of Them at Once

You run the validator and get **214 errors**. Same message on every row: *overlapping with next subtitle*. The dialogue is fine. The translations are approved. But the upload button stays grey until the timecodes make sense.

Overlaps are the most mechanical failure in caption QC — and the most tedious to fix one cue at a time.

---

## What an overlap actually is

In SRT and WebVTT, each cue has a start time and an end time. An **overlap** exists when:

```
cue N end time  >  cue N+1 start time
```

Example:

```
87
00:04:12,400 --> 00:04:15,900
We should leave before the storm hits.

88
00:04:15,200 --> 00:04:18,100
The road closes at six.
```

Cue 87 ends at 15.900 s but cue 88 starts at 15.200 s — 700 ms of double display. VLC stacks both lines. Netflix QC rejects the package. YouTube often accepts it but viewers see a flash of unreadable text.

Players differ in how they render overlaps; validators agree they are invalid.

---

## Why overlaps show up in otherwise good files

### Auto-caption exports

YouTube, Zoom, and Descript exports frequently assign the next cue to start when speech **begins**, while the previous cue still holds until speech **ends**. On fast exchanges, overlaps are the default.

### Translation expansion

German or Finnish translations run longer in the same window. Editors extend end times without checking the next cue's in-point.

### Merge operations

Combining two SRTs (main + forced narrative) or concatenating episodic files without re-indexing leaves duplicate index numbers and crossed times.

### Manual "fix" that over-extends

Extending a cue to fix CPS without trimming the neighbor creates a new overlap downstream — a chain reaction through act two.

### Frame rounding

Converting between comma decimals (SRT) and period decimals (VTT) plus frame snapping at 23.976 can nudge an end time one frame past the next start.

---

## Manual cleanup (small files)

For **under twenty overlaps**, hand repair in Subtitle Edit or Aegisub is reasonable:

1. Sort cues by start time (not index number — merges often scramble indices).
2. For each pair where `end > next start`, set `end = next start − 100 ms` (one frame at 24 fps ≈ 42 ms; 100 ms is a safe readable gap).
3. Guard against **negative duration**: if trimming makes `end ≤ start`, shorten the text or split the cue instead of crushing timing.
4. Re-run validation.

Keyboard-heavy editors expose "Fix overlaps" macros — usually the same trim rule applied row by row.

---

## Bulk repair on long files

Above **fifty overlaps**, manual work is error-prone. A 45-minute documentary with 900 cues can hide overlaps in the middle that you will not see until spot-checking at 1.25× speed.

### Script approach (DIY)

A Python loop over parsed cues:

```python
for i in range(len(cues) - 1):
    if cues[i].end > cues[i + 1].start:
        cues[i].end = cues[i + 1].start - 0.1
        if cues[i].end <= cues[i].start:
            cues[i].end = cues[i].start + 0.5
```

That mirrors what most repair tools do: **trim the earlier cue**, preserve the later in-point, enforce a minimum 0.5 s duration when possible.

Edge case: if the overlap is huge because a cue was duplicated, trimming alone leaves garbage text — delete or merge duplicates first.

### Spreadsheet traps

Excel will "helpfully" convert `00:04:15,900` into a time value and destroy the file. Use dedicated subtitle tools or code, not cells.

---

## When trimming overlaps breaks reading speed

Shrinking cue 87's end time fixes the overlap but can push **CPS** (characters per second) over platform limits if the line is long and the window is now shorter. The validator passes overlaps but fails reading speed — or the opposite, if you extend durations to fix CPS and recreate overlaps.

The fix order matters:

1. Remove overlaps (structural validity).
2. Extend durations where CPS fails **and** the next cue allows room.
3. Wrap long lines (CPL) if single-row character limits fail.

Doing step 3 before step 1 hides overlaps inside wrapped rows.

At scale, walking that sequence on 200 cues is exactly the kind of repetitive pass machines handle well. Upload the overlapping SRT to the [subtitle grammar fixer](https://videotext.io/subtitle-grammar-fixer): overlaps are repaired automatically; turn on **Fix timing** if the trim creates unreadably fast cues; turn on **Line breaks (CPL)** if rows exceed 42 characters. Download and re-validate — you should see zero overlap errors and a separate CPS report to spot-check.

---

## QA after bulk fix

Automated trim is conservative — it will not rewrite dialogue. Still verify:

- **Fast dialogue** — overlaps often cluster in arguments; watch one minute unmuted.
- **Forced narratives** — if you merged streams, confirm no cue was trimmed mid-thought into nonsense.
- **Burned-in delivery** — re-burn a 30 s sample; stacked pixels are harder to undo than stacked SRT rows.

---

## Prevention

- Export from transcription tools with **gap** or **minimum display** settings when available.
- After translation, run overlap scan **before** client review — not after approval.
- Treat merge scripts as production code; test on a two-cue sample before running on season bundles.

Two hundred overlaps is not a creative problem. It is a clock hygiene problem. Fix the clocks in bulk, then spend your attention on the lines that actually need a human ear.
