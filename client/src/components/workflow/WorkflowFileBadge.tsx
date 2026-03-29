/**
 * WorkflowFileBadge — shown on upload zones when a file is pre-loaded from the workflow.
 * Replaces the upload zone dropbox with a sleek "ready from previous step" indicator.
 * User can dismiss (×) to reset back to a normal upload zone.
 */
import { motion } from 'framer-motion'
import { FileVideo, FileText, X } from 'lucide-react'

export type WorkflowFileType = 'video' | 'srt'

interface WorkflowFileBadgeProps {
  fileName: string
  type: WorkflowFileType
  onDismiss: () => void
  /** Extra classes for the container */
  className?: string
}

export function WorkflowFileBadge({ fileName, type, onDismiss, className = '' }: WorkflowFileBadgeProps) {
  const Icon = type === 'video' ? FileVideo : FileText
  const label = type === 'video' ? 'video' : 'subtitles'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={[
        'flex items-center gap-3 px-4 py-3.5',
        'bg-violet-50 dark:bg-violet-900/20',
        'border border-violet-200 dark:border-violet-700/50',
        'rounded-xl w-full',
        className,
      ].join(' ')}
    >
      {/* Pulse dot */}
      <span
        className="shrink-0 w-2 h-2 rounded-full bg-violet-500 animate-pulse"
        aria-hidden
      />

      {/* File icon */}
      <Icon className="w-4 h-4 shrink-0 text-violet-500 dark:text-violet-400" strokeWidth={1.5} aria-hidden />

      {/* Labels */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium text-violet-700 dark:text-violet-300 truncate leading-tight">
          {fileName}
        </span>
        <span className="text-xs text-violet-500 dark:text-violet-400 leading-tight">
          {label} ready from previous step
        </span>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Remove ${label} and upload a different file`}
        className="shrink-0 ml-auto p-1 rounded-md text-violet-400 hover:text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-800/50 dark:hover:text-violet-200 transition-colors"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
    </motion.div>
  )
}
