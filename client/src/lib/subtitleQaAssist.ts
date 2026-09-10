import type { SubtitleRow } from '../components/SubtitleEditor'
import { msToSrtTime, parseTimeToMs } from './subtitleUtils'

export type AssistIssueType =
  | 'overlap'
  | 'long-line'
  | 'fast-reading'
  | 'empty'
  | 'bad-timing'
  | 'short-duration'
  | 'ai-artifact'
  | 'large-gap'

export interface AssistIssue {
  cueIndex: number
  type: AssistIssueType
  message: string
  severity: 'error' | 'warning'
  /** Safe fixes can be applied automatically; judgment issues need the user. */
  autoFixable: boolean
}

const AI_ARTIFACT_PATTERNS: RegExp[] = [
  /\[inaudible\]/i,
  /\[unintelligible\]/i,
  /\[crosstalk\]/i,
  /\[noise\]/i,
  /\[applause\]/i,
  /\[laughter\]/i,
  /♪/,
  /\b(\w{3,})\s+\1\s+\1\b/i,
]

export function runAssistValidation(rows: SubtitleRow[]): AssistIssue[] {
  const issues: AssistIssue[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const startMs = parseTimeToMs(row.startTime)
    const endMs = parseTimeToMs(row.endTime)
    const durSec = (endMs - startMs) / 1000
    const text = row.text.trim()
    const cueNumber = row.index

    if (!text) {
      issues.push({
        cueIndex: i,
        type: 'empty',
        message: `Cue ${cueNumber}: Empty subtitle text`,
        severity: 'error',
        autoFixable: false,
      })
    }

    if (endMs <= startMs) {
      issues.push({
        cueIndex: i,
        type: 'bad-timing',
        message: `Cue ${cueNumber}: End time is not after start time`,
        severity: 'error',
        autoFixable: false,
      })
    }

    if (durSec < 0.8 && durSec > 0 && text) {
      issues.push({
        cueIndex: i,
        type: 'short-duration',
        message: `Cue ${cueNumber}: Might feel rushed (${durSec.toFixed(2)}s)`,
        severity: 'warning',
        autoFixable: false,
      })
    }

    if (i + 1 < rows.length) {
      const nextStart = parseTimeToMs(rows[i + 1].startTime)
      if (endMs > nextStart) {
        issues.push({
          cueIndex: i,
          type: 'overlap',
          message: `Cue ${cueNumber} overlaps next cue`,
          severity: 'error',
          autoFixable: true,
        })
      }
      const gapSec = (nextStart - endMs) / 1000
      if (gapSec > 4) {
        issues.push({
          cueIndex: i,
          type: 'large-gap',
          message: `Cue ${cueNumber}: ${gapSec.toFixed(1)}s gap to next cue`,
          severity: 'warning',
          autoFixable: false,
        })
      }
    }

    const longestLine = row.text.split('\n').reduce((mx, l) => Math.max(mx, l.length), 0)
    if (longestLine > 42) {
      issues.push({
        cueIndex: i,
        type: 'long-line',
        message: `Cue ${cueNumber}: Line too long for screen`,
        severity: 'warning',
        autoFixable: false,
      })
    }

    const chars = row.text.replace(/\n/g, ' ').length
    const cps = durSec > 0 ? chars / durSec : 0
    if (cps > 21) {
      issues.push({
        cueIndex: i,
        type: 'fast-reading',
        message: `Cue ${cueNumber}: Hard to read at this speed`,
        severity: 'warning',
        autoFixable: false,
      })
    }

    for (const pattern of AI_ARTIFACT_PATTERNS) {
      if (pattern.test(row.text)) {
        issues.push({
          cueIndex: i,
          type: 'ai-artifact',
          message: `Cue ${cueNumber}: Looks like an AI leftover`,
          severity: 'warning',
          autoFixable: false,
        })
        break
      }
    }
  }
  return issues
}

/** Snap overlapping cue ends so timing is continuous without user input. */
export function applySafeAssistFixes(rows: SubtitleRow[]): {
  rows: SubtitleRow[]
  fixedCount: number
} {
  if (rows.length === 0) return { rows, fixedCount: 0 }
  const next = rows.map((r) => ({ ...r }))
  let fixedCount = 0

  for (let i = 0; i < next.length; i++) {
    const trimmed = next[i].text.replace(/[ \t]+$/gm, '').replace(/^\s+|\s+$/g, '')
    if (trimmed !== next[i].text) {
      next[i] = { ...next[i], text: trimmed }
      fixedCount += 1
    }
  }

  for (let i = 0; i < next.length - 1; i++) {
    const endMs = parseTimeToMs(next[i].endTime)
    const nextStart = parseTimeToMs(next[i + 1].startTime)
    if (endMs > nextStart) {
      const clamped = Math.max(parseTimeToMs(next[i].startTime) + 40, nextStart - 40)
      next[i] = { ...next[i], endTime: msToSrtTime(clamped) }
      fixedCount += 1
    }
  }

  return { rows: next, fixedCount }
}

export function summarizeAssist(rows: SubtitleRow[]): {
  safeFixCount: number
  reviewCueCount: number
  reviewIssues: AssistIssue[]
} {
  const issues = runAssistValidation(rows)
  const reviewIssues = issues.filter((i) => !i.autoFixable)
  const reviewCueCount = new Set(reviewIssues.map((i) => i.cueIndex)).size
  const safeFixCount = issues.filter((i) => i.autoFixable).length
  return { safeFixCount, reviewCueCount, reviewIssues }
}
