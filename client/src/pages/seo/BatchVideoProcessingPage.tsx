/**
 * SEO entry point: /batch-video-processing
 * Batch is now integrated into Video → Transcript (drop 2+ files).
 */
import { Navigate } from 'react-router-dom'

export default function BatchVideoProcessingPage() {
  return <Navigate to="/video-to-transcript" replace />
}
