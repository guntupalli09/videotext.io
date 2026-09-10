import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Pause, Play } from 'lucide-react'
import type { SubtitleRow } from '../SubtitleEditor'
import { parseTimeToMs } from '../../lib/subtitleUtils'

interface ReviewEditingDeskProps {
  videoSrc: string | null
  rows: SubtitleRow[]
  editable: boolean
  onRowsChange: (rows: SubtitleRow[]) => void
  /** Cue indices that Smart Assist flagged for judgment (0-based). */
  reviewCueIndices?: number[]
}

function toClock(t: string): string {
  const ms = parseTimeToMs(t)
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Dense editing desk for the Review phase:
 * click cue → seek video → edit inline → autosave → next cue.
 */
export default function ReviewEditingDesk({
  videoSrc,
  rows,
  editable,
  onRowsChange,
  reviewCueIndices = [],
}: ReviewEditingDeskProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [savedFlash, setSavedFlash] = useState<number | null>(null)
  const flagged = useMemo(() => new Set(reviewCueIndices), [reviewCueIndices])

  const timedActiveIdx = useMemo(() => {
    for (let i = 0; i < rows.length; i++) {
      const start = parseTimeToMs(rows[i].startTime) / 1000
      const end = parseTimeToMs(rows[i].endTime) / 1000
      if (currentTime >= start && currentTime < end) return i
    }
    return activeIdx
  }, [currentTime, rows, activeIdx])

  useEffect(() => {
    if (isPlaying) setActiveIdx(timedActiveIdx)
  }, [timedActiveIdx, isPlaying])

  useEffect(() => {
    rowRefs.current.get(activeIdx)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIdx])

  const jumpTo = (idx: number, play = false) => {
    const start = parseTimeToMs(rows[idx].startTime) / 1000
    if (videoRef.current) {
      videoRef.current.currentTime = start
      if (play) void videoRef.current.play().catch(() => {})
    }
    setCurrentTime(start)
    setActiveIdx(idx)
  }

  const saveText = (idx: number, text: string) => {
    onRowsChange(rows.map((row, i) => (i === idx ? { ...row, text } : row)))
    setSavedFlash(idx)
  }

  useEffect(() => {
    if (savedFlash == null) return
    const t = window.setTimeout(() => setSavedFlash(null), 1400)
    return () => window.clearTimeout(t)
  }, [savedFlash])

  const goNext = () => {
    if (activeIdx < rows.length - 1) jumpTo(activeIdx + 1)
  }
  const goPrev = () => {
    if (activeIdx > 0) jumpTo(activeIdx - 1)
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      onKeyDown={(e) => {
        if (e.target instanceof HTMLTextAreaElement) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            goNext()
          }
          return
        }
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          goNext()
        }
        if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault()
          goPrev()
        }
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Editing desk</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Click a cue · edit · Enter for next · autosaves as you type
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeIdx <= 0}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-white disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Previous cue"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="min-w-[4.5rem] text-center font-mono text-xs tabular-nums text-gray-500">
            {rows.length === 0 ? '0 / 0' : `${activeIdx + 1} / ${rows.length}`}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={activeIdx >= rows.length - 1}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-white disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Next cue"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:min-h-[480px]">
        <div className="flex w-full flex-col border-b border-gray-200 bg-black lg:w-[40%] lg:border-b-0 lg:border-r dark:border-gray-800">
          {videoSrc ? (
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-black lg:aspect-auto lg:flex-1 lg:min-h-0">
              <video
                ref={videoRef}
                src={videoSrc}
                className="max-h-full max-w-full object-contain"
                preload="metadata"
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              {rows[activeIdx] && (
                <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center px-4">
                  <div className="max-w-[92%] rounded-lg bg-black/80 px-3 py-1.5 text-center text-sm leading-snug text-white">
                    {rows[activeIdx].text}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-gray-950 text-sm text-gray-400 lg:aspect-auto lg:flex-1 lg:min-h-[280px]">
              VIDEO
            </div>
          )}
          <div className="flex items-center gap-2 border-t border-gray-800 bg-gray-950 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current
                if (!v) return
                if (isPlaying) v.pause()
                else void v.play().catch(() => {})
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
            {rows[activeIdx] && (
              <span className="font-mono text-xs tabular-nums text-gray-400">
                {toClock(rows[activeIdx].startTime)} → {toClock(rows[activeIdx].endTime)}
              </span>
            )}
          </div>
        </div>

        <div className="max-h-[520px] min-w-0 flex-1 overflow-y-auto lg:max-h-none">
          {rows.map((row, idx) => {
            const isActive = idx === activeIdx
            const needsReview = flagged.has(idx)
            return (
              <div
                key={row.index}
                ref={(el) => {
                  if (el) rowRefs.current.set(idx, el)
                  else rowRefs.current.delete(idx)
                }}
                className={`border-b border-gray-100 px-3 py-3 transition-colors dark:border-gray-800 ${
                  isActive
                    ? 'bg-blue-50/90 dark:bg-blue-950/35'
                    : needsReview
                      ? 'bg-amber-50/40 dark:bg-amber-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-950/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => jumpTo(idx, true)}
                  className="mb-1.5 flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-gray-400">#{row.index}</span>
                    <span className="font-mono text-[11px] tabular-nums text-blue-600 dark:text-blue-400">
                      {toClock(row.startTime)} → {toClock(row.endTime)}
                    </span>
                    {needsReview && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        Needs review
                      </span>
                    )}
                  </span>
                  {savedFlash === idx ? (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                  ) : isActive ? (
                    <span className="text-[11px] text-blue-600 dark:text-blue-400">Editing</span>
                  ) : null}
                </button>
                {editable ? (
                  <textarea
                    value={row.text}
                    onFocus={() => jumpTo(idx)}
                    onChange={(e) => saveText(idx, e.target.value)}
                    rows={Math.max(2, Math.min(4, row.text.split('\n').length + 1))}
                    className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-gray-950 dark:text-gray-100 ${
                      isActive ? 'border-blue-400 shadow-sm' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    aria-label={`Cue ${row.index} text`}
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">{row.text}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
