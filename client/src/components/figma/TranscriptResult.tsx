import { motion } from 'framer-motion'
import {
  Check,
  Download,
  Search,
  Edit3,
  Copy,
  Languages,
  FileCode,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface TranscriptResultProps {
  fileName: string
  processingTime: string
  fileSize?: string
  transcript: string
  onDownload?: () => void
  onProcessAnother?: () => void
  onGenerateSubtitles?: () => void
  onExportSrt?: () => void
  onExportVtt?: () => void
  onCopy?: () => void
  onTranslate?: () => void
  onEditToggle?: () => void
  editLabel?: string
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
  /** When false, hides the built-in Transcript card (use external layout instead). */
  showTranscriptCard?: boolean
  /** Next-step tools: { path, name, description } */
  relatedTools?: Array<{ path: string; name: string; description: string }>
  /** When false, hides the built-in Next step cards (use external workflow UI instead). */
  showNextSteps?: boolean
}

export function TranscriptResult({
  fileName,
  processingTime,
  fileSize,
  transcript,
  onDownload,
  onProcessAnother,
  onGenerateSubtitles,
  onExportSrt,
  onExportVtt,
  onCopy,
  onTranslate,
  onEditToggle,
  editLabel = 'Edit',
  searchQuery = '',
  onSearchQueryChange,
  showTranscriptCard = true,
  relatedTools = [],
  showNextSteps = true,
}: TranscriptResultProps) {
  const defaultRelatedTools = [
    { path: '/video-to-subtitles', name: 'Video → Subtitles', description: 'Generate SRT/VTT' },
    { path: '/burn-subtitles', name: 'Burn Subtitles', description: 'Burn video + SRT files' },
    { path: '/compress-video', name: 'Compress Video', description: 'Reduce file size' },
  ]
  const tools = relatedTools.length > 0 ? relatedTools : defaultRelatedTools

  const hasActions = onExportSrt || onExportVtt || onCopy || onTranslate || onEditToggle || onSearchQueryChange

  return (
    <div className="space-y-3 min-w-0 w-full">
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
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">Transcript ready</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={fileName}>{fileName}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/50 text-[11px] text-violet-700 dark:text-violet-300 font-medium">
              ⚡ {processingTime}
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
          Download transcript
        </motion.button>
      )}

      {/* ── Secondary action pill-bar ───────────────────────────────── */}
      {hasActions && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-wrap gap-2"
        >
          {onSearchQueryChange && (
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search transcript…"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 transition-colors"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {onEditToggle && (
              <button
                type="button"
                onClick={onEditToggle}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {editLabel}
              </button>
            )}
            {onExportSrt && (
              <button
                type="button"
                onClick={onExportSrt}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                SRT
              </button>
            )}
            {onExportVtt && (
              <button
                type="button"
                onClick={onExportVtt}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                VTT
              </button>
            )}
            {onTranslate && (
              <button
                type="button"
                onClick={onTranslate}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <Languages className="w-3.5 h-3.5" />
                Translate
              </button>
            )}
            {onCopy && (
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Continue workflow CTA ───────────────────────────────────── */}
      {onGenerateSubtitles != null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="flex flex-col gap-1.5"
        >
          <button
            type="button"
            onClick={onGenerateSubtitles}
            className="w-full h-11 bg-white dark:bg-gray-900 border-2 border-violet-500 dark:border-violet-500 text-violet-600 dark:text-violet-400 font-semibold rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all flex items-center justify-center gap-2 text-sm"
          >
            Continue Workflow
          </button>
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
            Generate subtitles — same video pre-filled, no re-upload
          </p>
        </motion.div>
      )}

      {/* ── Built-in transcript card (opt-in) ──────────────────────── */}
      {showTranscriptCard && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Transcript</h3>
            <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {transcript}
            </div>
          </div>
        </div>
      )}

      {/* ── Built-in next steps (opt-in) ───────────────────────────── */}
      {showNextSteps && tools.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Next step</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                state={{ useWorkflowVideo: true }}
                className="block p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
