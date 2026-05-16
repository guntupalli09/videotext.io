import type { RefObject, LegacyRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Settings } from 'lucide-react'
import { formatTimestamp } from '../../lib/srtExport'

export type PinnedAudioPlayerBarProps = {
  audioSrc: string
  audioRef: RefObject<HTMLAudioElement | null>
  scrubberRef: RefObject<HTMLInputElement | null>
  timeDisplayRef: RefObject<HTMLSpanElement | null>
  durationDisplayRef: RefObject<HTMLSpanElement | null>
  volumeSliderRef: RefObject<HTMLInputElement | null>
  audioDuration: number
  setAudioDuration: (d: number) => void
  audioIsPlaying: boolean
  setAudioIsPlaying: (v: boolean) => void
  audioMuted: boolean
  setAudioMuted: (v: boolean) => void
  audioVolume: number
  setAudioVolume: (v: number) => void
  audioSpeed: number
  setAudioSpeed: (v: number) => void
  syncScrubberFill: () => void
  syncVolumeFill: () => void
  /** Current playback time — use for segment highlighting and scrub sync */
  onPlaybackTime: (t: number) => void
  crossOrigin?: 'anonymous'
}

export default function PinnedAudioPlayerBar(props: PinnedAudioPlayerBarProps) {
  const {
    audioSrc,
    audioRef,
    scrubberRef,
    timeDisplayRef,
    durationDisplayRef,
    volumeSliderRef,
    audioDuration,
    setAudioDuration,
    audioIsPlaying,
    setAudioIsPlaying,
    audioMuted,
    setAudioMuted,
    audioVolume,
    setAudioVolume,
    audioSpeed,
    setAudioSpeed,
    syncScrubberFill,
    syncVolumeFill,
    onPlaybackTime,
    crossOrigin,
  } = props

  const applyScrubTime = (t: number) => {
    onPlaybackTime(t)
    if (audioRef.current) audioRef.current.currentTime = t
    if (scrubberRef.current) scrubberRef.current.value = String(t)
    if (timeDisplayRef.current) timeDisplayRef.current.textContent = formatTimestamp(t)
    syncScrubberFill()
  }

  return (
    <div
      className="vtt-pinned-audio pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5"
      role="region"
      aria-label="Audio playback"
    >
      <div className="pointer-events-auto flex w-full max-w-5xl items-center gap-2 sm:gap-4 rounded-2xl border border-[#2a2840] bg-[#0a0a1a] px-3 py-3 sm:px-5 shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
        <audio
          ref={audioRef as LegacyRef<HTMLAudioElement>}
          src={audioSrc}
          {...(crossOrigin ? { crossOrigin } : {})}
          preload="metadata"
          onLoadedMetadata={() => {
            const dur = audioRef.current?.duration ?? 0
            setAudioDuration(dur)
            if (scrubberRef.current) scrubberRef.current.max = String(dur)
            if (durationDisplayRef.current) durationDisplayRef.current.textContent = formatTimestamp(dur)
            syncScrubberFill()
          }}
          onTimeUpdate={() => {
            const t = audioRef.current?.currentTime ?? 0
            if (scrubberRef.current) scrubberRef.current.value = String(t)
            if (timeDisplayRef.current) timeDisplayRef.current.textContent = formatTimestamp(t)
            syncScrubberFill()
            onPlaybackTime(t)
          }}
          onPlay={() => setAudioIsPlaying(true)}
          onPause={() => setAudioIsPlaying(false)}
          onEnded={() => setAudioIsPlaying(false)}
        />
        <button
          type="button"
          onClick={() => {
            if (!audioRef.current) return
            audioIsPlaying ? audioRef.current.pause() : audioRef.current.play().catch(() => {})
          }}
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-transform hover:bg-blue-600 active:scale-95 sm:h-11 sm:w-11"
          aria-label={audioIsPlaying ? 'Pause' : 'Play'}
        >
          {audioIsPlaying ? <Pause className="h-5 w-5" strokeWidth={2} /> : <Play className="h-5 w-5 ml-0.5" strokeWidth={2} />}
        </button>
        <span
          ref={timeDisplayRef as LegacyRef<HTMLSpanElement>}
          className="shrink-0 min-w-[2.75rem] text-xs tabular-nums text-white sm:text-sm"
        >
          0:00
        </span>
        <input
          ref={scrubberRef as LegacyRef<HTMLInputElement>}
          type="range"
          min={0}
          max={audioDuration || 100}
          step={0.1}
          defaultValue={0}
          onChange={(e) => applyScrubTime(Number(e.target.value))}
          onInput={(e) => applyScrubTime(Number((e.target as HTMLInputElement).value))}
          className="vtt-rail vtt-rail-progress min-w-0 flex-1"
        />
        <span
          ref={durationDisplayRef as LegacyRef<HTMLSpanElement>}
          className="shrink-0 min-w-[2.75rem] text-right text-xs tabular-nums text-white sm:text-sm"
        >
          0:00
        </span>
        <button
          type="button"
          title={audioMuted ? 'Unmute' : 'Mute'}
          onClick={() => {
            const muted = !audioMuted
            setAudioMuted(muted)
            if (audioRef.current) audioRef.current.muted = muted
          }}
          className="shrink-0 text-white/90 transition-opacity hover:opacity-100 opacity-90"
          aria-label={audioMuted ? 'Unmute' : 'Mute'}
        >
          {audioMuted || audioVolume === 0 ? <VolumeX className="h-5 w-5" strokeWidth={2} /> : <Volume2 className="h-5 w-5" strokeWidth={2} />}
        </button>
        <input
          ref={volumeSliderRef as LegacyRef<HTMLInputElement>}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={audioVolume}
          onChange={(e) => {
            const v = Number(e.target.value)
            setAudioVolume(v)
            if (audioRef.current) {
              audioRef.current.volume = v
              audioRef.current.muted = v === 0
            }
            if (v > 0 && audioMuted) setAudioMuted(false)
            syncVolumeFill()
          }}
          className="vtt-rail vtt-rail-volume w-20 shrink-0 sm:w-28"
        />
        <details className="relative shrink-0 group">
          <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden">
            <Settings className="h-5 w-5" strokeWidth={2} aria-hidden />
            <span className="sr-only">Playback settings</span>
          </summary>
          <div className="absolute bottom-full right-0 z-10 mb-2 min-w-[10rem] rounded-xl border border-[#2a2840] bg-[#12101f] p-3 shadow-xl">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/50">Speed</label>
            <select
              value={audioSpeed}
              onChange={(e) => {
                const s = Number(e.target.value)
                setAudioSpeed(s)
                if (audioRef.current) audioRef.current.playbackRate = s
              }}
              className="w-full rounded-lg border border-[#2a2840] bg-[#0a0a1a] px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[0.25, 0.5, 0.75, 1, 1.5, 2].map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </div>
        </details>
      </div>
    </div>
  )
}
