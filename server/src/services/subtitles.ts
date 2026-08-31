import 'dotenv/config'
import OpenAI from 'openai'
import { SubtitleEntry, parseSRT, parseVTT, toSRT, toVTT, detectSubtitleFormat } from '../utils/srtParser'
import { getLogger } from '../lib/logger'

const subtitlesLog = getLogger('worker')

// Constructed lazily (only when grammarFix actually runs, and only once a key is confirmed
// present) — the OpenAI SDK throws synchronously in its constructor when no API key is
// available anywhere, and this module is imported by the worker's core subtitle pipeline,
// so an eager `new OpenAI()` here would crash subtitle validation/fixing entirely in any
// environment without OPENAI_API_KEY set, not just disable the AI grammar pass.
let openaiClient: OpenAI | null = null
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

export interface SubtitleIssue {
  type: 'overlap' | 'long_line' | 'fast_reading' | 'invalid_timing' | 'large_gap'
  index: number
  message: string
}

/** Phase 1B — UTILITY 2E: Validation warning (informational only, no blocking). */
export interface SubtitleWarning {
  type: string
  message: string
  line?: number
}

/** Phase 1B — UTILITY 2D: Lightweight timing normalization. Offset (+/- ms), clamp long durations. No text change. */
const DEFAULT_MAX_DURATION_SEC = 10
const MIN_DURATION_SEC = 0.5

export function normalizeTimingOnly(
  entries: SubtitleEntry[],
  offsetMs: number = 0,
  maxDurationSec: number = DEFAULT_MAX_DURATION_SEC
): SubtitleEntry[] {
  const offsetSec = offsetMs / 1000
  const result: SubtitleEntry[] = entries.map((e, i) => ({
    index: i + 1,
    startTime: Math.max(0, e.startTime + offsetSec),
    endTime: Math.max(0, e.endTime + offsetSec),
    text: e.text,
  }))

  for (let i = 0; i < result.length; i++) {
    let duration = result[i].endTime - result[i].startTime
    if (duration > maxDurationSec) {
      result[i].endTime = result[i].startTime + maxDurationSec
      duration = maxDurationSec
    }
    if (duration < MIN_DURATION_SEC) {
      result[i].endTime = result[i].startTime + MIN_DURATION_SEC
    }
  }

  for (let i = 0; i < result.length - 1; i++) {
    if (result[i].endTime > result[i + 1].startTime) {
      result[i].endTime = result[i + 1].startTime - 0.1
      if (result[i].endTime <= result[i].startTime) {
        result[i].endTime = result[i].startTime + MIN_DURATION_SEC
      }
    }
  }

  return result
}

/** Phase 1B — UTILITY 2E: Validation only. Returns warnings; does not modify. */
const LINE_LENGTH_THRESHOLD = 42
const READING_SPEED_CHARS_PER_SEC = 21

export function validateSubtitleEntries(entries: SubtitleEntry[]): { warnings: SubtitleWarning[] } {
  const warnings: SubtitleWarning[] = []
  const sorted = [...entries].sort((a, b) => a.startTime - b.startTime)

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    const lineNum = e.index

    if (e.text.length > LINE_LENGTH_THRESHOLD) {
      warnings.push({
        type: 'long_line',
        message: `Line longer than ${LINE_LENGTH_THRESHOLD} characters (${e.text.length})`,
        line: lineNum,
      })
    }

    const duration = e.endTime - e.startTime
    if (duration > 0 && e.text.length / duration > READING_SPEED_CHARS_PER_SEC) {
      warnings.push({
        type: 'reading_speed',
        message: `Reading speed may be too high (${(e.text.length / duration).toFixed(0)} chars/s)`,
        line: lineNum,
      })
    }

    if (i < sorted.length - 1 && e.endTime > sorted[i + 1].startTime) {
      warnings.push({
        type: 'overlap',
        message: 'Overlapping with next subtitle',
        line: lineNum,
      })
    }
  }

  return { warnings }
}

export function validateAgainstSceneCuts(entries: SubtitleEntry[], cutTimestamps: number[]): SubtitleWarning[] {
  if (!cutTimestamps.length) return []
  const warnings: SubtitleWarning[] = []
  for (const e of entries) {
    const cut = cutTimestamps.find(t => t > e.startTime && t < e.endTime)
    if (cut) {
      warnings.push({
        type: 'scene_cut',
        message: `Subtitle ${e.index} spans a scene cut at ${cut.toFixed(2)}s — consider splitting or retiming`,
        line: e.index,
      })
    }
  }
  return warnings
}

export function validateSubtitleFile(filePath: string): { warnings: SubtitleWarning[] } {
  const format = detectSubtitleFormat(filePath)
  const entries = format === 'srt' ? parseSRT(filePath) : parseVTT(filePath)
  return validateSubtitleEntries(entries)
}

export interface FixSubtitleIssuesOptions {
  /** Resolve overlapping cues by trimming the earlier cue's end time. Default true — overlap always produces an invalid file, so this is a structural fix rather than an opt-in style choice. */
  applyOverlapFix?: boolean
  /** Split lines over 42 characters. Only applied when the caller opts in (the "Line breaks (CPL)" checkbox). */
  applyLineBreakFix?: boolean
  /** Extend/clamp cue duration for invalid (<=0) or too-fast reading speed. Only applied when the caller opts in (the "Fix timing" checkbox). */
  applyTimingFix?: boolean
}

/**
 * Detect and fix subtitle issues. Issues are always detected and reported regardless of
 * options so the findings panel stays accurate; `options` controls which categories are
 * actually mutated in `fixed`, so an unchecked "Fix timing"/"Line breaks" box genuinely
 * means that category of change is not applied to the downloaded file.
 */
export function fixSubtitleIssues(
  entries: SubtitleEntry[],
  options: FixSubtitleIssuesOptions = {}
): { fixed: SubtitleEntry[]; issues: SubtitleIssue[] } {
  const applyOverlapFix = options.applyOverlapFix ?? true
  const applyLineBreakFix = options.applyLineBreakFix ?? true
  const applyTimingFix = options.applyTimingFix ?? true

  const issues: SubtitleIssue[] = []
  const fixed: SubtitleEntry[] = [...entries]

  // Sort by start time
  fixed.sort((a, b) => a.startTime - b.startTime)

  // 1. Overlapping timestamps — always resolved; an overlap is a malformed file, not a style choice.
  for (let i = 0; i < fixed.length - 1; i++) {
    if (fixed[i].endTime > fixed[i + 1].startTime) {
      issues.push({
        type: 'overlap',
        index: fixed[i].index,
        message: `Overlapping with next subtitle`,
      })
      if (applyOverlapFix) {
        // Fix: Set endTime to startTime of next - 0.1 seconds
        fixed[i].endTime = fixed[i + 1].startTime - 0.1
        if (fixed[i].endTime <= fixed[i].startTime) {
          fixed[i].endTime = fixed[i].startTime + 0.5 // Minimum 0.5s display
        }
      }
    }
  }

  // 2. Lines longer than 42 characters (YouTube limit)
  for (let i = 0; i < fixed.length; i++) {
    const entry = fixed[i]
    if (entry.text.length > 42) {
      issues.push({
        type: 'long_line',
        index: entry.index,
        message: `Line too long (${entry.text.length} characters)`,
      })

      if (applyLineBreakFix) {
        entry.text = wrapToMaxLineLength(entry.text, 42)
      }
    }
  }

  // 3. Invalid (<=0) or too-fast reading speed
  for (let i = 0; i < fixed.length; i++) {
    const entry = fixed[i]
    const duration = entry.endTime - entry.startTime

    if (duration <= 0) {
      issues.push({
        type: 'invalid_timing',
        index: entry.index,
        message: `Invalid timing: end time is before or equal to start time (${duration.toFixed(1)}s) — corrected to a readable duration`,
      })
      if (applyTimingFix) {
        const minEndTime = entry.startTime + 1.5
        const maxEndTime = i < fixed.length - 1 ? fixed[i + 1].startTime - 0.1 : minEndTime
        entry.endTime = Math.max(entry.startTime + 0.5, Math.min(minEndTime, maxEndTime))
      }
      continue
    }

    if (duration < 1.5 && entry.text.length > 20) {
      issues.push({
        type: 'fast_reading',
        index: entry.index,
        message: `Reading speed too fast (${duration.toFixed(1)}s for ${entry.text.length} chars)`,
      })

      if (applyTimingFix) {
        // Extend endTime to ensure minimum 1.5s display
        const minEndTime = entry.startTime + 1.5
        if (entry.endTime < minEndTime) {
          // Check if next subtitle allows extension
          if (i < fixed.length - 1) {
            const maxEndTime = fixed[i + 1].startTime - 0.1
            entry.endTime = Math.min(minEndTime, maxEndTime)
          } else {
            entry.endTime = minEndTime
          }
        }
      }
    }
  }

  // 4. Detect large gaps (never auto-fixed — inserting a cue would invent content — just reported)
  for (let i = 0; i < fixed.length - 1; i++) {
    const gap = fixed[i + 1].startTime - fixed[i].endTime
    if (gap > 5) {
      issues.push({
        type: 'large_gap',
        index: fixed[i].index,
        message: `Large gap of ${gap.toFixed(1)}s before next subtitle`,
      })
    }
  }

  // Re-index entries
  fixed.forEach((entry, index) => {
    entry.index = index + 1
  })

  return { fixed, issues }
}

/**
 * Word-wrap text into lines no longer than maxLen, breaking at spaces. Unlike a single
 * two-way split, this handles arbitrarily long lines (e.g. run-on cues) by wrapping as
 * many times as needed instead of leaving a still-too-long second half.
 */
function wrapToMaxLineLength(text: string, maxLen: number): string {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
    } else if ((current + ' ' + word).length <= maxLen) {
      current += ' ' + word
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  // A single word longer than maxLen can't be broken at a space — leave it, rather than
  // mid-word-hyphenating text we didn't write.
  return lines.join('\n')
}

export interface FixSubtitleOptions {
  fixTiming?: boolean
  timingOffsetMs?: number
  grammarFix?: boolean
  lineBreakFix?: boolean
  removeFillers?: boolean
}

/** Filler words/phrases to remove when removeFillers is true. Case-insensitive, whole-word. */
const FILLER_PATTERN = /\b(um|uh|hmm|hm|er|ah|like|you know|basically|actually|literally|so\s+|well\s+|just\s+|really\s+|right\s+|i mean|kind of|sort of)\b/gi

function removeFillerWordsFromEntries(entries: SubtitleEntry[]): SubtitleEntry[] {
  const result: SubtitleEntry[] = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    let text = e.text
      .replace(FILLER_PATTERN, ' ')
      // Filler words are usually comma-bounded in real transcripts ("Um, so, ...").
      // Removing just the word leaves orphaned punctuation (", so, , this is, ,"),
      // so clean up doubled/leading/trailing commas left behind by the removal.
      .replace(/,(\s*,)+/g, ',')
      .replace(/\s+,/g, ',')
      .replace(/^[\s,]+/, '')
      .replace(/[\s,]+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) {
      // Empty after removal: merge timing into previous or next
      if (result.length > 0) {
        result[result.length - 1].endTime = e.endTime
      }
      continue
    }
    result.push({ ...e, text, index: result.length + 1 })
  }
  return result
}

/**
 * Local fallback: normalize casing and punctuation only (no spelling/grammar correction).
 * Used when the AI pass is unavailable or fails, so grammarFix never leaves text untouched.
 */
function grammarAndFormattingFix(entries: SubtitleEntry[]): SubtitleEntry[] {
  return entries.map((e) => {
    let text = e.text.trim()
    if (!text) return { ...e }
    text = text.replace(/\s+/g, ' ')
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1)
      if (!/[.!?]$/.test(text)) text = text + '.'
    }
    return { ...e, text }
  })
}

const GRAMMAR_BATCH_SIZE = 25

/**
 * AI-powered spelling and grammar correction for subtitle cues. Fixes misspellings,
 * homophones (their/there/they're, its/it's), grammar, casing, and punctuation while
 * preserving meaning, register, and approximate length so timing/CPS stays valid.
 * Falls back to the regex-only casing/punctuation pass per-batch on any failure
 * (missing API key, network error, malformed response) so grammarFix never throws
 * and never drops a cue.
 */
export async function aiGrammarSpellingFix(entries: SubtitleEntry[]): Promise<SubtitleEntry[]> {
  if (!entries.length) return entries
  if (!process.env.OPENAI_API_KEY) {
    subtitlesLog.warn({ msg: 'OPENAI_API_KEY not set; falling back to regex grammar fix' })
    return grammarAndFormattingFix(entries)
  }

  const result: SubtitleEntry[] = [...entries]

  for (let i = 0; i < result.length; i += GRAMMAR_BATCH_SIZE) {
    const batch = result.slice(i, i + GRAMMAR_BATCH_SIZE)
    const numbered = batch.map((e, idx) => `${i + idx + 1}. ${e.text.replace(/\n/g, ' ')}`).join('\n')

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Fix spelling, grammar, homophones (their/there/they're, its/it's, your/you're), casing, and punctuation in the following ${batch.length} subtitle lines.

CRITICAL REQUIREMENTS:
- Fix ONLY spelling/grammar/casing/punctuation errors. Do NOT rephrase, summarize, or change meaning or word choice beyond correcting errors.
- Keep each corrected line close in length to the original (this is timed subtitle text — reading speed depends on length).
- Preserve natural spoken register — do not make casual speech overly formal.
- Return EXACTLY ${batch.length} lines, no more, no less, in the same order.
- Format: "1. corrected text" (one per line). No explanations, no extra commentary.

Lines:
${numbered}

Return ALL ${batch.length} corrected lines (1. through ${batch.length}.):`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      })

      let raw = response.choices[0]?.message?.content ?? ''
      raw = raw.replace(/```[\s\S]*?```/g, '').trim()
      const lines = raw.split('\n').filter((l) => l.trim().length > 0)

      const corrected: string[] = []
      for (const line of lines) {
        const m = line.match(/^\s*\d+[.)]\s*(.+)$/)
        corrected.push(m ? m[1].trim() : line.trim())
      }

      if (corrected.length === batch.length && corrected.every((t) => t.length > 0)) {
        for (let j = 0; j < batch.length; j++) {
          result[i + j] = { ...result[i + j], text: corrected[j] }
        }
      } else {
        // Response shape didn't match 1:1 — safer to fall back than risk misaligned cues.
        subtitlesLog.warn({ msg: 'AI grammar fix batch mismatch, falling back to regex pass', expected: batch.length, got: corrected.length })
        for (let j = 0; j < batch.length; j++) {
          result[i + j] = grammarAndFormattingFix([result[i + j]])[0]
        }
      }
    } catch (err) {
      subtitlesLog.warn({ msg: 'AI grammar fix batch failed, falling back to regex pass', error: String(err) })
      for (let j = 0; j < batch.length; j++) {
        result[i + j] = grammarAndFormattingFix([result[i + j]])[0]
      }
    }
  }

  return result
}

/**
 * Parse and fix subtitle file. Phase 1B: optional timing pass, grammar, line-break.
 * Checkbox options (fixTiming/lineBreakFix) gate not just their own pass but also the
 * corresponding category inside fixSubtitleIssues, so an unchecked box genuinely means
 * that category of change isn't applied to the downloaded file — only overlap resolution
 * (which is always required for a valid file) is unconditional.
 */
export async function fixSubtitleFile(
  filePath: string,
  options: FixSubtitleOptions = {}
): Promise<{
  content: string
  format: 'srt' | 'vtt'
  issues: SubtitleIssue[]
  warnings?: SubtitleWarning[]
}> {
  const format = detectSubtitleFormat(filePath)
  let entries = format === 'srt' ? parseSRT(filePath) : parseVTT(filePath)

  let warnings: SubtitleWarning[] = []
  try {
    const val = validateSubtitleEntries(entries)
    warnings = val.warnings
  } catch {
    // Validation failure must not block job
  }

  if (options.fixTiming) {
    entries = normalizeTimingOnly(entries, options.timingOffsetMs ?? 0)
  }
  if (options.removeFillers) {
    entries = removeFillerWordsFromEntries(entries)
  }
  if (options.grammarFix) {
    entries = await aiGrammarSpellingFix(entries)
  }
  const { fixed, issues } = fixSubtitleIssues(entries, {
    applyLineBreakFix: !!options.lineBreakFix,
    applyTimingFix: !!options.fixTiming,
  })

  const content = format === 'srt' ? toSRT(fixed) : toVTT(fixed)
  return { content, format, issues, warnings }
}
