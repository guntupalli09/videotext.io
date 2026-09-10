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

  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  /** When set, playback follows / loops this cue instead of free-running. */
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null)

  const timedActiveIdx = useMemo(() => {
    for (let i = 0; i < cues.length; i++) {
      const start = parseTimeToMs(cues[i].startTime) / 1000
      const end = parseTimeToMs(cues[i].endTime) / 1000
      if (currentTime >= start && currentTime < end) return i
    }
    for (let i = cues.length - 1; i >= 0; i--) {
      const start = parseTimeToMs(cues[i].startTime) / 1000
      if (currentTime >= start) return i
    }
    return 0
  }, [currentTime, cues])

  useEffect(() => {
    if (pinnedIdx != null) {
      setActiveIdx(pinnedIdx)
      return
    }
    if (isPlaying) setActiveIdx(timedActiveIdx)
  }, [timedActiveIdx, isPlaying, pinnedIdx])

  useEffect(() => {
    const el = rowRefs.current.get(activeIdx)
    const list = listRef.current
    if (!el || !list) return
    const listRect = list.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const pad = 12
    if (elRect.top < listRect.top + pad || elRect.bottom > listRect.bottom - pad) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIdx])

  const seekToCue = useCallback(
    (idx: number, opts?: SeekOptions) => {
      if (idx < 0 || idx >= cues.length) return
      const start = parseTimeToMs(cues[idx].startTime) / 1000
      const video = videoRef.current
      if (video) {
        video.currentTime = start
        if (opts?.play) void video.play().catch(() => {})
      }
      setCurrentTime(start)
      setActiveIdx(idx)
      if (opts?.pin) setPinnedIdx(idx)
      else if (opts?.play) setPinnedIdx(null)
    },
    [cues]
  )

  const handleTimeUpdate = useCallback(() => {
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

  const replayPinnedCue = useCallback(() => {
    const idx = pinnedIdx ?? activeIdx
    seekToCue(idx, { play: true, pin: pinnedIdx != null })
  }, [pinnedIdx, activeIdx, seekToCue])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (!video.paused) {
      video.pause()
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
    void video.play().catch(() => {})
  }, [pinnedIdx, cues])

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
  }
}
