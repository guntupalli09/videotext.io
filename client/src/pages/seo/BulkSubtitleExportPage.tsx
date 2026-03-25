/**
 * SEO entry point: /bulk-subtitle-export
 * Batch is now integrated into Video → Transcript (drop 2+ files).
 */
import { Navigate } from 'react-router-dom'

export default function BulkSubtitleExportPage() {
  return <Navigate to="/video-to-transcript" replace />
}
