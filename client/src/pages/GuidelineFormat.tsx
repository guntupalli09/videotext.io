import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { ToolLayout } from '../components/figma/ToolLayout'
import { api, getAuthToken } from '../lib/api'
import { detectFormat, parseSrt, parseVtt, cuesToSrt, cuesToVtt } from '../lib/subtitleUtils'
import { PRESET_DATA, type GuidelinePresetKey } from './guidelineFormatPresetData'

type EditableRule = {
  id: string
  category: string
  label: string
  defaultValue: string
  currentValue: string
  isEdited: boolean
}

const CATEGORY_ORDER = [
  'Verbatim & Fillers',
  'Speaker Labels',
  'False Starts & Stutters',
  'Contractions & Slang',
  'Tags & Notation',
  'Spelling & Numbers',
  'Profanity & Special Cases',
] as const

type SelectValue = '' | GuidelinePresetKey | 'custom'

type ParsedRule = {
  id: string
  category: string
  label: string
  currentValue: string
}

type DiffSegment = { type: 'unchanged' | 'added' | 'removed'; text: string }

type FlaggedSegment = {
  originalText: string
  suggestedText: string
  ruleApplied: string
  confidence: string
  reason: string
}

type JobStatusResponse = {
  status: string
  stage?: string | null
  outputText: string | null
  diffData: DiffSegment[] | null
  flaggedSegments: FlaggedSegment[] | null
  appliedRules: string[] | null
  validationReport?: {
    summary?: {
      verified?: { passed: number; total: number }
      likelyCompliant?: { passed: number; total: number }
      needsReview?: { passed: number; total: number }
      confidencePct?: number
    }
    checks?: Array<{
      id: string
      label: string
      bucket: 'verified' | 'likely_compliant' | 'needs_review'
      passed: boolean
      details?: string
      metrics?: Record<string, number>
      segmentIndex?: number
      snippet?: string
    }>
  } | null
  createdAt: string
}

function rulesFromPreset(preset: (typeof PRESET_DATA)[GuidelinePresetKey]): EditableRule[] {
  return preset.rules.map((r) => ({
    id: r.id,
    category: r.category,
    label: r.label,
    defaultValue: r.defaultValue,
    currentValue: r.defaultValue,
    isEdited: false,
  }))
}

function AutoGrowTextarea({
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  'aria-label'?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(48, el.scrollHeight)}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{ resize: 'none', overflow: 'hidden' }}
    />
  )
}

export default function GuidelineFormat() {
  const [transcript, setTranscript] = useState('')
  const [prefillBanner, setPrefillBanner] = useState(false)
  const [selectValue, setSelectValue] = useState<SelectValue>('')
  const [selectedPreset, setSelectedPreset] = useState<GuidelinePresetKey | 'custom' | null>(null)
  const [rules, setRules] = useState<EditableRule[]>([])
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** Transcript snapshot for the active job — used so "Original" stays stable while user edits textarea. */
  const [originalTranscriptForJob, setOriginalTranscriptForJob] = useState('')
  const [inputCaptionFormat, setInputCaptionFormat] = useState<'srt' | 'vtt' | null>(null)
  const [originalCaptionCues, setOriginalCaptionCues] = useState<ReturnType<typeof parseSrt> | null>(null)
  const [focusSegment, setFocusSegment] = useState<number | null>(null)
  const txtInputRef = useRef<HTMLInputElement>(null)
  const docxTranscriptRef = useRef<HTMLInputElement>(null)
  const customGuideRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('vt_prefill_transcript')
    if (raw != null && raw !== '') {
      setTranscript(raw)
      sessionStorage.removeItem('vt_prefill_transcript')
      setPrefillBanner(true)
    }
  }, [])

  const wordCount = useMemo(() => {
    const t = transcript.trim()
    if (!t) return 0
    return t.split(/\s+/).filter(Boolean).length
  }, [transcript])

  const hasGuidelineSelected =
    selectedPreset != null && (selectedPreset !== 'custom' || customFile !== null)

  const canSubmit = transcript.trim().length > 0 && hasGuidelineSelected && !isSubmitting

  const anyRuleEdited = rules.some((r) => r.isEdited)

  const resetJobUi = () => {
    setJobId(null)
    setJobStatus(null)
    setSubmitError(null)
    setIsSubmitting(false)
    setOriginalTranscriptForJob('')
    setInputCaptionFormat(null)
    setOriginalCaptionCues(null)
    setFocusSegment(null)
  }

  const buildRulesPayload = (): ParsedRule[] => {
    if (selectedPreset === 'custom') {
      return [
        {
          id: 'custom-upload',
          category: 'Custom',
          label: 'Client style guide file',
          currentValue: customFile?.name || 'attached',
        },
      ]
    }
    if (selectedPreset) {
      return rules.map((r) => ({
        id: r.id,
        category: r.category,
        label: r.label,
        currentValue: r.currentValue,
      }))
    }
    return []
  }

  useEffect(() => {
    if (!jobId) return
    let stopped = false
    let timer: ReturnType<typeof setInterval> | undefined

    const poll = async () => {
      try {
        const res = await api(`/api/guidelines/jobs/${jobId}`, { timeout: 15000 })
        const data = (await res.json()) as JobStatusResponse & { error?: string }
        if (stopped) return
        if (!res.ok) {
          setSubmitError(data.error || 'Failed to fetch job status')
          setIsSubmitting(false)
          if (timer) clearInterval(timer)
          return
        }
        setJobStatus(data)
        if (data.status === 'completed' || data.status === 'failed') {
          setIsSubmitting(false)
          if (timer) clearInterval(timer)
        }
      } catch (e) {
        if (stopped) return
        setSubmitError(e instanceof Error ? e.message : 'Network error')
        setIsSubmitting(false)
        if (timer) clearInterval(timer)
      }
    }

    poll()
    timer = setInterval(poll, 2000)
    return () => {
      stopped = true
      if (timer) clearInterval(timer)
    }
  }, [jobId])

  const submitFormat = async () => {
    if (!canSubmit || !selectedPreset) return
    if (!getAuthToken()) {
      toast.error('Sign in to format your transcript')
      return
    }
    const rulesPayload = buildRulesPayload()
    if (!rulesPayload.length) {
      toast.error('Select rules or a style guide file')
      return
    }
    const trimmedTranscript = transcript.trim()
    const detected = detectFormat(trimmedTranscript)
    const captionMode = detected === 'srt' || detected === 'vtt' ? detected : null
    let cuesPayload: any = null
    if (captionMode) {
      const cues = captionMode === 'vtt' ? parseVtt(trimmedTranscript) : parseSrt(trimmedTranscript)
      if (!cues.length) {
        toast.error('Could not parse your captions. Please paste a valid SRT or VTT file.')
        return
      }
      setInputCaptionFormat(captionMode)
      setOriginalCaptionCues(cues)
      cuesPayload = cues.map((c) => ({ index: c.index, startTime: c.startTime, endTime: c.endTime, text: c.text }))
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setJobStatus(null)
    setJobId(null)
    setOriginalTranscriptForJob(trimmedTranscript)
    try {
      const res = await api('/api/guidelines/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptText: trimmedTranscript,
          rules: rulesPayload,
          presetId: selectedPreset,
          ...(captionMode ? { inputFormat: captionMode, cues: cuesPayload } : {}),
        }),
        timeout: 60000,
      })
      const data = (await res.json()) as { jobId?: string; error?: string }
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to start formatting')
        setIsSubmitting(false)
        return
      }
      if (!data.jobId) {
        setSubmitError('Invalid response from server')
        setIsSubmitting(false)
        return
      }
      setJobId(data.jobId)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Network error')
      setIsSubmitting(false)
    }
  }

  const downloadFormattedTxt = () => {
    const text = jobStatus?.outputText
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'formatted_transcript.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadFormattedSrt = () => {
    if (inputCaptionFormat !== 'srt' && inputCaptionFormat !== 'vtt') return
    const original = originalCaptionCues
    const formattedText = jobStatus?.outputText || ''
    if (!original || !formattedText) return
    const formattedCues = (inputCaptionFormat === 'vtt' ? parseVtt(formattedText) : parseSrt(formattedText))
    if (!formattedCues.length) {
      toast.error('SRT export failed (formatted captions could not be parsed).')
      return
    }
    const content = cuesToSrt(formattedCues)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'formatted_transcript.srt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadFormattedVtt = () => {
    if (inputCaptionFormat !== 'srt' && inputCaptionFormat !== 'vtt') return
    const formattedText = jobStatus?.outputText || ''
    if (!formattedText) return
    const formattedCues = (inputCaptionFormat === 'vtt' ? parseVtt(formattedText) : parseSrt(formattedText))
    if (!formattedCues.length) {
      toast.error('VTT export failed (formatted captions could not be parsed).')
      return
    }
    const content = cuesToVtt(formattedCues)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'formatted_transcript.vtt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadFormattedJson = () => {
    if (!jobStatus) return
    const payload = {
      ...jobStatus,
      jobId,
      originalText: originalTranscriptForJob,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'formatted_transcript.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadFlaggedCsv = () => {
    const list = Array.isArray(jobStatus?.flaggedSegments) ? jobStatus!.flaggedSegments! : []
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = ['confidence', 'ruleApplied', 'reason', 'originalText', 'suggestedText']
    const rows = list.map((x) => [x.confidence, x.ruleApplied, x.reason, x.originalText, x.suggestedText].map(escape).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'flagged_segments.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadFormattedRtf = () => {
    const text = jobStatus?.outputText
    if (!text) return
    const rtfEscaped = text
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\r?\n/g, '\\par\n')
    const rtf = `{\\rtf1\\ansi\\deff0\n${rtfEscaped}\n}`
    const blob = new Blob([rtf], { type: 'application/rtf;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'formatted_transcript.rtf'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadFormattedDocx = async () => {
    const text = jobStatus?.outputText
    if (!text) return
    try {
      const { Document: D, Paragraph: P, TextRun: T, Packer } = await import('docx')
      const paras = text.split('\n').map((line) => new P({ children: [new T({ text: line })] }))
      const doc = new D({ sections: [{ children: paras }] })
      const blob = await Packer.toBlob(doc)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'formatted_transcript.docx'
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('DOCX downloaded')
    } catch {
      toast.error('DOCX export failed')
    }
  }

  const downloadFormattedPdf = async () => {
    const text = jobStatus?.outputText
    if (!text) return
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const margin = 20
      const textWidth = doc.internal.pageSize.getWidth() - margin * 2
      const pageH = doc.internal.pageSize.getHeight()
      const lineH = 6
      let y = margin
      doc.setFontSize(11)
      const allLines = doc.splitTextToSize(text, textWidth) as string[]
      for (const line of allLines) {
        if (y + lineH > pageH - margin) {
          doc.addPage()
          y = margin
        }
        doc.text(line, margin, y)
        y += lineH
      }
      doc.save('formatted_transcript.pdf')
      toast.success('PDF downloaded')
    } catch {
      toast.error('PDF export failed')
    }
  }

  const onSelectPreset = (v: SelectValue) => {
    setSelectValue(v)
    resetJobUi()
    if (v === '' || !v) {
      setSelectedPreset(null)
      setRules([])
      setCustomFile(null)
      return
    }
    if (v === 'custom') {
      setSelectedPreset('custom')
      setRules([])
      return
    }
    setCustomFile(null)
    const key = v as GuidelinePresetKey
    setSelectedPreset(key)
    setRules(rulesFromPreset(PRESET_DATA[key]))
  }

  const updateRuleValue = (id: string, next: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, currentValue: next, isEdited: next !== r.defaultValue }
      })
    )
  }

  const resetOneRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, currentValue: r.defaultValue, isEdited: false } : r)))
  }

  const resetAllRules = () => {
    setRules((prev) => prev.map((r) => ({ ...r, currentValue: r.defaultValue, isEdited: false })))
  }

  const readTxtFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setTranscript(text)
    }
    reader.readAsText(file)
  }, [])

  const onTranscriptFile = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.txt')) {
      readTxtFile(file)
      return
    }
    if (lower.endsWith('.docx')) {
      toast('DOCX parsing coming soon')
      return
    }
    toast('Please upload a .txt, .srt, .vtt, or .docx file')
  }

  const onCustomGuideFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx') && !lower.endsWith('.txt')) {
      toast('Upload a PDF, DOCX, or TXT style guide')
      return
    }
    setCustomFile(file)
    resetJobUi()
  }

  const rulesByCategory = useMemo(() => {
    const map = new Map<string, EditableRule[]>()
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, [])
    }
    for (const r of rules) {
      const list = map.get(r.category)
      if (list) list.push(r)
    }
    return map
  }, [rules])

  const flaggedList = Array.isArray(jobStatus?.flaggedSegments) ? jobStatus!.flaggedSegments! : []
  const appliedRulesList = Array.isArray(jobStatus?.appliedRules) ? jobStatus!.appliedRules! : []
  const diffSegments = Array.isArray(jobStatus?.diffData) ? jobStatus!.diffData! : []
  const showLoadingMessage = isSubmitting && !jobStatus
  const showProcessingMessage =
    isSubmitting && jobStatus && (jobStatus.status === 'queued' || jobStatus.status === 'processing')
  const stageLabel =
    jobStatus?.stage === 'formatting'
      ? 'Formatting…'
      : jobStatus?.stage === 'validating'
        ? 'Verifying…'
        : jobStatus?.status === 'queued'
          ? 'Queued…'
          : jobStatus?.status === 'processing'
            ? 'Processing…'
            : null

  const originalSegments = useMemo(() => {
    const t = originalTranscriptForJob.trim()
    if (!t) return []
    const blocks = t.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean)
    return blocks.length ? blocks : [t]
  }, [originalTranscriptForJob])

  return (
    <>
      <ToolLayout
        breadcrumbs={[{ label: 'Format to client guidelines', href: '/guideline-format' }]}
        title="Format transcripts to match client transcription style guides"
        subtitle="Paste or upload transcript text, pick a marketplace preset or attach a client guideline file, edit the rule cards to match what you were assigned, then run Format to log your checklist before human QA."
        icon={<FileText className="text-violet-600 dark:text-violet-400" strokeWidth={1.75} />}
        sidebar={null}
      >
        <div className="max-w-6xl mx-auto space-y-8">
          {prefillBanner && (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
              <p>Transcript loaded from your VideoText job — ready to format.</p>
              <button
                type="button"
                onClick={() => setPrefillBanner(false)}
                className="text-emerald-800 dark:text-emerald-200 underline text-sm font-medium shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {/* Left — transcript */}
            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Step 1</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paste your transcript</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keep speaker labels exactly as-is. We’ll format punctuation, casing, tags, and spacing based on the rules.
                </p>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste or type your raw transcript…"
                className="w-full min-h-[200px] rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => txtInputRef.current?.click()}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Upload .txt
                </button>
                <button
                  type="button"
                  onClick={() => docxTranscriptRef.current?.click()}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Upload .docx
                </button>
                <input
                  ref={txtInputRef}
                  type="file"
                  accept=".txt,.srt,.vtt,text/plain"
                  className="hidden"
                  onChange={(e) => onTranscriptFile(e.target.files)}
                />
                <input
                  ref={docxTranscriptRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => onTranscriptFile(e.target.files)}
                />
              </div>
              <p
                className="text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  onTranscriptFile(e.dataTransfer.files)
                }}
              >
                Or drop a .txt or .docx file here
              </p>
              {wordCount > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-300">{wordCount.toLocaleString()} words</p>
              )}
            </section>

            {/* Right — guidelines */}
            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-6">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Step 2</p>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Choose a style guide</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Start from a preset, then tweak any rule cards below to match your assignment.
                </p>
              </div>

              <div>
                <label htmlFor="guideline-preset" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Guideline preset
                </label>
                <select
                  id="guideline-preset"
                  value={selectValue}
                  onChange={(e) => onSelectPreset(e.target.value as SelectValue)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="" disabled>
                    Select a guideline preset…
                  </option>
                  <optgroup label="Platform style guides">
                    <option value="rev">Rev — transcription style guide</option>
                    <option value="gotranscript">GoTranscript — transcription style guide</option>
                    <option value="transcribeme">TranscribeMe — clean verbatim style guide</option>
                    <option value="scribie">Scribie — transcription style guide</option>
                  </optgroup>
                  <optgroup label="────────────">
                    <option value="custom">Custom — upload my own guideline</option>
                  </optgroup>
                </select>
              </div>

              {selectedPreset && selectedPreset !== 'custom' && rules.length > 0 && (
                <div className="space-y-4">
                  {CATEGORY_ORDER.map((cat) => {
                    const list = rulesByCategory.get(cat) ?? []
                    if (!list.length) return null
                    return (
                      <details
                        key={cat}
                        open
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-950/30"
                      >
                        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-violet-700 dark:text-violet-300">
                          {cat} <span className="text-xs font-medium text-gray-400 dark:text-gray-500">({list.length})</span>
                        </summary>
                        <div className="px-4 pb-4 space-y-4">
                          {list.map((rule) => (
                            <div
                              key={rule.id}
                              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/80 dark:bg-gray-900/40"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <label className="text-sm font-medium text-gray-800 dark:text-gray-200" htmlFor={`rule-${rule.id}`}>
                                  {rule.label}
                                </label>
                                {rule.isEdited && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                                      Edited <span aria-hidden className="text-amber-500">●</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => resetOneRule(rule.id)}
                                      className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                )}
                              </div>
                              <AutoGrowTextarea
                                aria-label={rule.label}
                                value={rule.currentValue}
                                onChange={(v) => updateRuleValue(rule.id, v)}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                              />
                            </div>
                          ))}
                        </div>
                      </details>
                    )
                  })}
                  {anyRuleEdited && (
                    <button
                      type="button"
                      onClick={resetAllRules}
                      className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      Reset all to defaults
                    </button>
                  )}
                </div>
              )}

              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight pt-2 border-t border-gray-100 dark:border-gray-800">
                Or upload your own client style guide — PDF, DOCX, or TXT
              </h2>

              {selectedPreset === 'custom' && (
                <div className="space-y-3">
                  <input
                    ref={customGuideRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={(e) => onCustomGuideFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => customGuideRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-8 text-sm text-gray-600 dark:text-gray-300 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-colors"
                  >
                    Drop your client style guide here
                  </button>
                  <p
                    className="text-xs text-gray-500 text-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      onCustomGuideFiles(e.dataTransfer.files)
                    }}
                  >
                    Drop PDF, DOCX, or TXT — or click above to browse
                  </p>
                  {customFile && (
                    <p className="text-sm text-gray-700 dark:text-gray-200 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2">
                      {customFile.name} received — parsing coming soon
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="rounded-2xl border border-violet-200/60 dark:border-violet-900/40 bg-white/70 dark:bg-gray-900/30 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Step 3</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Run formatting</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  We’ll apply your rules and return a review-ready diff and flagged sections.
                </p>
              </div>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submitFormat()}
                className="rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 text-sm shadow-md transition-colors"
              >
                {isSubmitting ? 'Formatting…' : 'Format Transcript →'}
              </button>
            </div>
          </div>

          {(showLoadingMessage || showProcessingMessage || submitError || jobStatus) && (
            <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/25 p-6 space-y-4">
              {showLoadingMessage && (
                <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                  Applying style guide rules to your transcript… This takes 30–60 seconds for a 1-hour transcript.
                </p>
              )}
              {showProcessingMessage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                      {stageLabel ?? 'Formatting in progress…'}
                    </p>
                    {jobStatus?.stage && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Stage: {jobStatus.stage}
                      </span>
                    )}
                  </div>
                  <div className="h-2 w-full rounded-full bg-violet-200/50 dark:bg-violet-900/30 overflow-hidden">
                    <div
                      className="h-full bg-violet-600 transition-all"
                      style={{
                        width:
                          jobStatus?.stage === 'formatting'
                            ? '55%'
                            : jobStatus?.stage === 'validating'
                              ? '85%'
                              : '35%',
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {jobStatus?.stage === 'validating'
                      ? 'Running verification checks for a professional handoff…'
                      : 'Applying style guide rules to your transcript…'}
                  </p>
                </div>
              )}
              {submitError && (
                <div className="space-y-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
                  <button
                    type="button"
                    onClick={resetJobUi}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-900/60"
                  >
                    Try again
                  </button>
                </div>
              )}
              {jobStatus?.status === 'failed' && !submitError && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-800 dark:text-gray-100">Formatting failed. Please try again.</p>
                  <button
                    type="button"
                    onClick={resetJobUi}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-900/60"
                  >
                    Try again
                  </button>
                </div>
              )}
              {jobStatus?.status === 'completed' && !submitError && (
                <div className="space-y-6">
                  {jobStatus.validationReport?.summary && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Validation Report</p>
                        {typeof jobStatus.validationReport.summary.confidencePct === 'number' && (
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            Validation confidence:{' '}
                            <span className="text-violet-700 dark:text-violet-300">{jobStatus.validationReport.summary.confidencePct}%</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300">
                        <span>
                          ✓ <strong className="text-gray-900 dark:text-white">{jobStatus.validationReport.summary.verified?.passed ?? 0}</strong>{' '}
                          checks verified
                        </span>
                        <span>
                          ⚠ <strong className="text-gray-900 dark:text-white">{jobStatus.validationReport.summary.likelyCompliant?.passed ?? 0}</strong>{' '}
                          likely compliant
                        </span>
                        <span>
                          👀 <strong className="text-gray-900 dark:text-white">
                            {(jobStatus.validationReport.summary.needsReview?.total ?? 0) - (jobStatus.validationReport.summary.needsReview?.passed ?? 0)}
                          </strong>{' '}
                          require review
                        </span>
                      </div>
                      {Array.isArray(jobStatus.validationReport.checks) && jobStatus.validationReport.checks.length > 0 && (
                        <details className="pt-1">
                          <summary className="cursor-pointer text-xs font-medium text-violet-700 dark:text-violet-300">
                            Show details
                          </summary>
                          <ul className="mt-3 space-y-2 text-xs text-gray-700 dark:text-gray-300">
                            {jobStatus.validationReport.checks.map((c) => {
                              const prefix = c.bucket === 'verified' ? '✓' : c.bucket === 'likely_compliant' ? '⚠' : '👀'
                              const tone =
                                c.bucket === 'verified'
                                  ? c.passed
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-red-700 dark:text-red-300'
                                  : c.bucket === 'likely_compliant'
                                    ? 'text-amber-800 dark:text-amber-200'
                                    : 'text-gray-700 dark:text-gray-300'
                              const canJump = typeof c.segmentIndex === 'number' && c.segmentIndex > 0
                              return (
                                <li
                                  key={c.id}
                                  className={`rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-950/30 px-3 py-2 ${tone}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <button
                                      type="button"
                                      disabled={!canJump}
                                      onClick={() => {
                                        if (!canJump) return
                                        const idx = c.segmentIndex as number
                                        setFocusSegment(idx)
                                        const el = document.getElementById(`seg-${idx}`)
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                      }}
                                      className={`text-left font-semibold ${canJump ? 'hover:underline' : ''}`}
                                      title={canJump ? `Jump to segment ${c.segmentIndex}` : undefined}
                                    >
                                      {prefix} {c.label}
                                      {canJump ? <span className="ml-2 text-[10px] font-semibold opacity-80">(Segment {c.segmentIndex})</span> : null}
                                    </button>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                                      {c.bucket === 'verified' ? 'Verified' : c.bucket === 'likely_compliant' ? 'Likely compliant' : 'Needs review'}
                                    </span>
                                  </div>
                                  {c.details && <p className="mt-1 text-gray-600 dark:text-gray-300">{c.details}</p>}
                                  {c.snippet && (
                                    <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                                      “{c.snippet}”
                                    </p>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300">
                    <span>
                      <strong className="text-gray-900 dark:text-white">{flaggedList.length}</strong> sections flagged for review
                    </span>
                    <span>
                      <strong className="text-gray-900 dark:text-white">{appliedRulesList.length}</strong> rules applied
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 min-h-[120px]">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Original</h3>
                      <div className="space-y-3">
                        {originalSegments.length > 0 ? (
                          originalSegments.map((seg, idx) => {
                            const n = idx + 1
                            const isFocused = focusSegment === n
                            return (
                              <div
                                key={n}
                                id={`seg-${n}`}
                                className={`rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap font-sans leading-relaxed transition-colors ${
                                  isFocused
                                    ? 'border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30'
                                    : 'border-gray-200/70 dark:border-gray-700/70 bg-white/60 dark:bg-gray-950/20'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Segment {n}</span>
                                </div>
                                <div className="text-gray-800 dark:text-gray-200">{seg}</div>
                              </div>
                            )
                          })
                        ) : (
                          <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                            {originalTranscriptForJob}
                          </pre>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 min-h-[120px]">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Formatted
                      </h3>
                      <div className="text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans">
                        {diffSegments.length > 0 ? (
                          diffSegments.map((seg, i) => {
                            const key = `${i}-${seg.type}-${seg.text.slice(0, 12)}`
                            if (seg.type === 'added') {
                              return (
                                <span key={key} className="bg-emerald-200/80 dark:bg-emerald-900/50 px-0.5 rounded-sm">
                                  {seg.text}
                                </span>
                              )
                            }
                            if (seg.type === 'removed') {
                              return (
                                <span key={key} className="text-red-600 dark:text-red-400 line-through decoration-red-500/70 px-0.5">
                                  {seg.text}
                                </span>
                              )
                            }
                            return <span key={key}>{seg.text}</span>
                          })
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans">{jobStatus.outputText ?? ''}</pre>
                        )}
                      </div>
                    </div>
                  </div>

                  {flaggedList.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sections flagged for review</h3>
                      <ul className="space-y-3">
                        {flaggedList.map((seg, i) => {
                          const c = (seg.confidence || '').toLowerCase()
                          const badgeClass =
                            c === 'high'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                              : c === 'low'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                          return (
                            <li
                              key={i}
                              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 space-y-2 text-sm"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeClass}`}>
                                  {seg.confidence || 'medium'}
                                </span>
                                <span className="text-xs font-medium text-violet-700 dark:text-violet-300">{seg.ruleApplied}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Original: </span>
                                {seg.originalText}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Suggested: </span>
                                {seg.suggestedText}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">{seg.reason}</p>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-violet-200/60 dark:border-violet-900/40">
                    <button
                      type="button"
                      onClick={downloadFormattedTxt}
                      disabled={!jobStatus.outputText}
                      className="rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2"
                    >
                      Download TXT
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadFormattedDocx()}
                      disabled={!jobStatus.outputText}
                      className="rounded-lg border border-violet-300/70 dark:border-violet-800/60 bg-white/70 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
                    >
                      DOCX
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadFormattedPdf()}
                      disabled={!jobStatus.outputText}
                      className="rounded-lg border border-violet-300/70 dark:border-violet-800/60 bg-white/70 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={downloadFormattedRtf}
                      disabled={!jobStatus.outputText}
                      className="rounded-lg border border-violet-300/70 dark:border-violet-800/60 bg-white/70 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
                    >
                      RTF
                    </button>
                    <button
                      type="button"
                      onClick={downloadFormattedJson}
                      disabled={!jobStatus}
                      className="rounded-lg border border-violet-300/70 dark:border-violet-800/60 bg-white/70 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={downloadFlaggedCsv}
                      disabled={flaggedList.length === 0}
                      className="rounded-lg border border-violet-300/70 dark:border-violet-800/60 bg-white/70 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
                    >
                      CSV (flags)
                    </button>
                    {inputCaptionFormat ? (
                      <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Caption mode detected ({inputCaptionFormat.toUpperCase()})</span>
                        <button
                          type="button"
                          onClick={downloadFormattedSrt}
                          disabled={!jobStatus.outputText}
                          className="rounded-lg border border-violet-300/70 dark:border-violet-800/60 bg-white/70 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
                        >
                          SRT
                        </button>
                        <button
                          type="button"
                          onClick={downloadFormattedVtt}
                          disabled={!jobStatus.outputText}
                          className="rounded-lg border border-violet-300/70 dark:border-violet-800/60 bg-white/70 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
                        >
                          VTT
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                        Tip: paste SRT/VTT to enable caption-safe exports.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ToolLayout>
    </>
  )
}
