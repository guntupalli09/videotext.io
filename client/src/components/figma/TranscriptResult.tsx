import { motion } from 'framer-motion';
import {
  Check,
  Download,
  Search,
  Edit,
  Copy,
  Languages,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TranscriptResultProps {
  fileName: string;
  processingTime: string;
  fileSize?: string;
  transcript: string;
  onDownload?: () => void;
  onProcessAnother?: () => void;
  onGenerateSubtitles?: () => void;
  onExportSrt?: () => void;
  onExportVtt?: () => void;
  onCopy?: () => void;
  onTranslate?: () => void;
  onEditToggle?: () => void;
  editLabel?: string;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  /** When false, hides the built-in Transcript card (use external layout instead). */
  showTranscriptCard?: boolean;
  /** Next-step tools: { path, name, description } */
  relatedTools?: Array<{ path: string; name: string; description: string }>;
  /** When false, hides the built-in Next step cards (use external workflow UI instead). */
  showNextSteps?: boolean;
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
  const defaultRelatedTools: Array<{ path: string; name: string; description: string }> = [
    { path: '/video-to-subtitles', name: 'Video → Subtitles', description: 'Generate SRT/VTT' },
    { path: '/burn-subtitles', name: 'Burn Subtitles', description: 'Burn video + SRT files' },
    { path: '/compress-video', name: 'Compress Video', description: 'Reduce file size' },
  ];
  const tools = relatedTools.length > 0 ? relatedTools : defaultRelatedTools;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full py-4 sm:py-5 px-5 sm:px-6 flex items-center justify-between gap-4 rounded-2xl bg-white/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 shadow-sm"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30"
          >
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">Transcript ready</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-full mt-0.5" title={fileName}>{fileName}</p>
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-0.5">Processed in {processingTime} ⚡</p>
            {fileSize && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{fileSize}</p>}
          </div>
        </div>
        {onProcessAnother && (
          <button
            type="button"
            onClick={onProcessAnother}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-violet-700 dark:text-violet-200 bg-violet-100/90 dark:bg-violet-900/40 border border-violet-300/70 dark:border-violet-600/60 hover:bg-violet-200 dark:hover:bg-violet-800/50 shadow-sm transition-colors whitespace-nowrap"
            aria-label="Start a new file"
          >
            + New file
          </button>
        )}
      </motion.div>

      {onDownload && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onDownload}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Download className="w-4 h-4 shrink-0" />
          Download transcript
        </motion.button>
      )}

      {onGenerateSubtitles != null && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onGenerateSubtitles}
            className="w-full py-3 sm:py-3.5 bg-white dark:bg-gray-800 border-2 border-violet-500 dark:border-violet-500 text-violet-600 dark:text-violet-400 font-semibold rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            Continue Workflow
          </button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">Generate subtitles — same video pre-filled, no re-upload</p>
        </motion.div>
      )}



      {showTranscriptCard && (
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden min-w-0">
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Transcript</h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              {onSearchQueryChange && (
                <div className="flex-1 min-w-0 w-full sm:min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search in transcript"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              )}
              {onEditToggle && (
                <button
                  type="button"
                  onClick={onEditToggle}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {editLabel}
                </button>
              )}
              {onExportSrt && (
                <button
                  type="button"
                  onClick={onExportSrt}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  SRT
                </button>
              )}
              {onExportVtt && (
                <button
                  type="button"
                  onClick={onExportVtt}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  VTT
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mb-4">
              {onTranslate && (
                <button
                  type="button"
                  onClick={onTranslate}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2"
                >
                  <Languages className="w-4 h-4" />
                  Translate
                </button>
              )}
              {onCopy && (
                <button
                  type="button"
                  onClick={onCopy}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {transcript}
            </div>
          </div>
        </div>
      )}

      {showNextSteps && tools.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Next step</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Your next file is pre-filled on the next tool.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                state={{ useWorkflowVideo: true }}
                className="block p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 dark:hover:text-violet-400 mt-2 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
