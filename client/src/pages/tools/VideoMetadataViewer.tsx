import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'

interface VideoInfo {
  name: string
  size: number
  type: string
  duration: number
  width: number
  height: number
  lastModified: number
}

function formatSize(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${(bytes / 1e3).toFixed(0)} KB`
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b) }

export default function VideoMetadataViewer() {
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setLoading(true)
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      setInfo({
        name: file.name,
        size: file.size,
        type: file.type || 'video/*',
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        lastModified: file.lastModified,
      })
      setLoading(false)
      URL.revokeObjectURL(url)
    }
    video.onerror = () => {
      setError('Could not read video metadata. The file may be corrupted or unsupported.')
      setLoading(false)
      URL.revokeObjectURL(url)
    }
    video.src = url
  }

  const aspectRatio = info && info.width > 0 && info.height > 0
    ? (() => { const g = gcd(info.width, info.height); return `${info.width / g}:${info.height / g}` })()
    : null

  const rows = info ? [
    { label: 'File name', val: info.name },
    { label: 'File size', val: formatSize(info.size) },
    { label: 'Format / MIME type', val: info.type },
    { label: 'Duration', val: `${formatDuration(info.duration)} (${info.duration.toFixed(3)}s)` },
    { label: 'Resolution', val: info.width && info.height ? `${info.width} × ${info.height} px` : 'N/A' },
    { label: 'Aspect ratio', val: aspectRatio ?? 'N/A' },
    { label: 'Last modified', val: info.lastModified ? new Date(info.lastModified).toLocaleString() : 'N/A' },
  ] : []

  return (
    <FreeToolLayout
      title="Video Metadata Viewer — Check Video Info Without Uploading"
      description="View video file details — duration, resolution, aspect ratio, file size, and format — directly in your browser. Nothing is uploaded. Works on all video files."
      guideTitle="How to view video file metadata"
      guideSteps={[
        { step: 'Click "Choose file" and select your video', desc: 'Any video format your browser supports can be analyzed: MP4, WebM, MOV, MKV, and more.' },
        { step: 'Metadata loads instantly', desc: 'Duration, resolution, aspect ratio, file size, and MIME type are read locally using the browser\'s HTML5 video API.' },
        { step: 'Use the information', desc: 'Use resolution and duration info for export settings, subtitle creation, or compression decisions.' },
      ]}
      faqs={[
        { q: 'Does my video get uploaded to a server?', a: 'No. Your video file is read entirely within your browser using the HTML5 File API and the native video element. It never leaves your device.' },
        { q: 'What metadata can this tool detect?', a: 'File name, size, MIME type, video duration, resolution (width × height in pixels), and aspect ratio. Audio tracks and codec information require a deeper analysis tool like MediaInfo.' },
        { q: 'Why doesn\'t my file show resolution?', a: 'Some formats (like audio-only files or certain MKV containers) may not expose resolution via the browser API. MP4, WebM, and MOV files work most reliably.' },
        { q: 'How do I check video codec or bitrate?', a: 'Codec and bitrate information are not available via the browser\'s HTML5 API. For deep codec analysis, use VLC (right-click → Media Info) or MediaInfo (free desktop app).' },
        { q: 'What is a MIME type for video?', a: 'MIME type identifies the file format: video/mp4 for MP4, video/webm for WebM, video/quicktime for MOV. It\'s used by servers and players to determine how to handle the file.' },
      ]}
      relatedTools={[
        { label: 'Video Bitrate Calculator', path: '/tools/video-bitrate-calculator', desc: 'Calculate ideal bitrate for file size' },
        { label: 'Aspect Ratio Calculator', path: '/tools/aspect-ratio-calculator', desc: 'Crop and resize dimensions' },
        { label: 'Compress Video', path: '/compress-video', desc: 'Reduce video file size online' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate AI subtitles from your video' },
      ]}
    >
      <div className="space-y-4">
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-10 text-center hover:border-violet-300 dark:hover:border-violet-500 transition-colors cursor-pointer"
        >
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to select a video file</p>
          <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM, MKV, AVI — nothing is uploaded</p>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-2">Reading metadata…</p>
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {rows.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Video information</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((row) => (
                <div key={row.label} className="flex items-start px-4 py-3 gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-40 shrink-0 pt-0.5">{row.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white break-all">{row.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <video ref={videoRef} className="hidden" />
    </FreeToolLayout>
  )
}
