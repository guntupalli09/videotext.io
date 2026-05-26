import { useState, useEffect, useRef, Suspense, lazy, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, Languages, Film, Wrench, FileDown, Minimize2, Lock } from 'lucide-react'
import FailedState from '../components/FailedState'
import SamplesModule from '../components/SamplesModule'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
// import WorkflowChainSuggestion from '../components/WorkflowChainSuggestion'
import PaywallModal from '../components/PaywallModal'
import JobAuthGateModal from '../components/JobAuthGateModal'
import UpgradeBanner from '../components/UpgradeBanner'
import LanguageSelector from '../components/LanguageSelector'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { ResultSkeleton } from '../components/figma/ResultSkeleton'
import { SubtitleResult } from '../components/figma/SubtitleResult'
import { RadioGroup, Select } from '../components/figma/FormControls'
import type { SubtitleRow } from '../components/SubtitleEditor'
const SubtitleEditor = lazy(() => import('../components/SubtitleEditor'))
const SubtitleQAReview = lazy(() => import('../components/SubtitleQAReview'))
import { incrementUsage } from '../lib/usage'
import { uploadFile, uploadFileWithProgress, getJobStatus, subscribeJobStatus, getCurrentUsage, getConnectionProbeIfNeeded, BACKEND_TOOL_TYPES, SessionExpiredError, getUserFacingMessage, isNetworkError, POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS, getAuthToken, claimGuestJob } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { getFailureMessage } from '../lib/failureMessage'
import { checkVideoPreflight } from '../lib/uploadPreflight'
import { getFilePreview, formatDuration, type FilePreviewData } from '../lib/filePreview'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, getPersistedJobId, getPersistedJobToken, clearPersistedJobId } from '../lib/jobSession'
import { trackEvent, trackFirstOutputSeen } from '../lib/analytics'
// import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import toast from 'react-hot-toast'
// import { useWorkflow } from '../contexts/WorkflowContext'
import { trackAppEvent } from '../lib/feedbackEvents'
import { exportFileStem, joinExportFilename, langCodeForFile } from '../lib/exportFileNames'
// import { emitToolCompleted } from '../workflow/workflowStore'

/** Optional SEO overrides for alternate entry points (e.g. /mp4-to-srt, /subtitle-generator). Do NOT duplicate logic. */
export type VideoToSubtitlesSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
  seoTutorial?: {
    steps?: { title: string; detail: string }[]
    formatExample?: string[]
    commonMistakes?: string[]
    ctaText?: string
    ctaPath?: string
  }
}

export default function VideoToSubtitles(props: VideoToSubtitlesSeoProps = {}) {
  const { seoH1, seoIntro, faq = [], seoTutorial } = props
  const location = useLocation()
  const defaultFaq = location.pathname === '/video-to-subtitles' ? [
    { q: 'How do I generate subtitles from a video?', a: 'Upload your video file and the tool will automatically generate subtitles with timestamps.' },
    { q: 'Can I create SRT files automatically?', a: 'Yes. The tool generates SRT files instantly from video.' },
    { q: 'Is there a free subtitle generator?', a: 'Yes, you can generate subtitles online without manual editing.' },
    { q: 'Can I export subtitles in different formats?', a: 'Yes. SRT and VTT formats are supported.' },
    { q: 'Does this work for long videos?', a: 'Yes. The tool is optimized for large and long video files.' },
  ] : []
  const effectiveFaq = faq.length > 0 ? faq : defaultFaq
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [format, setFormat] = useState<'srt' | 'vtt'>('srt')
  const [language, setLanguage] = useState<string>('')
  const [additionalLanguages, setAdditionalLanguages] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('uploading')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string; warnings?: { type: string; message: string; line?: number }[] } | null>(null)
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([])
  const [showPaywall, setShowPaywall] = useState(false)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signup-combo' | 'login'>('signup-combo')
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [isRehydrating, setIsRehydrating] = useState(false)
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null)
  const [_elapsedMs, setElapsedMs] = useState(0)
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null)
  const [connectionSpeed, setConnectionSpeed] = useState<'fast' | 'medium' | 'slow' | undefined>(undefined)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [fileFromWorkflow, setFileFromWorkflow] = useState(false)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const [convertTargetFormat, setConvertTargetFormat] = useState<'srt' | 'vtt' | 'txt'>('srt')
  const [convertProgress, setConvertProgress] = useState(false)
  const [convertPreview, setConvertPreview] = useState<string | null>(null)
  const [convertDownloadUrl, setConvertDownloadUrl] = useState<string | null>(null)
  const rehydratePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeUploadPollRef = useRef<(() => void) | null>(null)
  const pollConsecutiveNetworkErrorsRef = useRef(0)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const jobStartedTrackedRef = useRef<string | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)
  const terminalRef = useRef(false)
  const lastPartialVersionRef = useRef(0)
  const [partialSegments, setPartialSegments] = useState<{ start: number; end: number; text: string }[]>([])
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  /** Set on job_completed for "Processed in XX.Xs" badge (UI only). */
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const [failedMessage, setFailedMessage] = useState<string | undefined>(undefined)

  const fallbackSubtitleName = useMemo(() => {
    const ext = format === 'vtt' ? '.vtt' : '.srt'
    return joinExportFilename(
      exportFileStem(selectedFile?.name, 'video'),
      `subtitles_original_${langCodeForFile(language || undefined)}`,
      ext
    )
  }, [selectedFile?.name, language, format])

  useEffect(() => {
    setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  useEffect(() => {
    if (status === 'completed' && !isLoggedIn()) {
      setShowAuthGate(true)
      setShowAuthModal(true)
    }
  }, [status])

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const canEdit = ['basic', 'pro', 'agency'].includes(plan)
  const canMultiLanguage = plan === 'basic' || plan === 'pro' || plan === 'agency'
  const maxAdditionalLanguages = plan === 'agency' ? 9 : plan === 'pro' ? 4 : plan === 'basic' ? 1 : 0

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
        setIsRehydrating(false)
        setProgress(jobStatus.progress ?? 0)
        if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

        const transition = getJobLifecycleTransition(jobStatus)
        if (transition === 'completed') {
          terminalRef.current = true
          setPartialSegments([])
          setStatus('completed')
          setResult(jobStatus.result ?? null)
          trackAppEvent('transcription_completed', { toolId: 'video-to-subtitles' })
          // emitToolCompleted({ toolId: 'video-to-subtitles', pathname: '/video-to-subtitles' })
          setUploadPhase('processing')
          setUploadProgress(100)
          if (isLoggedIn() && jobStatus.result?.downloadUrl) {
            try {
              const subtitleResponse = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl))
              const ct = subtitleResponse.headers.get('content-type') || ''
              const isZip =
                jobStatus.result.fileName?.toLowerCase().endsWith('.zip') || ct.includes('application/zip')
              if (!isZip) {
                const subtitleText = await subtitleResponse.text()
                setSubtitleRows(parseSubtitlesToRows(subtitleText))
              } else {
                setSubtitleRows([])
              }
            } catch {
              // ignore
            }
          }
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
        if (jobStatus.status === 'processing' && jobStatus.partialVersion != null && jobStatus.partialVersion > lastPartialVersionRef.current) {
          lastPartialVersionRef.current = jobStatus.partialVersion
          if (jobStatus.partialSegments?.length) setPartialSegments(jobStatus.partialSegments)
        }
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
            pollConsecutiveNetworkErrorsRef.current = 0
            setProgress(s.progress ?? 0)
            if (s.queuePosition !== undefined) setQueuePosition(s.queuePosition)
            const t = getJobLifecycleTransition(s)
            if (t === 'completed') {
              terminalRef.current = true
              setPartialSegments([])
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              setStatus('completed')
              setResult(s.result ?? null)
              trackAppEvent('transcription_completed', { toolId: 'video-to-subtitles' })
              // emitToolCompleted({ toolId: 'video-to-subtitles', pathname: '/video-to-subtitles' })
              if (isLoggedIn() && s.result?.downloadUrl) {
                try {
                  const res = await fetch(getAbsoluteDownloadUrl(s.result.downloadUrl))
                  const ct = res.headers.get('content-type') || ''
                  const isZip = s.result.fileName?.toLowerCase().endsWith('.zip') || ct.includes('application/zip')
                  if (!isZip) {
                    const text = await res.text()
                    setSubtitleRows(parseSubtitlesToRows(text))
                  } else {
                    setSubtitleRows([])
                  }
                } catch {
                  // ignore
                }
              }
            } else if (t === 'failed') {
              terminalRef.current = true
              setPartialSegments([])
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              setIsRehydrating(false)
              setStatus('failed')
              toast.error('Processing failed. Please try again.')
              clearPersistedJobId(pathname, navigate)
            } else if (s.status === 'processing' && s.partialVersion != null && s.partialVersion > lastPartialVersionRef.current) {
              lastPartialVersionRef.current = s.partialVersion
              if (s.partialSegments?.length) setPartialSegments(s.partialSegments)
            }
          } catch (err) {
            if (err instanceof SessionExpiredError) {
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              clearPersistedJobId(pathname, navigate)
              setIsRehydrating(false)
              setStatus('idle')
              setCurrentJobId(null)
              setUploadPhase('uploading')
              setUploadProgress(0)
              setProgress(0)
              setResult(null)
              setPartialSegments([])
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
          setStatus('idle')
          setCurrentJobId(null)
          setUploadPhase('uploading')
          setUploadProgress(0)
          setProgress(0)
          setResult(null)
          setPartialSegments([])
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

  // Keep workflow in sync when result is shown so "Next step" links pre-fill the file on the next tool
  // useEffect(() => {
  //   if (status === 'completed' && selectedFile) workflow.setVideo(selectedFile)
  // }, [status, selectedFile])

  const handleFileSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
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
    setAdditionalLanguages([])
  }

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

  const parseSubtitlesToRows = (text: string): SubtitleRow[] => {
    const blocks = text
      .replace(/\r/g, '')
      .trim()
      .split('\n\n')
      .filter(Boolean)

    const rows: SubtitleRow[] = []
    for (const block of blocks) {
      const lines = block.split('\n').filter((l) => l.trim().length > 0)
      const timeLineIdx = lines.findIndex((l) => l.includes('-->'))
      if (timeLineIdx === -1) continue

      const timeLine = lines[timeLineIdx]
      const [start, end] = timeLine.split('-->').map((s) => s.trim())
      const textLines = lines.slice(timeLineIdx + 1)
      rows.push({
        index: rows.length + 1,
        startTime: start,
        endTime: end,
        text: textLines.join('\n'),
      })
    }
    return rows
  }

  const rowsToSrt = (rows: SubtitleRow[]): string => {
    return rows
      .map((r, idx) => {
        const index = idx + 1
        return `${index}\n${r.startTime} --> ${r.endTime}\n${r.text}`
      })
      .join('\n\n')
  }

  const handleProcess = async (trimStartPercent?: number, trimEndPercent?: number) => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    const durationSeconds = filePreview?.durationSeconds ?? 0
    const hasTrim = trimStartPercent != null && trimEndPercent != null && (trimStartPercent !== 0 || trimEndPercent !== 100)
    const trimStartSec = hasTrim ? (durationSeconds * trimStartPercent!) / 100 : trimStart
    const trimEndSec = hasTrim ? (durationSeconds * trimEndPercent!) / 100 : trimEnd

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
        trackEvent('paywall_shown', { tool: 'video-to-subtitles' })
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
        trackEvent('paywall_shown', { tool: 'video-to-subtitles', reason: 'preflight' })
        return
      }
    } catch {
      uploadAbortRef.current = null
      setStatus('idle')
      toast.error('Could not validate video. Try again.')
      return
    }

    try {
      const baseOptions = {
        toolType: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
        format: plan === 'free' ? 'srt' : format,
        language: language || undefined,
        trimmedStart: (trimStartSec ?? trimStart) ?? undefined,
        trimmedEnd: (trimEndSec ?? trimEnd) ?? undefined,
        additionalLanguages: canMultiLanguage ? additionalLanguages : undefined,
      }
      setUploadPhase('uploading')
      trackEvent('processing_started', { tool: 'video-to-subtitles' })

      const response = await uploadFileWithProgress(
        selectedFile,
        baseOptions,
        {
          onProgress: (p) => setUploadProgress(p),
          connectionSpeed: connectionSpeedResult,
          signal: uploadAbortRef.current?.signal,
        }
      )

      uploadAbortRef.current = null
      setCurrentJobId(response.jobId)
      persistJobId(location.pathname, response.jobId, response.jobToken)
      setUploadPhase('processing')
      setUploadProgress(100)
      terminalRef.current = false
      lastPartialVersionRef.current = 0
      setPartialSegments([])
      const startedAt = Date.now()
      setProcessingStartedAt(startedAt)
      processingStartedAtRef.current = startedAt
      // texJobStarted()

      const jobToken = response.jobToken
      const handleJobStatus = (jobStatus: import('../lib/api').JobStatus) => {
        if (terminalRef.current) return
        setProgress(jobStatus.progress ?? 0)
        if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)
        if (jobStatus.status === 'processing' && jobStartedTrackedRef.current !== response.jobId) {
          jobStartedTrackedRef.current = response.jobId
          try {
            trackEvent('job_started', { job_id: response.jobId, tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES })
          } catch {
            // non-blocking
          }
        }
        const transition = getJobLifecycleTransition(jobStatus)
        if (transition === 'completed') {
          terminalRef.current = true
          setPartialSegments([])
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current()
            activeUploadPollRef.current = null
          }
          jobStartedTrackedRef.current = null
          setStatus('completed')
          setResult(jobStatus.result ?? null)
          trackAppEvent('transcription_completed', { toolId: 'video-to-subtitles' })
          const started = processingStartedAtRef.current ?? Date.now()
          const processingMs = Date.now() - started
          // emitToolCompleted({ toolId: 'video-to-subtitles', pathname: '/video-to-subtitles', processingMs })
          if (isLoggedIn() && jobStatus.result?.downloadUrl) {
            try {
              fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl))
                .then((subtitleResponse) => {
                  const ct = subtitleResponse.headers.get('content-type') || ''
                  const isZip =
                    (jobStatus.result?.fileName?.toLowerCase().endsWith('.zip')) ||
                    ct.includes('application/zip')
                  if (isZip) {
                    setSubtitleRows([])
                    return
                  }
                  return subtitleResponse.text()
                })
                .then((subtitleText) => {
                  if (typeof subtitleText === 'string') setSubtitleRows(parseSubtitlesToRows(subtitleText))
                })
                .catch(() => setSubtitleRows([]))
            } catch {
              // Ignore preview fetch errors
            }
          }
          incrementUsage('video-to-subtitles')
          try {
            trackEvent('job_completed', {
              job_id: response.jobId,
              tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
              processing_time_ms: processingMs,
            })
            trackFirstOutputSeen({ tool: 'video-to-subtitles', source: 'result_panel' })
            trackAppEvent('first_output_seen', { tool: 'video-to-subtitles', source: 'result_panel' })
            trackEvent('processing_completed', { tool: 'video-to-subtitles' })
            // texJobCompleted(processingMs, 'video-to-subtitles')
            setLastProcessingMs(processingMs)
          } catch {
            // non-blocking
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

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setFilePreview(null)
    setCurrentJobId(null)
    uploadAbortRef.current = null
    terminalRef.current = false
    lastPartialVersionRef.current = 0
    setTrimStart(null)
    setTrimEnd(null)
    setAdditionalLanguages([])
    setStatus('idle')
    setProgress(0)
    setUploadPhase('uploading')
    setUploadProgress(0)
    setResult(null)
    setSubtitleRows([])
    setPartialSegments([])
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  const currentResultFormat = result?.fileName?.toLowerCase().endsWith('.vtt') ? 'vtt' : result?.fileName?.toLowerCase().endsWith('.txt') ? 'txt' : 'srt'

  const handleConvertFormat = async () => {
    if (!result?.downloadUrl || !result?.fileName) return
    if (convertTargetFormat === currentResultFormat) {
      window.open(getDownloadUrl(), '_blank')
      return
    }
    try {
      const effectiveFormat = plan === 'free' ? 'srt' : convertTargetFormat
      if (plan === 'free' && convertTargetFormat !== 'srt') {
        toast('Free plan: SRT only. Upgrade for VTT and other formats.')
        return
      }
      setConvertProgress(true)
      setConvertPreview(null)
      const res = await fetch(getDownloadUrl())
      const blob = await res.blob()
      const file = new File([blob], result.fileName || fallbackSubtitleName, { type: blob.type || 'text/plain' })
      const uploadRes = await uploadFile(file, {
        toolType: BACKEND_TOOL_TYPES.CONVERT_SUBTITLES,
        targetFormat: effectiveFormat,
      })
      const pollIntervalRef = { current: 0 as number }
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(uploadRes.jobId, uploadRes.jobToken ? { jobToken: uploadRes.jobToken } : undefined)
          if (getJobLifecycleTransition(jobStatus) === 'completed' && jobStatus.result?.downloadUrl) {
            clearInterval(pollIntervalRef.current)
            const convertedUrl = getAbsoluteDownloadUrl(jobStatus.result.downloadUrl)
            if (plan === 'free') {
              const prevRes = await fetch(convertedUrl)
              const text = await prevRes.text()
              const lines = text.split(/\n\n|\n/).slice(0, 30)
              setConvertPreview(lines.join('\n'))
              setConvertDownloadUrl(convertedUrl)
            } else {
              window.open(convertedUrl, '_blank')
            }
          } else if (getJobLifecycleTransition(jobStatus) === 'failed') {
            clearInterval(pollIntervalRef.current)
            toast.error('Conversion failed.')
          }
        } catch {
          // keep polling
        }
      }
      pollIntervalRef.current = window.setInterval(doPoll, JOB_POLL_INTERVAL_MS)
      doPoll()
    } catch (e: any) {
      toast.error(e.message || 'Conversion failed')
    } finally {
      setConvertProgress(false)
    }
  }

  const breadcrumbs = [{ label: 'Video to Subtitles', href: '/video-to-subtitles' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Subtitle Generator (Auto Create SRT & VTT from Video)',
    subtitle: seoIntro ?? 'Generate subtitles from video instantly. Create SRT and VTT files with accurate timestamps — no manual editing. 👉 Upload video → get subtitles in seconds (SRT, VTT ready). 👉 Works for long videos, multiple formats, and instant export.',
    icon: <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
    tags: ['SRT', 'VTT', 'Subtitles', 'Captions', 'Timestamps', 'Multi-format'],
    sidebar: null,
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        <UpgradeBanner variant="watermark" />
        {status === 'idle' && !selectedFile && (
          <div className="space-y-4">
            <UploadZone
              immediateSelect
              onFileSelect={handleFileSelect}
              initialFiles={selectedFile ? [selectedFile] : null}
              onRemove={() => {
                // if (fileFromWorkflow) workflow.clearVideo()
                setSelectedFile(null)
                setFileFromWorkflow(false)
              }}
              fromWorkflowLabel={fileFromWorkflow ? 'From previous step' : undefined}
            />
            {location.pathname === '/video-to-subtitles' && (
              <SamplesModule sourcePath={location.pathname} samplesHref="/samples#subtitle" />
            )}
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
            actionLabel="Generate Subtitles"
            onAction={(trimStartPercent, trimEndPercent) => handleProcess(trimStartPercent, trimEndPercent)}
            actionLoading={false}
            showVideoPlayer={!!(videoPreviewUrl || filePreview?.durationSeconds)}
            videoSrc={videoPreviewUrl ?? undefined}
            durationSeconds={filePreview?.durationSeconds}
          >
            <div className="space-y-6">
              <RadioGroup
                label="Subtitle Format"
                options={
                  plan === 'free'
                    ? [{ value: 'srt', label: 'SRT (Recommended for YouTube)', description: 'Free plan: SRT only. Upgrade for VTT.' }]
                    : [
                        { value: 'srt', label: 'SRT (Recommended for YouTube)', description: 'Use SRT for most platforms' },
                        { value: 'vtt', label: 'VTT (Recommended for web)', description: 'Web Video Text Tracks format' },
                      ]
                }
                value={plan === 'free' ? 'srt' : format}
                onChange={(v) => setFormat(v as 'srt' | 'vtt')}
              />
              <Select
                label="Language (optional)"
                options={[
                  { value: '', label: 'Auto-detect' },
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'de', label: 'German' },
                  { value: 'ar', label: 'Arabic' },
                  { value: 'hi', label: 'Hindi' },
                  { value: 'zh', label: 'Chinese' },
                  { value: 'ja', label: 'Japanese' },
                ]}
                value={language}
                onChange={setLanguage}
              />
              {canMultiLanguage && (
                <LanguageSelector
                  primaryLanguage={language || 'en'}
                  selected={additionalLanguages}
                  onChange={setAdditionalLanguages}
                  maxAdditional={maxAdditionalLanguages}
                />
              )}
            </div>
          </ProcessingInterface>
        )}

        {status === 'processing' && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-8">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {selectedFile?.name} • {filePreview?.durationSeconds != null ? formatDuration(filePreview.durationSeconds) : '—'}
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Processing', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={
                isRehydrating
                  ? 'Resuming…'
                  : uploadPhase === 'uploading'
                    ? `Uploading (${uploadProgress}%)`
                    : 'Generating subtitles…'
              }
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={uploadPhase === 'uploading' ? '1–2 minutes for large files' : '20–40 seconds'}
              statusSubtext={
                uploadPhase === 'processing' && queuePosition !== undefined
                  ? `Queue position: ${queuePosition}`
                  : connectionSpeed === 'slow' && uploadPhase === 'uploading'
                    ? 'Slow connection; optimizing upload'
                    : undefined
              }
              livePreviewLabel="Live subtitles with timestamps"
              liveTranscript={
                uploadPhase === 'processing' && partialSegments.length > 0
                  ? partialSegments
                      .map((s) => {
                        const h = Math.floor(s.start / 3600)
                        const m = Math.floor((s.start % 3600) / 60)
                        const sec = s.start % 60
                        const ts = h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec.toFixed(1)}` : `${m}:${sec.toFixed(1)}`
                        return `${ts}  ${s.text.trim()}`
                      })
                      .join('\n')
                  : undefined
              }
              onCancel={handleCancelUpload}
            />
            <ResultSkeleton variant="subtitle" />
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-6">
            {/* Teaser card for guests */}
            {showAuthGate && !isLoggedIn() && (
              <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden select-none">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">Subtitles ready!</span>
                    {lastProcessingMs != null && (
                      <span className="text-xs text-gray-400">· {(lastProcessingMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] text-gray-400 mb-2 font-medium">Sign up to unlock:</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {([`Download ${format.toUpperCase()} file`, '2 free exports', 'Edit subtitles'] as const).map((feat) => (
                      <span key={feat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-400 dark:text-gray-500">
                        <Lock className="w-2.5 h-2.5" />
                        {feat}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setAuthModalMode('signup-combo'); setShowAuthModal(true) }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
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
            )}

            {/* Full result — hidden until signed in */}
            {(!showAuthGate || isLoggedIn()) && (
            <SubtitleResult
              fileName={result.fileName ?? fallbackSubtitleName}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              format={format.toUpperCase() as 'SRT' | 'VTT'}
              onDownload={
                plan === 'free'
                  ? async () => {
                      if (freeExportsUsed >= 2) {
                        toast('You\'ve used your 2 free downloads. Upgrade for more.')
                        return
                      }
                      try {
                        const token = getAuthToken()
                        const res = await fetch(getDownloadUrl() + '?wm=1', {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        })
                        const blob = await res.blob()
                        const a = document.createElement('a')
                        a.href = URL.createObjectURL(blob)
                        a.download = result?.fileName || fallbackSubtitleName
                        a.click()
                        URL.revokeObjectURL(a.href)
                        trackAppEvent('export_clicked', { toolId: 'video-to-subtitles' })
                        try { trackEvent('result_downloaded', { tool: 'video-to-subtitles', format, plan: 'free' }) } catch { /* non-blocking */ }
                        setFreeExportsUsed((prev) => prev + 1)
                        toast.success('Download started (with watermark)')
                      } catch {
                        toast.error('Download failed')
                      }
                    }
                  : async () => {
                      try {
                        const token = getAuthToken()
                        const res = await fetch(getDownloadUrl() + '?wm=1', {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        })
                        const blob = await res.blob()
                        const a = document.createElement('a')
                        a.href = URL.createObjectURL(blob)
                        a.download = result?.fileName || fallbackSubtitleName
                        a.click()
                        URL.revokeObjectURL(a.href)
                        try { trackEvent('result_downloaded', { tool: 'video-to-subtitles', format, plan: 'paid' }) } catch { /* non-blocking */ }
                      } catch {
                        toast.error('Download failed')
                      }
                    }
              }
              onProcessAnother={handleProcessAnother}
              relatedTools={[]}
            />
            )}{/* end gate-hidden result */}
            <div className="mt-2 min-h-[2.75rem]">
            {/* <WorkflowChainSuggestion
              pathname={location.pathname}
              plan={plan}
              lastJobCompletedToolId={lastJobCompletedToolId}
            /> */}
            </div>

            {subtitleRows.length > 0 && (
              <div className="space-y-2">
                <Suspense fallback={<div className="h-64 rounded-xl bg-gray-900 animate-pulse" />}>
                  <SubtitleQAReview
                    videoSrc={videoPreviewUrl}
                    rows={subtitleRows}
                    onRowsChange={canEdit ? setSubtitleRows : () => {}}
                    editable={canEdit}
                    onDownloadEdited={() => {
                      const content = rowsToSrt(subtitleRows)
                      const blob = new Blob([content], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = (result.fileName || fallbackSubtitleName).replace(/\.vtt$/i, '.srt')
                      a.click()
                      URL.revokeObjectURL(url)
                      try { trackEvent('result_downloaded', { tool: 'video-to-subtitles', format: 'srt', edited: true }) } catch { /* non-blocking */ }
                    }}
                  />
                </Suspense>
                {!canEdit && (
                  <p className="text-xs text-gray-500 px-1">
                    Upgrade to Basic to edit subtitle text. Click any cue to seek and play the video.
                  </p>
                )}
              </div>
            )}

            {/* Phase 1B — UTILITY 2B: Convert format. Derived from subtitle files; free: preview 30 lines, paid: full download. */}
            <div className="bg-white rounded-xl p-6 shadow-card">
              <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center gap-2">
                <FileDown className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                Convert format
              </h3>
              <p className="text-sm text-gray-600 mb-4">Download subtitles in another format (SRT, VTT, or plain text).</p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={plan === 'free' ? 'srt' : convertTargetFormat}
                  onChange={(e) => setConvertTargetFormat(e.target.value as 'srt' | 'vtt' | 'txt')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={plan === 'free'}
                >
                  <option value="srt">SRT</option>
                  {plan !== 'free' && (
                    <>
                      <option value="vtt">VTT</option>
                      <option value="txt">TXT (plain text)</option>
                    </>
                  )}
                </select>
                <button
                  onClick={handleConvertFormat}
                  disabled={convertProgress}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {convertProgress ? 'Converting…' : `Get as ${convertTargetFormat.toUpperCase()}`}
                </button>
              </div>
              {plan === 'free' && (
                <p className="text-xs text-gray-500 mt-2">
                  Free plan: SRT only. Preview below. You can download 1 format with watermark ({freeExportsUsed}/2 total downloads used).
                </p>
              )}
              {convertPreview !== null && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-700 mb-2">Preview (first 30 lines)</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{convertPreview}</pre>
                </div>
              )}
              {plan === 'free' && convertDownloadUrl && freeExportsUsed < 2 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!convertDownloadUrl || freeExportsUsed >= 2) return
                    try {
                      const token = getAuthToken()
                      const res = await fetch(convertDownloadUrl + '?wm=1', {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      })
                      const ext = convertTargetFormat === 'srt' ? 'srt' : convertTargetFormat === 'vtt' ? 'vtt' : 'txt'
                      const blob = await res.blob()
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = joinExportFilename(
                        exportFileStem(selectedFile?.name, 'video'),
                        `subtitles_converted_${convertTargetFormat}`,
                        `.${ext}`
                      )
                      a.click()
                      URL.revokeObjectURL(a.href)
                      try { trackEvent('result_downloaded', { tool: 'video-to-subtitles', format: convertTargetFormat, plan: 'free' }) } catch { /* non-blocking */ }
                      setFreeExportsUsed((prev) => prev + 1)
                      setConvertDownloadUrl(null)
                      toast.success('Download started (with watermark)')
                    } catch {
                      toast.error('Download failed')
                    }
                  }}
                  className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Download converted file with watermark
                </button>
              )}
            </div>

            <CrossToolSuggestions
              workflowHint="Your last file is pre-filled on the next tool."
              suggestions={[
                { icon: Languages, title: 'Translate Subtitles', path: '/translate-subtitles', description: 'Translate to another language' },
                { icon: Film, title: 'Burn Subtitles', path: '/burn-subtitles', description: 'Burn into video', state: { useWorkflowVideo: true } },
                { icon: Wrench, title: 'Fix Subtitles', path: '/fix-subtitles', description: 'Fix timing & format' },
                { icon: Minimize2, title: 'Compress Video', path: '/compress-video', description: 'Reduce file size', state: { useWorkflowVideo: true } },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
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
          onUpgrade={() => {
            // Send the user to the pricing page where they can pick a plan
            window.location.href = '/pricing'
          }}
        />

      <JobAuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        jobDescription="Your subtitles are ready!"
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

      {(seoTutorial?.steps?.length || seoTutorial?.formatExample?.length || seoTutorial?.commonMistakes?.length) && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 max-w-4xl mx-auto px-4 space-y-6" aria-label="Tutorial">
          {seoTutorial?.steps?.length && (
            <div>
              <h2 className="text-2xl font-medium text-gray-800 mb-4">Step-by-step tutorial</h2>
              <ol className="space-y-4">
                {seoTutorial.steps.map((step, i) => (
                  <li key={i}>
                    <h3 className="font-medium text-gray-800">{step.title}</h3>
                    <p className="text-gray-600 mt-1">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {seoTutorial?.formatExample?.length && (
            <div>
              <h2 className="text-2xl font-medium text-gray-800 mb-3">Valid SRT format example</h2>
              <pre className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 overflow-x-auto">
                {seoTutorial.formatExample.join('\n')}
              </pre>
            </div>
          )}

          {seoTutorial?.commonMistakes?.length && (
            <div>
              <h2 className="text-2xl font-medium text-gray-800 mb-3">Common SRT mistakes to avoid</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                {seoTutorial.commonMistakes.map((mistake, i) => (
                  <li key={i}>{mistake}</li>
                ))}
              </ul>
            </div>
          )}

          {seoTutorial?.ctaText && seoTutorial?.ctaPath && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
              <p className="text-sm text-gray-700 mb-2">Manual SRT editing works for short clips. For longer videos, generate subtitles automatically and edit only what needs review.</p>
              <Link to={seoTutorial.ctaPath} className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                {seoTutorial.ctaText}
              </Link>
            </div>
          )}
        </section>
      )}



      {location.pathname === '/video-to-subtitles' && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 max-w-4xl mx-auto px-4 space-y-8" aria-label="Subtitle Generator SEO content">
          <div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Generate Subtitles from Video Instantly</h2>
            <p className="text-gray-600">Create subtitles automatically from any video file. No timeline editing or manual typing required. This subtitle generator is built for creators who need fast, accurate captions without extra cleanup. Need full text output too? Convert video to transcript with our <Link to="/video-to-transcript" className="text-blue-600 hover:text-blue-700 font-medium">video to transcript tool</Link>.</p>
          </div>

          <div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Create SRT &amp; VTT Subtitle Files Automatically</h2>
            <p className="text-gray-600">Generate ready-to-use subtitle files for YouTube, social media, and video platforms. Export in SRT or VTT in seconds with clean timestamps. Need multilingual workflows after export? Use <Link to="/translate-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">translate subtitles</Link> to localize files instantly.</p>
          </div>

          <div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Automatic Subtitle Generator (No Manual Editing)</h2>
            <p className="text-gray-600">Most tools require heavy cleanup. This tool generates clean subtitles, adds timestamps automatically, and outputs ready-to-use files. Working from YouTube content? Start with our <Link to="/youtube-transcript-generator" className="text-blue-600 hover:text-blue-700 font-medium">YouTube transcript generator</Link> and export subtitles when ready.</p>
          </div>

          <div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Generate Subtitles for Long Videos Fast</h2>
            <p className="text-gray-600">Built for large files and long-form content: process long videos efficiently, no splitting required, and fast output even for large files. Need higher-volume or queue-style workflows? Use <Link to="/transcribe-long-videos" className="text-blue-600 hover:text-blue-700 font-medium">transcribe long videos</Link>.</p>
          </div>

          <div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Why This Subtitle Generator Is Better</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>Automatic timestamps — no manual sync</li>
              <li>Multi-format export — SRT, VTT</li>
              <li>Fast processing — minutes, not hours</li>
              <li>Clean output — minimal editing needed</li>
              <li>Privacy-first — files deleted after processing</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Who Needs a Subtitle Generator?</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>YouTubers → captions for videos</li>
              <li>Social media creators → subtitles for engagement</li>
              <li>Agencies → scale caption workflows</li>
              <li>Educators → accessibility and learning</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">More Transcription &amp; Subtitle Tools</h2>
            <ul className="space-y-2 text-gray-600">
              <li><Link to="/video-to-transcript" className="text-blue-600 hover:text-blue-700 font-medium">Video to transcript tool</Link></li>
              <li><Link to="/youtube-transcript-generator" className="text-blue-600 hover:text-blue-700 font-medium">YouTube transcript generator</Link></li>
              <li><Link to="/voice-recorder" className="text-blue-600 hover:text-blue-700 font-medium">Voice to text (live transcription)</Link></li>
              <li><Link to="/translate-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Translate subtitles</Link></li>
              <li><Link to="/transcribe-long-videos" className="text-blue-600 hover:text-blue-700 font-medium">Transcribe long videos fast</Link></li>
            </ul>
          </div>
        </section>
      )}

      {effectiveFaq.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 max-w-4xl mx-auto px-4" aria-label="FAQ">
          <h2 className="text-2xl font-medium text-gray-800 mb-4">Frequently asked questions</h2>
          <dl className="space-y-4">
            {effectiveFaq.map((item, i) => (
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
