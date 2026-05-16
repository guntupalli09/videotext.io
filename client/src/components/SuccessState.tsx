import { Check, Download, File } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatFileSize } from '../lib/utils'
import { trackEvent } from '../lib/analytics'
import { motion } from 'framer-motion'

/** Shared with tool pages — saves plain transcript for /guideline-format prefill (sessionStorage vt_prefill_transcript). */
export function MakeClientReadyTranscriptButton({
  plainTranscript,
  className = 'w-full',
}: {
  plainTranscript: string
  className?: string
}) {
  const navigate = useNavigate()
  const text = plainTranscript.trim()
  if (!text) return null

  const handleClick = () => {
    sessionStorage.setItem('vt_prefill_transcript', text)
    navigate('/guideline-format')
  }

  return (
    <>
      <div className="my-4 border-t border-gray-200 dark:border-gray-700 w-full" role="separator" />
      <button
        type="button"
        onClick={handleClick}
        className={`${className} rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors shadow-none`}
      >
        Make this client-ready →
      </button>
    </>
  )
}

interface SuccessStateProps {
  fileName?: string
  fileSize?: number
  downloadUrl?: string
  onProcessAnother?: () => void
  /** Optional: for result_downloaded analytics */
  toolType?: string
  jobId?: string
  /** When set, download uses this handler instead of direct link (e.g. free plan: fetch + watermark + download). */
  onDownloadClick?: (e: React.MouseEvent) => void
  /** Label for the download button when using onDownloadClick (e.g. "Download with watermark"). */
  downloadLabel?: string
  /** Show "Processed in XX.Xs ⚡" above download when set (e.g. from job_completed). */
  processedInSeconds?: number
  /** Plain transcript text — when set, enables "Make this client-ready" below export actions. */
  jobTranscriptPlainText?: string
}

export default function SuccessState({
  fileName,
  fileSize,
  downloadUrl,
  onProcessAnother,
  toolType,
  jobId,
  onDownloadClick,
  downloadLabel = 'Download',
  processedInSeconds,
  jobTranscriptPlainText,
}: SuccessStateProps) {
  const trackDownload = () => {
    try {
      trackEvent('result_downloaded', {
        ...(toolType && { tool_type: toolType }),
        ...(jobId && { job_id: jobId }),
      })
    } catch {
      // non-blocking
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="text-center success-container"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="bg-success/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <Check className="h-8 w-8 text-success" strokeWidth={1.5} />
      </motion.div>

      <h3 className="page-heading font-medium mb-6">Your file is ready!</h3>

      {fileName && (
        <div className="surface-card p-6 mb-8 max-w-md mx-auto">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-3">
              <File className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-gray-800">{fileName}</p>
              {fileSize && <p className="text-sm text-gray-500">{formatFileSize(fileSize)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Reserve space to avoid CLS when badge appears; 150ms delay for perceived calculation */}
      <div className="min-h-8 flex items-center justify-center mb-4">
        {processedInSeconds != null && processedInSeconds > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="badge text-base font-medium text-blue-600 dark:text-blue-400 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 success-speed-badge rounded-full"
            aria-label={`Processed in ${processedInSeconds.toFixed(1)} seconds`}
          >
            Processed in {processedInSeconds.toFixed(1)}s ⚡
          </motion.p>
        )}
      </div>

      {(downloadUrl || onDownloadClick) && (
        onDownloadClick ? (
          <button
            type="button"
            onClick={(e) => {
              trackDownload()
              onDownloadClick(e)
            }}
            className="btn-primary w-full mb-4"
          >
            <Download className="h-5 w-5 inline-block mr-2" strokeWidth={1.5} />
            {downloadLabel}
          </button>
        ) : (
          <a
            href={downloadUrl!}
            download
            onClick={trackDownload}
            className="btn-primary w-full mb-4"
          >
            <Download className="h-5 w-5 inline-block mr-2" strokeWidth={1.5} />
            {downloadLabel}
          </a>
        )
      )}

      {jobTranscriptPlainText?.trim() ? (
        <div className="w-full max-w-md mx-auto">
          <MakeClientReadyTranscriptButton plainTranscript={jobTranscriptPlainText} />
        </div>
      ) : null}

      {onProcessAnother && (
        <button
          onClick={onProcessAnother}
          className="text-primary hover:text-primary-hover hover:opacity-80 font-medium text-sm transition-motion"
        >
          Process another file
        </button>
      )}
    </motion.div>
  )
}
