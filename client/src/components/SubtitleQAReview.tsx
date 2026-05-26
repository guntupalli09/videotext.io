import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, CheckCircle2,
  Repeat, Download, Eye, EyeOff, X,
} from 'lucide-react'
import type { SubtitleRow } from './SubtitleEditor'
import { parseTimeToMs } from '../lib/subtitleUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubtitleQAReviewProps {
  videoSrc: string | null
  rows: SubtitleRow[]
  onRowsChange: (rows: SubtitleRow[]) => void
  editable: boolean
  onDownloadEdited: () => void
}

interface ParsedCue {
  index: number       // 0-based
  cueNumber: number   // display number (1-based)
  startMs: number
  endMs: number
  startSec: number
  endSec: number
  text: string
  speaker: string | null
}

interface QAIssue {
  cueIndex: number  // 0-based
  type: 'overlap' | 'long-line' | 'fast-reading' | 'empty' | 'bad-timing' | 'short-duration' | 'ai-artifact' | 'large-gap'
  message: string
  severity: 'error' | 'warning'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 96
const OVERSCAN = 6
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

const AI_ARTIFACT_PATTERNS: RegExp[] = [
  /\[inaudible\]/i,
  /\[unintelligible\]/i,
  /\[crosstalk\]/i,
  /\[noise\]/i,
  /\[applause\]/i,
  /\[laughter\]/i,
  /♪/,
  /\b(\w{3,})\s+\1\s+\1\b/i, // triple repeated word
]

const ISSUE_TYPE_LABELS: Record<QAIssue['type'], string> = {
  overlap: 'Overlap',
  'long-line': 'Long line',
  'fast-reading': 'Fast CPS',
  empty: 'Empty',
  'bad-timing': 'Bad timing',
  'short-duration': 'Short',
  'ai-artifact': 'AI artifact',
  'large-gap': 'Gap',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCues(rows: SubtitleRow[]): ParsedCue[] {
  return rows.map((row, i) => {
    const startMs = parseTimeToMs(row.startTime)
    const endMs = parseTimeToMs(row.endTime)
    const speakerMatch = row.text.match(/^\[([^\]]+)\]:\s*/)
    return {
      index: i,
      cueNumber: row.index,
      startMs,
      endMs,
      startSec: startMs / 1000,
      endSec: endMs / 1000,
      text: speakerMatch ? row.text.slice(speakerMatch[0].length) : row.text,
      speaker: speakerMatch ? speakerMatch[1] : null,
    }
  })
}

function runValidation(cues: ParsedCue[]): QAIssue[] {
  const issues: QAIssue[] = []
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i]
    const durSec = (c.endMs - c.startMs) / 1000

    if (!c.text.trim())
      issues.push({ cueIndex: i, type: 'empty', message: `Cue ${c.cueNumber}: Empty subtitle text`, severity: 'error' })

    if (c.endMs <= c.startMs)
      issues.push({ cueIndex: i, type: 'bad-timing', message: `Cue ${c.cueNumber}: End time is not after start time`, severity: 'error' })

    if (durSec < 0.8 && durSec > 0 && c.text.trim())
      issues.push({ cueIndex: i, type: 'short-duration', message: `Cue ${c.cueNumber}: Very short display time (${durSec.toFixed(2)}s)`, severity: 'warning' })

    if (i + 1 < cues.length && c.endMs > cues[i + 1].startMs) {
      const overlapMs = c.endMs - cues[i + 1].startMs
      issues.push({ cueIndex: i, type: 'overlap', message: `Cue ${c.cueNumber} overlaps cue ${cues[i + 1].cueNumber} by ${overlapMs}ms`, severity: 'error' })
    }

    const longestLine = c.text.split('\n').reduce((mx, l) => Math.max(mx, l.length), 0)
    if (longestLine > 42)
      issues.push({ cueIndex: i, type: 'long-line', message: `Cue ${c.cueNumber}: Line too long (${longestLine} chars, max 42)`, severity: 'warning' })

    const chars = c.text.replace(/\n/g, ' ').length
    const cps = durSec > 0 ? chars / durSec : 0
    if (cps > 21)
      issues.push({ cueIndex: i, type: 'fast-reading', message: `Cue ${c.cueNumber}: Reading speed too high (${cps.toFixed(1)} CPS, max 21)`, severity: 'warning' })

    if (i + 1 < cues.length) {
      const gapSec = (cues[i + 1].startMs - c.endMs) / 1000
      if (gapSec > 4)
        issues.push({ cueIndex: i, type: 'large-gap', message: `Cue ${c.cueNumber}: ${gapSec.toFixed(1)}s gap to next cue`, severity: 'warning' })
    }

    for (const pattern of AI_ARTIFACT_PATTERNS) {
      if (pattern.test(c.text)) {
        issues.push({ cueIndex: i, type: 'ai-artifact', message: `Cue ${c.cueNumber}: Possible AI artifact detected`, severity: 'warning' })
        break
      }
    }
  }
  return issues
}

function findActiveCue(timeSec: number, cues: ParsedCue[]): number {
  if (!cues.length) return -1
  let lo = 0, hi = cues.length - 1, best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (cues[mid].startSec <= timeSec) { best = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  if (best >= 0 && timeSec < cues[best].endSec) return best
  return -1
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubtitleQAReview({
  videoSrc,
  rows,
  onRowsChange,
  editable,
  onDownloadEdited,
}: SubtitleQAReviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const loopStateRef = useRef({ isLoopingCue: false, activeCueIdx: -1, loopRange: null as [number, number] | null })
  const lastAutoScrollIdx = useRef(-1)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [activeCueIdx, setActiveCueIdx] = useState(-1)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [isLoopingCue, setIsLoopingCue] = useState(false)
  const [loopRange] = useState<[number, number] | null>(null)
  const [reviewed, setReviewed] = useState<Set<number>>(new Set())
  const [issuesOpen, setIssuesOpen] = useState(true)
  const [activeIssuePtr, setActiveIssuePtr] = useState(0)
  const [listScrollTop, setListScrollTop] = useState(0)
  const [listHeight, setListHeight] = useState(480)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [showReviewed, setShowReviewed] = useState(true)

  const parsedCues = useMemo(() => parseCues(rows), [rows])
  const issues = useMemo(() => runValidation(parsedCues), [parsedCues])

  const errorCount = useMemo(() => issues.filter((iss: QAIssue) => iss.severity === 'error').length, [issues])
  const warnCount = useMemo(() => issues.filter((iss: QAIssue) => iss.severity === 'warning').length, [issues])

  // Index: cueIndex → array of issues for that cue (fast lookup)
  const issuesByCue = useMemo(() => {
    const map = new Map<number, QAIssue[]>()
    for (const issue of issues) {
      const arr = map.get(issue.cueIndex) ?? []
      arr.push(issue)
      map.set(issue.cueIndex, arr)
    }
    return map
  }, [issues])

  const visibleFirst = Math.max(0, Math.floor(listScrollTop / ROW_HEIGHT) - OVERSCAN)
  const visibleLast = Math.min(parsedCues.length - 1, Math.ceil((listScrollTop + listHeight) / ROW_HEIGHT) + OVERSCAN)

  // Keep loop state ref in sync so the stable onTimeUpdate callback can read it
  useEffect(() => {
    loopStateRef.current = { isLoopingCue, activeCueIdx, loopRange }
  }, [isLoopingCue, activeCueIdx, loopRange])

  // Measure list height via ResizeObserver
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setListHeight(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Stable time update handler — reads loop state from ref to avoid re-attaching
  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    const t = vid.currentTime
    setCurrentTime(t)

    const { isLoopingCue, activeCueIdx, loopRange } = loopStateRef.current

    // Loop current cue
    if (isLoopingCue && activeCueIdx >= 0) {
      const cue = parsedCues[activeCueIdx]
      if (cue && t >= cue.endSec - 0.05) {
        vid.currentTime = cue.startSec
        return
      }
    }

    // Loop selected range
    if (loopRange) {
      const [s, e] = loopRange
      if (t >= e) { vid.currentTime = s; return }
    }
  }, [parsedCues])

  // Update active cue whenever currentTime changes
  useEffect(() => {
    const idx = findActiveCue(currentTime, parsedCues)
    setActiveCueIdx(idx)
    if (idx >= 0) setSelectedIdx(idx)
  }, [currentTime, parsedCues])

  // Auto-scroll list to active cue during playback
  useEffect(() => {
    if (activeCueIdx < 0 || activeCueIdx === lastAutoScrollIdx.current) return
    const el = listRef.current
    if (!el) return
    lastAutoScrollIdx.current = activeCueIdx
    const itemTop = activeCueIdx * ROW_HEIGHT
    const itemBottom = itemTop + ROW_HEIGHT
    const viewTop = el.scrollTop
    const viewBottom = el.scrollTop + el.clientHeight
    if (itemTop < viewTop + 20 || itemBottom > viewBottom - 20) {
      const target = itemTop - el.clientHeight / 2 + ROW_HEIGHT / 2
      el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    }
  }, [activeCueIdx])

  // Keyboard navigation (delegated to container)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = containerRef.current
      if (!el || (!el.contains(document.activeElement) && document.activeElement !== el)) return

      if (e.code === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((prev: number) => {
          const next = Math.max(0, prev - 1)
          scrollToIdx(next)
          return next
        })
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((prev: number) => {
          const next = Math.min(parsedCues.length - 1, prev + 1)
          scrollToIdx(next)
          return next
        })
      }
      if ((e.code === 'Enter' || e.code === 'Space') && editingIdx === null) {
        e.preventDefault()
        if (selectedIdx >= 0) seekToCue(selectedIdx, true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [parsedCues.length, selectedIdx, editingIdx])

  const scrollToIdx = (idx: number) => {
    const el = listRef.current
    if (!el) return
    const target = idx * ROW_HEIGHT - el.clientHeight / 2 + ROW_HEIGHT / 2
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }

  const seekToCue = (idx: number, autoPlay = true) => {
    const cue = parsedCues[idx]
    if (!cue) return
    setSelectedIdx(idx)
    if (videoRef.current) {
      videoRef.current.currentTime = cue.startSec
      if (autoPlay) videoRef.current.play().catch(() => {})
    }
    scrollToIdx(idx)
  }

  const replayMinus3 = () => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, currentTime - 3)
    videoRef.current.play().catch(() => {})
  }

  const toggleMarkReviewed = (e: React.MouseEvent<HTMLElement>, idx: number) => {
    e.stopPropagation()
    setReviewed((prev: Set<number>) => {
      const s = new Set(prev)
      s.has(idx) ? s.delete(idx) : s.add(idx)
      return s
    })
  }

  const jumpToIssue = (ptr: number) => {
    const issue = issues[ptr]
    if (!issue) return
    setActiveIssuePtr(ptr)
    seekToCue(issue.cueIndex, false)
  }

  const commitEdit = (idx: number, value: string) => {
    onRowsChange(rows.map((r: SubtitleRow, i: number) => (i === idx ? { ...r, text: value } : r)))
    setEditingIdx(null)
  }

  const startEdit = (e: React.MouseEvent<HTMLElement>, idx: number) => {
    if (!editable) return
    e.stopPropagation()
    setEditDraft(rows[idx]?.text ?? '')
    setEditingIdx(idx)
    setTimeout(() => editTextareaRef.current?.focus(), 0)
  }

  // ─── Row visual state ──────────────────────────────────────────────────────

  const getRowClasses = (idx: number): string => {
    const cueIssues = issuesByCue.get(idx)
    const hasError = cueIssues?.some((iss: QAIssue) => iss.severity === 'error')
    const hasWarning = cueIssues?.some((iss: QAIssue) => iss.severity === 'warning')
    const isActive = idx === activeCueIdx
    const isSelected = idx === selectedIdx

    if (isActive) return 'bg-blue-500/[0.14] border-l-[3px] border-l-blue-500'
    if (hasError) return 'bg-red-500/[0.08] border-l-[3px] border-l-red-500'
    if (hasWarning) return 'bg-amber-500/[0.07] border-l-[3px] border-l-amber-500/60'
    if (isSelected) return 'bg-gray-700/40 border-l-[3px] border-l-gray-600'
    return 'border-l-[3px] border-l-transparent'
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="rounded-xl overflow-hidden bg-gray-950 text-white border border-gray-800 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-white tracking-tight">Subtitle QA Review</span>
          <span className="text-xs text-gray-400">{parsedCues.length} cues</span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-emerald-400">{reviewed.size} reviewed</span>
          {(errorCount > 0 || warnCount > 0) && (
            <>
              <span className="text-xs text-gray-500">·</span>
              {errorCount > 0 && <span className="text-xs text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
              {warnCount > 0 && <span className="text-xs text-amber-400">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReviewed(!showReviewed)}
            title={showReviewed ? 'Hide reviewed cues' : 'Show reviewed cues'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            {showReviewed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Reviewed</span>
          </button>
          {editable && (
            <button
              onClick={onDownloadEdited}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export edited
            </button>
          )}
        </div>
      </div>

      {/* ── Main split layout ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row" style={{ height: 'clamp(380px, 58vh, 620px)' }}>

        {/* ── Left: Video Player ──────────────────────────────────────── */}
        <div className="w-full lg:w-[52%] flex flex-col bg-black border-b border-gray-800 lg:border-b-0 lg:border-r">
          {videoSrc ? (
            <>
              {/* Video area */}
              <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="max-w-full max-h-full object-contain"
                  preload="metadata"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
                {/* Subtitle overlay */}
                {activeCueIdx >= 0 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none px-4">
                    <div className="bg-black/80 text-white text-sm text-center px-3 py-1.5 rounded max-w-[90%] leading-snug">
                      {parsedCues[activeCueIdx].speaker && (
                        <span className="text-purple-300 mr-1">[{parsedCues[activeCueIdx].speaker}]</span>
                      )}
                      {parsedCues[activeCueIdx].text}
                    </div>
                  </div>
                )}
              </div>

              {/* Video Controls */}
              <div className="px-3 py-2.5 bg-gray-900 border-t border-gray-800 space-y-2 shrink-0">
                {/* Seek bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 tabular-nums w-9 shrink-0">{fmtTime(currentTime)}</span>
                  <div className="relative flex-1 h-3 flex items-center group">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.05}
                      value={currentTime}
                      onChange={e => {
                        const t = Number(e.target.value)
                        if (videoRef.current) videoRef.current.currentTime = t
                        setCurrentTime(t)
                      }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500 bg-gray-700"
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 tabular-nums w-9 text-right shrink-0">{fmtTime(duration)}</span>
                </div>

                {/* Buttons row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Play/Pause */}
                  <button
                    onClick={() => videoRef.current && (isPlaying ? videoRef.current.pause() : videoRef.current.play().catch(() => {}))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>

                  {/* Replay –3s */}
                  <button
                    onClick={replayMinus3}
                    title="Replay last 3 seconds (hotkey: while focused)"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-medium transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>−3s</span>
                  </button>

                  {/* Loop cue */}
                  <button
                    onClick={() => setIsLoopingCue(!isLoopingCue)}
                    title="Loop current cue"
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      isLoopingCue
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                    }`}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    <span>Loop</span>
                  </button>

                  {/* Speed */}
                  <select
                    value={speed}
                    onChange={e => {
                      const s = Number(e.target.value)
                      setSpeed(s)
                      if (videoRef.current) videoRef.current.playbackRate = s
                    }}
                    className="bg-gray-800 border border-gray-700 text-gray-200 text-[11px] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    title="Playback speed"
                  >
                    {SPEED_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}×</option>
                    ))}
                  </select>

                  {/* Volume */}
                  <button
                    onClick={() => {
                      const next = !muted
                      setMuted(next)
                      if (videoRef.current) videoRef.current.muted = next
                    }}
                    className="text-gray-400 hover:text-white transition-colors ml-auto"
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={e => {
                      const v = Number(e.target.value)
                      setVolume(v)
                      if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0 }
                      if (v > 0 && muted) setMuted(false)
                    }}
                    className="w-16 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500 bg-gray-700 shrink-0"
                  />
                </div>

                {/* Keyboard hint */}
                <p className="text-[10px] text-gray-600 mt-0.5">
                  Click editor panel → <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500">↑↓</kbd> move cues · <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500">Enter</kbd> play · <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500">double-click</kbd> edit text
                </p>
              </div>
            </>
          ) : (
            /* Audio-only / no video mode */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500 p-6">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                <Play className="h-8 w-8 text-gray-600 ml-1" />
              </div>
              <p className="text-sm text-center">No video preview available.<br />Timing and validation checks are still active.</p>
            </div>
          )}
        </div>

        {/* ── Right: Subtitle Editor (virtualized) ────────────────────── */}
        <div className="w-full lg:w-[48%] flex flex-col bg-gray-950 min-h-0">
          {/* Column headers */}
          <div className="px-3 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-gray-600">
              <span className="w-6 text-right shrink-0">#</span>
              <span className="w-24 shrink-0">Timestamps</span>
              <span className="flex-1">Text / Speaker</span>
              <span className="w-12 text-right shrink-0">Status</span>
            </div>
          </div>

          {/* Virtual cue list */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
            onScroll={e => setListScrollTop((e.currentTarget).scrollTop)}
          >
            <div style={{ height: parsedCues.length * ROW_HEIGHT, position: 'relative' }}>
              {parsedCues.slice(visibleFirst, visibleLast + 1).map((cue) => {
                const idx = cue.index
                const cueIssues = issuesByCue.get(idx)
                const hasError = cueIssues?.some(i => i.severity === 'error') ?? false
                const hasWarning = cueIssues?.some(i => i.severity === 'warning') ?? false
                const isActive = idx === activeCueIdx
                const isReviewed = reviewed.has(idx)
                const isEditing = editingIdx === idx

                if (!showReviewed && isReviewed && !hasError && !hasWarning && !isActive) {
                  // Show a collapsed placeholder row
                  return (
                    <div
                      key={idx}
                      style={{ position: 'absolute', top: idx * ROW_HEIGHT, height: ROW_HEIGHT, left: 0, right: 0 }}
                      className="flex items-center px-3 gap-2 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/30 border-l-[3px] border-l-emerald-600/40"
                      onClick={() => seekToCue(idx, true)}
                    >
                      <span className="text-[11px] text-gray-600 tabular-nums w-6 text-right shrink-0">{cue.cueNumber}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600/60 shrink-0" />
                      <span className="text-[11px] text-gray-600 italic truncate">Reviewed</span>
                    </div>
                  )
                }

                return (
                  <div
                    key={idx}
                    style={{ position: 'absolute', top: idx * ROW_HEIGHT, height: ROW_HEIGHT, left: 0, right: 0 }}
                    className={`flex items-start gap-2 px-3 py-2.5 border-b border-gray-800/50 cursor-pointer transition-colors hover:bg-gray-800/40 ${getRowClasses(idx)}`}
                    onClick={() => seekToCue(idx, true)}
                  >
                    {/* Cue number */}
                    <span className="text-[11px] text-gray-500 tabular-nums w-6 text-right shrink-0 pt-0.5">{cue.cueNumber}</span>

                    {/* Timestamps + speaker */}
                    <div className="shrink-0 w-24">
                      <div className="text-[10px] font-mono text-blue-400/80 leading-tight tabular-nums truncate">{rows[idx]?.startTime}</div>
                      <div className="text-[10px] font-mono text-gray-600 leading-tight tabular-nums truncate">{rows[idx]?.endTime}</div>
                      {cue.speaker && (
                        <div className="text-[10px] text-purple-400 leading-tight mt-0.5 truncate">{cue.speaker}</div>
                      )}
                    </div>

                    {/* Text / Edit */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <textarea
                          ref={editTextareaRef}
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onBlur={() => commitEdit(idx, editDraft)}
                          onKeyDown={e => {
                            e.stopPropagation()
                            if (e.key === 'Escape') { setEditingIdx(null); return }
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(idx, editDraft) }
                          }}
                          rows={3}
                          className="w-full bg-gray-800 border border-blue-500 text-white text-[11px] rounded px-2 py-1 resize-none focus:outline-none"
                        />
                      ) : (
                        <>
                          <p
                            className="text-[12px] leading-snug text-gray-200 whitespace-pre-wrap break-words line-clamp-3"
                            onDoubleClick={e => startEdit(e, idx)}
                            title={editable ? 'Double-click to edit' : undefined}
                          >
                            {cue.text || <em className="text-gray-600">empty</em>}
                          </p>
                          {/* Issue badges */}
                          {cueIssues && cueIssues.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cueIssues.slice(0, 3).map((issue, ii) => (
                                <span
                                  key={ii}
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium leading-none ${
                                    issue.severity === 'error'
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {ISSUE_TYPE_LABELS[issue.type]}
                                </span>
                              ))}
                              {cueIssues.length > 3 && (
                                <span className="text-[9px] px-1.5 py-0.5 text-gray-500">+{cueIssues.length - 3}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Status icons */}
                    <div className="shrink-0 flex flex-col items-center gap-1 w-6 pt-0.5">
                      {hasError && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                      {!hasError && hasWarning && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                      {isReviewed && !hasError
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        : (
                          <button
                            onClick={e => toggleMarkReviewed(e, idx)}
                            title="Mark as reviewed"
                            className="opacity-0 group-hover:opacity-100 hover:!opacity-100 h-3.5 w-3.5 rounded-full border border-gray-600 hover:border-emerald-500 transition-colors"
                          />
                        )
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Issues Panel ────────────────────────────────────────────────── */}
      {issues.length > 0 && (
        <div className="border-t border-gray-800 bg-gray-950">
          {/* Panel header / toggle */}
          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-900 transition-colors">
            <button
              onClick={() => setIssuesOpen(!issuesOpen)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm font-medium text-white">{issues.length} Validation Issues</span>
              <span className="text-xs text-gray-500 hidden sm:inline">
                {errorCount > 0 && <span className="text-red-400 mr-2">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
                {warnCount > 0 && <span className="text-amber-400">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>}
              </span>
            </button>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              {/* Prev/Next issue navigation */}
              <button
                onClick={() => { const p = Math.max(0, activeIssuePtr - 1); jumpToIssue(p) }}
                disabled={activeIssuePtr <= 0}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous issue"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-500 tabular-nums w-12 text-center">
                {activeIssuePtr + 1} / {issues.length}
              </span>
              <button
                onClick={() => { const p = Math.min(issues.length - 1, activeIssuePtr + 1); jumpToIssue(p) }}
                disabled={activeIssuePtr >= issues.length - 1}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next issue"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIssuesOpen(!issuesOpen)}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors ml-1"
              >
                {issuesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Issue list */}
          {issuesOpen && (
            <div className="max-h-44 overflow-y-auto divide-y divide-gray-800/70">
              {issues.map((issue, i) => (
                <button
                  key={i}
                  onClick={() => jumpToIssue(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                    i === activeIssuePtr
                      ? 'bg-gray-800'
                      : 'hover:bg-gray-900'
                  }`}
                >
                  {issue.severity === 'error'
                    ? <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-xs text-gray-200 leading-snug">{issue.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        issue.severity === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-[10px] text-gray-600">{ISSUE_TYPE_LABELS[issue.type]}</span>
                    </div>
                  </div>
                  {i === activeIssuePtr && (
                    <X className="h-3.5 w-3.5 text-gray-600 ml-auto mt-0.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
