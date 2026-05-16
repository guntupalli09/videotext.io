import { useRef } from "react";
import { motion } from "framer-motion";
import { X, FileVideo, Loader2 } from "lucide-react";

interface UploadedFile {
  name: string;
  size: string;
  duration?: string;
  thumbnail?: string;
}

interface ProcessingInterfaceProps {
  file: UploadedFile;
  onRemove?: () => void;
  children?: React.ReactNode;
  actionLabel: string;
  /** Called when user clicks primary action; receives current trim range 0–100 so parent can convert to seconds. */
  onAction?: (trimStartPercent: number, trimEndPercent: number) => void;
  showVideoPlayer?: boolean;
  /** When true, show loading state on button (parent controls processing). */
  actionLoading?: boolean;
  /** Optional video src (e.g. object URL) for trim preview. */
  videoSrc?: string | null;
  durationSeconds?: number;
  /** Trim range 0–100 (controlled). */
  trimStartPercent?: number;
  trimEndPercent?: number;
  onTrimChange?: (startPercent: number, endPercent: number) => void;
}

export function ProcessingInterface({
  file,
  onRemove,
  children,
  actionLabel,
  onAction,
  showVideoPlayer = true,
  actionLoading = false,
  videoSrc,
  durationSeconds: _durationSeconds,
  trimStartPercent = 0,
  trimEndPercent = 100,
  onTrimChange,
}: ProcessingInterfaceProps) {
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const handleAction = () => {
    onTrimChange?.(trimStartPercent, trimEndPercent);
    onAction?.(trimStartPercent, trimEndPercent);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex h-10 items-center justify-between gap-3 border-b border-gray-200/70 px-3 dark:border-gray-800">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="shrink-0">
              <FileVideo className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="truncate text-[13px] font-medium text-gray-900 dark:text-white">
                {file.name}
              </h3>
              <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-mono">{file.size}</span>
                {file.duration != null && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{file.duration}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {onRemove && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRemove}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {showVideoPlayer && (videoSrc || file.duration) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-800 shadow-sm"
        >
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">
            Video preview
          </h3>
          {videoSrc && (
            <>
              <div className="bg-black rounded-lg overflow-hidden mb-2 sm:mb-3 flex items-center justify-center w-full max-w-xl mx-auto max-h-[200px] aspect-video">
                <video
                  ref={(el) => {
                    videoPlayerRef.current = el;
                  }}
                  className="w-full h-full object-contain"
                  controls
                  src={videoSrc}
                />
              </div>
            </>
          )}
          {file.duration && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Duration: <span className="font-mono">{file.duration}</span>
            </p>
          )}
        </motion.div>
      )}

      {children && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          {children}
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleAction}
        disabled={actionLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
      >
        {actionLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <span>{actionLabel}</span>
        )}
      </motion.button>
    </div>
  );
}
