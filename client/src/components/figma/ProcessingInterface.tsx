import { useRef } from 'react';
import { motion } from 'framer-motion';
import { X, FileVideo, Clock, Loader2 } from 'lucide-react';

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
        className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-800 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 sm:p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg shrink-0">
              <FileVideo className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-0.5 truncate">{file.name}</h3>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <span>{file.size}</span>
                {file.duration != null && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{file.duration}</span>
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
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {showVideoPlayer && (videoSrc || file.duration) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-800 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Video preview</h3>
          {videoSrc && (
            <>
              <div className="bg-black rounded-lg overflow-hidden mb-2 sm:mb-3 flex items-center justify-center w-full max-w-xl mx-auto max-h-[200px] aspect-video">
                <video
                  ref={(el) => { videoPlayerRef.current = el; }}
                  className="w-full h-full object-contain"
                  controls
                  src={videoSrc}
                />
              </div>
            </>
          )}
          {file.duration && <p className="text-xs text-gray-600 dark:text-gray-400">Duration: {file.duration}</p>}
        </motion.div>
      )}

      {children && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
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
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
