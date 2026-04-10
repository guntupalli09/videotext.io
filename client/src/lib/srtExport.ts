/**
 * Client-side SRT/VTT export from segments. No server round-trip.
 */
export interface Segment {
  start: number
  end: number
  text: string
  /** Resolved speaker display name (already mapped via speakerNameMap). Present only when diarization was enabled. */
  speaker?: string
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

/** Returns true when at least 2 segments carry distinct speaker values. */
function hasMultipleSpeakers(segments: Segment[]): boolean {
  const seen = new Set<string>()
  for (const s of segments) {
    if (s.speaker) seen.add(s.speaker)
    if (seen.size >= 2) return true
  }
  return false
}

/**
 * Converts segments to SRT format.
 * When segments carry a resolved `speaker` field AND there are multiple distinct
 * speakers, each cue is prefixed with `[SpeakerName]: `.
 */
export function segmentsToSrt(segments: Segment[]): string {
  const addSpeaker = hasMultipleSpeakers(segments)
  return segments
    .map((seg, i) => {
      const start = formatSrtTime(seg.start)
      const end = formatSrtTime(seg.end)
      const text = seg.text.trim() || ' '
      const line = addSpeaker && seg.speaker ? `[${seg.speaker}]: ${text}` : text
      return `${i + 1}\n${start} --> ${end}\n${line}\n`
    })
    .join('\n')
}

/**
 * Converts segments to WebVTT format.
 * When segments carry a resolved `speaker` field AND there are multiple distinct
 * speakers, each cue uses the native VTT voice tag `<v SpeakerName>`.
 */
export function segmentsToVtt(segments: Segment[]): string {
  const addSpeaker = hasMultipleSpeakers(segments)
  const header = 'WEBVTT\n\n'
  const body = segments
    .map((seg) => {
      const start = formatVttTime(seg.start)
      const end = formatVttTime(seg.end)
      const text = seg.text.trim() || ' '
      const line = addSpeaker && seg.speaker ? `<v ${seg.speaker}>${text}` : text
      return `${start} --> ${end}\n${line}\n`
    })
    .join('\n')
  return header + body
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
