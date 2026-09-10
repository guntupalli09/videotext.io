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

/**
 * Translate desk: sticky video (~37%) + cue workspace (~63%).
 * Source = reference. Target = working field.
 */
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
    onTargetRowsChange(targetRows.map((row, i) => (i === idx ? { ...row, text } : row)))
    setSavedFlash(idx)
  }

  useEffect(() => {
    if (savedFlash == null) return
    const t = window.setTimeout(() => setSavedFlash(null), 1200)
    return () => window.clearTimeout(t)
  }, [savedFlash])

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col lg:flex-row lg:items-start">
        {/* Sticky video — ~37% */}
        <div className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-black lg:sticky lg:top-0 lg:w-[37%] lg:self-start lg:border-b-0 lg:border-r dark:border-gray-800">
          {videoSrc ? (
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-black">
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
            <div className="flex aspect-video items-center justify-center bg-gray-900 text-sm text-gray-400">
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

        {/* Cue workspace — ~63% */}
        <div className="min-w-0 flex-1 lg:w-[63%]">
          <div className="grid grid-cols-1 border-b border-gray-200 dark:border-gray-800 sm:grid-cols-[minmax(0,0.88fr)_minmax(0,1.2fr)]">
            <div className="bg-gray-100/90 px-3 py-2 dark:bg-gray-950/90">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                Reference
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{sourceLabel}</p>
            </div>
            <div className="border-t border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900 sm:border-l sm:border-t-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-600 dark:text-blue-400">
                Working field
              </p>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">{targetLabel}</p>
            </div>
          </div>

          <div className="max-h-[min(70vh,720px)] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {Array.from({ length: pairCount }).map((_, idx) => {
              const source = sourceRows[idx]
              const target = targetRows[idx]
              const isActive = idx === activeIdx
              return (
                <div
                  key={source.index}
                  className={`grid grid-cols-1 sm:grid-cols-[minmax(0,0.88fr)_minmax(0,1.2fr)] ${
                    isActive ? 'bg-blue-50/40 dark:bg-blue-950/15' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => seekToCue(idx)}
                    title="Jump video to this cue"
                    className={`border-b border-gray-100 px-3 py-3 text-left sm:border-b-0 sm:border-r dark:border-gray-800 ${
                      isActive
                        ? 'bg-gray-100/95 dark:bg-gray-950/70'
                        : 'bg-gray-50/90 dark:bg-gray-950/45'
                    }`}
                  >
                    <div className="mb-1.5 font-mono text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                      {fmtRange(source.startTime, source.endTime)}
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                      {source.text}
                    </p>
                  </button>

                  <div className="bg-white px-3 py-3 dark:bg-gray-900">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums text-gray-400">
                        <Lock className="h-3 w-3" aria-hidden />
                        Same timing
                      </span>
                      {savedFlash === idx ? (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                      ) : isActive ? (
                        <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Editing</span>
                      ) : null}
                    </div>
                    {editable ? (
                      <textarea
                        value={target.text}
                        onChange={(e) => updateTargetText(idx, e.target.value)}
                        onFocus={() => seekToCue(idx)}
                        rows={Math.max(2, target.text.split('\n').length)}
                        className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/35 dark:bg-gray-950 dark:text-gray-50 ${
                          isActive
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-gray-300 hover:border-blue-300 dark:border-gray-600 dark:hover:border-blue-500'
                        }`}
                        aria-label={`${targetLabel} translation for cue ${source.index}`}
                      />
                    ) : (
                      <p className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50">
                        {target.text}
                      </p>
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
