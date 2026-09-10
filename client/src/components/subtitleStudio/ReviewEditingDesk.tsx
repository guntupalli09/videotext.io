import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Lock, Pause, Play, Unlock } from 'lucide-react'
import type { SubtitleRow } from '../SubtitleEditor'
import { msToSrtTime, parseTimeToMs } from '../../lib/subtitleUtils'
import type { CueChip } from '../../lib/subtitleQaAssist'
import { useCuePlaybackSync } from './useCuePlaybackSync'

interface ReviewEditingDeskProps {
  videoSrc: string | null
  rows: SubtitleRow[]
  editable: boolean
  onRowsChange: (rows: SubtitleRow[]) => void
  cueChips?: Map<number, CueChip[]>
  focusCueIndex?: number | null
  focusCueToken?: number
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

const CHIP_CLASS: Record<string, string> = {
  'hard-to-read':
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  'timing-adjusted':
    'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200',
  'needs-review':
    'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200',
}

/**
 * Cue-first Review desk with playback sync:
 * active highlight, auto-scroll, seek on cue/timestamp click,
 * segment-pinned replay while editing, timestamps locked by default.
 */
export default function ReviewEditingDesk({
  videoSrc,
  rows,
  editable,
  onRowsChange,
  cueChips,
  focusCueIndex = null,
  focusCueToken = 0,
}: ReviewEditingDeskProps) {
  const [savedFlash, setSavedFlash] = useState<number | null>(null)
  const [timingUnlocked, setTimingUnlocked] = useState(false)

  const {
    videoRef,
    listRef,
    isPlaying,
    setIsPlaying,
    activeIdx,
    pinnedIdx,
    setPinnedIdx,
    seekToCue,
    handleTimeUpdate,
    replayPinnedCue,
    togglePlay,
    setRowRef,
  } = useCuePlaybackSync(rows)

  useEffect(() => {
    if (focusCueIndex == null || focusCueIndex < 0 || focusCueIndex >= rows.length) return
    seekToCue(focusCueIndex, { pin: true })
  }, [focusCueIndex, focusCueToken, rows.length, seekToCue])

  useEffect(() => {
    if (savedFlash == null) return
    const t = window.setTimeout(() => setSavedFlash(null), 1400)
    return () => window.clearTimeout(t)
  }, [savedFlash])

  const saveText = (idx: number, text: string) => {
    onRowsChange(rows.map((row, i) => (i === idx ? { ...row, text } : row)))
    setSavedFlash(idx)
  }

  const saveTiming = (idx: number, field: 'startTime' | 'endTime', value: string) => {
    if (!timingUnlocked) return
    onRowsChange(rows.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  const nudgeTiming = (idx: number, field: 'startTime' | 'endTime', deltaMs: number) => {
    if (!timingUnlocked) return
    const current = parseTimeToMs(rows[idx][field])
    saveTiming(idx, field, msToSrtTime(Math.max(0, current + deltaMs)))
  }

  const goNext = () => {
    if (activeIdx < rows.length - 1) seekToCue(activeIdx + 1, { pin: pinnedIdx != null })
  }
  const goPrev = () => {
    if (activeIdx > 0) seekToCue(activeIdx - 1, { pin: pinnedIdx != null })
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      onKeyDown={(e) => {
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
          if (e.target instanceof HTMLTextAreaElement && e.key === 'Enter' && !e.shiftKey) {
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Cue workspace</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Playback highlights the active cue · click a cue or timestamp to seek · Enter for next
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTimingUnlocked((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              timingUnlocked
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
            }`}
            title={timingUnlocked ? 'Lock timestamps' : 'Unlock timestamps for advanced timing edits'}
          >
            {timingUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {timingUnlocked ? 'Timing unlocked' : 'Timing locked'}
          </button>
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
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start">
        <div className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-black lg:sticky lg:top-0 lg:w-[37%] lg:self-start lg:border-b-0 lg:border-r dark:border-gray-800">
          {videoSrc ? (
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoSrc}
                className="max-h-full max-w-full object-contain"
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
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
            <div className="flex aspect-video items-center justify-center bg-gray-950 text-sm text-gray-400">
              VIDEO
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-800 bg-gray-950 px-3 py-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
            {pinnedIdx != null && (
              <button
                type="button"
                onClick={replayPinnedCue}
                className="rounded-md border border-gray-700 px-2 py-1 text-[11px] font-medium text-gray-200 hover:bg-gray-800"
              >
                Replay cue
              </button>
            )}
            {rows[activeIdx] && (
              <button
                type="button"
                onClick={() => seekToCue(activeIdx, { play: true })}
                className="font-mono text-xs tabular-nums text-gray-400 hover:text-gray-200 hover:underline"
                title="Seek to active cue start"
              >
                {toClock(rows[activeIdx].startTime)} → {toClock(rows[activeIdx].endTime)}
              </button>
            )}
            {pinnedIdx != null && (
              <span className="ml-auto text-[10px] text-sky-300">Pinned for edit / replay</span>
            )}
          </div>
        </div>

        <div ref={listRef} className="max-h-[min(70vh,720px)] min-w-0 flex-1 overflow-y-auto lg:w-[63%]">
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">No cues yet.</p>
          ) : (
            rows.map((row, idx) => {
              const isActive = idx === activeIdx
              const isPinned = idx === pinnedIdx
              const chips = cueChips?.get(idx) ?? []
              return (
                <div
                  key={row.index}
                  ref={(el) => setRowRef(idx, el)}
                  onClick={(e) => {
                    const t = e.target as HTMLElement
                    if (
                      t.closest('textarea') ||
                      t.closest('input') ||
                      t.closest('button')
                    ) {
                      return
                    }
                    seekToCue(idx, { play: true })
                  }}
                  className={`cursor-pointer border-b border-gray-100 px-3 py-3 transition-colors dark:border-gray-800 ${
                    isActive
                      ? 'bg-blue-50/90 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/35 dark:ring-blue-800'
                      : chips.length > 0
                        ? 'bg-amber-50/30 dark:bg-amber-950/15'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-950/50'
                  }`}
                >
                  <div className="mb-1.5 flex w-full flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => seekToCue(idx, { play: true })}
                        className="font-mono text-[11px] tabular-nums text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        title="Seek to this cue"
                      >
                        #{row.index}
                      </button>
                      {timingUnlocked && editable ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-blue-700 dark:text-blue-300">
                          <input
                            type="text"
                            value={row.startTime}
                            onChange={(e) => saveTiming(idx, 'startTime', e.target.value)}
                            onBlur={() => seekToCue(idx)}
                            className="w-[7.5rem] rounded border border-blue-300 bg-white px-1 py-0.5 dark:border-blue-700 dark:bg-gray-950"
                            aria-label={`Cue ${row.index} start time`}
                          />
                          <button type="button" className="rounded px-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => nudgeTiming(idx, 'startTime', -100)} title="-0.1s start">−</button>
                          <button type="button" className="rounded px-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => nudgeTiming(idx, 'startTime', 100)} title="+0.1s start">+</button>
                          <span>→</span>
                          <input
                            type="text"
                            value={row.endTime}
                            onChange={(e) => saveTiming(idx, 'endTime', e.target.value)}
                            className="w-[7.5rem] rounded border border-blue-300 bg-white px-1 py-0.5 dark:border-blue-700 dark:bg-gray-950"
                            aria-label={`Cue ${row.index} end time`}
                          />
                          <button type="button" className="rounded px-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => nudgeTiming(idx, 'endTime', -100)} title="-0.1s end">−</button>
                          <button type="button" className="rounded px-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => nudgeTiming(idx, 'endTime', 100)} title="+0.1s end">+</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => seekToCue(idx, { play: true })}
                          className="font-mono text-[11px] tabular-nums text-blue-600 hover:underline dark:text-blue-400"
                          title="Seek video to this timestamp"
                        >
                          {toClock(row.startTime)} → {toClock(row.endTime)}
                        </button>
                      )}
                      {chips.map((chip) => (
                        <span
                          key={chip.kind}
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${CHIP_CLASS[chip.kind] ?? ''}`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>
                    {savedFlash === idx ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                    ) : isPinned ? (
                      <span className="text-[11px] text-sky-600 dark:text-sky-400">Editing</span>
                    ) : isActive ? (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400">Playing</span>
                    ) : null}
                  </div>
                  {editable ? (
                    <textarea
                      value={row.text}
                      onFocus={() => {
                        setPinnedIdx(idx)
                        seekToCue(idx, { pin: true })
                      }}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setPinnedIdx((current) => (current === idx ? null : current))
                        }, 200)
                      }}
                      onChange={(e) => saveText(idx, e.target.value)}
                      rows={Math.max(2, Math.min(4, row.text.split('\n').length + 1))}
                      className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-gray-950 dark:text-gray-100 ${
                        isActive ? 'border-blue-400 shadow-sm' : 'border-gray-200 dark:border-gray-700'
                      }`}
                      aria-label={`Cue ${row.index} text`}
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left text-sm leading-relaxed text-gray-800 dark:text-gray-100"
                      onClick={() => seekToCue(idx, { play: true })}
                    >
                      {row.text}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
