/**
 * Deterministic SMPTE timecode arithmetic (BITC-style HH:MM:SS:FF / HH:MM:SS;FF).
 *
 * Built to fix the exact failure a tester (Brian) hit in ExpressScribe: burned-in
 * timecode drifting the further into a file you go (19:59:34:16 shown as
 * 19:59:36:10). That class of bug comes from either (a) re-deriving timecode by
 * repeatedly accumulating floating-point seconds, or (b) not implementing real
 * SMPTE drop-frame compensation for 29.97/59.94fps. Every function here works in
 * integer frame counts derived once — never re-accumulated floats.
 *
 * Convention: ":" separates a non-drop-frame FF field, ";" a drop-frame one —
 * standard SMPTE notation. addAnchorTimecode() decodes the anchor to a true
 * (gap-free) elapsed-frame count regardless of which notation it's written in,
 * adds the offset in real frames, then re-encodes for display in the anchor's
 * own notation — so a drop-frame anchor round-trips correctly instead of
 * silently being read as if no frames were ever dropped (which is exactly the
 * kind of error that produces ExpressScribe-style drift).
 *
 * Never wired into the guideline-formatting LLM step — this stays a deterministic
 * post-processing step over real ASR segment offsets, same guarantee already
 * enforced structurally for caption timing (see guidelineEnforcer.ts).
 */

/** Frame rates where SMPTE drop-frame compensation applies (NTSC-derived). */
const DROP_FRAME_RATES = new Set([29.97, 59.94])

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function isDropFrameEligible(fps: number): boolean {
  return DROP_FRAME_RATES.has(round2(fps))
}

/** Nominal integer frame rate used for frame-count math (29.97 -> 30, 59.94 -> 60, others unchanged). */
function nominalFps(fps: number): number {
  const r = round2(fps)
  if (r === 29.97) return 30
  if (r === 59.94) return 60
  return Math.round(fps)
}

/**
 * Elapsed real (wall-clock) seconds -> a real (gap-free) frame count. Rounds
 * once. Uses the true fps (e.g. 29.97), not the nominal integer rate — at
 * 29.97fps only ~107,892 frames actually occur in a real hour, not 108,000;
 * using the nominal rate here is exactly the kind of rounding error that
 * produces ExpressScribe-style drift over a long file.
 */
export function secondsToFrameCount(seconds: number, fps: number): number {
  return Math.round(seconds * fps)
}

/**
 * Encode: a real (gap-free) frame count -> the "display" frame count whose
 * div/mod-by-fps gives the correct drop-frame HH:MM:SS:FF. Classic SMPTE
 * drop-frame algorithm (Duncan): every 10-minute block skips 2 frame numbers
 * at the start of 9 of its 10 minutes (the block's first minute is exempt).
 */
export function encodeDropFrameDisplayCount(realFrameCount: number, fps: number): number {
  if (!isDropFrameEligible(fps)) return realFrameCount
  const nfps = nominalFps(fps)
  const dropFrames = 2
  const framesPer10Minutes = nfps * 600 - dropFrames * 9
  const framesPerMinuteAfterDrop = nfps * 60 - dropFrames

  const d = Math.floor(realFrameCount / framesPer10Minutes)
  const m = realFrameCount % framesPer10Minutes

  const extraDropped =
    m > dropFrames ? dropFrames * Math.floor((m - dropFrames) / framesPerMinuteAfterDrop) : 0

  return realFrameCount + dropFrames * 9 * d + extraDropped
}

/**
 * Decode: a drop-frame-displayed HH:MM:SS;FF (already parsed into parts) -> the
 * true (gap-free) elapsed-frame count. Inverse of encodeDropFrameDisplayCount.
 */
function decodeDropFrameDisplayCount(hh: number, mm: number, ss: number, ff: number, fps: number): number {
  const nfps = nominalFps(fps)
  const dropFrames = 2
  const naive = (hh * 3600 + mm * 60 + ss) * nfps + ff
  const totalMinutes = 60 * hh + mm
  return naive - dropFrames * (totalMinutes - Math.floor(totalMinutes / 10))
}

/** Formats a display frame count (already encoded for drop-frame, if applicable) as HH:MM:SS:FF / HH:MM:SS;FF. */
export function frameCountToTimecode(displayFrameCount: number, fps: number, dropFrame: boolean): string {
  const nfps = nominalFps(fps)
  const frames = ((displayFrameCount % nfps) + nfps) % nfps
  const totalSeconds = Math.floor(displayFrameCount / nfps)
  const s = totalSeconds % 60
  const m = Math.floor(totalSeconds / 60) % 60
  const h = Math.floor(totalSeconds / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}${dropFrame ? ';' : ':'}${pad(frames)}`
}

/**
 * Parses "HH:MM:SS:FF" (non-drop) or "HH:MM:SS;FF" (drop-frame) into a true
 * (gap-free) elapsed-frame count at fps, correctly decoding drop-frame notation
 * rather than reading it as a literal naive frame index.
 */
export function timecodeToFrameCount(timecode: string, fps: number): number {
  const m = timecode.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})([:;])(\d{1,2})$/)
  if (!m) throw new Error(`Invalid timecode: "${timecode}"`)
  const [, hh, mm, ss, sep, ff] = m
  const h = parseInt(hh, 10)
  const min = parseInt(mm, 10)
  const s = parseInt(ss, 10)
  const f = parseInt(ff, 10)
  if (sep === ';' && isDropFrameEligible(fps)) {
    return decodeDropFrameDisplayCount(h, min, s, f, fps)
  }
  return (h * 3600 + min * 60 + s) * nominalFps(fps) + f
}

/**
 * The core operation: given an anchor BITC (the video's starting timecode) and a
 * real ASR segment offset in elapsed seconds from that anchor, returns the
 * segment's BITC, in the same drop/non-drop notation as the anchor. Both the
 * anchor and the offset are converted to true elapsed-frame counts exactly
 * once and summed as integers — this never re-accumulates floating-point
 * seconds, which is the root cause of ExpressScribe-style drift.
 */
export function addAnchorTimecode(anchorTimecode: string, fps: number, offsetSeconds: number): string {
  const anchorIsDropFrame = anchorTimecode.trim().includes(';') && isDropFrameEligible(fps)
  const anchorRealFrames = timecodeToFrameCount(anchorTimecode, fps)
  const offsetFrames = secondsToFrameCount(offsetSeconds, fps)
  const totalRealFrames = anchorRealFrames + offsetFrames
  const displayFrames = anchorIsDropFrame
    ? encodeDropFrameDisplayCount(totalRealFrames, fps)
    : totalRealFrames
  return frameCountToTimecode(displayFrames, fps, anchorIsDropFrame)
}
