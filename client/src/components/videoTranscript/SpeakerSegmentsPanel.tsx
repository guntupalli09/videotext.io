import { useState, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import type { Segment } from '../../lib/srtExport'

type Item = {
  /** Resolved display name ("Alice" or "Speaker 1") */
  speaker: string
  /** Raw backend label ("SPEAKER_00") — used as the key for renaming */
  rawSpeaker: string
  text: string
  isDiarized: boolean
}

export default function SpeakerSegmentsPanel(props: {
  data: Item[]
  segments: Segment[] | undefined
  audioObjectUrl: string | null
  activeSegIdx: number
  transcriptView: 'original' | 'translated'
  translatedSegments: Segment[] | null | undefined
  diarizationWasRequested: boolean
  speakerSegmentRefsRef: MutableRefObject<Map<number, HTMLDivElement>>
  audioRef: RefObject<HTMLAudioElement | null>
  onRenameSpeaker?: (rawSpeaker: string, newName: string) => void
}) {
  const {
    data,
    segments,
    audioObjectUrl,
    activeSegIdx,
    transcriptView,
    translatedSegments,
    diarizationWasRequested,
    speakerSegmentRefsRef,
    audioRef,
    onRenameSpeaker,
  } = props

  const speakerColors: string[] = [
    'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/30',
    'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/30',
    'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30',
    'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/30',
    'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30',
    'border-fuchsia-400 bg-fuchsia-50 dark:border-fuchsia-600 dark:bg-fuchsia-950/30',
  ]
  const speakerTextColors: string[] = [
    'text-violet-600 dark:text-violet-400',
    'text-sky-600 dark:text-sky-400',
    'text-emerald-600 dark:text-emerald-400',
    'text-rose-600 dark:text-rose-400',
    'text-amber-600 dark:text-amber-400',
    'text-fuchsia-600 dark:text-fuchsia-400',
  ]

  // Inline rename state — tracks which raw speaker label is being edited
  const [editingRaw, setEditingRaw] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commitRename = () => {
    if (editingRaw !== null) {
      const trimmed = draftName.trim()
      if (trimmed && onRenameSpeaker) onRenameSpeaker(editingRaw, trimmed)
      setEditingRaw(null)
    }
  }

  const hasMultipleSpeakers = data.length > 0 && data.some((d) => d.isDiarized)
  const uniqueSpeakers = [...new Set(data.map((d) => d.rawSpeaker))]
  const speakerColorIdx = (rawName: string) => uniqueSpeakers.indexOf(rawName) % speakerColors.length

  if (!data.length) {
    return (
      <div className="rounded-xl bg-gray-50/80 dark:bg-gray-800/60 p-4">
        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Speakers</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Check &quot;Speaker labels&quot; before transcribing to see who said what.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2 shrink-0">
        Who said what
        {audioObjectUrl && (
          <span className="ml-auto text-[11px] font-normal text-gray-400 dark:text-gray-500">Tap a line to seek</span>
        )}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 shrink-0">
        {hasMultipleSpeakers
          ? 'Click a speaker label to rename it — names carry through to all exports.'
          : diarizationWasRequested
            ? 'Speaker identification ran but could not detect multiple voices — try again if that is unexpected.'
            : 'Enable speaker labels before transcribing to see turns.'}
      </p>
      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {data.map((item, i) => {
          const seg = segments?.[i]
          const isActive = i === activeSegIdx
          const colorClass = speakerColors[speakerColorIdx(item.rawSpeaker)]
          const textColorClass = speakerTextColors[speakerColorIdx(item.rawSpeaker)]
          const ts = seg ? `${Math.floor(seg.start / 60)}:${String(Math.floor(seg.start % 60)).padStart(2, '0')}` : null
          const isEditingThis = editingRaw === item.rawSpeaker

          return (
            <div
              key={i}
              ref={(el) => {
                if (el) speakerSegmentRefsRef.current.set(i, el)
                else speakerSegmentRefsRef.current.delete(i)
              }}
              onClick={() => {
                if (isEditingThis) return
                if (!audioRef.current || !seg) return
                audioRef.current.currentTime = seg.start
                void audioRef.current.play().catch(() => {})
              }}
              className={`flex gap-3 items-start border-l-2 pl-3 py-2 rounded-r-xl transition-all ${
                audioObjectUrl && !isEditingThis ? 'cursor-pointer' : ''
              } ${
                isActive
                  ? `${colorClass} shadow-sm`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/60 dark:hover:bg-gray-800/40'
              }`}
            >
              <div className="shrink-0 flex flex-col items-end gap-0.5 pt-0.5 w-16">
                {/* Speaker label — click to rename when diarized */}
                {isEditingThis ? (
                  <input
                    ref={inputRef}
                    value={draftName}
                    autoFocus
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitRename() }
                      if (e.key === 'Escape') { e.preventDefault(); setEditingRaw(null) }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={32}
                    className={`text-[11px] font-semibold uppercase w-16 bg-transparent border-b border-current outline-none truncate ${textColorClass}`}
                    aria-label="Rename speaker"
                  />
                ) : (
                  <span
                    className={`text-[11px] font-semibold uppercase truncate max-w-full ${
                      isActive ? textColorClass : 'text-gray-400 dark:text-gray-500'
                    } ${item.isDiarized && onRenameSpeaker ? 'cursor-text hover:opacity-70' : ''}`}
                    title={item.isDiarized && onRenameSpeaker ? 'Click to rename' : undefined}
                    onClick={(e) => {
                      if (!item.isDiarized || !onRenameSpeaker) return
                      e.stopPropagation()
                      setEditingRaw(item.rawSpeaker)
                      setDraftName(item.speaker)
                    }}
                  >
                    {item.speaker}
                  </span>
                )}
                {ts && (
                  <span className={`text-[10px] font-mono ${isActive ? textColorClass + ' opacity-70' : 'text-gray-300 dark:text-gray-600'}`}>
                    {ts}
                  </span>
                )}
              </div>
              <p className={`flex-1 text-sm leading-relaxed ${isActive ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                {isActive && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 mr-1.5 mb-0.5 animate-pulse" aria-hidden />
                )}
                {transcriptView === 'translated' && translatedSegments?.[i]?.text ? translatedSegments[i].text : item.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
