import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { FileText, Users, ListOrdered, BookOpen, FileCode, Download, Lock, Play, Pause, Volume2, VolumeX, Search, X, Layers, Sparkles, FolderArchive, AlertCircle, Loader2 } from 'lucide-react'
import FailedState from '../components/FailedState'
// import WorkflowChainSuggestion from '../components/WorkflowChainSuggestion'
import PaywallModal from '../components/PaywallModal'
import UpgradeBanner from '../components/UpgradeBanner'
import JobAuthGateModal from '../components/JobAuthGateModal'
import { isLoggedIn } from '../lib/auth'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { ResultSkeleton } from '../components/figma/ResultSkeleton'
import { TranscriptResult } from '../components/figma/TranscriptResult'
import TranscriptSharePanel from '../components/TranscriptSharePanel'
import { Checkbox } from '../components/figma/FormControls'
import { incrementUsage } from '../lib/usage'
import { uploadFileWithProgress, getJobStatus, subscribeJobStatus, getCurrentUsage, invalidateUsageCache, getConnectionProbeIfNeeded, BACKEND_TOOL_TYPES, SessionExpiredError, getUserFacingMessage, isNetworkError, POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS, getAuthToken, submitYoutubeUrl, isYoutubeUrl, claimGuestJob, uploadBatch, getBatchStatus, getBatchDownloadUrl, type YoutubeUploadResponse, type BatchStatus } from '../lib/api'
import { getFailureMessage } from '../lib/failureMessage'
import { checkVideoPreflight } from '../lib/uploadPreflight'
import { getFilePreview, formatDuration, type FilePreviewData } from '../lib/filePreview'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { API_ORIGIN, getAbsoluteDownloadUrl, getApiBase } from '../lib/apiBase'
import { LANGUAGES, languageToCode } from '../lib/languages'
import {
  exportFileStem,
  joinExportFilename,
  langCodeForFile,
  targetLangFileSlug,
  transcriptExportName,
} from '../lib/exportFileNames'
import { persistJobId, getPersistedJobId, getPersistedJobToken, clearPersistedJobId } from '../lib/jobSession'
import { trackAppEvent } from '../lib/feedbackEvents'
import { trackEvent } from '../lib/analytics'
// import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import { segmentsToSrt, segmentsToVtt, formatTimestamp, type Segment } from '../lib/srtExport'
import toast from 'react-hot-toast'
// import { useWorkflow } from '../contexts/WorkflowContext'
// import { emitToolCompleted } from '../workflow/workflowStore'

// ─── Phase 1 – Derived Transcript Utilities (client-side only) ─────────────────
const BRANCH_IDS = ['transcript', 'speakers', 'summary', 'chapters', 'exports'] as const
type BranchId = (typeof BRANCH_IDS)[number]
const BRANCH_LABELS: Record<BranchId, string> = {
  transcript: 'Transcript',
  speakers: 'Speakers',
  summary: 'Summary',
  chapters: 'Chapters',
  exports: 'Exports',
}
const BRANCH_ICONS: Record<BranchId, typeof FileText> = {
  transcript: FileText,
  speakers: Users,
  summary: ListOrdered,
  chapters: BookOpen,
  exports: FileCode,
}
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how'])

/** Matches server `batchEnabled` (Pro, Business, Agency, founding_workflow — not Basic). */
function batchUploadEligible(): boolean {
  if (typeof window === 'undefined') return false
  const p = (localStorage.getItem('plan') || 'free').toLowerCase()
  return ['pro', 'agency', 'business', 'founding_workflow'].includes(p)
}

/** Optional SEO overrides for alternate entry points (e.g. /video-to-text, /youtube-to-transcript). Do NOT duplicate logic here. */
export type VideoToTranscriptSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
  /** Open YouTube URL tab by default (for /youtube-to-transcript SEO pages). */
  defaultInputMode?: 'file' | 'youtube'
}

export default function VideoToTranscript(props: VideoToTranscriptSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('uploading')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<{
    downloadUrl: string
    fileName?: string
    segments?: { start: number; end: number; text: string; speaker?: string }[]
    summary?: { summary: string; bullets: string[]; actionItems?: string[] }
    chapters?: { title: string; startTime: number; endTime?: number }[]
    audioUrl?: string
  } | null>(null)
  const [transcriptPreview, setTranscriptPreview] = useState('')
  const [fullTranscript, setFullTranscript] = useState('')
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeChapters, setIncludeChapters] = useState(true)
  const [exportFormats, setExportFormats] = useState<('txt' | 'json' | 'docx' | 'pdf')[]>(['txt'])
  const [speakerDiarization, setSpeakerDiarization] = useState(false)
  const [diarizationWasRequested, setDiarizationWasRequested] = useState(false)
  const [numSpeakers, setNumSpeakers] = useState('')
  const [diarizationLanguage, setDiarizationLanguage] = useState('')
  const [glossary, setGlossary] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [transcriptEditMode, setTranscriptEditMode] = useState(false)
  const [editableSegments, setEditableSegments] = useState<Segment[] | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signup-combo' | 'login'>('signup-combo')
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [isRehydrating, setIsRehydrating] = useState(false)
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null)
  const [, setElapsedMs] = useState(0)
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null)
  const [, setConnectionSpeed] = useState<'fast' | 'medium' | 'slow' | undefined>(undefined)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [fileFromWorkflow, setFileFromWorkflow] = useState(false)
  const uploadAbortRef = useRef<AbortController | null>(null)
  // Phase 1 – Derived Transcript Utilities: branch tab (no remount/refetch)
  const [activeBranch, setActiveBranch] = useState<BranchId>('transcript')
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null)
  const [translatedCache, setTranslatedCache] = useState<Record<string, string>>({})
  const [translateEnabled, setTranslateEnabled] = useState(false)
  const [transcriptView, setTranscriptView] = useState<'original' | 'translated'>('original')
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const segmentRefsRef = useRef<Map<number, HTMLSpanElement>>(new Map())
  const speakerSegmentRefsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  // Audio playback for transcript sync
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioPlaybackTimeRef = useRef(0)   // updated at timeupdate frequency without triggering re-renders
  const scrubberRef = useRef<HTMLInputElement>(null)
  const timeDisplayRef = useRef<HTMLSpanElement>(null)
  const [activeSegIdx, setActiveSegIdx] = useState(-1)  // re-renders only when segment boundary crosses
  const [audioIsPlaying, setAudioIsPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null)
  const [audioVolume, setAudioVolume] = useState(1)
  const [audioMuted, setAudioMuted] = useState(false)
  const [audioSpeed, setAudioSpeed] = useState(1)
  const rehydratePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeUploadPollRef = useRef<(() => void) | null>(null)
  const pollConsecutiveNetworkErrorsRef = useRef(0)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const jobStartedTrackedRef = useRef<string | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)
  const terminalRef = useRef(false)
  const lastPartialVersionRef = useRef(0)
  const partialScrollRef = useRef<HTMLDivElement>(null)
  const savedScrollTopRef = useRef(0)
  const scrollRestoreRafRef = useRef<{ first: number; second: number }>({ first: 0, second: 0 })
  /** Phase 6: when we first show partial transcript (for min stream visibility delay). */
  const partialFirstSeenAtRef = useRef<number | null>(null)
  const minStreamDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uploadTimelineFirstRenderLoggedRef = useRef(false)
  const [partialSegments, setPartialSegments] = useState<{ start: number; end: number; text: string; speaker?: string }[]>([])
  /** Free plan: number of export downloads used for this transcript (max 2, with watermark). */
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  /** Set on job_completed for "Processed in XX.Xs" badge (UI only). */
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  /** Contextual failure message (from getFailureMessage); shown in FailedState and Tex. */
  const [failedMessage, setFailedMessage] = useState<string | undefined>(undefined)
  // Batch processing state (multi-file Pro mode)
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [batchInfo, setBatchInfo] = useState<BatchStatus | null>(null)
  const batchPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  /** Monotonic max % so the bar never steps backward if the API briefly returns a stale count. */
  const batchPctPeakRef = useRef(0)
  const [isBatchStarting, setIsBatchStarting] = useState(false)
  /** Optional: translate subtitle exports per video (ISO codes via languageToCode). */
  const [batchTranslateLanguage, setBatchTranslateLanguage] = useState<string>('')
  const [batchSpeakerDiarization, setBatchSpeakerDiarization] = useState(false)
  /** Whisper / batch job language (ISO code via languageToCode). */
  const [batchPrimaryLanguage, setBatchPrimaryLanguage] = useState('English')

  /** ISO-ish tag for original-language exports (batch uses chosen spoken language; single-file uses auto-detect). */
  const exportSourceLangCode = useMemo(() => {
    if (isBatchMode) return languageToCode(batchPrimaryLanguage) || 'auto'
    return undefined
  }, [isBatchMode, batchPrimaryLanguage])

  // ── YouTube URL input mode ──────────────────────────────────────────────────
  /** 'file' = drag-and-drop upload, 'youtube' = URL paste. Persists while idle. */
  // YouTube URL mode is temporarily disabled — always file upload
  const [inputMode] = useState<'file' | 'youtube'>('file')
  /** Raw value of the YouTube URL text field. */
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('')
  /** Metadata returned by the server after enqueueing the job (no extra round-trip). */
  const [youtubeDisplayTitle, setYoutubeDisplayTitle] = useState<string | null>(null)
  const [youtubeThumbnailUrl, setYoutubeThumbnailUrl] = useState<string | null>(null)
  const [youtubeDurationSec, setYoutubeDurationSec] = useState<number | null>(null)
  /** Current stage of the YouTube pipeline (set from job status polling). */
  const [youtubeStage, setYoutubeStage] = useState<import('../lib/api').YoutubeJobStage | null>(null)
  /** Last stage before failure — used to generate a contextual error message. */
  const youtubeStageAtFailureRef = useRef<import('../lib/api').YoutubeJobStage | null>(null)

  // Reset free export count when user gets a new result (e.g. process another file)
  useEffect(() => {
    setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  // Upload-to-first-word timeline: log firstRender when partialSegments first paints
  useEffect(() => {
    if (partialSegments.length === 0 || uploadTimelineFirstRenderLoggedRef.current) return
    uploadTimelineFirstRenderLoggedRef.current = true
    requestAnimationFrame(() => {
      const t = typeof window !== 'undefined' ? (window as any).__uploadTimeline : undefined
      if (t) t.firstRender = Date.now()
      if (t) {
        console.log('[UPLOAD_TIMELINE]', {
          uploadStart: t.uploadStart,
          upload100: t.upload100,
          uploadCompleteResponse: t.uploadCompleteResponse,
          sseStart: t.sseStart,
          firstSseMessage: t.firstSseMessage,
          firstPartialReceived: t.firstPartialReceived,
          firstRender: t.firstRender,
        })
      }
    })
  }, [partialSegments.length])

  // Instant file preview (browser only); persists through upload + processing
  useEffect(() => {
    if (!selectedFile) {
      setFilePreview(null)
      return
    }
    let cancelled = false
    getFilePreview(selectedFile).then((p) => {
      if (!cancelled) setFilePreview(p)
    })
    return () => {
      cancelled = true
    }
  }, [selectedFile])

  // Object URL for trim preview in Figma ProcessingInterface (revoke on cleanup after clearing so no ERR_FILE_NOT_FOUND)
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(selectedFile)
      setVideoPreviewUrl(url)
      return () => {
        setVideoPreviewUrl(null)
        const u = url
        setTimeout(() => URL.revokeObjectURL(u), 0)
      }
    }
    setVideoPreviewUrl(null)
  }, [selectedFile])

  // Audio for transcript panel playback — use server-transcoded AAC so every browser and
  // every input format (WebM, AVI, MOV, MKV, AC3, DTS, …) works, including Safari.
  // Must use API origin when VITE_API_URL points at a separate host (relative /api/audio would 404 on the SPA origin).
  useEffect(() => {
    if (status === 'completed' && result?.audioUrl) {
      setAudioObjectUrl(getAbsoluteDownloadUrl(result.audioUrl))
      setActiveSegIdx(-1)
      setAudioIsPlaying(false)
      audioPlaybackTimeRef.current = 0
      if (scrubberRef.current) scrubberRef.current.value = '0'
      if (timeDisplayRef.current) timeDisplayRef.current.textContent = formatTimestamp(0)
      return () => {
        setAudioObjectUrl(null)
      }
    }
    setAudioObjectUrl(null)
    setActiveSegIdx(-1)
    setAudioIsPlaying(false)
    audioPlaybackTimeRef.current = 0
  }, [result?.audioUrl, status])

  // Sync editable segments from result (so inline edits are preserved until result changes)
  useEffect(() => {
    if (result?.segments?.length) {
      setEditableSegments(result.segments.map((s) => ({ start: s.start, end: s.end, text: s.text })))
    } else {
      setEditableSegments(null)
    }
    setTranscriptEditMode(false)
  }, [result?.segments])

  // Elapsed time ticker when processing (cleanup on unmount/complete/fail)
  useEffect(() => {
    if (status !== 'processing' || !processingStartedAt) {
      setElapsedMs(0)
      return
    }
    const tick = () => setElapsedMs(Date.now() - processingStartedAt)
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [status, processingStartedAt])

  // Reset translation when transcript result changes
  useEffect(() => {
    if (!translateEnabled) {
      setTranslationLanguage(null)
    }
    setTranslatedCache({})
    setTranscriptView('original')
  }, [result]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-translate transcript when enabled and transcript text becomes available
  useEffect(() => {
    if (!translateEnabled || !translationLanguage || !fullTranscript.trim()) return
    if (translatedCache[translationLanguage]) return // already translated
    const token = getAuthToken()
    fetch(`${getApiBase()}/api/translate-transcript/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: fullTranscript, targetLanguage: translationLanguage }),
    })
      .then((r) => r.json())
      .then(({ translatedText }: { translatedText?: string }) => {
        if (translatedText) {
          setTranslatedCache((prev) => ({ ...prev, [translationLanguage]: translatedText }))
        }
      })
      .catch(() => {})
  }, [fullTranscript, translateEnabled, translationLanguage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore scroll position when transitioning from partial to completed transcript.
  // Double rAF so we run after DOM/layout has stabilized (avoids jump when height changes).
  useEffect(() => {
    if (status !== 'completed' || !result) return
    const saved = savedScrollTopRef.current
    if (saved <= 0) return
    scrollRestoreRafRef.current.first = requestAnimationFrame(() => {
      scrollRestoreRafRef.current.second = requestAnimationFrame(() => {
        if (transcriptScrollRef.current) {
          transcriptScrollRef.current.scrollTop = saved
        }
      })
    })
    return () => {
      cancelAnimationFrame(scrollRestoreRafRef.current.first)
      cancelAnimationFrame(scrollRestoreRafRef.current.second)
    }
  }, [status, result])

  // Rehydrate from URL/sessionStorage after idle or reload (e.g. mobile Safari)
  useEffect(() => {
    const pathname = location.pathname
    const jobId = getPersistedJobId(pathname)
    if (!jobId) return

    terminalRef.current = false
    lastPartialVersionRef.current = 0
    setStatus('processing')
    setUploadPhase('processing')
    setUploadProgress(100)
    setCurrentJobId(jobId)
    setIsRehydrating(true)
    setProcessingStartedAt(Date.now())
    setPartialSegments([])

    const jobToken = getPersistedJobToken(pathname)
    let cancelled = false
    const run = async () => {
      try {
        const jobStatus = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
        if (cancelled) return
        pollConsecutiveNetworkErrorsRef.current = 0
        setIsRehydrating(false)
        setProgress(jobStatus.progress ?? 0)
        if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

        const transition = getJobLifecycleTransition(jobStatus)
        if (transition === 'completed') {
          terminalRef.current = true
          setPartialSegments([])
          setStatus('completed')
          setResult(jobStatus.result ?? null)
          trackAppEvent('transcription_completed', { toolId: 'video-to-transcript' })
          // emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript' })
          setUploadPhase('processing')
          setUploadProgress(100)
          const res = jobStatus.result
          if (res?.segments?.length) {
            const textFromSegments = res.segments.map((s: { text: string }) => s.text).join('\n\n')
            setFullTranscript(textFromSegments)
            setTranscriptPreview(textFromSegments.substring(0, 500))
          } else if (res?.downloadUrl) {
            try {
              const transcriptResponse = await fetch(getAbsoluteDownloadUrl(res.downloadUrl))
              const transcriptText = await transcriptResponse.text()
              setTranscriptPreview(transcriptText.substring(0, 500))
              setFullTranscript(transcriptText)
            } catch {
              // ignore (e.g. ZIP file)
            }
          }
          invalidateUsageCache()
          getCurrentUsage({ skipCache: true })
            .then((data) => {
              const isImports = data.quotaType === 'imports'
              const total = isImports ? (data.limit ?? 3) : (data.limits.minutesPerMonth + data.overages.minutes)
              setAvailableMinutes(total)
            })
            .catch(() => {})
          return
        }
        if (transition === 'failed') {
          terminalRef.current = true
          setPartialSegments([])
          setIsRehydrating(false)
          setStatus('failed')
          toast.error('Processing failed. Please try again.')
          clearPersistedJobId(pathname, navigate)
          return
        }
        if (jobStatus.status === 'processing' && jobStatus.partialSegments?.length) {
          const version = jobStatus.partialVersion ?? 0
          if (version > lastPartialVersionRef.current || lastPartialVersionRef.current === 0) {
            lastPartialVersionRef.current = Math.max(version, lastPartialVersionRef.current)
            setPartialSegments(jobStatus.partialSegments)
          }
        }
        // Resume polling for queued/processing
        setStatus('processing')
        setUploadPhase('processing')
        setUploadProgress(100)
        const doPoll = async () => {
          if (cancelled) return
          try {
            if (terminalRef.current) return
            const s = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
            if (cancelled) return
            if (terminalRef.current) return
            setProgress(s.progress ?? 0)
            if (s.queuePosition !== undefined) setQueuePosition(s.queuePosition)
            const t = getJobLifecycleTransition(s)
            if (t === 'completed') {
              terminalRef.current = true
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              setPartialSegments([])
              setStatus('completed')
              setResult(s.result ?? null)
              trackAppEvent('transcription_completed', { toolId: 'video-to-transcript' })
              // emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript' })
              if (s.result?.segments?.length) {
                const textFromSegments = s.result.segments.map((seg: { text: string }) => seg.text).join('\n\n')
                setFullTranscript(textFromSegments)
                setTranscriptPreview(textFromSegments.substring(0, 500))
              } else if (s.result?.downloadUrl) {
                try {
                  const res = await fetch(getAbsoluteDownloadUrl(s.result.downloadUrl))
                  const text = await res.text()
                  setTranscriptPreview(text.substring(0, 500))
                  setFullTranscript(text)
                } catch {
                  // ignore
                }
              }
              invalidateUsageCache()
              getCurrentUsage({ skipCache: true })
                .then((data) => {
                  const isImports = data.quotaType === 'imports'
                  const total = isImports ? (data.limit ?? 3) : (data.limits.minutesPerMonth + data.overages.minutes)
                  setAvailableMinutes(total)
                })
                .catch(() => {})
            } else if (t === 'failed') {
              terminalRef.current = true
              setPartialSegments([])
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              setIsRehydrating(false)
              setStatus('failed')
              toast.error('Processing failed. Please try again.')
              clearPersistedJobId(pathname, navigate)
            } else if (s.status === 'processing' && s.partialSegments?.length) {
              const version = s.partialVersion ?? 0
              if (version > lastPartialVersionRef.current || lastPartialVersionRef.current === 0) {
                lastPartialVersionRef.current = Math.max(version, lastPartialVersionRef.current)
                setPartialSegments(s.partialSegments)
              }
            }
          } catch (err) {
            if (err instanceof SessionExpiredError) {
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              clearPersistedJobId(pathname, navigate)
              toast.error(err.message)
            } else if (isNetworkError(err)) {
              pollConsecutiveNetworkErrorsRef.current += 1
              if (pollConsecutiveNetworkErrorsRef.current >= POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS) {
                if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
                rehydratePollRef.current = null
                setIsRehydrating(false)
                toast.error('Server unreachable. Start the backend and refresh the page.')
              }
            }
          }
        }
        pollConsecutiveNetworkErrorsRef.current = 0
        rehydratePollRef.current = setInterval(doPoll, JOB_POLL_INTERVAL_MS)
        doPoll()
      } catch (err) {
        if (cancelled) return
        setIsRehydrating(false)
        if (err instanceof SessionExpiredError) {
          clearPersistedJobId(pathname, navigate)
          toast.error(err.message)
        }
      }
    }
    run()
    return () => {
      cancelled = true
      if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
      rehydratePollRef.current = null
    }
  }, [location.pathname, navigate])

  // Remind user to keep tab open when they switch away during upload (helps mobile)
  useEffect(() => {
    if (uploadPhase !== 'uploading') return
    const onVisibility = () => {
      if (document.hidden) toast('Keep this tab open until the upload finishes.', { icon: '📤', duration: 4000 })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [uploadPhase])

  // const workflow = useWorkflow()

  // useEffect(() => {
  //   const state = location.state as { useWorkflowVideo?: boolean } | undefined
  //   if (state?.useWorkflowVideo && workflow.videoFile) {
  //     setSelectedFile(workflow.videoFile)
  //     setFileFromWorkflow(true)
  //   }
  // }, [location.state, workflow.videoFile])

  // Pick up a file dropped on the landing page hero dropzone
  useEffect(() => {
    const w = window as Window & { __videotextPendingFile?: File }
    if (w.__videotextPendingFile) {
      setSelectedFile(w.__videotextPendingFile)
      delete w.__videotextPendingFile
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep workflow in sync when result is shown so "Next step" links pre-fill the file on the next tool
  // useEffect(() => {
  //   if (status === 'completed' && selectedFile) workflow.setVideo(selectedFile)
  // }, [status, selectedFile])

  // Show auth gate immediately when job completes and user is not logged in.
  // Users can see live partial transcription during processing but results are gated.
  useEffect(() => {
    if (status === 'completed' && !isLoggedIn()) {
      setShowAuthGate(true)
    }
  }, [status])

  const handleFileSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
        file_size_bytes: file.size,
      })
    } catch {
      // non-blocking
    }
    // workflow.setVideo(file)
    setSelectedFile(file)
    setFileFromWorkflow(false)
    setTrimStart(null)
    setTrimEnd(null)
  }

  const handleFilesSelect = (files: File[]) => {
    if (files.length <= 1) {
      if (files.length === 1) handleFileSelect(files[0])
      return
    }
    if (!batchUploadEligible()) {
      handleFileSelect(files[0])
      toast('Batch upload is on Pro and Business — upgrade to process multiple videos at once.', { icon: '📦', duration: 5500 })
      return
    }
    setBatchFiles(files.slice(0, 20))
    setIsBatchMode(true)
    setSelectedFile(null)
  }

  const handleProcessBatch = async () => {
    if (batchFiles.length === 0 || isBatchStarting) return
    const paid = typeof window !== 'undefined' && (localStorage.getItem('plan') || 'free').toLowerCase() !== 'free'
    if (batchPollRef.current) {
      clearInterval(batchPollRef.current)
      batchPollRef.current = null
    }
    batchPctPeakRef.current = 0
    setIsBatchStarting(true)
    try {
      const extraLangs =
        batchTranslateLanguage && paid ? [languageToCode(batchTranslateLanguage)] : []
      const primaryCode = languageToCode(batchPrimaryLanguage || 'English') || 'en'
      const res = await uploadBatch(batchFiles, primaryCode, extraLangs, {
        speakerDiarization: paid && batchSpeakerDiarization,
        ...(extraLangs.length > 0 ? { additionalLanguages: extraLangs } : {}),
      })
      const batchId = res.batchId
      setBatchInfo({ batchId, status: 'queued', progress: { total: batchFiles.length, completed: 0, failed: 0, percentage: 0 }, estimatedTimeRemaining: 0, errors: [] })
      setStatus('processing')
      const poll = setInterval(async () => {
        try {
          const s = await getBatchStatus(batchId)
          const pct = Math.max(batchPctPeakRef.current, s.progress.percentage)
          batchPctPeakRef.current = pct
          setBatchInfo({ ...s, progress: { ...s.progress, percentage: pct } })
          if (s.status === 'completed' || s.status === 'partial' || s.status === 'failed') {
            clearInterval(poll)
            batchPollRef.current = null
            setStatus('completed')
          }
        } catch {
          // ignore transient poll errors
        }
      }, 3000)
      batchPollRef.current = poll
    } catch {
      toast.error('Failed to start batch processing. Please try again.')
    } finally {
      setIsBatchStarting(false)
    }
  }

  useEffect(() => {
    return () => {
      if (batchPollRef.current) {
        clearInterval(batchPollRef.current)
        batchPollRef.current = null
      }
    }
  }, [])

  const handleCancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort()
      uploadAbortRef.current = null
    }
    if (activeUploadPollRef.current) {
      activeUploadPollRef.current()
      activeUploadPollRef.current = null
    }
    if (currentJobId) {
      clearPersistedJobId(location.pathname, navigate)
      setCurrentJobId(null)
      setStatus('idle')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      toast('Cancelled. You can upload a new file; the previous job may still complete in the background.', { icon: 'ℹ️', duration: 5000 })
    } else if (status === 'processing' && uploadPhase === 'uploading') {
      setStatus('idle')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      toast('Cancelled. You can try again or upload a different file.')
    }
  }

  const handleProcess = async (trimStartPercent?: number, trimEndPercent?: number) => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    const durationSeconds = filePreview?.durationSeconds ?? 0
    const trimStartSec = trimStartPercent != null ? (durationSeconds * trimStartPercent) / 100 : trimStart
    const trimEndSec = trimEndPercent != null ? (durationSeconds * trimEndPercent) / 100 : trimEnd

    // Quota check: imports for free, minutes for paid
    let usageData: Awaited<ReturnType<typeof getCurrentUsage>> | null = null
    try {
      usageData = await getCurrentUsage()
      const isImports = usageData.quotaType === 'imports'
      const totalAvailable = isImports ? (usageData.limit ?? 3) : (usageData.limits.minutesPerMonth + usageData.overages.minutes)
      const used = isImports ? (usageData.used ?? usageData.usage?.importCount ?? 0) : usageData.usage.totalMinutes
      setAvailableMinutes(totalAvailable)
      const atOrOverLimit = isImports ? used >= (usageData.limit ?? 3) : (totalAvailable > 0 && used >= totalAvailable)
      if (atOrOverLimit) {
        setShowPaywall(true)
        trackEvent('paywall_shown', { tool: 'video-to-transcript' })
        return
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    let connectionSpeedResult: 'fast' | 'medium' | 'slow' | undefined
    try {
      setStatus('processing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      uploadAbortRef.current = new AbortController()
      setCurrentJobId(null)

      const limits = usageData?.limits
        ? { maxFileSize: usageData.limits.maxFileSize, maxVideoDuration: usageData.limits.maxVideoDuration }
        : {}
      const probePromise = getConnectionProbeIfNeeded(selectedFile)
      const [preflight, probeResult] = await Promise.all([
        checkVideoPreflight(selectedFile, limits),
        probePromise ?? Promise.resolve(null),
      ])
      connectionSpeedResult = probeResult ?? undefined
      setConnectionSpeed(connectionSpeedResult)
      if (!preflight.allowed) {
        uploadAbortRef.current = null
        setStatus('idle')
        toast.error(preflight.reason ?? 'Video exceeds plan limits.')
        trackEvent('paywall_shown', { tool: 'video-to-transcript', reason: 'preflight' })
        return
      }
    } catch (e) {
      uploadAbortRef.current = null
      setStatus('idle')
      toast.error('Could not validate video. Try again.')
      return
    }

    try {
      const _isPaid = typeof window !== 'undefined' && (localStorage.getItem('plan') || 'free').toLowerCase() !== 'free'
      const baseOptions: Parameters<typeof uploadFileWithProgress>[1] = {
        toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
        trimmedStart: (trimStartSec ?? trimStart) ?? undefined,
        trimmedEnd: (trimEndSec ?? trimEnd) ?? undefined,
        includeSummary: _isPaid ? includeSummary : false,
        includeChapters: _isPaid ? includeChapters : false,
        exportFormats: exportFormats.length > 0 ? exportFormats : (['txt'] as const),
        speakerDiarization: _isPaid ? speakerDiarization : false,
        numSpeakers: _isPaid && numSpeakers ? Number(numSpeakers) : undefined,
        diarizationLanguage: _isPaid ? diarizationLanguage.trim() || undefined : undefined,
        glossary: glossary.trim() || undefined,
      }
      setDiarizationWasRequested(speakerDiarization)
      setUploadPhase('uploading')
      trackEvent('processing_started', { tool: 'video-to-transcript' })

      if (typeof window !== 'undefined') (window as any).__uploadTimeline = {}
      if (typeof window !== 'undefined') (window as any).__uploadTimeline.uploadStart = Date.now()
      uploadTimelineFirstRenderLoggedRef.current = false
      const response = await uploadFileWithProgress(
        selectedFile,
        baseOptions,
        {
          onProgress: (p) => setUploadProgress(p),
          connectionSpeed: connectionSpeedResult,
          signal: uploadAbortRef.current?.signal,
        }
      )

      const tl = typeof window !== 'undefined' ? (window as any).__uploadTimeline : undefined
      uploadAbortRef.current = null
      setCurrentJobId(response.jobId)
      persistJobId(location.pathname, response.jobId, response.jobToken)
      setUploadPhase('processing')
      setUploadProgress(100)
      terminalRef.current = false
      lastPartialVersionRef.current = 0
      partialFirstSeenAtRef.current = null
      if (minStreamDelayTimeoutRef.current) {
        clearTimeout(minStreamDelayTimeoutRef.current)
        minStreamDelayTimeoutRef.current = null
      }
      setPartialSegments([])
      const startedAt = Date.now()
      setProcessingStartedAt(startedAt)
      processingStartedAtRef.current = startedAt
      // texJobStarted()

      // Status updates: first poll immediately, then SSE (with polling fallback) for lower latency.
      const jobToken = response.jobToken
      const handleJobStatus = (jobStatus: import('../lib/api').JobStatus) => {
        if (terminalRef.current) return
        setProgress(jobStatus.progress ?? 0)
        if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)
        if (jobStatus.status === 'processing' && jobStartedTrackedRef.current !== response.jobId) {
          jobStartedTrackedRef.current = response.jobId
          try {
            trackEvent('job_started', { job_id: response.jobId, tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT })
          } catch {
            // non-blocking
          }
        }
        const transition = getJobLifecycleTransition(jobStatus)
        if (transition === 'completed') {
          terminalRef.current = true
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current()
            activeUploadPollRef.current = null
          }
          jobStartedTrackedRef.current = null
          savedScrollTopRef.current = partialScrollRef.current?.scrollTop ?? 0
          const MIN_STREAM_VISIBILITY_MS = 8000
          const res = jobStatus.result
          const streamProgress = res && typeof (res as { streamProgress?: boolean }).streamProgress === 'boolean' && (res as { streamProgress?: boolean }).streamProgress
          const firstSeenAt = partialFirstSeenAtRef.current
          const remainingMs = streamProgress && firstSeenAt != null ? MIN_STREAM_VISIBILITY_MS - (Date.now() - firstSeenAt) : 0
          const applyCompletedTransition = () => {
            minStreamDelayTimeoutRef.current = null
            setPartialSegments([])
            setStatus('completed')
            setResult(jobStatus.result ?? null)
            trackAppEvent('transcription_completed', { toolId: 'video-to-transcript' })
            const started = processingStartedAtRef.current ?? Date.now()
            const processingMs = Date.now() - started
            // emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript', processingMs })
            if (res?.segments?.length) {
              const textFromSegments = res.segments.map((s: { text: string }) => s.text).join('\n\n')
              setFullTranscript(textFromSegments)
              setTranscriptPreview(textFromSegments.substring(0, 500))
            } else if (res?.downloadUrl) {
              try {
                fetch(getAbsoluteDownloadUrl(res.downloadUrl))
                  .then((transcriptResponse) => transcriptResponse.text())
                  .then((transcriptText) => {
                    setTranscriptPreview(transcriptText.substring(0, 500))
                    setFullTranscript(transcriptText)
                  })
                  .catch(() => {})
              } catch {
                // Ignore
              }
            }
            incrementUsage('video-to-transcript')
            invalidateUsageCache()
            const refreshUsage = () => {
              getCurrentUsage({ skipCache: true })
                .then((data) => {
                  const isImports = data.quotaType === 'imports'
                  const total = isImports ? (data.limit ?? 3) : (data.limits.minutesPerMonth + data.overages.minutes)
                  setAvailableMinutes(total)
                })
                .catch(() => {})
            }
            refreshUsage()
            setTimeout(refreshUsage, 800)
            try {
              trackEvent('job_completed', {
                job_id: response.jobId,
                tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
                processing_time_ms: processingMs,
              })
              trackEvent('processing_completed', { tool: 'video-to-transcript' })
              // texJobCompleted(processingMs, 'video-to-transcript')
              setLastProcessingMs(processingMs)
            } catch {
              // non-blocking
            }
          }
          if (remainingMs > 0) {
            minStreamDelayTimeoutRef.current = setTimeout(() => { void applyCompletedTransition() }, remainingMs)
          } else {
            void applyCompletedTransition()
          }
        } else if (transition === 'failed') {
          terminalRef.current = true
          setPartialSegments([])
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current()
            activeUploadPollRef.current = null
          }
          const msg = getFailureMessage({
            fileSizeBytes: selectedFile?.size,
            mimeType: selectedFile?.type,
            remainingMinutes: availableMinutes ?? undefined,
            planQuotaMinutes: availableMinutes ?? undefined,
            durationMinutes: filePreview?.durationSeconds != null ? filePreview.durationSeconds / 60 : undefined,
          })
          setFailedMessage(msg)
          setStatus('failed')
          // texJobFailed(msg)
          toast.error('Processing failed. Please try again.')
        } else if (jobStatus.status === 'processing' && jobStatus.partialVersion != null && jobStatus.partialVersion > lastPartialVersionRef.current) {
          lastPartialVersionRef.current = jobStatus.partialVersion
          if (jobStatus.partialSegments?.length) {
            const t = typeof window !== 'undefined' ? (window as any).__uploadTimeline : undefined
            if (t && t.firstPartialReceived == null) t.firstPartialReceived = Date.now()
            if (partialFirstSeenAtRef.current === null) partialFirstSeenAtRef.current = Date.now()
            setPartialSegments(jobStatus.partialSegments)
          }
        }
      }
      const doPoll = async () => {
        try {
          if (terminalRef.current) return
          const jobStatus = await getJobStatus(response.jobId, jobToken ? { jobToken } : undefined)
          if (terminalRef.current) return
          pollConsecutiveNetworkErrorsRef.current = 0
          handleJobStatus(jobStatus)
        } catch (error: any) {
          if (isNetworkError(error)) {
            pollConsecutiveNetworkErrorsRef.current += 1
            if (pollConsecutiveNetworkErrorsRef.current >= POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS) {
              if (activeUploadPollRef.current) {
                activeUploadPollRef.current()
                activeUploadPollRef.current = null
              }
              toast.error('Server unreachable. Start the backend and refresh the page.')
            }
          }
        }
      }
      pollConsecutiveNetworkErrorsRef.current = 0
      if (tl) tl.sseStart = Date.now()
      doPoll().then(() => {
        if (terminalRef.current) return
        activeUploadPollRef.current = subscribeJobStatus(response.jobId, jobToken ? { jobToken } : undefined, handleJobStatus)
      })
    } catch (error: any) {
      uploadAbortRef.current = null
      if (error instanceof Error && error.message === 'Upload cancelled') {
        setStatus('idle')
        setUploadPhase('uploading')
        setUploadProgress(0)
        setCurrentJobId(null)
        return
      }
      if (error instanceof SessionExpiredError) {
        clearPersistedJobId(location.pathname, navigate)
        setStatus('idle')
      } else {
        const msg = getFailureMessage({
          fileSizeBytes: selectedFile?.size,
          mimeType: selectedFile?.type,
          isNetworkError: isNetworkError(error),
        })
        setFailedMessage(msg)
        setStatus('failed')
        // texJobFailed(msg)
      }
      toast.error(getUserFacingMessage(error))
    }
  }

  // ── YouTube submission ──────────────────────────────────────────────────────
  const handleProcessYoutube = async () => {
    const url = youtubeUrlInput.trim()
    if (!url) { toast.error('Please enter a YouTube URL'); return }
    if (!isYoutubeUrl(url)) { toast.error('Please enter a valid YouTube URL (youtube.com or youtu.be)'); return }
    const _isPaid = typeof window !== 'undefined' && (localStorage.getItem('plan') || 'free').toLowerCase() !== 'free'

    // Quota check (mirrors handleProcess)
    let usageData: Awaited<ReturnType<typeof getCurrentUsage>> | null = null
    try {
      usageData = await getCurrentUsage()
      const isImports = usageData.quotaType === 'imports'
      const totalAvailable = isImports
        ? (usageData.limit ?? 3)
        : (usageData.limits.minutesPerMonth + usageData.overages.minutes)
      const used = isImports
        ? (usageData.used ?? usageData.usage?.importCount ?? 0)
        : usageData.usage.totalMinutes
      setAvailableMinutes(totalAvailable)
      const atOrOverLimit = isImports
        ? used >= (usageData.limit ?? 3)
        : (totalAvailable > 0 && used >= totalAvailable)
      if (atOrOverLimit) {
        setShowPaywall(true)
        trackEvent('paywall_shown', { tool: 'video-to-transcript', source: 'youtube' })
        return
      }
    } catch { /* fall through on usage error */ }

    try {
      setStatus('processing')
      setUploadPhase('processing') // YouTube: no upload step — goes straight to processing
      setUploadProgress(100)
      setProgress(0)
      uploadAbortRef.current = new AbortController()
      setCurrentJobId(null)
      terminalRef.current = false
      lastPartialVersionRef.current = 0
      partialFirstSeenAtRef.current = null
      if (minStreamDelayTimeoutRef.current) {
        clearTimeout(minStreamDelayTimeoutRef.current)
        minStreamDelayTimeoutRef.current = null
      }
      setPartialSegments([])
      setYoutubeStage(null)
      youtubeStageAtFailureRef.current = null
      setDiarizationWasRequested(speakerDiarization)
      trackEvent('processing_started', { tool: 'video-to-transcript', source: 'youtube' })

      const response: YoutubeUploadResponse = await submitYoutubeUrl(
        url,
        {
          includeSummary: _isPaid ? includeSummary : false,
          includeChapters: _isPaid ? includeChapters : false,
          exportFormats: exportFormats.length > 0 ? exportFormats : ['txt'],
          speakerDiarization: _isPaid ? speakerDiarization : false,
          numSpeakers: _isPaid && numSpeakers ? Number(numSpeakers) : undefined,
          diarizationLanguage: _isPaid ? diarizationLanguage.trim() || undefined : undefined,
          glossary: glossary.trim() || undefined,
        },
        uploadAbortRef.current.signal
      )
      uploadAbortRef.current = null

      // Set display metadata immediately from the response (title + thumbnail arrive in 202)
      if (response.youtubeTitle) setYoutubeDisplayTitle(response.youtubeTitle)
      if (response.youtubeThumbnailUrl) setYoutubeThumbnailUrl(response.youtubeThumbnailUrl)
      if (response.youtubeDurationSec) setYoutubeDurationSec(response.youtubeDurationSec)

      setCurrentJobId(response.jobId)
      persistJobId(location.pathname, response.jobId, response.jobToken)
      const startedAt = Date.now()
      setProcessingStartedAt(startedAt)
      processingStartedAtRef.current = startedAt
      // texJobStarted()

      const jobToken = response.jobToken
      const handleJobStatus = (jobStatus: import('../lib/api').JobStatus) => {
        if (terminalRef.current) return
        setProgress(jobStatus.progress ?? 0)
        if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)
        if (jobStatus.youtubeStage) {
          setYoutubeStage(jobStatus.youtubeStage)
          youtubeStageAtFailureRef.current = jobStatus.youtubeStage
        }
        if (jobStatus.status === 'processing' && jobStartedTrackedRef.current !== response.jobId) {
          jobStartedTrackedRef.current = response.jobId
          try { trackEvent('job_started', { job_id: response.jobId, tool_type: 'youtube-to-transcript' }) } catch { /* non-blocking */ }
        }
        const transition = getJobLifecycleTransition(jobStatus)
        if (transition === 'completed') {
          terminalRef.current = true
          if (activeUploadPollRef.current) { activeUploadPollRef.current(); activeUploadPollRef.current = null }
          jobStartedTrackedRef.current = null
          savedScrollTopRef.current = partialScrollRef.current?.scrollTop ?? 0
          const MIN_STREAM_VISIBILITY_MS = 8000
          const res = jobStatus.result
          const streamProg = res && typeof (res as { streamProgress?: boolean }).streamProgress === 'boolean' && (res as { streamProgress?: boolean }).streamProgress
          const firstSeenAt = partialFirstSeenAtRef.current
          const remainingMs = streamProg && firstSeenAt != null ? MIN_STREAM_VISIBILITY_MS - (Date.now() - firstSeenAt) : 0
          const applyCompleted = () => {
            minStreamDelayTimeoutRef.current = null
            setPartialSegments([])
            setStatus('completed')
            setResult(jobStatus.result ?? null)
            trackAppEvent('transcription_completed', { toolId: 'video-to-transcript' })
            const started = processingStartedAtRef.current ?? Date.now()
            const processingMs = Date.now() - started
            // emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript', processingMs })
            if (res?.segments?.length) {
              const text = res.segments.map((s: { text: string }) => s.text).join('\n\n')
              setFullTranscript(text)
              setTranscriptPreview(text.substring(0, 500))
            } else if (res?.downloadUrl) {
              fetch(getAbsoluteDownloadUrl(res.downloadUrl))
                .then((r) => r.text())
                .then((t) => { setTranscriptPreview(t.substring(0, 500)); setFullTranscript(t) })
                .catch(() => {})
            }
            incrementUsage('video-to-transcript')
            invalidateUsageCache()
            getCurrentUsage({ skipCache: true })
              .then((data) => {
                const ii = data.quotaType === 'imports'
                const total = ii ? (data.limit ?? 3) : (data.limits.minutesPerMonth + data.overages.minutes)
                setAvailableMinutes(total)
              }).catch(() => {})
            try {
              trackEvent('job_completed', { job_id: response.jobId, tool_type: 'youtube-to-transcript', processing_time_ms: processingMs })
              trackEvent('processing_completed', { tool: 'video-to-transcript', source: 'youtube' })
              // texJobCompleted(processingMs, 'video-to-transcript')
              setLastProcessingMs(processingMs)
            } catch { /* non-blocking */ }
          }
          if (remainingMs > 0) {
            minStreamDelayTimeoutRef.current = setTimeout(() => { void applyCompleted() }, remainingMs)
          } else {
            void applyCompleted()
          }
        } else if (transition === 'failed') {
          terminalRef.current = true
          setPartialSegments([])
          if (activeUploadPollRef.current) { activeUploadPollRef.current(); activeUploadPollRef.current = null }
          const stageAtFailure = youtubeStageAtFailureRef.current
          const msg = stageAtFailure === 'downloading_audio'
            ? 'Could not download audio from this YouTube video. It may be private, age-restricted, or region-blocked. Try a different video or use the file upload.'
            : stageAtFailure === 'fetching_captions'
              ? 'Could not retrieve captions or audio for this video. The video may be private, unavailable, or have no accessible audio track.'
              : getFailureMessage({})
          setFailedMessage(msg)
          setStatus('failed')
          // texJobFailed(msg)
          toast.error(stageAtFailure === 'downloading_audio' || stageAtFailure === 'fetching_captions'
            ? 'YouTube processing failed. See details below.'
            : 'Processing failed. Please try again.')
        } else if (jobStatus.status === 'processing' && jobStatus.partialVersion != null && jobStatus.partialVersion > lastPartialVersionRef.current) {
          lastPartialVersionRef.current = jobStatus.partialVersion
          if (jobStatus.partialSegments?.length) {
            if (partialFirstSeenAtRef.current === null) partialFirstSeenAtRef.current = Date.now()
            setPartialSegments(jobStatus.partialSegments)
          }
        }
      }

      const doPoll = async () => {
        try {
          if (terminalRef.current) return
          const s = await getJobStatus(response.jobId, jobToken ? { jobToken } : undefined)
          if (terminalRef.current) return
          pollConsecutiveNetworkErrorsRef.current = 0
          handleJobStatus(s)
        } catch (error: any) {
          if (isNetworkError(error)) {
            pollConsecutiveNetworkErrorsRef.current += 1
            if (pollConsecutiveNetworkErrorsRef.current >= POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS) {
              if (activeUploadPollRef.current) { activeUploadPollRef.current(); activeUploadPollRef.current = null }
              toast.error('Server unreachable. Start the backend and refresh the page.')
            }
          }
        }
      }
      pollConsecutiveNetworkErrorsRef.current = 0
      doPoll().then(() => {
        if (terminalRef.current) return
        activeUploadPollRef.current = subscribeJobStatus(response.jobId, jobToken ? { jobToken } : undefined, handleJobStatus)
      })
    } catch (error: any) {
      uploadAbortRef.current = null
      if (error instanceof Error && error.message === 'Upload cancelled') {
        setStatus('idle'); setUploadPhase('uploading'); setUploadProgress(0); setCurrentJobId(null)
        return
      }
      if (error instanceof SessionExpiredError) {
        clearPersistedJobId(location.pathname, navigate)
        setStatus('idle')
      } else {
        const msg = getFailureMessage({ isNetworkError: isNetworkError(error) })
        setFailedMessage(msg)
        setStatus('failed')
        // texJobFailed(msg)
      }
      toast.error(getUserFacingMessage(error))
    }
  }

  const handleCopyToClipboard = async () => {
    const textToCopy =
      translationLanguage && translatedCache[translationLanguage] != null
        ? translatedCache[translationLanguage]
        : segmentsForExport && segmentsForExport.length > 0
          ? segmentsForExport.map((s) => s.text).join('\n\n').trim()
          : (fullTranscript || '').trim()
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      toast.success('Copied to clipboard!')
    } catch {
      // Fallback for environments where clipboard API is restricted
      try {
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast.success('Copied to clipboard!')
      } catch {
        toast.error('Failed to copy to clipboard')
      }
    }
  }

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setFilePreview(null)
    setCurrentJobId(null)
    uploadAbortRef.current = null
    terminalRef.current = false
    lastPartialVersionRef.current = 0
    partialFirstSeenAtRef.current = null
    if (minStreamDelayTimeoutRef.current) {
      clearTimeout(minStreamDelayTimeoutRef.current)
      minStreamDelayTimeoutRef.current = null
    }
    // Reset batch state
    setBatchFiles([])
    setIsBatchMode(false)
    setBatchInfo(null)
    if (batchPollRef.current) {
      clearInterval(batchPollRef.current)
      batchPollRef.current = null
    }
    batchPctPeakRef.current = 0
    setIsBatchStarting(false)
    setStatus('idle')
    setProgress(0)
    setUploadPhase('uploading')
    setUploadProgress(0)
    setResult(null)
    setTranscriptPreview('')
    setFullTranscript('')
    setPartialSegments([])
    setActiveBranch('transcript')
    setIncludeSummary(true)
    setIncludeChapters(true)
    setExportFormats(['txt'])
    setSpeakerDiarization(false)
    setNumSpeakers('')
    setDiarizationLanguage('')
    setGlossary('')
    setSearchQuery('')
    setTranscriptEditMode(false)
    setEditableSegments(null)
    setTranslateEnabled(false)
    setTranslationLanguage(null)
    setTranslatedCache({})
    setTranscriptView('original')
    setBatchTranslateLanguage('')
    setBatchSpeakerDiarization(false)
    setBatchPrimaryLanguage('English')
    // Reset YouTube state
    setYoutubeUrlInput('')
    setYoutubeDisplayTitle(null)
    setYoutubeThumbnailUrl(null)
    setYoutubeDurationSec(null)
    setYoutubeStage(null)
    youtubeStageAtFailureRef.current = null
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  // Phase 1 – scroll transcript to segment index; switch to Transcript branch first so segment is mounted
  const scrollToSegment = useCallback((index: number) => {
    setActiveBranch('transcript')
    setTimeout(() => {
      const el = segmentRefsRef.current.get(index)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  // Auto-scroll transcript to keep active segment visible during playback
  useEffect(() => {
    if (activeSegIdx < 0 || !audioIsPlaying) return
    const el = segmentRefsRef.current.get(activeSegIdx)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeSegIdx, audioIsPlaying])

  // Auto-scroll speakers panel to keep active segment visible during playback
  useEffect(() => {
    if (activeSegIdx < 0 || !audioIsPlaying || activeBranch !== 'speakers') return
    const el = speakerSegmentRefsRef.current.get(activeSegIdx)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeSegIdx, audioIsPlaying, activeBranch])

  // Phase 1 – Derived Transcript Utilities (client-side; failures must not affect transcript)
  const getParagraphs = useCallback((text: string): string[] => {
    if (!text.trim()) return []
    return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  }, [])

  const getSpeakersData = useCallback((): { speaker: string; text: string; isDiarized: boolean }[] => {
    if (result?.segments?.length) {
      const rawLabels = result.segments.map((s) => s.speaker?.trim() || 'Speaker')
      const unique = Array.from(new Set(rawLabels)) as string[]
      // Only treat as diarized when we have at least 2 distinct speaker labels from the backend
      const isDiarized = unique.length >= 2
      const labelToFriendly: Record<string, string> = {}
      unique.forEach((label, idx) => {
        labelToFriendly[label] = `Speaker ${idx + 1}`
      })
      return result.segments.map((s) => ({
        speaker: labelToFriendly[s.speaker?.trim() || 'Speaker'] || 'Speaker',
        text: s.text,
        isDiarized,
      }))
    }
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return []
      const paras = getParagraphs(raw)
      return paras.map((p, i) => ({
        speaker: `Speaker ${(i % 3) + 1}`,
        text: p,
        isDiarized: false,
      }))
    } catch {
      return []
    }
  }, [result?.segments, fullTranscript, getParagraphs])

  const getSummarySchema = useCallback((): { summary?: string; bullets: string[]; decisions: string[]; action_items: string[]; key_points: string[] } => {
    if (result?.summary) {
      return {
        summary: result.summary.summary,
        bullets: result.summary.bullets || [],
        decisions: [],
        action_items: result.summary.actionItems || [],
        key_points: result.summary.bullets || [],
      }
    }
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return { bullets: [], decisions: [], action_items: [], key_points: [] }
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean)
      const decisions: string[] = []
      const action_items: string[] = []
      const key_points: string[] = []
      const decRe = /\b(decided|decision|agree|agreed|we'll|we will)\b/i
      const actRe = /\b(action|todo|to do|will \w+|need to|must)\b/i
      const keyRe = /\b(important|key point|takeaway|summary|in conclusion)\b/i
      for (const s of sentences) {
        const t = s.trim()
        if (!t) continue
        if (decRe.test(t)) decisions.push(t)
        else if (actRe.test(t)) action_items.push(t)
        else if (keyRe.test(t)) key_points.push(t)
      }
      return { bullets: [], decisions, action_items, key_points }
    } catch {
      return { bullets: [], decisions: [], action_items: [], key_points: [] }
    }
  }, [result?.summary, fullTranscript])

  const getChaptersData = useCallback((): { label: string; segmentIndex: number; startTime?: number }[] => {
    if (result?.chapters?.length) {
      const segs = result.segments || []
      return result.chapters.map((c) => {
        let segmentIndex = 0
        if (segs.length) {
          const idx = segs.findIndex((s) => s.start >= c.startTime)
          segmentIndex = idx >= 0 ? idx : segs.length - 1
        }
        return { label: c.title, segmentIndex, startTime: c.startTime }
      })
    }
    try {
      const paras = getParagraphs(fullTranscript || '')
      if (paras.length === 0) return []
      const chunkSize = Math.max(1, Math.ceil(paras.length / 6))
      const chapters: { label: string; segmentIndex: number }[] = []
      for (let i = 0; i < paras.length; i += chunkSize) {
        const first = paras[i]
        const preview = first.length > 40 ? first.slice(0, 40) + '…' : first
        chapters.push({ label: `Section ${chapters.length + 1}: ${preview}`, segmentIndex: i })
      }
      return chapters
    } catch {
      return []
    }
  }, [result?.chapters, fullTranscript, getParagraphs])

  const getHighlightsData = useCallback((): { type: string; text: string }[] => {
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return []
      const out: { type: string; text: string }[] = []
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean)
      const defRe = /\b(means|defined as|is when|refers to)\b/i
      const conclRe = /\b(in conclusion|to conclude|therefore|thus|so we)\b/i
      const quoteRe = /^["'].*["']$|".*"/
      for (const s of sentences) {
        const t = s.trim()
        if (t.length < 15) continue
        if (defRe.test(t)) out.push({ type: 'Definition', text: t })
        else if (conclRe.test(t)) out.push({ type: 'Conclusion', text: t })
        else if (quoteRe.test(t) || t.endsWith('!')) out.push({ type: 'Quote', text: t })
        else if (/\b(important|critical|key)\b/i.test(t)) out.push({ type: 'Important', text: t })
      }
      return out
    } catch {
      return []
    }
  }, [fullTranscript])

  const getKeywordsData = useCallback((): { keyword: string; count: number; segmentIndex: number }[] => {
    try {
      const paras = getParagraphs(fullTranscript || '')
      if (paras.length === 0) return []
      const countMap = new Map<string, number>()
      const firstIndexMap = new Map<string, number>()
      paras.forEach((p, idx) => {
        const words = p.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))
        words.forEach((w) => {
          countMap.set(w, (countMap.get(w) || 0) + 1)
          if (!firstIndexMap.has(w)) firstIndexMap.set(w, idx)
        })
      })
      return Array.from(countMap.entries())
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 24)
        .map(([keyword, count]) => ({ keyword, count, segmentIndex: firstIndexMap.get(keyword) ?? 0 }))
    } catch {
      return []
    }
  }, [fullTranscript, getParagraphs])


  const transcriptParagraphs = getParagraphs(fullTranscript || '')
  const displayTranscript =
    transcriptView === 'translated' && translationLanguage && translatedCache[translationLanguage] != null
      ? translatedCache[translationLanguage]
      : fullTranscript || ''
  const _displayParagraphs = getParagraphs(displayTranscript)
  void _displayParagraphs

  // Per-segment translated text — align with original segments (paragraph split, line split, or length-weighted fallback)
  const translatedSegments: NonNullable<typeof result>['segments'] | null = useMemo(() => {
    if (!translationLanguage || !translatedCache[translationLanguage] || !result?.segments?.length) return null
    const translatedFull = translatedCache[translationLanguage].trim()
    const segs = result.segments
    const paras = translatedFull.split(/\n\n+/).filter(Boolean)
    if (paras.length === segs.length) {
      return segs.map((s, i) => ({ ...s, text: paras[i]?.trim() ?? s.text }))
    }
    const lines = translatedFull.split('\n').filter((l) => l.trim())
    if (lines.length === segs.length) {
      return segs.map((s, i) => ({ ...s, text: lines[i]?.trim() ?? s.text }))
    }
    const weights = segs.map((s) => Math.max(1, s.text.length))
    const totalW = weights.reduce((a, b) => a + b, 0)
    const boundaries: number[] = [0]
    let acc = 0
    for (let i = 0; i < segs.length - 1; i++) {
      acc += (weights[i] / totalW) * translatedFull.length
      boundaries.push(Math.round(acc))
    }
    boundaries.push(translatedFull.length)
    return segs.map((s, i) => ({
      ...s,
      text: translatedFull.slice(boundaries[i], boundaries[i + 1]).trim() || s.text,
    }))
  }, [translationLanguage, translatedCache, result?.segments])

  const isPaidPlan = typeof window !== 'undefined' && (localStorage.getItem('plan') || 'free').toLowerCase() !== 'free'

  // Search: match in segments (if any) or paragraphs; return { index, snippet, startTime? }
  const _searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || q.length < 2) return []
    const snippetLen = 60
    if (result?.segments?.length) {
      return result.segments
        .map((s, i) => ({ index: i, text: s.text, start: s.start }))
        .filter((x) => x.text.toLowerCase().includes(q))
        .map((x) => ({
          index: x.index,
          snippet: x.text.length > snippetLen ? x.text.slice(0, snippetLen) + '…' : x.text,
          startTime: x.start,
        }))
    }
    return transcriptParagraphs
      .map((p, i) => ({ index: i, text: p }))
      .filter((x) => x.text.toLowerCase().includes(q))
      .map((x) => ({
        index: x.index,
        snippet: x.text.length > snippetLen ? x.text.slice(0, snippetLen) + '…' : x.text,
        startTime: undefined,
      }))
  }, [searchQuery, result?.segments, transcriptParagraphs])
  void _searchResults

  const segmentsForExport = editableSegments && editableSegments.length > 0 ? editableSegments : (result?.segments ?? null)

  const handleExportSrt = () => {
    trackAppEvent('export_clicked', { toolId: 'video-to-transcript', format: 'srt' })
    if (!segmentsForExport?.length) {
      toast.error('Enable summary or chapters to get timestamps, then export SRT.')
      return
    }
    const srt = segmentsToSrt(segmentsForExport)
    const WM1 = 'Fast AI transcription by VideoText.io — Free Plan'
    const WM2 = '⚠  Remove this watermark: videotext.io/pricing  |  Upgrade to Pro'
    const watermarkedSrt = !isPaidPlan
      ? `0\n00:00:00,000 --> 00:00:08,000\n${WM1}\n${WM2}\n\n${srt}`
      : srt
    const blob = new Blob([watermarkedSrt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = joinExportFilename(
      exportFileStem(selectedFile?.name, 'video'),
      `subtitles_original_${langCodeForFile(exportSourceLangCode)}`,
      '.srt'
    )
    a.click()
    URL.revokeObjectURL(url)
    toast.success('SRT downloaded')
  }

  const handleExportVtt = () => {
    if (!segmentsForExport?.length) {
      toast.error('Enable summary or chapters to get timestamps, then export VTT.')
      return
    }
    const vtt = segmentsToVtt(segmentsForExport)
    const WM1_VTT = 'Fast AI transcription by VideoText.io — Free Plan'
    const WM2_VTT = '⚠  Remove this watermark: videotext.io/pricing  |  Upgrade to Pro'
    const watermarkedVtt = !isPaidPlan
      ? vtt.replace('WEBVTT', `WEBVTT\n\n00:00:00.000 --> 00:00:08.000\n${WM1_VTT}\n${WM2_VTT}\n`)
      : vtt
    const blob = new Blob([watermarkedVtt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = joinExportFilename(
      exportFileStem(selectedFile?.name, 'video'),
      `subtitles_original_${langCodeForFile(exportSourceLangCode)}`,
      '.vtt'
    )
    a.click()
    URL.revokeObjectURL(url)
    toast.success('VTT downloaded')
  }

  const breadcrumbs = [{ label: 'Video to Transcript', href: '/video-to-transcript' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Video → Transcript',
    subtitle: seoIntro ?? 'Extract spoken text from any video in seconds',
    icon: <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
    sidebar: null,
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        <UpgradeBanner variant="video-length" />
        {status === 'idle' && !selectedFile && !isBatchMode && (
          <div className="space-y-4">
            {/* YouTube URL tab temporarily hidden — feature under development */}

            {/* ── File upload tab ── */}
            {inputMode === 'file' && (
              <div className="space-y-3 sm:space-y-4">
                {batchUploadEligible() && (
                  <div
                    className="rounded-xl sm:rounded-2xl border-2 border-purple-400/55 dark:border-purple-500/45 bg-gradient-to-br from-purple-500/[0.12] via-violet-600/[0.08] to-fuchsia-600/[0.06] dark:from-purple-950/60 dark:via-violet-950/40 dark:to-fuchsia-950/25 px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm shadow-purple-500/10"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <div className="shrink-0 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-purple-600/25 dark:bg-purple-400/20 ring-2 ring-purple-500/35">
                        <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700 dark:text-purple-200" aria-hidden />
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-snug">
                          Batch upload included — add several videos at once
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                          Drag in multiple files or use “browse” and select more than one. You get one ZIP with all transcripts when processing finishes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <UploadZone
                  immediateSelect
                  multiple
                  onFileSelect={handleFileSelect}
                  onFilesSelect={handleFilesSelect}
                  initialFiles={selectedFile ? [selectedFile] : null}
                  onRemove={() => {
                    // if (fileFromWorkflow) workflow.clearVideo()
                    setSelectedFile(null)
                    setFileFromWorkflow(false)
                  }}
                  fromWorkflowLabel={fileFromWorkflow ? 'From previous step' : undefined}
                />
                {!batchUploadEligible() && (
                  <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                    {isPaidPlan ? (
                      <>
                        Batch processing (multiple files) is on{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-200">Pro &amp; Business</span>
                        .{' '}
                        <Link to="/pricing" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                          View plans
                        </Link>
                      </>
                    ) : (
                      <>
                        Batch upload — process many videos in one go — is on{' '}
                        <Link to="/pricing" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                          Pro &amp; Business
                        </Link>
                        .
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* ── YouTube URL tab ── */}
            {inputMode === 'youtube' && (
              <div className="space-y-4">
                {/* Highlighted input card */}
                <div className="rounded-xl sm:rounded-2xl border-2 border-red-400/60 dark:border-red-500/50 bg-red-50/60 dark:bg-red-950/20 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    {/* YouTube icon (SVG — no lucide dependency) */}
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-red-600" fill="currentColor" aria-hidden>
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Paste a YouTube URL
                    </h3>
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      value={youtubeUrlInput}
                      onChange={(e) => setYoutubeUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleProcessYoutube() }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500 transition"
                    />
                    {youtubeUrlInput && (
                      <button
                        type="button"
                        onClick={() => setYoutubeUrlInput('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                        aria-label="Clear"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Example hint */}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supports regular videos, Shorts, and private-link videos.
                    Example:{' '}
                    <span className="font-mono text-gray-700 dark:text-gray-300">youtu.be/dQw4w9WgXcQ</span>
                  </p>

                  {/* Validation feedback */}
                  {youtubeUrlInput && !isYoutubeUrl(youtubeUrlInput) && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      That doesn't look like a YouTube URL. Check the link and try again.
                    </p>
                  )}
                  {youtubeUrlInput && isYoutubeUrl(youtubeUrlInput) && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ Valid YouTube URL
                    </p>
                  )}
                </div>

                {/* Options (same as file mode) */}
                <div className="rounded-xl bg-gray-50/90 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700/50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Options</h4>
                  <div className="space-y-2">
                    {/* AI Summary — Pro only */}
                    {isPaidPlan ? (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeSummary}
                          onChange={(e) => setIncludeSummary(e.target.checked)}
                          className="rounded border-gray-300 text-purple-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Include AI summary &amp; bullets</span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between opacity-60">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">Include AI summary &amp; bullets <Lock className="w-3 h-3 text-gray-400" /></span>
                        <Link to="/pricing" className="text-xs text-violet-500 font-medium hover:underline">Pro</Link>
                      </div>
                    )}
                    {/* Chapters — Pro only */}
                    {isPaidPlan ? (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeChapters}
                          onChange={(e) => setIncludeChapters(e.target.checked)}
                          className="rounded border-gray-300 text-purple-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Auto-generate chapters</span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between opacity-60">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">Auto-generate chapters <Lock className="w-3 h-3 text-gray-400" /></span>
                        <Link to="/pricing" className="text-xs text-violet-500 font-medium hover:underline">Pro</Link>
                      </div>
                    )}
                    {/* Speaker labels — Pro only */}
                    {isPaidPlan ? (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={speakerDiarization}
                          onChange={(e) => setSpeakerDiarization(e.target.checked)}
                          className="rounded border-gray-300 text-purple-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Speaker labels (who said what)</span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between opacity-60">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">Speaker labels (who said what) <Lock className="w-3 h-3 text-gray-400" /></span>
                        <Link to="/pricing" className="text-xs text-violet-500 font-medium hover:underline">Pro</Link>
                      </div>
                    )}
                    {isPaidPlan && speakerDiarization && (
                      <>
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                          Speaker identification adds extra processing time — roughly 1.5× longer than standard transcription (e.g. a 2-hour video takes ~10 min instead of ~4 min).
                        </p>
                        <div className="flex gap-2 mt-1">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">No. of speakers <span className="text-gray-400">(optional)</span></label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={numSpeakers}
                              onChange={(e) => setNumSpeakers(e.target.value)}
                              placeholder="Auto-detect"
                              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Language <span className="text-gray-400">(optional)</span></label>
                            <input
                              type="text"
                              value={diarizationLanguage}
                              onChange={(e) => setDiarizationLanguage(e.target.value)}
                              placeholder="Auto-detect (e.g. en)"
                              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Transcribe button */}
                <button
                  type="button"
                  onClick={() => void handleProcessYoutube()}
                  disabled={!youtubeUrlInput || !isYoutubeUrl(youtubeUrlInput)}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 bg-red-500 hover:bg-red-600 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Transcribe YouTube Video
                </button>
              </div>
            )}
          </div>
        )}

        {/* Batch mode — file list + process CTA */}
        {isBatchMode && status === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {batchFiles.length} video{batchFiles.length !== 1 ? 's' : ''} selected
                  </h3>
                  <span className="text-xs text-violet-500 font-medium bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">Pro · up to 20</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBatchFiles([])
                    setIsBatchMode(false)
                    setBatchTranslateLanguage('')
                    setBatchSpeakerDiarization(false)
                    setBatchPrimaryLanguage('English')
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {batchFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{f.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <button
                      type="button"
                      onClick={() => setBatchFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      aria-label="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="block">
                <span className="sr-only">Add more files</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium cursor-pointer hover:underline">
                  + Add more
                  <input
                    type="file"
                    multiple
                    accept="video/*,audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const added = Array.from(e.target.files ?? [])
                      if (added.length) setBatchFiles(prev => [...prev, ...added].slice(0, 20))
                      e.target.value = ''
                    }}
                  />
                </span>
              </label>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 p-3 space-y-3 text-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                ZIP layout: <span className="font-mono text-[11px]">Batch/&lt;video-folder&gt;/</span> with{' '}
                <span className="font-mono text-[11px]">*_transcript_original_*.txt</span>,{' '}
                <span className="font-mono text-[11px]">*_transcript_original_*.json</span>,{' '}
                <span className="font-mono text-[11px]">*_subtitles_original_*</span>,{' '}
                <span className="font-mono text-[11px]">*_notion.json</span>
                {isPaidPlan && ', plus speaker files and translated *_subtitles_translated_* / *_transcript_translated_*'}.
              </p>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Spoken language (transcription)</label>
                <select
                  value={batchPrimaryLanguage}
                  onChange={(e) => setBatchPrimaryLanguage(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              {isPaidPlan && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchSpeakerDiarization}
                      onChange={(e) => setBatchSpeakerDiarization(e.target.checked)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Speaker labels (who said what)</span>
                  </label>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Also translate subtitles to (optional)</label>
                    <select
                      value={batchTranslateLanguage}
                      onChange={(e) => setBatchTranslateLanguage(e.target.value)}
                      className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
                    >
                      <option value="">— None —</option>
                      {LANGUAGES.filter((l) => l.value !== 'English').map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleProcessBatch}
              disabled={batchFiles.length === 0 || isBatchStarting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              {isBatchStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                  Starting…
                </>
              ) : (
                <>
                  Process {batchFiles.length} video{batchFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}

        {status === 'idle' && selectedFile && (
          <ProcessingInterface
            file={{
              name: selectedFile.name,
              size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
              duration: filePreview?.durationSeconds != null ? formatDuration(filePreview.durationSeconds) : undefined,
            }}
            onRemove={() => {
              // if (fileFromWorkflow) workflow.clearVideo()
              setSelectedFile(null)
              setFileFromWorkflow(false)
            }}
            actionLabel="Transcribe Video"
            onAction={(trimStartPercent, trimEndPercent) => handleProcess(trimStartPercent, trimEndPercent)}
            actionLoading={false}
            showVideoPlayer={!!(videoPreviewUrl || filePreview?.durationSeconds)}
            videoSrc={videoPreviewUrl ?? undefined}
            durationSeconds={filePreview?.durationSeconds}
          >
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Options</h3>
              <div className="space-y-4">
                {/* AI Summary — Pro only */}
                {isPaidPlan ? (
                  <Checkbox
                    label="Include AI summary & bullets"
                    checked={includeSummary}
                    onChange={(checked) => setIncludeSummary(checked)}
                  />
                ) : (
                  <div className="flex items-center justify-between opacity-60">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      Include AI summary &amp; bullets
                      <Lock className="w-3 h-3 text-gray-400" />
                    </span>
                    <Link to="/pricing" className="text-xs text-violet-500 font-medium hover:underline">Pro</Link>
                  </div>
                )}
                {/* Chapters — Pro only */}
                {isPaidPlan ? (
                  <Checkbox
                    label="Auto-generate chapters"
                    checked={includeChapters}
                    onChange={(checked) => setIncludeChapters(checked)}
                  />
                ) : (
                  <div className="flex items-center justify-between opacity-60">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      Auto-generate chapters
                      <Lock className="w-3 h-3 text-gray-400" />
                    </span>
                    <Link to="/pricing" className="text-xs text-violet-500 font-medium hover:underline">Pro</Link>
                  </div>
                )}
                {/* Speaker labels — Pro only */}
                {isPaidPlan ? (
                  <Checkbox
                    label="Speaker labels (who said what)"
                    description="Identify and label different speakers in the transcript"
                    checked={speakerDiarization}
                    onChange={(checked) => setSpeakerDiarization(checked)}
                  />
                ) : (
                  <div className="flex items-center justify-between opacity-60">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      Speaker labels (who said what)
                      <Lock className="w-3 h-3 text-gray-400" />
                    </span>
                    <Link to="/pricing" className="text-xs text-violet-500 font-medium hover:underline">Pro</Link>
                  </div>
                )}
                {isPaidPlan && speakerDiarization && (
                  <>
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 -mt-1">
                      Speaker identification adds extra processing time — roughly 1.5× longer than standard transcription (e.g. a 2-hour video takes ~10 min instead of ~4 min).
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">No. of speakers <span className="text-gray-400">(optional)</span></label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={numSpeakers}
                          onChange={(e) => setNumSpeakers(e.target.value)}
                          placeholder="Auto-detect"
                          className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Language <span className="text-gray-400">(optional)</span></label>
                        <input
                          type="text"
                          value={diarizationLanguage}
                          onChange={(e) => setDiarizationLanguage(e.target.value)}
                          placeholder="Auto-detect (e.g. en)"
                          className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </>
                )}
                {/* Also translate to — Pro only */}
                <div className={`rounded-xl border p-3 space-y-2 transition-colors ${
                  translateEnabled && isPaidPlan
                    ? 'border-blue-200 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20'
                    : 'border-gray-100 dark:border-gray-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {isPaidPlan ? (
                      <input
                        type="checkbox"
                        checked={translateEnabled}
                        onChange={(e) => {
                          setTranslateEnabled(e.target.checked)
                          if (e.target.checked && !translationLanguage) setTranslationLanguage('Spanish')
                        }}
                        className="rounded accent-blue-500"
                      />
                    ) : null}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      Also translate to
                      {!isPaidPlan && <Lock className="w-3 h-3 text-gray-400" />}
                    </span>
                    {!isPaidPlan && (
                      <Link to="/pricing" className="ml-auto text-xs text-violet-500 font-medium hover:underline">Pro</Link>
                    )}
                  </div>
                  {translateEnabled && isPaidPlan && (
                    <>
                      <select
                        value={translationLanguage ?? 'Spanish'}
                        onChange={(e) => setTranslationLanguage(e.target.value)}
                        className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        A translated transcript will be added alongside the original — always preserved.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </ProcessingInterface>
        )}

        {/* Batch processing progress */}
        {isBatchMode && status === 'processing' && batchInfo && (
          <div className="rounded-2xl border border-violet-200/80 dark:border-violet-800/50 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/50 dark:from-violet-950/40 dark:via-gray-900/80 dark:to-fuchsia-950/20 p-6 sm:p-8 space-y-6 shadow-lg shadow-violet-500/10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex gap-4">
                <div className="shrink-0 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    Batch processing
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Each video runs full transcription; then we pack everything into one ZIP.
                  </p>
                </div>
              </div>
              <div className="text-right sm:pt-1">
                <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-300">
                  {batchInfo.progress.completed + batchInfo.progress.failed}/{batchInfo.progress.total}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">videos finished</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Overall progress</span>
                <span>{batchInfo.progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200/90 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-2.5 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${Math.min(100, batchInfo.progress.percentage)}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 border border-violet-100 dark:border-violet-900/40 text-gray-700 dark:text-gray-300">
                <FolderArchive className="w-3.5 h-3.5 text-violet-500" />
                ZIP: Batch/&lt;folder&gt;/ per video
              </span>
              {batchInfo.progress.failed > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 px-3 py-1.5 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {batchInfo.progress.failed} failed (see ZIP error log)
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 border-t border-violet-100/80 dark:border-violet-900/30 pt-4">
              Download unlocks when every video finishes. You can leave this page — the job runs on our servers.
            </p>
          </div>
        )}

        {/* Batch completed results */}
        {isBatchMode && status === 'completed' && batchInfo && (
          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/60 dark:from-emerald-950/35 dark:via-gray-900/90 dark:to-teal-950/25 p-6 sm:p-8 space-y-6 shadow-lg shadow-emerald-500/10">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Download className="w-6 h-6" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your batch is ready</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {batchInfo.progress.completed} of {batchInfo.progress.total} transcribed successfully
                  {batchInfo.progress.failed > 0 && (
                    <span className="text-amber-700 dark:text-amber-400">
                      {' '}
                      · {batchInfo.progress.failed} could not be completed (details included in the ZIP)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 leading-relaxed">
                  Inside the ZIP: <span className="font-mono">README.txt</span> explains the layout.{' '}
                  Open <span className="font-mono">Batch/</span> — each subfolder is one video with{' '}
                  <span className="font-mono">*_transcript_original_*</span>, JSON, subtitles, optional speakers, and translations.
                </p>
              </div>
            </div>
            {batchInfo.errors && batchInfo.errors.length > 0 && (
              <div className="rounded-xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-200 mb-2">Issues</p>
                <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300/90 text-xs">
                  {batchInfo.errors.map((e, i) => (
                    <li key={i}>
                      <span className="font-medium">{e.videoName}</span>: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a
              href={getBatchDownloadUrl(batchInfo.batchId)}
              download
              className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              Download all as ZIP
            </a>
            <button
              type="button"
              onClick={handleProcessAnother}
              className="w-full py-2.5 px-6 rounded-xl text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Process another batch
            </button>
          </div>
        )}

        {!isBatchMode && status === 'processing' && (
          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-8 border border-purple-100 dark:border-purple-900/30">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-purple-200 dark:border-purple-900/30">
              {/* YouTube thumbnail or file icon */}
              {youtubeThumbnailUrl ? (
                <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-800">
                  <img
                    src={youtubeThumbnailUrl}
                    alt={youtubeDisplayTitle ?? 'YouTube video'}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-purple-200 dark:bg-purple-900/50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                  {youtubeDisplayTitle ?? selectedFile?.name ?? 'Processing…'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {youtubeDisplayTitle ? (
                    <>
                      {youtubeDurationSec != null && formatDuration(youtubeDurationSec)}
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0" fill="currentColor" aria-hidden>
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        YouTube
                      </span>
                    </>
                  ) : (
                    <>
                      {selectedFile && `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                      {filePreview?.durationSeconds != null && ` • ${formatDuration(filePreview.durationSeconds)}`}
                    </>
                  )}
                </p>
              </div>
            </div>
            <ProcessingProgress
              steps={youtubeDisplayTitle ? [
                {
                  label: 'Captions',
                  status: youtubeStage == null ? 'active'
                    : youtubeStage === 'fetching_captions' ? 'active'
                    : 'completed',
                },
                {
                  label: 'Audio',
                  status: youtubeStage == null ? 'pending'
                    : youtubeStage === 'fetching_captions' ? 'pending'
                    : youtubeStage === 'downloading_audio' ? 'active'
                    : 'completed',
                },
                {
                  label: 'Transcript',
                  status: youtubeStage === 'transcribing' ? 'active'
                    : progress >= 100 ? 'completed'
                    : 'pending',
                },
              ] : [
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Processing', status: uploadPhase === 'processing' ? 'active' : uploadPhase === 'uploading' ? 'pending' : 'completed' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={
                isRehydrating ? 'Resuming…' :
                uploadPhase === 'uploading' ? `Uploading (${uploadProgress}%)` :
                youtubeDisplayTitle && youtubeStage === 'fetching_captions' ? 'Fetching captions…' :
                youtubeDisplayTitle && youtubeStage === 'downloading_audio' ? 'Downloading audio (captions unavailable)…' :
                youtubeDisplayTitle && youtubeStage === 'transcribing' ? 'Transcribing audio…' :
                youtubeDisplayTitle ? 'Processing YouTube video…' :
                'Processing audio and generating transcript'
              }
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={youtubeDisplayTitle ? undefined : '30-60 seconds'}
              statusSubtext={queuePosition !== undefined ? `${queuePosition} jobs ahead of you` : undefined}
              liveTranscript={partialSegments.map((s) => s.text).join('\n')}
              onCancel={handleCancelUpload}
            />
            <ResultSkeleton variant="transcript" />
          </div>
        )}

        {!isBatchMode && status === 'completed' && result && (
          <>
            {/* ── Teaser preview card (non-logged-in) — first 10% of real content ── */}
            {showAuthGate && !isLoggedIn() && (() => {
              const fullText = displayTranscript || fullTranscript || transcriptPreview || ''
              const previewSegs = result.segments?.length
                ? result.segments.slice(0, Math.max(3, Math.ceil(result.segments.length * 0.1)))
                : null
              const previewText = fullText.slice(0, Math.max(400, Math.ceil(fullText.length * 0.1)))
              return (
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden select-none mb-2">
                  {/* header row */}
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" aria-hidden />
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">Transcript ready</span>
                      {lastProcessingMs != null && (
                        <span className="text-xs text-gray-400">· {(lastProcessingMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {[
                        result.segments?.length ? `${result.segments.length} segments` : '',
                        fullText ? `~${Math.round(fullText.trim().split(/\s+/).length)} words` : '',
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>

                  {/* 10% preview — real segments or text, fades out at bottom */}
                  <div className="relative overflow-hidden" style={{ maxHeight: '18rem' }}>
                    <div className="px-5 py-4 space-y-2">
                      {previewSegs ? (
                        previewSegs.map((seg, i) => {
                          const mins = Math.floor(seg.start / 60)
                          const secs = Math.floor(seg.start % 60)
                          const ts = `${mins}:${String(secs).padStart(2, '0')}`
                          return (
                            <div key={i} className="flex gap-3 items-start">
                              <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 w-8">{ts}</span>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {seg.text}
                              </p>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{previewText}</p>
                      )}
                    </div>
                    {/* strong gradient fade — covers bottom ~55% to make it feel "cut off" */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none bg-gradient-to-t from-white dark:from-gray-900 via-white/60 dark:via-gray-900/60 to-transparent"
                      aria-hidden
                    />
                  </div>

                  {/* locked features + CTA */}
                  <div className="px-5 pb-5 pt-2 pointer-events-auto">
                    <p className="text-[11px] text-gray-400 mb-2 font-medium">Sign up to unlock:</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(['Full transcript', 'Summary', 'Speaker labels', 'Chapters', 'SRT / VTT / PDF'] as const).map((feat) => (
                        <span key={feat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-400 dark:text-gray-500">
                          <Lock className="w-2.5 h-2.5" aria-hidden />
                          {feat}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setAuthModalMode('signup-combo'); setShowAuthModal(true) }}
                        className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
                      >
                        Create free account
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAuthModalMode('login'); setShowAuthModal(true) }}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Log in
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

          <div className={`space-y-6 relative ${showAuthGate && !isLoggedIn() ? 'pointer-events-none select-none' : ''}`}>
            {/* Blur overlay for non-logged-in users — the JobAuthGateModal sits above this */}
            {showAuthGate && !isLoggedIn() && (
              <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-950/80 rounded-2xl" aria-hidden="true" />
            )}
            {/* Result header + primary actions */}
            <TranscriptResult
              fileName={
                result.fileName ??
                joinExportFilename(
                  exportFileStem(selectedFile?.name, 'video'),
                  `transcript_original_${langCodeForFile(exportSourceLangCode)}`,
                  '.txt'
                )
              }
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              fileSize={result.fileName ? undefined : undefined}
              transcript={displayTranscript || fullTranscript || transcriptPreview || ''}
              onDownload={async () => {
                const url = getDownloadUrl()
                if (!url) return
                try {
                  const token = getAuthToken()
                  const res = await fetch(url + '?wm=1', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  })
                  const blob = await res.blob()
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = result?.fileName ?? 'transcript.txt'
                  a.click()
                  URL.revokeObjectURL(a.href)
                } catch {
                  toast.error('Download failed')
                }
              }}
              onProcessAnother={handleProcessAnother}

              onExportSrt={handleExportSrt}
              onExportVtt={handleExportVtt}
              onCopy={handleCopyToClipboard}
              onEditToggle={isPaidPlan ? () => setTranscriptEditMode((v) => !v) : undefined}
              editLabel={transcriptEditMode ? 'Done' : 'Edit'}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              showTranscriptCard={false}
              showNextSteps={false}
            />

            {status === 'completed' &&
              result &&
              (() => {
                const jid = currentJobId || getPersistedJobId(location.pathname)
                const jtok = getPersistedJobToken(location.pathname)
                const orig = (fullTranscript || transcriptPreview || '').trim()
                if (!jid || !jtok || !orig) return null
                return (
                  <TranscriptSharePanel
                    jobId={jid}
                    jobToken={jtok}
                    sourceTool="video-to-transcript"
                    title={selectedFile?.name || result.fileName || 'Transcript'}
                    originalFullText={fullTranscript || transcriptPreview || ''}
                    translatedFullText={
                      translationLanguage && translatedCache[translationLanguage] != null
                        ? translatedCache[translationLanguage]
                        : null
                    }
                    translationLanguage={translationLanguage}
                    segments={result.segments}
                    translatedSegments={translatedSegments ?? undefined}
                    summary={result.summary}
                  />
                )
              })()}

            {/* ── Transcript stats pills ── */}
            {(() => {
              const text = displayTranscript || fullTranscript || transcriptPreview || ''
              const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
              const segCount = result.segments?.length ?? 0
              const readMin = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : 0
              const lastSeg = result.segments?.length ? result.segments[result.segments.length - 1] : null
              const durSec = lastSeg?.end ?? 0
              const durStr = durSec > 60 ? `${Math.floor(durSec / 60)}m ${String(Math.floor(durSec % 60)).padStart(2, '0')}s` : durSec > 0 ? `${Math.floor(durSec)}s` : null
              if (!wordCount) return null
              const pills = [
                wordCount > 0 && `${wordCount.toLocaleString()} words`,
                segCount > 0 && `${segCount} segments`,
                readMin > 0 && `~${readMin} min read`,
                durStr,
              ].filter(Boolean) as string[]
              return (
                <div className="flex flex-wrap items-center gap-2 px-1">
                  {pills.map((label) => (
                    <span key={label} className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {label}
                    </span>
                  ))}
                </div>
              )
            })()}

            {/* Branch tabs and workspace views */}
            <div className="space-y-4">
              {/* Branch tabs */}
              <div className="rounded-2xl bg-gray-50/90 px-3 py-3 shadow-card" role="tablist" aria-label="Transcript branches">
                <div className="flex overflow-x-auto gap-2 items-center pb-0.5 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                  {(() => {
                    const counts: Partial<Record<BranchId, number>> = {
                      speakers: getSpeakersData().length,
                      chapters: getChaptersData().length,
                    }
                    return BRANCH_IDS.map((id) => {
                      const Icon = BRANCH_ICONS[id]
                      const count = counts[id]
                      const isActive = activeBranch === id
                      return (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setActiveBranch(id)}
                          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-motion ${
                            isActive
                              ? 'bg-violet-600 text-white shadow-card ring-2 ring-violet-200 ring-offset-2 ring-offset-gray-50'
                              : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800 hover:shadow-card ring-1 ring-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          {BRANCH_LABELS[id]}
                          {count != null && count > 0 && (
                            <span className={`inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 rounded-full text-[10px] font-semibold leading-none ${
                              isActive ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-700'
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Workflow link / suggestion */}
              <div className="min-h-[2.75rem]">
                {/* <WorkflowChainSuggestion
                  pathname={location.pathname}
                  plan={(localStorage.getItem('plan') || 'free').toLowerCase()}
                  lastJobCompletedToolId={lastJobCompletedToolId}
                /> */}
              </div>

              {/* Active branch views */}
              {activeBranch === 'speakers' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Users className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Who said what
                      {audioObjectUrl && <span className="ml-auto text-[11px] font-normal text-gray-400">Click any segment to seek</span>}
                    </h3>
                    {(() => {
                      const data = getSpeakersData()
                      const hasMultipleSpeakers = data.length > 0 && data.some((d) => d.isDiarized)
                      if (!data.length) {
                        return (
                          <div className="rounded-xl bg-gray-50/80 p-4">
                            <p className="text-gray-600 text-sm font-medium mb-1">Speakers</p>
                            <p className="text-gray-500 text-sm">Check &quot;Speaker labels&quot; before transcribing to see who said what.</p>
                          </div>
                        )
                      }
                      // Assign a stable color per unique speaker label
                      const speakerColors: string[] = [
                        'border-violet-400 bg-violet-50',
                        'border-sky-400 bg-sky-50',
                        'border-emerald-400 bg-emerald-50',
                        'border-rose-400 bg-rose-50',
                        'border-amber-400 bg-amber-50',
                        'border-fuchsia-400 bg-fuchsia-50',
                      ]
                      const speakerTextColors: string[] = [
                        'text-violet-600',
                        'text-sky-600',
                        'text-emerald-600',
                        'text-rose-600',
                        'text-amber-600',
                        'text-fuchsia-600',
                      ]
                      const uniqueSpeakers = [...new Set(data.map((d) => d.speaker))]
                      const speakerColorIdx = (name: string) => uniqueSpeakers.indexOf(name) % speakerColors.length
                      return (
                        <>
                          <p className="text-sm text-gray-500 mb-4">
                            {hasMultipleSpeakers
                              ? 'Speaker labels come from voice-based detection. Each distinct voice is shown as Speaker 1, Speaker 2, and so on.'
                              : diarizationWasRequested
                                ? 'Speaker identification ran but could not detect multiple speakers — the video may have a single speaker, or the service encountered an issue. Try again if unexpected.'
                                : 'Check &quot;Speaker labels&quot; before transcribing to get automatic labels for different voices.'}
                          </p>
                          <div className="space-y-2 min-h-48 max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh] overflow-y-auto pr-1">
                            {data.map((item, i) => {
                              const seg = result?.segments?.[i]
                              const isActive = i === activeSegIdx
                              const colorClass = speakerColors[speakerColorIdx(item.speaker)]
                              const textColorClass = speakerTextColors[speakerColorIdx(item.speaker)]
                              const ts = seg
                                ? `${Math.floor(seg.start / 60)}:${String(Math.floor(seg.start % 60)).padStart(2, '0')}`
                                : null
                              return (
                                <div
                                  key={i}
                                  ref={(el) => { if (el) speakerSegmentRefsRef.current.set(i, el); else speakerSegmentRefsRef.current.delete(i) }}
                                  onClick={() => {
                                    if (!audioRef.current || !seg) return
                                    audioRef.current.currentTime = seg.start
                                    audioRef.current.play().catch(() => {})
                                  }}
                                  className={`flex gap-3 items-start border-l-2 pl-3 py-2 rounded-r-xl transition-all ${
                                    audioObjectUrl ? 'cursor-pointer' : ''
                                  } ${
                                    isActive
                                      ? `${colorClass} shadow-sm`
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                                  }`}
                                >
                                  <div className="shrink-0 flex flex-col items-end gap-0.5 pt-0.5 w-16">
                                    <span className={`text-[11px] font-semibold uppercase truncate ${isActive ? textColorClass : 'text-gray-400'}`}>
                                      {item.speaker}
                                    </span>
                                    {ts && (
                                      <span className={`text-[10px] font-mono ${isActive ? textColorClass + ' opacity-70' : 'text-gray-300'}`}>
                                        {ts}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`flex-1 text-sm leading-relaxed ${isActive ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                    {isActive && (
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 mr-1.5 mb-0.5 animate-pulse" aria-hidden />
                                    )}
                                    {transcriptView === 'translated' && translatedSegments?.[i]?.text
                                      ? translatedSegments[i].text
                                      : item.text}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

              {activeBranch === 'summary' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <ListOrdered className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Summary
                    </h3>
                    {(() => {
                      const schema = getSummarySchema()
                      const hasServer = schema.summary || (schema.bullets && schema.bullets.length > 0)
                      const hasAny = hasServer || schema.decisions.length || schema.action_items.length || schema.key_points.length
                      if (!hasAny) {
                        return (
                          <div className="rounded-xl bg-gray-50/80 p-4">
                            <p className="text-gray-600 text-sm font-medium mb-1">Summary</p>
                            <p className="text-gray-500 text-sm">Enable &quot;Include AI summary&quot; when transcribing to get a paragraph and bullet points.</p>
                          </div>
                        )
                      }
                      return (
                        <div className="grid gap-4">
                          {schema.summary && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Overview</h4>
                              <p className="text-sm text-gray-700">{schema.summary}</p>
                            </div>
                          )}
                          {schema.bullets && schema.bullets.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Key points</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {schema.bullets.map((k, i) => <li key={i}>{k}</li>)}
                              </ul>
                            </div>
                          )}
                          {schema.action_items && schema.action_items.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Action items</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {schema.action_items.map((a, i) => <li key={i}>{a}</li>)}
                              </ul>
                            </div>
                          )}
                          {!hasServer && schema.decisions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Decisions</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {schema.decisions.map((d, i) => <li key={i}>{d}</li>)}
                              </ul>
                            </div>
                          )}
                          {!hasServer && schema.key_points.length > 0 && schema.key_points !== schema.bullets && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Key points</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {schema.key_points.map((k, i) => <li key={i}>{k}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}

              {activeBranch === 'chapters' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Chapters
                    </h3>
                    {(() => {
                      const chapters = getChaptersData()
                      if (!chapters.length) {
                        return (
                          <div className="rounded-xl bg-gray-50/80 p-4">
                            <p className="text-gray-600 text-sm font-medium mb-1">Chapters</p>
                            <p className="text-gray-500 text-sm">Section headings derived from transcript paragraphs. Empty when the transcript has no paragraph structure.</p>
                          </div>
                        )
                      }
                      return (
                        <div className="space-y-2 min-h-48 max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh] overflow-y-auto">
                          {chapters.map((ch, i) => (
                            <button
                              key={i}
                              onClick={() => scrollToSegment(ch.segmentIndex)}
                              className="block w-full text-left px-3 py-2 rounded-xl bg-gray-50/80 hover:bg-violet-50/80 text-sm text-gray-800 ring-1 ring-gray-100"
                            >
                              {ch.label}
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}

              {activeBranch === 'exports' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FileCode className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Exports
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">Download transcript and derived data in your preferred format.</p>
                    {!fullTranscript ? (
                      <div className="rounded-xl bg-gray-50/80 p-4">
                        <p className="text-gray-600 text-sm font-medium mb-1">Exports</p>
                        <p className="text-gray-500 text-sm">Structured exports (JSON, CSV, Notion, Text) appear here once transcript data is available.</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500 mb-4">
                          {isPaidPlan
                            ? 'Full download available.'
                            : `Free plan: download any 2 exports with watermark (${freeExportsUsed}/2 used). Upgrade for unlimited downloads.`}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(['json', 'csv', 'notion', 'text'] as const).map((format) => {
                            const schema = getSummarySchema()
                            const speakers = getSpeakersData()
                            const chapters = getChaptersData()
                            const highlights = getHighlightsData()
                            const keywords = getKeywordsData()
                            const buildContent = () => {
                              if (format === 'json') {
                                return JSON.stringify({ summary: schema, speakers, chapters, highlights, keywords, rawPreview: fullTranscript.slice(0, 500) }, null, 2)
                              }
                              if (format === 'csv') {
                                const rows = [['type', 'content'], ['raw_preview', fullTranscript.slice(0, 300).replace(/"/g, '""')]]
                                speakers.forEach((s) => rows.push(['speaker', `"${s.speaker}","${s.text.replace(/"/g, '""')}"`]))
                                return rows.map((r) => r.join(',')).join('\n')
                              }
                              if (format === 'notion') {
                                return JSON.stringify(speakers.map((s) => ({ type: 'paragraph', rich_text: [{ text: { content: `[${s.speaker}] ${s.text}` } }] })), null, 2)
                              }
                              if (format === 'text') {
                                return fullTranscript
                              }
                              return ''
                            }
                            const content = buildContent()
                            const preview = content.slice(0, 400) + (content.length > 400 ? '…' : '')
                            const FREE_EXPORT_WATERMARK = '\n\n---\nExported from VideoText (Free Plan) · videotext.io\n'
                            const freeCanDownload = !isPaidPlan && freeExportsUsed < 2
                            const freeUsedAll = !isPaidPlan && freeExportsUsed >= 2
                            const mimeType = format === 'json' ? 'application/json' : 'text/plain'
                            const handleDownload = () => {
                              if (isPaidPlan) {
                                const blob = new Blob([content], { type: mimeType })
                                const a = document.createElement('a')
                                a.href = URL.createObjectURL(blob)
                                a.download = transcriptExportName(selectedFile?.name, format, exportSourceLangCode)
                                a.click()
                                URL.revokeObjectURL(a.href)
                                toast.success('Download started')
                                return
                              }
                              if (freeUsedAll) {
                                toast('You\'ve used your 2 free exports. Upgrade for unlimited downloads.')
                                return
                              }
                              const watermarkedContent = content + FREE_EXPORT_WATERMARK
                              setFreeExportsUsed((prev) => prev + 1)
                              const blob = new Blob([watermarkedContent], { type: mimeType })
                              const a = document.createElement('a')
                              a.href = URL.createObjectURL(blob)
                              a.download = transcriptExportName(selectedFile?.name, format, exportSourceLangCode)
                              a.click()
                              URL.revokeObjectURL(a.href)
                              toast.success('Download started (with watermark)')
                            }
                            const downloadLabel = isPaidPlan
                              ? 'Download'
                              : freeCanDownload
                                ? 'Download with watermark'
                                : '2/2 used'
                            const canClick = isPaidPlan || freeCanDownload
                            const label = format === 'json' ? 'JSON' : format === 'csv' ? 'CSV' : format === 'notion' ? 'Notion' : 'Text'
                            const formatMeta: Record<string, { color: string; dot: string; ext: string }> = {
                              json: { color: 'bg-amber-50 ring-amber-100', dot: 'bg-amber-400', ext: '.json' },
                              csv:  { color: 'bg-emerald-50 ring-emerald-100', dot: 'bg-emerald-400', ext: '.csv' },
                              notion: { color: 'bg-gray-50 ring-gray-100', dot: 'bg-gray-400', ext: '.json' },
                              text: { color: 'bg-blue-50 ring-blue-100', dot: 'bg-blue-400', ext: '.txt' },
                            }
                            const meta = formatMeta[format] ?? { color: 'bg-gray-50 ring-gray-100', dot: 'bg-gray-400', ext: '' }
                            return (
                              <div key={format} className={`rounded-xl ${meta.color} p-4 ring-1`}>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} aria-hidden />
                                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                                    <span className="text-[10px] font-mono text-gray-400">{meta.ext}</span>
                                  </div>
                                  <button
                                    onClick={handleDownload}
                                    disabled={!canClick}
                                    className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-lg transition-colors ${
                                      canClick
                                        ? 'bg-white hover:bg-violet-50 text-violet-600 hover:text-violet-700 ring-1 ring-gray-200'
                                        : 'text-gray-300 cursor-not-allowed'
                                    }`}
                                  >
                                    <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                    {downloadLabel}
                                  </button>
                                </div>
                                <pre className="text-xs text-gray-600 bg-white/70 p-3 rounded-lg max-h-28 overflow-y-auto whitespace-pre-wrap break-words ring-1 ring-white/80">
                                  {preview}
                                </pre>
                              </div>
                            )
                          })}
                        </div>
                        {/* Subtitle files — SRT (original + translated) */}
                        {segmentsForExport && segmentsForExport.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Subtitle Files</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Original SRT */}
                              {(() => {
                                const langCode = langCodeForFile(exportSourceLangCode).toUpperCase()
                                const handleDownloadSrt = () => {
                                  const srt = segmentsToSrt(segmentsForExport)
                                  const blob = new Blob([srt], { type: 'text/plain' })
                                  const a = document.createElement('a')
                                  a.href = URL.createObjectURL(blob)
                                  a.download = joinExportFilename(
                                    exportFileStem(selectedFile?.name, 'video'),
                                    `subtitles_original_${langCodeForFile(exportSourceLangCode)}`,
                                    '.srt'
                                  )
                                  a.click()
                                  URL.revokeObjectURL(a.href)
                                  toast.success('SRT downloaded')
                                }
                                return (
                                  <div className="rounded-xl bg-violet-50 ring-1 ring-violet-100 p-4">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full shrink-0 bg-violet-400" aria-hidden />
                                        <span className="text-sm font-semibold text-gray-800">SRT [{langCode}]</span>
                                        <span className="text-[10px] font-mono text-gray-400">.srt</span>
                                      </div>
                                      <button
                                        onClick={handleDownloadSrt}
                                        className="flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-lg transition-colors bg-white hover:bg-violet-50 text-violet-600 hover:text-violet-700 ring-1 ring-gray-200"
                                      >
                                        <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                        Download
                                      </button>
                                    </div>
                                    <pre className="text-xs text-gray-600 bg-white/70 p-3 rounded-lg max-h-28 overflow-y-auto whitespace-pre-wrap break-words ring-1 ring-white/80">
                                      {segmentsToSrt(segmentsForExport).slice(0, 400)}…
                                    </pre>
                                  </div>
                                )
                              })()}
                              {/* Translated SRT — only when translation available */}
                              {translateEnabled && translationLanguage && translatedSegments && (() => {
                                const langCode = languageToCode(translationLanguage).toUpperCase()
                                const trSlug = targetLangFileSlug(translationLanguage)
                                const handleDownloadTranslatedSrt = () => {
                                  const srt = segmentsToSrt(translatedSegments)
                                  const blob = new Blob([srt], { type: 'text/plain' })
                                  const a = document.createElement('a')
                                  a.href = URL.createObjectURL(blob)
                                  a.download = joinExportFilename(
                                    exportFileStem(selectedFile?.name, 'video'),
                                    `subtitles_translated_${trSlug}`,
                                    '.srt'
                                  )
                                  a.click()
                                  URL.revokeObjectURL(a.href)
                                  toast.success('Translated SRT downloaded')
                                }
                                return (
                                  <div className="rounded-xl bg-blue-50 ring-1 ring-blue-100 p-4">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full shrink-0 bg-blue-400" aria-hidden />
                                        <span className="text-sm font-semibold text-gray-800">SRT [{langCode}]</span>
                                        <span className="text-[10px] font-mono text-gray-400">.srt</span>
                                      </div>
                                      <button
                                        onClick={handleDownloadTranslatedSrt}
                                        className="flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-lg transition-colors bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 ring-1 ring-gray-200"
                                      >
                                        <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                        Download
                                      </button>
                                    </div>
                                    <pre className="text-xs text-gray-600 bg-white/70 p-3 rounded-lg max-h-28 overflow-y-auto whitespace-pre-wrap break-words ring-1 ring-white/80">
                                      {segmentsToSrt(translatedSegments).slice(0, 400)}…
                                    </pre>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}
                        {/* Translated transcript export — shown when "Also translate to" was enabled */}
                        {translateEnabled && translationLanguage && translatedCache[translationLanguage] && (
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">
                              Translated — {translationLanguage}
                            </p>
                            <div className="rounded-xl bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-950/20 dark:ring-blue-800/30 p-4">
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full shrink-0 bg-blue-400" aria-hidden />
                                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    Transcript [{languageToCode(translationLanguage).toUpperCase()}]
                                  </span>
                                  <span className="text-[10px] font-mono text-gray-400">.txt</span>
                                </div>
                                <button
                                  onClick={() => {
                                    const content = translatedCache[translationLanguage]
                                    const blob = new Blob([content], { type: 'text/plain' })
                                    const a = document.createElement('a')
                                    a.href = URL.createObjectURL(blob)
                                    a.download = joinExportFilename(
                                      exportFileStem(selectedFile?.name, 'video'),
                                      `transcript_translated_${targetLangFileSlug(translationLanguage)}`,
                                      '.txt'
                                    )
                                    a.click()
                                    URL.revokeObjectURL(a.href)
                                    toast.success('Download started')
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                  Download
                                </button>
                              </div>
                              <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white/70 dark:bg-white/5 p-3 rounded-lg max-h-28 overflow-y-auto whitespace-pre-wrap break-words ring-1 ring-white/80 dark:ring-white/10">
                                {translatedCache[translationLanguage].slice(0, 400)}
                                {translatedCache[translationLanguage].length > 400 ? '…' : ''}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
            </div>

            {/* Main transcript workspace panel (last) */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-6">
                {/* Panel header with translation sub-tabs inline */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white shrink-0">Transcript</h3>
                  {/* Translation tabs — right-aligned, shown when translation is ready */}
                  {translateEnabled && translationLanguage && (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                      {translatedCache[translationLanguage] ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setTranscriptView('original')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              transcriptView === 'original'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            Original
                          </button>
                          <button
                            type="button"
                            onClick={() => setTranscriptView('translated')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              transcriptView === 'translated'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            {translationLanguage}
                          </button>
                        </>
                      ) : fullTranscript ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-500">
                          <span className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                          Translating to {translationLanguage}…
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="flex-1 min-w-[160px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search in transcript"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  {isPaidPlan && (
                    <button
                      type="button"
                      onClick={() => setTranscriptEditMode((v) => !v)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      {transcriptEditMode ? 'Done' : 'Edit'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSrt}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                  >
                    SRT
                  </button>
                  <button
                    type="button"
                    onClick={handleExportVtt}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                  >
                    VTT
                  </button>
                </div>
                <div ref={transcriptScrollRef} className="max-h-[480px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-[15px] text-gray-700 dark:text-gray-300 leading-[1.75] tracking-[0.01em]">
                  {transcriptEditMode && editableSegments?.length ? (
                    <div className="space-y-3">
                      {editableSegments.map((seg, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-2 w-10">{formatTimestamp(seg.start)}</span>
                          <textarea
                            className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                            value={seg.text}
                            rows={2}
                            onChange={(e) => setEditableSegments((prev) => prev ? prev.map((s, j) => j === i ? { ...s, text: e.target.value } : s) : prev)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : result?.segments?.length ? (() => {
                    // Use translated segments when on translated tab (timestamps from original)
                    const segs = transcriptView === 'translated' && translatedSegments
                      ? translatedSegments
                      : result.segments
                    // Group segments into paragraphs of ~5 for readability
                    const groups: { seg: typeof segs[0]; globalIndex: number }[][] = []
                    const PARA_SIZE = 5
                    for (let i = 0; i < segs.length; i += PARA_SIZE) {
                      groups.push(segs.slice(i, i + PARA_SIZE).map((s, j) => ({ seg: s, globalIndex: i + j })))
                    }
                    return (
                      <div>
                        {groups.map((group, pi) => (
                          <p key={pi} className="mb-5">
                            {group.map(({ seg, globalIndex }) => {
                              const isActive = globalIndex === activeSegIdx
                              const origSeg = result.segments![globalIndex]
                              return (
                                <span
                                  key={globalIndex}
                                  ref={(el) => { if (el) segmentRefsRef.current.set(globalIndex, el); else segmentRefsRef.current.delete(globalIndex) }}
                                  onClick={() => {
                                    if (!audioRef.current || !origSeg) return
                                    audioRef.current.currentTime = origSeg.start
                                    audioRef.current.play().catch(() => {})
                                  }}
                                  className={audioObjectUrl ? 'cursor-pointer' : ''}
                                >
                                  <span className={`text-[11px] font-mono mr-1 ${isActive ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    ({formatTimestamp(origSeg?.start ?? seg.start)})
                                  </span>
                                  <span className={isActive ? 'bg-yellow-200 dark:bg-yellow-900/60 rounded px-0.5 transition-colors' : ''}>
                                    {seg.text}
                                  </span>{' '}
                                </span>
                              )
                            })}
                          </p>
                        ))}
                      </div>
                    )
                  })() : (
                    <div className="whitespace-pre-wrap">{displayTranscript || fullTranscript || transcriptPreview || ''}</div>
                  )}
                </div>

                {/* Audio player — below transcript */}
                {audioObjectUrl && (
                  <div className="mt-4 px-4 pt-3 pb-3 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
                    <audio
                      ref={audioRef}
                      src={audioObjectUrl}
                      crossOrigin={
                        typeof window !== 'undefined' && API_ORIGIN !== window.location.origin
                          ? 'anonymous'
                          : undefined
                      }
                      preload="metadata"
                      onLoadedMetadata={() => {
                        const dur = audioRef.current?.duration ?? 0
                        setAudioDuration(dur)
                        if (scrubberRef.current) scrubberRef.current.max = String(dur)
                      }}
                      onTimeUpdate={() => {
                        const t = audioRef.current?.currentTime ?? 0
                        audioPlaybackTimeRef.current = t
                        if (scrubberRef.current) scrubberRef.current.value = String(t)
                        if (timeDisplayRef.current) timeDisplayRef.current.textContent = formatTimestamp(t)
                        const segs = result?.segments
                        if (segs?.length) {
                          let newIdx = -1
                          for (let i = segs.length - 1; i >= 0; i--) {
                            if (t >= segs[i].start) { newIdx = i; break }
                          }
                          setActiveSegIdx(prev => prev === newIdx ? prev : newIdx)
                        }
                      }}
                      onPlay={() => setAudioIsPlaying(true)}
                      onPause={() => setAudioIsPlaying(false)}
                      onEnded={() => setAudioIsPlaying(false)}
                    />
                    {/* Play + scrubber + time */}
                    <div className="flex items-center gap-3 mb-2.5">
                      <button
                        type="button"
                        onClick={() => { if (!audioRef.current) return; audioIsPlaying ? audioRef.current.pause() : audioRef.current.play().catch(() => {}) }}
                        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white transition-all"
                      >
                        {audioIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>
                      <input
                        ref={scrubberRef}
                        type="range"
                        min={0}
                        max={audioDuration || 100}
                        step={0.1}
                        defaultValue={0}
                        onChange={(e) => {
                          const t = Number(e.target.value)
                          audioPlaybackTimeRef.current = t
                          if (audioRef.current) audioRef.current.currentTime = t
                          if (timeDisplayRef.current) timeDisplayRef.current.textContent = formatTimestamp(t)
                        }}
                        className="flex-1 h-1.5 accent-violet-600 cursor-pointer"
                      />
                      <span ref={timeDisplayRef} className="shrink-0 text-xs font-mono text-gray-500 dark:text-gray-400 w-10 text-right">
                        0:00
                      </span>
                    </div>
                    {/* Volume + speed */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title={audioMuted ? 'Unmute' : 'Mute'}
                        onClick={() => {
                          const muted = !audioMuted
                          setAudioMuted(muted)
                          if (audioRef.current) audioRef.current.muted = muted
                        }}
                        className="shrink-0 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      >
                        {audioMuted || audioVolume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={audioVolume}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setAudioVolume(v)
                          if (audioRef.current) {
                            audioRef.current.volume = v
                            audioRef.current.muted = v === 0
                          }
                          if (v > 0 && audioMuted) setAudioMuted(false)
                        }}
                        className="w-20 h-1.5 accent-violet-600 cursor-pointer"
                      />
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500 select-none">Speed</span>
                        <select
                          value={audioSpeed}
                          onChange={(e) => {
                            const s = Number(e.target.value)
                            setAudioSpeed(s)
                            if (audioRef.current) audioRef.current.playbackRate = s
                          }}
                          className="text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
                        >
                          {[0.25, 0.5, 0.75, 1, 1.5, 2].map(s => (
                            <option key={s} value={s}>{s}x</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* <CrossToolSuggestions
              workflowHint="Your last file is pre-filled on the next tool."
              suggestions={[
                { icon: Subtitles, title: 'Video → Subtitles', path: '/video-to-subtitles', description: 'Generate SRT/VTT', state: { useWorkflowVideo: true } },
                {
                  icon: Film,
                  title: 'Burn Subtitles',
                  path: '/burn-subtitles',
                  description: 'Burn captions (video + SRT pre-filled)',
                  state: { useWorkflowVideo: true, useWorkflowSrt: true },
                  onBeforeNavigate: () => {
                    // if (segmentsForExport?.length) workflow.setSrt(segmentsToSrt(segmentsForExport))
                    // if (selectedFile) workflow.setVideo(selectedFile)
                  },
                },
                { icon: Minimize2, title: 'Compress Video', path: '/compress-video', description: 'Reduce file size', state: { useWorkflowVideo: true } },
              ]}
            /> */}
          </div>
          </>
        )}

        {!isBatchMode && status === 'failed' && (
          <FailedState
            onTryAgain={() => {
              setFailedMessage(undefined)
              handleProcessAnother()
            }}
            message={failedMessage}
          />
        )}
      </ToolLayout>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />

      <JobAuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        jobDescription="Your transcript is ready!"
        onAuthSuccess={async () => {
          const jobId = currentJobId || getPersistedJobId(location.pathname)
          const jobToken = getPersistedJobToken(location.pathname)
          if (jobId && jobToken) {
            await claimGuestJob(jobId, jobToken)
          }
          setShowAuthGate(false)
          setShowAuthModal(false)
          window.location.reload()
        }}
      />

      {faq.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 px-6 max-w-7xl mx-auto" aria-label="FAQ">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Frequently asked questions</h2>
          <dl className="space-y-4">
            {faq.map((item, i) => (
              <div key={i}>
                <dt className="font-medium text-gray-800">{item.q}</dt>
                <dd className="mt-1 text-gray-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  )
}
