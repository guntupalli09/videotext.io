/**
 * Index of the segment that should be highlighted at playback time `t` (seconds).
 * Uses [start, end) when `end` is present; otherwise infers boundaries from adjacent segments.
 */
export function getActiveSegmentIndexAtTime(
  segments: { start: number; end?: number }[] | undefined,
  t: number
): number {
  if (!segments?.length) return -1
  if (t < segments[0].start) return -1
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    const inferredEnd =
      s.end ??
      (i < segments.length - 1 ? segments[i + 1].start : Number.POSITIVE_INFINITY)
    if (t >= s.start && t < inferredEnd) return i
  }
  const last = segments.length - 1
  return t >= segments[last].start ? last : -1
}
