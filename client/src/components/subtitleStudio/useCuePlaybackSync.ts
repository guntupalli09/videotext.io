import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseTimeToMs } from '../../lib/subtitleUtils'

export type TimedCue = {
  startTime: string
  endTime: string
}

type SeekOptions = {
  play?: boolean
  pin?: boolean
}

/**
 * Shared playback ↔ cue-list sync for Review / Translate desks.
 * - Highlights the active cue while video plays
 * - Auto-scrolls the cue list as playback advances
 * - Seeks on cue / timestamp click
 * - While editing (pinned), loops that cue segment for quick replay
 */
export function useCuePlaybackSync(cues: TimedCue[]) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLElement>>(new Map())
  const rafRef = useRef<number | null>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  /** When set, playback follows / loops this cue instead of free-running. */
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null)
  const [playError, setPlayError] = useState<string | null>(null)

  const timedActiveIdx = useMemo(() => {
    for (let i = 0; i < cues.length; i++) {
      const start = parseTimeToMs(cues[i].startTime) / 1000
      const end = parseTimeToMs(cues[i].endTime) / 1000
      if (Number.isFinite(start) && Number.isFinite(end) && currentTime >= start && currentTime < end) {
        return i
      }
    }
    for (let i = cues.length - 1; i >= 0; i--) {
      const start = parseTimeToMs(cues[i].startTime) / 1000
      if (Number.isFinite(start) && currentTime >= start) return i
    }
    return 0
  }, [currentTime, cues])

  // Follow playback time unless a cue is pinned for editing.
  useEffect(() => {
    if (pinnedIdx != null) {
      setActiveIdx(pinnedIdx)
      return
    }
    setActiveIdx(timedActiveIdx)
  }, [timedActiveIdx, pinnedIdx])

  // Scroll inside the cue list (not the page) as the active cue advances.
  useEffect(() => {
    const list = listRef.current
    const el = rowRefs.current.get(activeIdx)
    if (!list || !el) return
    const listTop = list.scrollTop
    const listBottom = listTop + list.clientHeight
    const elTop = el.offsetTop
    const elBottom = elTop + el.offsetHeight
    const pad = 24
    if (elTop < listTop + pad) {
      list.scrollTo({ top: Math.max(0, elTop - pad), behavior: 'smooth' })
    } else if (elBottom > listBottom - pad) {
      list.scrollTo({ top: Math.max(0, elBottom - list.clientHeight + pad), behavior: 'smooth' })
    }
  }, [activeIdx])

  const syncTimeFromVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const t = video.currentTime
    setCurrentTime(t)

    if (pinnedIdx != null && cues[pinnedIdx] && !video.paused) {
      const start = parseTimeToMs(cues[pinnedIdx].startTime) / 1000
      const end = parseTimeToMs(cues[pinnedIdx].endTime) / 1000
      if (t >= end - 0.04) {
        video.currentTime = start
        setCurrentTime(start)
      }
    }
  }, [pinnedIdx, cues])

  // rAF ticker while playing — more reliable than sparse timeupdate events.
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }
    const tick = () => {
      syncTimeFromVideo()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, syncTimeFromVideo])

  const tryPlay = useCallback(async () => {
    const video = videoRef.current
    if (!video) {
      setPlayError('No video loaded')
      return
    }
    try {
      await video.play()
      setPlayError(null)
      setIsPlaying(true)
    } catch {
      setPlayError('Could not play — click Play again')
      setIsPlaying(false)
    }
  }, [])

  const seekToCue = useCallback(
    (idx: number, opts?: SeekOptions) => {
      if (idx < 0 || idx >= cues.length) return
      const start = parseTimeToMs(cues[idx].startTime) / 1000
      const video = videoRef.current
      if (video && Number.isFinite(start)) {
        video.currentTime = start
      }
      setCurrentTime(Number.isFinite(start) ? start : 0)
      setActiveIdx(idx)
      if (opts?.pin) setPinnedIdx(idx)
      else if (opts?.play) setPinnedIdx(null)
      if (opts?.play) void tryPlay()
    },
    [cues, tryPlay]
  )

  const handleTimeUpdate = useCallback(() => {
    syncTimeFromVideo()
  }, [syncTimeFromVideo])

  const replayPinnedCue = useCallback(() => {
    const idx = pinnedIdx ?? activeIdx
    seekToCue(idx, { play: true, pin: pinnedIdx != null })
  }, [pinnedIdx, activeIdx, seekToCue])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      setPlayError('No video loaded')
      return
    }
    if (!video.paused) {
      video.pause()
      setIsPlaying(false)
      return
    }
    if (pinnedIdx != null && cues[pinnedIdx]) {
      const start = parseTimeToMs(cues[pinnedIdx].startTime) / 1000
      const end = parseTimeToMs(cues[pinnedIdx].endTime) / 1000
      if (video.currentTime < start || video.currentTime >= end - 0.05) {
        video.currentTime = start
        setCurrentTime(start)
      }
    }
    void tryPlay()
  }, [pinnedIdx, cues, tryPlay])

  const setRowRef = useCallback((idx: number, el: HTMLElement | null) => {
    if (el) rowRefs.current.set(idx, el)
    else rowRefs.current.delete(idx)
  }, [])

  return {
    videoRef,
    listRef,
    currentTime,
    isPlaying,
    setIsPlaying,
    activeIdx,
    setActiveIdx,
    pinnedIdx,
    setPinnedIdx,
    seekToCue,
    handleTimeUpdate,
    replayPinnedCue,
    togglePlay,
    setRowRef,
    playError,
  }
}
