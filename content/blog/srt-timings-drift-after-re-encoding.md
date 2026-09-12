---
slug: srt-timings-drift-after-re-encoding
title: "Your SRT Timings Drift After Re-Encoding — Why It Happens and the Two-Minute Fix"
description: "Re-encoded video often leaves subtitle cues early or late by seconds. Here is why drift appears after export, how to spot it quickly, and how to repair an SRT without re-transcribing."
tags:
  - Subtitles
  - SRT
  - Timing
  - Workflow
  - QC
---

# Your SRT Timings Drift After Re-Encoding — Why It Happens and the Two-Minute Fix

The video looks fine. The captions look fine in the editor. Then you mux the new H.264 export, press play, and the subs are **half a second early** — then **two seconds late** by the ten-minute mark. You did not change a single line of dialogue. The file just drifted.

That mismatch is one of the most common reasons a finished SRT gets rejected minutes before delivery. It is also one of the easiest to misdiagnose, because the text itself is perfect.

---

## What "drift" looks like in a real SRT

Drift is cumulative misalignment between cue times and the audio in the **final** video file — not the rough cut you timed against.

Typical symptoms:

- Cues feel correct for the first minute, then progressively slip.
- A single section jumps backward or forward after a hard cut (often an ad break or B-roll insert).
- Every cue is off by the same constant offset (e.g. always 300 ms early) — that is offset, not drift, but teams often lump them together.
- The player shows overlapping lines even though the SRT looked clean in a text editor — sometimes drift creates artificial overlaps when a later section catches up.

Open the SRT in any editor and scrub the **exported** MP4 side by side. If the error grows over time, you are dealing with drift. If it is uniform, measure one cue against the waveform and note the delta.

---

## Why re-encoding changes subtitle timing

### Frame rate and timebase mismatches

Subtitles store absolute times (`00:12:34,567`). Video encoders work in **frames** and **timebases**. When the export frame rate differs from the sequence you timed against — 23.976 vs 24, or 29.97 vs 30 — some pipelines round frame boundaries differently on each pass. A few milliseconds per cut adds up across a forty-minute file.

### Start-time offset (leader / black / slate)

Many encoders insert leader frames or trim the first GOP differently than your NLE preview. If the SRT was timed to timecode zero but the delivered MP4 starts at 00:00:01:00 because of a slate, every cue looks early until you shift the whole file.

### Variable frame rate (VFR) phone footage

Mobile and screen recordings often arrive as VFR. Players stretch time during playback. Subtitles timed on a constant-frame-rate proxy will not match the final VFR upload to YouTube or Vimeo.

### Muxing and container edits

Re-wrapping MKV → MP4, stripping an audio track, or replacing AAC can shift the presentation timestamp if the tool re-stamps packets. The video **looks** identical; the clock underneath is not.

### Chunked transcription exports

If the SRT came from AI transcription assembled in 30-second chunks, small alignment errors at chunk joins can look like localized drift. Re-encoding does not cause that — but re-export often coincides with the first full watch, so teams blame the encoder when the root issue was assembly.

---

## Manual fixes (when you have time)

### 1. Constant offset — shift everything

If every cue is early or late by the same amount:

1. Note the delta on one reliable cue (waveform spike ↔ subtitle in-point).
2. Add or subtract that delta from **all** timestamps.

In `ffmpeg`, a uniform shift of +350 ms:

```bash
ffmpeg -i input.srt -c copy -muxpreload 0 -muxdelay 0 -output_ts_offset 0.350 output.srt
```

Many desktop subtitle editors expose "Shift all cues" with the same math. This takes minutes when the error is uniform.

### 2. Localized jump after a cut

Find the scene boundary where sync breaks. Split the file into two segments in your editor, shift only the second segment, and merge. Document the cut time so the next revision is faster.

### 3. Frame-rate normalization

Re-export the video at a **constant** frame rate that matches your delivery spec before re-timing. Prevention beats repair: lock CFR early in the project.

### 4. Re-time from scratch (last resort)

If drift is non-linear and the deadline allows, re-spot critical sections against the final mux. Reserve this for broadcast or legal deliverables where frame accuracy is contractual.

---

## When manual shifting stops scaling

Uniform offset is quick. **Non-linear drift** — creeping error across hundreds of cues, or multiple jump points after ad inserts — turns into an afternoon of nudging rows in Aegisub or Subtitle Edit. At that point you are doing data entry, not QC.

You still need a structurally valid file: overlaps introduced by manual nudges, negative durations from a bad shift, and CPS violations after extending cues to "fix" sync by stretching display time. Those are separate failures platforms catch on upload.

That is the handoff where an automated repair pass helps: upload the drifted SRT, let the scanner trim overlaps, extend unreadably short cues, and wrap long lines — then spot-check five anchor points in the final video instead of every row.

For a one-file rescue without rebuilding from transcription, use the [subtitle grammar fixer](https://videotext.io/subtitle-grammar-fixer) on the exported SRT: upload, enable **Fix timing** for overlap and reading-speed repairs, download, and re-mux against the same MP4 you will deliver. You keep your text edits; the tool handles the mechanical timestamp hygiene.

---

## Prevention checklist for the next project

1. **Time against the file you will ship** — not the proxy, not the Zoom recording, not the first assembly.
2. **Lock CFR** before the first caption pass on social/mobile sources.
3. **Note timecode start** if the client player applies an offset (many LMS players add preroll).
4. **Keep a checksum cue** — one line with a sharp audio transient (door slam, clap) — and re-check it after every encode.
5. **Validate before handoff** — run CPS/CPL and overlap scans; drift often creates overlaps at the tail of a file.

---

## Bottom line

Re-encoding does not "break" subtitles magically — it exposes mismatches between the clock your cues were written on and the clock in the delivered container. Constant offset is a five-minute shift. Creeping drift needs either segmented manual work or a automated structural pass plus spot verification.

Catch it on the exported master, not in the client's QC inbox.
