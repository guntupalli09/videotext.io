import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, Pause, Play } from 'lucide-react'
import type { SubtitleRow } from '../SubtitleEditor'
import { parseTimeToMs } from '../../lib/subtitleUtils'

interface BilingualCueStudioProps {
  videoSrc: string | null
  sourceRows: SubtitleRow[]
  targetRows: SubtitleRow[]
  sourceLabel: string
  targetLabel: string
  editable: boolean
  onTargetRowsChange: (rows: SubtitleRow[]) => void
}

function fmtRange(start: string, end: string): string {
  const toShort = (t: string) => {
    const ms = parseTimeToMs(t)
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${toShort(start)} → ${toShort(end)}`
}

export default function BilingualCueStudio({
  videoSrc,
  sourceRows,
  targetRows,
  sourceLabel,
  targetLabel,
  editable,
  onTargetRowsChange,
}: BilingualCueStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [savedFlash, setSavedFlash] = useState<number | null>(null)

  const pairCount = Math.min(sourceRows.length, targetRows.length)

  const activeFromTime = useMemo(() => {
    for (let i = 0; i < pairCount; i++) {
      const start = parseTimeToMs(sourceRows[i].startTime) / 1000
      const end = parseTimeToMs(sourceRows[i].endTime) / 1000
      if (currentTime >= start && currentTime < end) return i
    }
    return -1
  }, [currentTime, pairCount, sourceRows])

  useEffect(() => {
    setActiveIdx(activeFromTime)
  }, [activeFromTime])

  const seekToCue = (idx: number) => {
    const start = parseTimeToMs(sourceRows[idx].startTime) / 1000
    if (videoRef.current) {
      videoRef.current.currentTime = start
      setCurrentTime(start)
    }
    setActiveIdx(idx)
  }

  const updateTargetText = (idx: number, text: string) => {
    const next = targetRows.map((row, i) => (i === idx ? { ...row, text } : row))
    onTargetRowsChange(next)
    setSavedFlash(idx)
  }

  useEffect(() => {
    if (savedFlash == null) return
    const t = window.setTimeout(() => setSavedFlash(null), 1200)
    return () => window.clearTimeout(t)
  }, [savedFlash])

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col lg:flex-row lg:min-h-[420px]">
        <div className="flex w-full flex-col border-b border-gray-200 bg-black lg:w-[38%] lg:border-b-0 lg:border-r dark:border-gray-800">
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
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-gray-900 text-sm text-gray-400 lg:aspect-auto lg:flex-1">
              No video preview
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
            <span className="font-mono text-xs tabular-nums text-gray-400">
              {fmtRange(
                sourceRows[Math.max(0, activeIdx)]?.startTime ?? '00:00:00,000',
                sourceRows[Math.max(0, activeIdx)]?.endTime ?? '00:00:00,000'
              )}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400">
              <Lock className="h-3 w-3" aria-hidden />
              Same timing
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-2 gap-0 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
            <div>Source — {sourceLabel}</div>
            <div>{targetLabel}</div>
          </div>
          <div className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {Array.from({ length: pairCount }).map((_, idx) => {
              const source = sourceRows[idx]
              const target = targetRows[idx]
              const isActive = idx === activeIdx
              return (
                <div
                  key={source.index}
                  className={`grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-2 ${
                    isActive ? 'bg-blue-50/80 dark:bg-blue-950/30' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => seekToCue(idx)}
                    className="text-left"
                  >
                    <div className="mb-1 font-mono text-[11px] tabular-nums text-gray-400">
                      {fmtRange(source.startTime, source.endTime)}
                    </div>
                    <p className="text-sm leading-snug text-gray-700 dark:text-gray-200">{source.text}</p>
                  </button>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-gray-400">
                        <Lock className="h-3 w-3" aria-hidden />
                        Same timing
                      </span>
                      {savedFlash === idx && (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                      )}
                    </div>
                    {editable ? (
                      <textarea
                        value={target.text}
                        onChange={(e) => updateTargetText(idx, e.target.value)}
                        onFocus={() => seekToCue(idx)}
                        rows={Math.max(2, target.text.split('\n').length)}
                        className="w-full resize-y rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm leading-snug text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    ) : (
                      <p className="text-sm leading-snug text-gray-700 dark:text-gray-200">{target.text}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
