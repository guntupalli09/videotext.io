import { useEffect, useMemo, useState } from 'react'
import { Lock, Pause, Play, Unlock } from 'lucide-react'
import type { SubtitleRow } from '../SubtitleEditor'
import { msToSrtTime, parseTimeToMs } from '../../lib/subtitleUtils'
import { useCuePlaybackSync } from './useCuePlaybackSync'

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
 * Translate desk: source + target lanes stay on the same cue / timing.
 * Timestamps locked to source by default; advanced unlock for target timing.
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
  const [savedFlash, setSavedFlash] = useState<number | null>(null)
  const [timingUnlocked, setTimingUnlocked] = useState(false)

  const pairCount = Math.min(sourceRows.length, targetRows.length)
  const timedCues = useMemo(
    () =>
      sourceRows.slice(0, pairCount).map((row, i) =>
        timingUnlocked
          ? {
              startTime: targetRows[i]?.startTime ?? row.startTime,
              endTime: targetRows[i]?.endTime ?? row.endTime,
            }
          : { startTime: row.startTime, endTime: row.endTime }
      ),
    [sourceRows, targetRows, pairCount, timingUnlocked]
  )

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
  } = useCuePlaybackSync(timedCues)

  useEffect(() => {
    if (savedFlash == null) return
    const t = window.setTimeout(() => setSavedFlash(null), 1200)
    return () => window.clearTimeout(t)
  }, [savedFlash])

  // Keep target timing synced to source while locked.
  useEffect(() => {
    if (timingUnlocked) return
    let changed = false
    const next = targetRows.map((row, i) => {
      const source = sourceRows[i]
      if (!source) return row
      if (row.startTime === source.startTime && row.endTime === source.endTime) return row
      changed = true
      return { ...row, startTime: source.startTime, endTime: source.endTime }
    })
    if (changed) onTargetRowsChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when lock / source timing changes
  }, [timingUnlocked, sourceRows])

  const updateTargetText = (idx: number, text: string) => {
    onTargetRowsChange(targetRows.map((row, i) => (i === idx ? { ...row, text } : row)))
    setSavedFlash(idx)
  }

  const updateTargetTiming = (idx: number, field: 'startTime' | 'endTime', value: string) => {
    if (!timingUnlocked) return
    onTargetRowsChange(targetRows.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  const nudgeTargetTiming = (idx: number, field: 'startTime' | 'endTime', deltaMs: number) => {
    if (!timingUnlocked) return
    const current = parseTimeToMs(targetRows[idx][field])
    updateTargetTiming(idx, field, msToSrtTime(Math.max(0, current + deltaMs)))
  }

  const activeSource = sourceRows[Math.max(0, activeIdx)]
  const activeTarget = targetRows[Math.max(0, activeIdx)]

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Translation desk</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Lanes stay on the same cue · click timestamp to seek · timing locked to source by default
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTimingUnlocked((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
            timingUnlocked
              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
              : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
          }`}
          title={timingUnlocked ? 'Re-lock target timing to source' : 'Unlock target timing (advanced)'}
        >
          {timingUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {timingUnlocked ? 'Timing unlocked' : 'Timing locked to source'}
        </button>
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
              {activeTarget && (
                <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center px-4">
                  <div className="max-w-[92%] rounded-lg bg-black/80 px-3 py-1.5 text-center text-sm leading-snug text-white">
                    {activeTarget.text}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-gray-900 text-sm text-gray-400">
              No video preview
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
            <button
              type="button"
              onClick={() => activeIdx >= 0 && seekToCue(activeIdx, { play: true })}
              className="font-mono text-xs tabular-nums text-gray-400 hover:text-gray-200 hover:underline"
              title="Seek to active cue start"
            >
              {fmtRange(
                activeSource?.startTime ?? '00:00:00,000',
                activeSource?.endTime ?? '00:00:00,000'
              )}
            </button>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400">
              {timingUnlocked ? <Unlock className="h-3 w-3" aria-hidden /> : <Lock className="h-3 w-3" aria-hidden />}
              {timingUnlocked ? 'Custom timing' : 'Same timing'}
            </span>
          </div>
        </div>

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

          <div
            ref={listRef}
            className="max-h-[min(70vh,720px)] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800"
          >
            {Array.from({ length: pairCount }).map((_, idx) => {
              const source = sourceRows[idx]
              const target = targetRows[idx]
              const isActive = idx === activeIdx
              const isPinned = idx === pinnedIdx
              const displayStart = timingUnlocked ? target.startTime : source.startTime
              const displayEnd = timingUnlocked ? target.endTime : source.endTime

              return (
                <div
                  key={source.index}
                  ref={(el) => setRowRef(idx, el)}
                  className={`grid grid-cols-1 sm:grid-cols-[minmax(0,0.88fr)_minmax(0,1.2fr)] ${
                    isActive
                      ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/20 dark:ring-blue-800'
                      : ''
                  }`}
                >
                  <div
                    className={`border-b border-gray-100 px-3 py-3 text-left sm:border-b-0 sm:border-r dark:border-gray-800 ${
                      isActive
                        ? 'bg-gray-100/95 dark:bg-gray-950/70'
                        : 'bg-gray-50/90 dark:bg-gray-950/45'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => seekToCue(idx, { play: true })}
                      className="mb-1.5 font-mono text-[10px] tabular-nums text-blue-600 hover:underline dark:text-blue-400"
                      title="Seek to timestamp"
                    >
                      {fmtRange(source.startTime, source.endTime)}
                    </button>
                    <button
                      type="button"
                      onClick={() => seekToCue(idx, { play: true })}
                      className="block w-full text-left text-[13px] leading-relaxed text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Jump video to this cue"
                    >
                      {source.text}
                    </button>
                  </div>

                  <div className="bg-white px-3 py-3 dark:bg-gray-900">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      {timingUnlocked && editable ? (
                        <span className="inline-flex flex-wrap items-center gap-1 font-mono text-[10px] tabular-nums text-blue-700 dark:text-blue-300">
                          <input
                            type="text"
                            value={target.startTime}
                            onChange={(e) => updateTargetTiming(idx, 'startTime', e.target.value)}
                            onBlur={() => seekToCue(idx, { pin: true })}
                            className="w-[7.5rem] rounded border border-blue-300 bg-white px-1 py-0.5 dark:border-blue-700 dark:bg-gray-950"
                            aria-label={`${targetLabel} start time for cue ${source.index}`}
                          />
                          <button
                            type="button"
                            className="rounded px-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => nudgeTargetTiming(idx, 'startTime', -100)}
                          >
                            −
                          </button>
                          <button
                            type="button"
                            className="rounded px-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => nudgeTargetTiming(idx, 'startTime', 100)}
                          >
                            +
                          </button>
                          <span>→</span>
                          <input
                            type="text"
                            value={target.endTime}
                            onChange={(e) => updateTargetTiming(idx, 'endTime', e.target.value)}
                            className="w-[7.5rem] rounded border border-blue-300 bg-white px-1 py-0.5 dark:border-blue-700 dark:bg-gray-950"
                            aria-label={`${targetLabel} end time for cue ${source.index}`}
                          />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => seekToCue(idx, { play: true })}
                          className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums text-blue-600 hover:underline dark:text-blue-400"
                          title="Seek video to this timestamp"
                        >
                          <Lock className="h-3 w-3 text-gray-400" aria-hidden />
                          {fmtRange(displayStart, displayEnd)}
                        </button>
                      )}
                      {savedFlash === idx ? (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          ✓ Saved
                        </span>
                      ) : isPinned ? (
                        <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                          Editing
                        </span>
                      ) : isActive ? (
                        <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          Playing
                        </span>
                      ) : null}
                    </div>
                    {editable ? (
                      <textarea
                        value={target.text}
                        onChange={(e) => updateTargetText(idx, e.target.value)}
                        onFocus={() => {
                          setPinnedIdx(idx)
                          seekToCue(idx, { pin: true })
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setPinnedIdx((current) => (current === idx ? null : current))
                          }, 200)
                        }}
                        rows={Math.max(2, target.text.split('\n').length)}
                        className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/35 dark:bg-gray-950 dark:text-gray-50 ${
                          isActive
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-gray-300 hover:border-blue-300 dark:border-gray-600 dark:hover:border-blue-500'
                        }`}
                        aria-label={`${targetLabel} translation for cue ${source.index}`}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => seekToCue(idx, { play: true })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-medium leading-relaxed text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
                      >
                        {target.text}
                      </button>
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
