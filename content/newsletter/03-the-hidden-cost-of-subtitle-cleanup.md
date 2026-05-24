---
issue: 3
title: "The Hidden Cost of Subtitle Cleanup"
newsletter: "Beyond ASR"
date: 2026-06-10
status: draft
---

# The Hidden Cost of Subtitle Cleanup

Nobody budgets for subtitle cleanup. It's the cost that eats margin quietly.

---

## The Problem

A transcription job is quoted, scoped, and delivered. The time estimate accounts for transcription and review. It usually doesn't account for the 25–40 minutes spent cleaning up the subtitle output.

Subtitle cleanup is the part of the workflow that everyone does and nobody talks about.

What it looks like in practice:
- Breaking long lines at natural phrase boundaries
- Adjusting reading speed so viewers can follow (150–180 words per minute is the broadcast standard)
- Fixing splits that land mid-word or mid-phrase
- Reformatting timestamps that overlap or have zero gap between segments
- Removing duplicate word repetitions from ASR hallucinations
- Handling multi-speaker segments that got concatenated into a single block

None of this is exotic. It's standard. And it's happening on every subtitle job.

---

## Why Existing Tools Don't Solve It

ASR models output continuous transcription. Converting that into broadcast-quality subtitles requires a second layer of processing: segmentation, timing, and readability enforcement.

Most tools do this automatically and call it done.

Automatic segmentation splits on silence. Silence-based splits frequently violate phrase boundaries. "We are going to" ends up split as:

```
We are going
to make the announcement
```

That reads poorly. A viewer at 1x speed can follow it. A viewer at normal viewing speed — especially a non-native speaker — can't.

Fixing it manually is fast per-line. But a 60-minute video has 800–1,200 subtitle segments. Fix 30% of them manually at 20 seconds per fix: that's 80–120 minutes of cleanup that wasn't scoped.

---

## What Deterministic Segmentation Looks Like

The alternative to silence-based splitting is rule-based segmentation: constraints that enforce phrase boundaries, reading speed limits, character count per line, and minimum gap between segments.

With proper constraints:
- Lines break at natural syntactic boundaries
- Reading speed is enforced before delivery, not after
- Overlapping timestamps are caught automatically
- Segments that are too short or too long are flagged

The cleanup task shrinks dramatically. Not because the AI got better at subtitles. Because the validation layer runs before the file leaves the system.

---

## Tactical Takeaway

Track subtitle cleanup time separately from transcription time on your next five jobs.

If it's averaging more than 20% of total job time, your segmentation defaults are wrong and you're absorbing the cost silently.

The fix is usually constraints, not a better model. Most ASR outputs aren't bad — they're just not formatted for delivery.

---

Subtitle validation is one of the things we built into the QA layer at VideoText.io because we kept seeing agencies absorb cleanup costs they couldn't explain. If this resonates, I'd like to hear what your cleanup burden looks like.

—Santhosh
