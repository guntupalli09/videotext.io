import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Film } from 'lucide-react'
// import { useWorkflow } from '../contexts/WorkflowContext'
import FailedState from '../components/FailedState'
import CoreToolSeoDepth from '../components/CoreToolSeoDepth'
import CollapsibleFaqSection from '../components/CollapsibleFaqSection'
import SamplesModule from '../components/SamplesModule'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import FreePlanNudge from '../components/FreePlanNudge'
import SecondJobUpgradeNudge from '../components/SecondJobUpgradeNudge'
import { isPaidPlan } from '../lib/plans'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { ResultSkeleton } from '../components/figma/ResultSkeleton'
import { TranslateResult } from '../components/figma/TranslateResult'
import ResultHeader from '../components/ResultHeader'
import { ExportsPanel, ExportSection } from '../components/figma/ExportsPanel'
import { ProcessingStateShell } from '../components/figma/ProcessingStateShell'
import { VideoResultPreview } from '../components/figma/VideoResultPreview'
import ResultUpgradeCard from '../components/ResultUpgradeCard'
import { Select } from '../components/figma/FormControls'
import { getFilePreview, formatDuration, type FilePreviewData } from '../lib/filePreview'
import { incrementUsage } from '../lib/usage'
import { incrementJobCompletedCount } from '../lib/jobCount'
import { uploadDualFilesWithProgress, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError, ensureGuestJobClaimed } from '../lib/api'
import { resolveCompletedJobResult } from '../lib/resolveCompletedJob'
import {
  canDownloadResult,
  hasDownloadableResult,
  needsResultRefetchAfterClaim,
  phaseForResolvedJob,
  phaseRecoveryCopy,
  type JobResultPhase,
} from '../lib/jobResultState'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { downloadAuthedUrl, downloadErrorMessage, resolveResultDownloadUrl, trackDownloadFailure } from '../lib/downloadResult'
import { persistJobId, clearPersistedJobId, getPersistedJobId, getPersistedJobToken } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import { isLoggedIn } from '../lib/auth'
import JobAuthGateModal from '../components/JobAuthGateModal'
// import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import toast from 'react-hot-toast'
import { Minimize2, FileText, MessageSquare } from 'lucide-react'
import { trackAppEvent } from '../lib/feedbackEvents'
import { exportFileStem, joinExportFilename } from '../lib/exportFileNames'
// import { emitToolCompleted } from '../workflow/workflowStore'

/** Optional SEO overrides for alternate entry points. Do NOT duplicate logic. */
export type BurnSubtitlesSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function BurnSubtitles(props: BurnSubtitlesSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()
  // const workflow = useWorkflow()
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null)
  const [videoFromWorkflow, setVideoFromWorkflow] = useState(false)
  const [srtFromWorkflow, setSrtFromWorkflow] = useState(false)
  /**
   * A finished worker job is not the same as a downloadable result. 'ready'
   * means and only means "a usable downloadUrl is in memory"; the two terminal
   * states that are NOT downloadable get their own values so the recovery UI can
   * render without the success panel ever claiming the video is ready.
   */
  const [status, setStatus] = useState<JobResultPhase>('idle')

  // useEffect(() => {
  //   const state = location.state as { useWorkflowVideo?: boolean; useWorkflowSrt?: boolean } | undefined
  //   if (state?.useWorkflowVideo && workflow.videoFile) {
  //     setVideoFile(workflow.videoFile)
  //     setVideoFromWorkflow(true)
  //   }
  //   if (state?.useWorkflowSrt && workflow.srtContent) {
  //     const blob = new Blob([workflow.srtContent], { type: 'text/plain;charset=utf-8' })
  //     setSubtitleFile(new File([blob], 'subtitles.srt', { type: 'text/plain' }))
  //     setSrtFromWorkflow(true)
  //   }
  // }, [location.state, workflow.videoFile, workflow.srtContent])

  // Keep workflow in sync when result is shown so "Next step" links pre-fill video on the next tool
  // useEffect(() => {
  //   if (status === 'ready' && videoFile) workflow.setVideo(videoFile)
  // }, [status, videoFile])

  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [position, setPosition] = useState<'bottom' | 'middle'>('bottom')
  const [backgroundOpacity, setBackgroundOpacity] = useState<'none' | 'low' | 'high'>('low')
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('processing')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progress, setProgress] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)
  // Guards one job_started per job; polling revisits 'processing' on every tick.
  const jobStartedTrackedRef = useRef<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signup-combo' | 'login'>('signup-combo')
  const pendingDownloadRef = useRef<(() => void) | null>(null)
  const [isRefreshingResult, setIsRefreshingResult] = useState(false)
  /**
   * Mirrors `result` but is written synchronously. The download actions are
   * closures created during render; replaying one right after a refresh would
   * otherwise read the blank result captured before the refetch. Every write to
   * `result` goes through applyResult so the two can never diverge.
   */
  const resultRef = useRef<{ downloadUrl: string; fileName?: string } | null>(null)

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const hasPaidPlan = isPaidPlan(plan)

  const fallbackBurnName = useMemo(
    () => joinExportFilename(exportFileStem(videoFile?.name, 'video'), 'video_with_subtitles_burned_in', '.mp4'),
    [videoFile?.name]
  )

  useEffect(() => {
    if (result?.downloadUrl) setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  /**
   * Recover a completed job after a reload.
   *
   * persistJobId() stores the job id and token for this path, but nothing read
   * them back, so refreshing dropped the result entirely and returned the page
   * to 'idle' — while the download-failure copy was telling users to refresh.
   * Resolve the persisted job on mount instead, so the advice is true and a
   * finished render is never stranded behind a reload.
   */
  useEffect(() => {
    const jobId = getPersistedJobId(location.pathname)
    if (!jobId) return
    const jobToken = getPersistedJobToken(location.pathname)
    let cancelled = false
    ;(async () => {
      try {
        const jobStatus = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
        if (cancelled) return
        if (getJobLifecycleTransition(jobStatus) !== 'completed') return
        const resolved = await resolveCompletedJobResult(jobId, jobToken ?? undefined, jobStatus)
        if (cancelled) return
        const phase = phaseForResolvedJob(resolved)
        applyResult(hasDownloadableResult(resolved.status?.result) ? resolved.status!.result! : null)
        setStatus(phase)
      } catch {
        // Non-blocking: a stale or expired job simply leaves the page idle.
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status === 'authentication-required' && !isLoggedIn()) {
      setShowAuthModal(true)
    }
  }, [status])

  useEffect(() => {
    if (!videoFile) {
      setFilePreview(null)
      return
    }
    let cancelled = false
    getFilePreview(videoFile).then((p) => {
      if (!cancelled) setFilePreview(p)
    })
    return () => { cancelled = true }
  }, [videoFile])

  useEffect(() => {
    if (videoFile && videoFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(videoFile)
      setVideoPreviewUrl(url)
      return () => {
        setVideoPreviewUrl(null)
        const u = url
        setTimeout(() => URL.revokeObjectURL(u), 0)
      }
    }
    setVideoPreviewUrl(null)
  }, [videoFile])

  const handleVideoSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.BURN_SUBTITLES,
        file_size_bytes: file.size,
        file_role: 'video',
      })
    } catch {
      // non-blocking
    }
    // workflow.setVideo(file)
    setVideoFile(file)
    setVideoFromWorkflow(false)
    setTrimStart(null)
    setTrimEnd(null)
  }

  const handleSubtitleSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.BURN_SUBTITLES,
        file_size_bytes: file.size,
        file_role: 'subtitle',
      })
    } catch {
      // non-blocking
    }
    setSubtitleFile(file)
  }

  const handleProcess = async (trimStartPercent?: number, trimEndPercent?: number) => {
    if (!videoFile || !subtitleFile) {
      toast.error('Please upload both video and subtitle files')
      return
    }

    const durationSeconds = filePreview?.durationSeconds ?? 0
    const hasTrim = trimStartPercent != null && trimEndPercent != null && (trimStartPercent !== 0 || trimEndPercent !== 100)
    const trimStartSec = hasTrim ? (durationSeconds * trimStartPercent!) / 100 : trimStart
    const trimEndSec = hasTrim ? (durationSeconds * trimEndPercent!) / 100 : trimEnd

    try {
      const usageData = await getCurrentUsage()
      const isImports = usageData.quotaType === 'imports'
      const totalAvailable = isImports ? (usageData.limit ?? 3) : (usageData.limits.minutesPerMonth + usageData.overages.minutes)
      const used = isImports ? (usageData.used ?? usageData.usage?.importCount ?? 0) : usageData.usage.totalMinutes
      const atOrOverLimit = isImports ? used >= (usageData.limit ?? 3) : (totalAvailable > 0 && used >= totalAvailable)
      if (atOrOverLimit) {
        setShowPaywall(true)
        return
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    try {
      setStatus('processing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      const startedAt = Date.now()
      processingStartedAtRef.current = startedAt
      // texJobStarted()

      const response = await uploadDualFilesWithProgress(videoFile, subtitleFile, BACKEND_TOOL_TYPES.BURN_SUBTITLES, {
        trimmedStart: (trimStartSec ?? trimStart) ?? undefined,
        trimmedEnd: (trimEndSec ?? trimEnd) ?? undefined,
        burnFontSize: fontSize,
        burnPosition: position,
        burnBackgroundOpacity: backgroundOpacity,
      }, { onProgress: (p) => setUploadProgress(p) })
      setUploadPhase('processing')
      setUploadProgress(100)

      persistJobId(location.pathname, response.jobId, response.jobToken)
      const pollIntervalRef = { current: 0 as number }
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId, response.jobToken ? { jobToken: response.jobToken } : undefined)
          setProgress(jobStatus.progress ?? 0)
          if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

          if (jobStatus.status === 'processing' && jobStartedTrackedRef.current !== response.jobId) {
            jobStartedTrackedRef.current = response.jobId
            try {
              trackEvent('job_started', {
                job_id: response.jobId,
                tool_type: BACKEND_TOOL_TYPES.BURN_SUBTITLES,
              })
            } catch {
              /* non-blocking */
            }
          }

          const transition = getJobLifecycleTransition(jobStatus)
          if (transition === 'completed') {
            clearInterval(pollIntervalRef.current)
            const started = processingStartedAtRef.current ?? Date.now()
            const processingMs = Date.now() - started
            setLastProcessingMs(processingMs)
            const resolved = await resolveCompletedJobResult(response.jobId, response.jobToken, jobStatus)
            const phase = phaseForResolvedJob(resolved)
            // Only a resolution that actually carries a downloadUrl may set a
            // result; the auth-gate placeholder is truthy and would otherwise
            // be mistaken for a loaded result everywhere downstream.
            applyResult(hasDownloadableResult(resolved.status?.result) ? resolved.status!.result! : null)
            if (phase === 'authentication-required') setShowAuthModal(true)
            setStatus(phase)
            trackAppEvent('transcription_completed', { toolId: 'burn-subtitles' })
            // emitToolCompleted({ toolId: 'burn-subtitles', pathname: '/burn-subtitles', processingMs })
            incrementUsage('burn-subtitles')
            try {
              const nextJobCount = incrementJobCompletedCount()
              trackEvent('job_completed', {
                job_id: response.jobId,
                tool_type: BACKEND_TOOL_TYPES.BURN_SUBTITLES,
                processing_time_ms: processingMs,
                job_count: nextJobCount,
              })
            } catch {
              /* non-blocking */
            }
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            // texJobFailed()
            toast.error('Processing failed. Please try again.')
          }
        } catch (error: any) {
          // Network/parse errors: do not set failed; keep polling.
        }
      }
      pollIntervalRef.current = window.setInterval(doPoll, JOB_POLL_INTERVAL_MS)
      doPoll()
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        clearPersistedJobId(location.pathname, navigate)
        setStatus('idle')
      } else {
        setStatus('failed')
        // texJobFailed()
      }
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleProcessAnother = () => {
    try { trackEvent('process_another_clicked', { tool_type: BACKEND_TOOL_TYPES.BURN_SUBTITLES }) } catch { /* non-blocking */ }
    clearPersistedJobId(location.pathname, navigate)
    setVideoFile(null)
    setSubtitleFile(null)
    setTrimStart(null)
    setTrimEnd(null)
    setStatus('idle')
    setUploadPhase('processing')
    setUploadProgress(0)
    setProgress(0)
    applyResult(null)
  }

  /** Single writer for the result, keeping state and the synchronous ref in step. */
  const applyResult = (next: { downloadUrl: string; fileName?: string } | null) => {
    resultRef.current = next
    setResult(next)
  }

  /**
   * Re-resolve a completed job and move the page to the phase it earns.
   *
   * Used after claiming and by the retry control. Returns the phase so callers
   * can react without re-reading state that React has not committed yet.
   */
  const refreshCompletedResult = async (
    jobId: string,
    jobToken?: string,
  ): Promise<JobResultPhase> => {
    setIsRefreshingResult(true)
    try {
      const resolved = await resolveCompletedJobResult(jobId, jobToken)
      const phase = phaseForResolvedJob(resolved)
      applyResult(hasDownloadableResult(resolved.status?.result) ? resolved.status!.result! : null)
      setStatus(phase)
      return phase
    } catch {
      setStatus('completed-awaiting-result')
      return 'completed-awaiting-result'
    } finally {
      setIsRefreshingResult(false)
    }
  }

  const getDownloadUrl = () => resolveResultDownloadUrl(resultRef.current?.downloadUrl)

  function requireAuthForDownload(action: () => void) {
    if (isLoggedIn()) {
      action()
    } else {
      pendingDownloadRef.current = action
      setShowAuthModal(true)
    }
  }

  const breadcrumbs = [{ label: 'Burn Subtitles', href: '/burn-subtitles' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Burn Subtitles into Video',
    subtitle: seoIntro ?? 'Hardcode SRT or VTT into your video. Upload video + captions, download one file. Files deleted after processing. 3 free imports/mo.',
    icon: <Film className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    tags: ['Hardcode', 'Burn-in', 'Permanent', 'Styling', 'Position'],
    sidebar: null,
    compactToolHeader: true,
    coreToolPath: '/burn-subtitles',
    currentStepLabel:
      status === 'ready'
        ? 'Video ready'
        : videoFile
          ? 'Upload configured'
          : 'Ready to upload',
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        {status === 'idle' && !videoFile && (
          <div className="space-y-component-sm">
            <UploadZone
              immediateSelect
              onFileSelect={handleVideoSelect}
              initialFiles={videoFile ? [videoFile] : null}
              onRemove={() => {
                // if (videoFromWorkflow) workflow.clearVideo()
                setVideoFile(null)
                setVideoFromWorkflow(false)
              }}
              fromWorkflowLabel={videoFromWorkflow ? 'From previous step' : undefined}
              acceptedFormats={['MP4', 'MOV', 'AVI', 'WEBM']}
              maxSize="10 GB"
            />
            {location.pathname === '/burn-subtitles' && (
              <SamplesModule sourcePath={location.pathname} samplesHref="/samples#burn" />
            )}
          </div>
        )}

        {status === 'idle' && videoFile && !subtitleFile && (
          <div className="space-y-component">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-component border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between gap-component-sm mb-component-sm">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Video</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{videoFile.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // if (videoFromWorkflow) workflow.clearVideo()
                    setVideoFile(null)
                    setVideoFromWorkflow(false)
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload subtitles (SRT/VTT)</p>
              <UploadZone
                immediateSelect
                onFileSelect={handleSubtitleSelect}
                initialFiles={subtitleFile ? [subtitleFile] : null}
                onRemove={() => {
                  // if (srtFromWorkflow) workflow.clearSrt()
                  setSubtitleFile(null)
                  setSrtFromWorkflow(false)
                }}
                fromWorkflowLabel={srtFromWorkflow ? 'From previous step' : undefined}
                acceptedFormats={['SRT', 'VTT']}
                acceptAttribute=".srt,.vtt"
                maxSize="10 MB"
              />
            </div>
          </div>
        )}

        {status === 'idle' && videoFile && subtitleFile && (
          <ProcessingInterface
            file={{
              name: videoFile.name,
              size: `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB`,
              duration: filePreview?.durationSeconds != null ? formatDuration(filePreview.durationSeconds) : undefined,
            }}
            onRemove={() => {
              // if (videoFromWorkflow) workflow.clearVideo()
              setVideoFile(null)
              setVideoFromWorkflow(false)
            }}
            actionLabel="Process Video"
            onAction={(trimStartPercent, trimEndPercent) => handleProcess(trimStartPercent, trimEndPercent)}
            actionLoading={false}
            showVideoPlayer={!!(videoPreviewUrl || filePreview?.durationSeconds)}
            videoSrc={videoPreviewUrl ?? undefined}
            durationSeconds={filePreview?.durationSeconds}
          >
            <div className="space-y-component">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">Subtitle: {subtitleFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    // if (srtFromWorkflow) workflow.clearSrt()
                    setSubtitleFile(null)
                    setSrtFromWorkflow(false)
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
              <Select
                label="Font size"
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
                value={fontSize}
                onChange={(v) => setFontSize(v as 'small' | 'medium' | 'large')}
              />
              <Select
                label="Position"
                options={[
                  { value: 'bottom', label: 'Bottom' },
                  { value: 'middle', label: 'Middle' },
                ]}
                value={position}
                onChange={(v) => setPosition(v as 'bottom' | 'middle')}
              />
              <Select
                label="Background"
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'low', label: 'Low' },
                  { value: 'high', label: 'High' },
                ]}
                value={backgroundOpacity}
                onChange={(v) => setBackgroundOpacity(v as 'none' | 'low' | 'high')}
              />
            </div>
          </ProcessingInterface>
        )}

        {status === 'processing' && (
          <ProcessingStateShell>
            <div className="mb-component-sm text-sm text-gray-600 dark:text-gray-400">
              {videoFile?.name} • {subtitleFile?.name}
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Burning', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={uploadPhase === 'uploading' ? 'Uploading...' : 'Burning subtitles into video...'}
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={uploadPhase === 'uploading' ? undefined : '3–5 min for a 10-min video'}
              statusSubtext={uploadPhase === 'processing' && queuePosition !== undefined && queuePosition > 0 ? `Queue position: ${queuePosition}` : undefined}
              onCancel={handleProcessAnother}
            />
            <ResultSkeleton variant="burn" />
          </ProcessingStateShell>
        )}

        {status === 'authentication-required' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <ResultHeader embedded title="Video with burned subtitles ready!" />
            <div className="space-y-component-sm px-5 py-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create a free account to download your video.
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => { setAuthModalMode('signup-combo'); setShowAuthModal(true) }}
                  className="max-w-[200px] flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Create free account
                </button>
                <button
                  onClick={() => { setAuthModalMode('login'); setShowAuthModal(true) }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
                >
                  Log in
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'ready' && result && canDownloadResult(status, result) && isLoggedIn() && (
          <div className="space-y-component">
            <TranslateResult
              title="Video with burned subtitles ready!"
              fileName={result.fileName ?? fallbackBurnName}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              hideDownload
              onProcessAnother={handleProcessAnother}
              relatedTools={[]}
            />
            <ResultUpgradeCard tool="burn" resultKey={result.downloadUrl} />
            <FreePlanNudge tool="burn-subtitles" resultKey={result.downloadUrl} />
            <SecondJobUpgradeNudge tool="burn-subtitles" resultKey={result.downloadUrl} milestone={2} />
            <SecondJobUpgradeNudge tool="burn-subtitles" resultKey={result.downloadUrl} milestone={3} />

            <div className="grid grid-cols-1 items-start gap-component-sm lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-component min-w-0">
                {videoPreviewUrl && (
                  <VideoResultPreview
                    videoSrc={videoPreviewUrl}
                    durationSeconds={filePreview?.durationSeconds}
                    fileName={videoFile?.name}
                    label="Source video preview"
                  />
                )}
                <CrossToolSuggestions
                workflowHint="Your last file is pre-filled on the next tool."
                suggestions={[
                  { icon: Minimize2, title: 'Compress Video', path: '/compress-video', description: 'Reduce file size', state: { useWorkflowVideo: true } },
                  { icon: FileText, title: 'Video → Transcript', path: '/video-to-transcript', description: 'Get transcript', state: { useWorkflowVideo: true } },
                  { icon: MessageSquare, title: 'Video → Subtitles', path: '/video-to-subtitles', description: 'Generate SRT/VTT', state: { useWorkflowVideo: true } },
                ]}
              />
              </div>

              <ExportsPanel freeExportsUsed={!hasPaidPlan ? freeExportsUsed : undefined}>
                <ExportSection title="Video">
                  <button
                    type="button"
                    onClick={() => requireAuthForDownload(
                      !hasPaidPlan
                        ? async () => {
                            if (freeExportsUsed >= 2) {
                              toast('You\'ve used your 2 free downloads. Upgrade for more.')
                              return
                            }
                            try {
                              await downloadAuthedUrl(getDownloadUrl(), resultRef.current?.fileName || fallbackBurnName)
                              try { trackEvent('result_downloaded', { tool: 'burn-subtitles', plan: 'free' }) } catch { /* non-blocking */ }
                              setFreeExportsUsed((prev) => prev + 1)
                              toast.success('Download started')
                            } catch (err) {
                              trackDownloadFailure(err, { tool: 'burn-subtitles', plan: 'free' })
                              toast.error(downloadErrorMessage(err))
                            }
                          }
                        : async () => {
                            try {
                              await downloadAuthedUrl(getDownloadUrl(), resultRef.current?.fileName || fallbackBurnName)
                              try { trackEvent('result_downloaded', { tool: 'burn-subtitles', plan: 'paid' }) } catch { /* non-blocking */ }
                            } catch (err) {
                              trackDownloadFailure(err, { tool: 'burn-subtitles', plan: 'paid' })
                              toast.error(downloadErrorMessage(err))
                            }
                          }
                    )}
                    disabled={!hasPaidPlan && freeExportsUsed >= 2}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!hasPaidPlan && freeExportsUsed >= 2 ? '2/2 free downloads used' : 'Download Video'}
                  </button>
                </ExportSection>
              </ExportsPanel>
            </div>
          </div>
        )}

        {status === 'completed-awaiting-result' && (() => {
          const copy = phaseRecoveryCopy(status)
          if (!copy) return null
          return (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-6 text-center dark:border-amber-700/50 dark:bg-amber-950/30">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{copy.title}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">{copy.detail}</p>
              <button
                type="button"
                disabled={isRefreshingResult}
                onClick={() => {
                  const jobId = getPersistedJobId(location.pathname)
                  const jobToken = getPersistedJobToken(location.pathname)
                  if (!jobId) {
                    toast.error('This session no longer has the job. Please run it again.')
                    return
                  }
                  void refreshCompletedResult(jobId, jobToken ?? undefined)
                }}
                className="mt-4 rounded-lg border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-900/40"
              >
                {isRefreshingResult ? 'Checking…' : 'Retry'}
              </button>
            </div>
          )
        })()}

        {status === 'failed' && (
          <FailedState onTryAgain={handleProcessAnother} />
        )}
      </ToolLayout>



      {location.pathname === '/burn-subtitles' && (
        <CoreToolSeoDepth path="/burn-subtitles" />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        tool="burn-subtitles"
      />

      <JobAuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        jobDescription="Your video with burned-in subtitles is ready!"
        onAuthSuccess={async () => {
          const jobId = getPersistedJobId(location.pathname)
          const jobToken = getPersistedJobToken(location.pathname)
          let claimed = true
          if (jobId && jobToken) {
            try {
              // ensureGuestJobClaimed (not claimGuestJob) so a job this account
              // already owns — a second sign-in, a retry — returns 409 and is
              // treated as success instead of a spurious error toast.
              await ensureGuestJobClaimed(jobId, jobToken)
            } catch {
              claimed = false
              toast.error('Could not link this job to your account. Please try again.')
            }
          }
          setShowAuthModal(false)

          // Claiming changed server-side authorization, so the payload the API
          // withheld from the guest is now fetchable. The auth-gate placeholder
          // is TRUTHY, so the old `else if (result)` check reported "already in
          // memory" and skipped this — leaving an enabled Download button over a
          // blank URL, which threw DownloadNotReadyError without ever issuing a
          // request. Gate on a usable downloadUrl, never on the object.
          const pending = pendingDownloadRef.current
          pendingDownloadRef.current = null

          if (claimed && jobId && needsResultRefetchAfterClaim(result)) {
            const phase = await refreshCompletedResult(jobId, jobToken ?? undefined)
            if (phase === 'ready' && pending) pending()
            return
          }
          if (pending) pending()
        }}
      />

      {faq.length > 0 && location.pathname !== '/burn-subtitles' && (
        <CollapsibleFaqSection items={faq} title="Frequently asked questions" />
      )}
    </>
  )
}
