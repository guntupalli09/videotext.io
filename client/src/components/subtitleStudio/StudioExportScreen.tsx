import type { ReactNode } from 'react'
import { FileDown, Link2, RefreshCw } from 'lucide-react'
import type { SubtitleRow } from '../SubtitleEditor'

type Lane = {
  id: string
  label: string
  rows: SubtitleRow[]
}

type Props = {
  lanes: Lane[]
  exportStale: boolean
  exportUnlocked: boolean
  onExportLane: (laneId: string, format: 'srt' | 'vtt') => void
  shareSlot?: ReactNode
  burnedInNote?: string
}

/**
 * Focused Export screen — snapshot of the latest saved project revision.
 * Hidden during Review / Translate; shown only after Final QA unlocks it.
 */
export default function StudioExportScreen({
  lanes,
  exportStale,
  exportUnlocked,
  onExportLane,
  shareSlot,
  burnedInNote = 'Burned-in captions coming soon — export SRT/VTT for now.',
}: Props) {
  if (!exportUnlocked) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-5 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-100">
        Export unlocks after Final QA. Resolve checks or accept remaining warnings first.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Export latest version</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {exportStale
            ? 'Your last export is out of date — it was generated before your most recent edits.'
            : 'Generated from the latest saved revision — includes every edit made in Review, Translate, and Final QA.'}
        </p>
      </div>

      {exportStale && (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
          <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          <span className="font-medium">Changes made since last export — regenerate to include them</span>
        </div>
      )}

      <div className="space-y-4 p-4">
        {lanes.map((lane) => (
          <div key={lane.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{lane.label}</p>
              <p className="text-[11px] text-gray-400">{lane.rows.length} cues</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => onExportLane(lane.id, 'srt')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {exportStale ? <RefreshCw className="h-3.5 w-3.5" /> : <FileDown className="h-3.5 w-3.5" />}
                {exportStale ? 'Regenerate SRT' : 'SRT'}
              </button>
              <button
                type="button"
                onClick={() => onExportLane(lane.id, 'vtt')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {exportStale ? <RefreshCw className="h-3.5 w-3.5" /> : <FileDown className="h-3.5 w-3.5" />}
                {exportStale ? 'Regenerate VTT' : 'VTT'}
              </button>
              <button
                type="button"
                disabled
                title={burnedInNote}
                className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs font-medium text-gray-400 sm:col-span-1 dark:border-gray-700"
              >
                Burned-in
              </button>
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
            <Link2 className="h-4 w-4" aria-hidden />
            Share link
          </p>
          {shareSlot ?? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Share becomes available when a job token is present.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
