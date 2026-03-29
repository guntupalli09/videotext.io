import { motion } from 'framer-motion'
import { Check, Download, RotateCcw } from 'lucide-react'

interface SubtitleResultProps {
  fileName: string
  processingTime: string
  fileSize?: string
  format: 'SRT' | 'VTT'
  onDownload?: () => void
  onProcessAnother?: () => void
  /** @deprecated — next steps are handled by CrossToolSuggestions in the parent page */
  relatedTools?: Array<{ path: string; name: string; description: string }>
}

export function SubtitleResult({
  fileName,
  processingTime,
  fileSize,
  format,
  onDownload,
  onProcessAnother,
}: SubtitleResultProps) {
  return (
    <div className="space-y-3">
      {/* ── Success header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="shrink-0 w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
        </motion.div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">Subtitles ready!</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={fileName}>{fileName}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/50 text-[11px] text-violet-700 dark:text-violet-300 font-medium">
              ⚡ {processingTime}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/50 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
              {format}
            </span>
            {fileSize && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{fileSize}</span>
            )}
          </div>
        </div>

        {onProcessAnother && (
          <button
            type="button"
            onClick={onProcessAnother}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            New file
          </button>
        )}
      </motion.div>

      {/* ── Primary download CTA ────────────────────────────────────── */}
      {onDownload && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          onClick={onDownload}
          className="w-full h-12 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Download className="w-4 h-4 shrink-0" strokeWidth={2} />
          Download {format}
        </motion.button>
      )}
    </div>
  )
}
