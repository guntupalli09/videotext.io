import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Languages, Copy, Check, Download, ArrowRight } from 'lucide-react'
import FailedState from '../components/FailedState'
import SamplesModule from '../components/SamplesModule'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UpgradeBanner from '../components/UpgradeBanner'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { TranslateResult } from '../components/figma/TranslateResult'
import { Select } from '../components/figma/FormControls'
import type { SubtitleRow } from '../components/SubtitleEditor'
const SubtitleEditor = lazy(() => import('../components/SubtitleEditor'))
import { incrementUsage } from '../lib/usage'
import { uploadFileWithProgress, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError, getAuthToken } from '../lib/api'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl, getApiBase } from '../lib/apiBase'
import { persistJobId, clearPersistedJobId } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import toast from 'react-hot-toast'
import { Film, Wrench, MessageSquare } from 'lucide-react'
import { trackAppEvent } from '../lib/feedbackEvents'
import { LANGUAGES } from '../lib/languages'
import { exportFileStem, joinExportFilename, targetLangFileSlug } from '../lib/exportFileNames'

type Tab = 'upload' | 'paste'

/** Optional SEO overrides for alternate entry points (e.g. /srt-translator). Do NOT duplicate logic. */
export type TranslateSubtitlesSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function TranslateSubtitles(props: TranslateSubtitlesSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [targetLanguage, setTargetLanguage] = useState<string>('Spanish')
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('processing')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progress, setProgress] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string; consistencyIssues?: { line: number; issueType: string }[] } | null>(null)
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([])
  const [plainTextResult, setPlainTextResult] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [pasteLoading, setPasteLoading] = useState(false)
  const [pasteResult, setPasteResult] = useState<string | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const isPaidPlan = !['free', ''].includes(plan)
  const canEdit = ['basic', 'pro', 'agency'].includes(plan)

  /** Paste / .txt upload → .txt; file upload → .srt (or .vtt from server). */
  const translateFallbackExt: '.srt' | '.txt' =
    !selectedFile || selectedFile.name.toLowerCase().endsWith('.txt') ? '.txt' : '.srt'

  const fallbackTranslatedName = (ext: '.srt' | '.vtt' | '.txt') =>
    joinExportFilename(
      exportFileStem(selectedFile?.name, 'subtitles'),
      `subtitles_translated_${targetLangFileSlug(targetLanguage)}`,
      ext
    )

  useEffect(() => {
    if (result?.downloadUrl) setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  const handleFileSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.TRANSLATE_SUBTITLES,
        file_size_bytes: file.size,
      })
    } catch {
      // non-blocking
    }
    setSelectedFile(file)
    setSubtitleRows([])
    setPlainTextResult(null)
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
      const [start, end] = lines[timeLineIdx].split('-->').map((s) => s.trim())
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
      .map((r, idx) => `${idx + 1}\n${r.startTime} --> ${r.endTime}\n${r.text}`)
      .join('\n\n')
  }

  // ── Paste translation (direct API, no job queue) ───────────────────────────
  const handlePasteTranslate = async () => {
    if (!pastedText.trim()) {
      toast.error('Paste some text first')
      return
    }

    // Free plan gating (client-side, daily counter)
    if (!isPaidPlan) {
      const today = new Date().toISOString().slice(0, 10)
      const key = `translationPasteUsed_${today}`
      const used = parseInt(localStorage.getItem(key) ?? '0', 10)
      if (used >= 3) {
        setShowPaywall(true)
        return
      }
    }

    try {
      setPasteLoading(true)
      setPasteResult(null)
      const token = getAuthToken()
      const res = await fetch(`${getApiBase()}/api/translate-transcript/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: pastedText, targetLanguage }),
      })
      if (res.status === 401) {
        toast.error('Sign in to translate pasted text, or use the Upload tab')
        return
      }
      if (res.status === 403) {
        setShowPaywall(true)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error((body as { message?: string }).message || 'Translation failed')
        return
      }
      const data = await res.json() as { translatedText: string }
      setPasteResult(data.translatedText)

      // Increment daily counter
      const today = new Date().toISOString().slice(0, 10)
      const key = `translationPasteUsed_${today}`
      const used = parseInt(localStorage.getItem(key) ?? '0', 10)
      localStorage.setItem(key, String(used + 1))
    } catch {
      toast.error('Translation failed. Please try again.')
    } finally {
      setPasteLoading(false)
    }
  }

  // ── File/upload translation (job queue) ───────────────────────────────────
  const handleProcess = async () => {
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

      let fileToUpload: File

      if (tab === 'upload' && selectedFile) {
        fileToUpload = selectedFile
      } else if (tab === 'paste' && pastedText.trim()) {
        // Wrap pasted text as a .txt file and send through the same queue
        const blob = new Blob([pastedText], { type: 'text/plain' })
        fileToUpload = new File([blob], 'paste.txt', { type: 'text/plain' })
      } else {
        toast.error('Please upload a file or paste text to translate')
        setStatus('idle')
        return
      }

      const response = await uploadFileWithProgress(fileToUpload, {
        toolType: BACKEND_TOOL_TYPES.TRANSLATE_SUBTITLES,
        targetLanguage,
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

          const transition = getJobLifecycleTransition(jobStatus)
          if (transition === 'completed') {
            clearInterval(pollIntervalRef.current)
            const started = processingStartedAtRef.current ?? Date.now()
            setLastProcessingMs(Date.now() - started)
            setStatus('completed')
            setResult(jobStatus.result ?? null)
            trackAppEvent('transcription_completed', { toolId: 'translate-subtitles' })

            if (jobStatus.result?.downloadUrl) {
              try {
                const res = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl))
                const txt = await res.text()
                const isTxt = (jobStatus.result.fileName ?? '').toLowerCase().endsWith('.txt')
                if (isTxt) {
                  setPlainTextResult(txt)
                } else {
                  setSubtitleRows(parseSubtitlesToRows(txt))
                }
              } catch {
                // ignore
              }
            }
            incrementUsage('translate-subtitles')
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            toast.error('Processing failed. Please try again.')
          }
        } catch {
          // Network/parse errors: keep polling
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
      }
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setPastedText('')
    setPasteResult(null)
    setStatus('idle')
    setUploadPhase('processing')
    setUploadProgress(0)
    setProgress(0)
    setResult(null)
    setSubtitleRows([])
    setPlainTextResult(null)
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Format preservation hint ───────────────────────────────────────────────
  const getFormatHint = () => {
    if (!selectedFile && tab !== 'paste') return null
    if (tab === 'paste') return 'Paragraph breaks and line structure preserved exactly'
    const name = selectedFile?.name?.toLowerCase() ?? ''
    if (name.endsWith('.srt') || name.endsWith('.vtt')) return 'Timestamps and cue structure preserved exactly'
    if (name.endsWith('.txt')) return 'Line breaks and paragraph structure preserved exactly'
    return null
  }

  const breadcrumbs = [{ label: 'Translation', href: '/translation' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Translation',
    subtitle: seoIntro ?? 'Translate any subtitle, transcript, or text file into 70+ languages — timestamps and formatting always preserved.',
    icon: <Languages className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
    tags: ['SRT', 'VTT', 'TXT', '70+ Languages', 'Format Preserved'],
    sidebar: null,
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        <UpgradeBanner variant="video-length" />

        {/* ── Tab switcher ──────────────────────────────────────────────────── */}
        {status === 'idle' && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-2">
            {(['upload', 'paste'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedFile(null); setPastedText(''); setPasteResult(null) }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t === 'upload' ? 'Upload file' : 'Paste text'}
              </button>
            ))}
          </div>
        )}

        {/* ── Upload tab: no file selected ─────────────────────────────────── */}
        {status === 'idle' && tab === 'upload' && !selectedFile && (
          <div className="space-y-4">
            <UploadZone
              immediateSelect
              onFileSelect={handleFileSelect}
              initialFiles={null}
              onRemove={() => setSelectedFile(null)}
              acceptedFormats={['SRT', 'VTT', 'TXT']}
              acceptAttribute=".srt,.vtt,.txt"
              maxSize="10 MB"
            />
            {location.pathname === '/translate-subtitles' && (
              <SamplesModule sourcePath={location.pathname} samplesHref="/samples#translate" />
            )}
          </div>
        )}

        {/* ── Upload tab: file selected ─────────────────────────────────────── */}
        {status === 'idle' && tab === 'upload' && selectedFile && (
          <ProcessingInterface
            file={{
              name: selectedFile.name,
              size: `${(selectedFile.size / 1024).toFixed(2)} KB`,
            }}
            onRemove={() => setSelectedFile(null)}
            actionLabel="Translate"
            onAction={handleProcess}
            actionLoading={false}
            showVideoPlayer={false}
          >
            <div className="space-y-4">
              <Select
                label="Translate to"
                options={LANGUAGES}
                value={targetLanguage}
                onChange={setTargetLanguage}
              />
              {getFormatHint() && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  {getFormatHint()}
                </p>
              )}
              {!isPaidPlan && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Free plan: 3 translations per day · Resets at midnight UTC ·{' '}
                  <Link to="/pricing" className="text-violet-500 hover:underline">Upgrade for unlimited</Link>
                </p>
              )}
            </div>
          </ProcessingInterface>
        )}

        {/* ── Paste tab ─────────────────────────────────────────────────────── */}
        {status === 'idle' && tab === 'paste' && !pasteResult && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Select
                label="Translate to"
                options={LANGUAGES}
                value={targetLanguage}
                onChange={setTargetLanguage}
              />
              {getFormatHint() && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  {getFormatHint()}
                </p>
              )}
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your transcript, subtitles, or any text here…"
              className="w-full h-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400"
            />
            {!isPaidPlan && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Free plan: 3 paste translations per day · Resets at midnight UTC ·{' '}
                <Link to="/pricing" className="text-violet-500 hover:underline">Upgrade for unlimited</Link>
              </p>
            )}
            <button
              onClick={handlePasteTranslate}
              disabled={pasteLoading || !pastedText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pasteLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Translating…
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  Translate to {targetLanguage}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Paste result ──────────────────────────────────────────────────── */}
        {status === 'idle' && tab === 'paste' && pasteResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4" />
                <span className="text-sm font-semibold">Translated to {targetLanguage}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(pasteResult)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() =>
                    downloadText(
                      pasteResult,
                      joinExportFilename(
                        exportFileStem(undefined, 'pasted_text'),
                        `transcript_translated_${targetLangFileSlug(targetLanguage)}`,
                        '.txt'
                      )
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .txt
                </button>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700 rounded-xl p-5 max-h-80 overflow-y-auto">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {pasteResult}
              </pre>
            </div>
            <button
              onClick={() => { setPasteResult(null); setPastedText('') }}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Translate another
            </button>
          </div>
        )}

        {/* ── Processing ────────────────────────────────────────────────────── */}
        {status === 'processing' && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-8">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {selectedFile?.name ?? 'Pasted text'} · Translating to {targetLanguage}
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Translating', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={uploadPhase === 'uploading' ? 'Uploading…' : `Translating to ${targetLanguage}…`}
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={uploadPhase === 'uploading' ? undefined : '10–40 seconds'}
              statusSubtext={uploadPhase === 'processing' && queuePosition !== undefined && queuePosition > 0 ? `Queue position: ${queuePosition}` : undefined}
              onCancel={handleProcessAnother}
            />
          </div>
        )}

        {/* ── File upload result ────────────────────────────────────────────── */}
        {status === 'completed' && result && (
          <div className="space-y-6">
            <TranslateResult
              title="Translation complete!"
              fileName={result.fileName ?? fallbackTranslatedName(translateFallbackExt)}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              downloadLabel={isPaidPlan ? 'Download translated file' : (freeExportsUsed >= 2 ? '2/2 free downloads used' : 'Download with watermark')}
              onDownload={
                !isPaidPlan
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
                        a.download = result?.fileName || fallbackTranslatedName(translateFallbackExt)
                        a.click()
                        URL.revokeObjectURL(a.href)
                        try { trackEvent('result_downloaded', { tool: 'translate-subtitles', plan: 'free' }) } catch { /* non-blocking */ }
                        setFreeExportsUsed((prev) => prev + 1)
                        toast.success('Download started')
                      } catch {
                        toast.error('Download failed')
                      }
                    }
                  : async () => {
                      try {
                        const token = getAuthToken()
                        const res = await fetch(getDownloadUrl(), {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        })
                        const blob = await res.blob()
                        const a = document.createElement('a')
                        a.href = URL.createObjectURL(blob)
                        a.download = result?.fileName || fallbackTranslatedName(translateFallbackExt)
                        a.click()
                        URL.revokeObjectURL(a.href)
                        try { trackEvent('result_downloaded', { tool: 'translate-subtitles', plan: 'paid' }) } catch { /* non-blocking */ }
                      } catch {
                        toast.error('Download failed')
                      }
                    }
              }
              onProcessAnother={handleProcessAnother}
              relatedTools={[
                { path: '/fix-subtitles', name: 'Fix Subtitles', description: 'Auto-correct timing' },
                { path: '/burn-subtitles', name: 'Burn Subtitles', description: 'Hardcode into video' },
                { path: '/video-to-subtitles', name: 'Video → Subtitles', description: 'Generate SRT/VTT from video' },
              ]}
            />

            {/* Plain text result (.txt files) */}
            {plainTextResult && (
              <div className="surface-card rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Translated text</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(plainTextResult)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700 rounded-lg p-4 max-h-72 overflow-y-auto">
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {plainTextResult}
                  </pre>
                </div>
              </div>
            )}

            {/* Consistency issues for SRT/VTT */}
            {result.consistencyIssues && result.consistencyIssues.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-6 shadow-card border border-amber-100">
                <p className="text-amber-800 font-medium mb-2">Some lines may not be translated.</p>
                <p className="text-sm text-amber-900 mb-2">Non-blocking: review lines below if needed.</p>
                <ul className="text-sm text-amber-900 space-y-1">
                  {result.consistencyIssues.slice(0, 8).map((issue, i) => (
                    <li key={i}>Line {issue.line}: {issue.issueType === 'untranslated' ? 'possibly untranslated' : 'mixed language'}</li>
                  ))}
                  {result.consistencyIssues.length > 8 && <li>… and {result.consistencyIssues.length - 8} more</li>}
                </ul>
              </div>
            )}

            {/* SRT/VTT inline editor */}
            {subtitleRows.length > 0 && (
              <div className="surface-card rounded-xl p-6">
                <Suspense fallback={null}>
                  <SubtitleEditor
                    entries={subtitleRows}
                    editable={canEdit}
                    onChange={setSubtitleRows}
                  />
                </Suspense>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    disabled={!canEdit}
                    onClick={() => {
                      const content = rowsToSrt(subtitleRows)
                      const blob = new Blob([content], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = (result.fileName || fallbackTranslatedName('.srt')).replace(/\.vtt$/i, '.srt')
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Download Edited Subtitles
                  </button>
                  {!canEdit && (
                    <div className="text-xs text-gray-500">
                      Upgrade to edit translated subtitles inline.
                    </div>
                  )}
                </div>
              </div>
            )}

            <CrossToolSuggestions
              workflowHint="Burn into video or fix timing on another file."
              suggestions={[
                { icon: Film, title: 'Burn Subtitles', path: '/burn-subtitles', description: 'Burn translated captions into video' },
                { icon: Wrench, title: 'Fix Subtitles', path: '/fix-subtitles', description: 'Fix timing, grammar, line breaks' },
                { icon: MessageSquare, title: 'Video → Subtitles', path: '/video-to-subtitles', description: 'Generate SRT/VTT from another video' },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
          <FailedState onTryAgain={handleProcessAnother} />
        )}
      </ToolLayout>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => { window.location.href = '/pricing' }}
      />

      {faq.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 max-w-4xl mx-auto px-4" aria-label="FAQ">
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
