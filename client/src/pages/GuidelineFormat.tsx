import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
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
  extractionConfidence?: 'high' | 'medium' | 'needs_review'
  extractionReason?: string
  sourceQuote?: string
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

type ResultMode = 'summary' | 'review' | 'full'

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
      qaReductionPct?: number
      qaReductionBasis?: {
        inputTokens: number
        outputTokens: number
        fillerTokenReduction: number
        repetitionRateDelta: number
        verifiedChecksPassed: number
        verifiedChecksTotal: number
        flaggedCount: number
      }
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

function applyReviewEditsToOutputText(
  outputText: string,
  flagged: FlaggedSegment[],
  edits: Record<number, string>
): { text: string; warnings: string[] } {
  let text = outputText
  const warnings: string[] = []
  for (const [k, v] of Object.entries(edits)) {
    const i = Number(k)
    if (!Number.isFinite(i) || i < 0) continue
    const seg = flagged[i]
    if (!seg) continue
    const next = String(v ?? '')
    if (!next.trim()) continue
    const needle = seg.suggestedText || ''
    if (!needle.trim()) continue
    const idx = text.indexOf(needle)
    if (idx === -1) {
      warnings.push(`Could not apply edit for issue ${i + 1} (text not found in formatted output).`)
      continue
    }
    text = text.slice(0, idx) + next + text.slice(idx + needle.length)
  }
  return { text, warnings }
}

export default function GuidelineFormat() {
  const [transcript, setTranscript] = useState('')
  const [prefillBanner, setPrefillBanner] = useState(false)
  const [selectValue, setSelectValue] = useState<SelectValue>('')
  const [selectedPreset, setSelectedPreset] = useState<GuidelinePresetKey | 'custom' | null>(null)
  const [rules, setRules] = useState<EditableRule[]>([])
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [customGuideLoading, setCustomGuideLoading] = useState(false)
  const [customGuideError, setCustomGuideError] = useState<string | null>(null)
  const [customGuideConflicts, setCustomGuideConflicts] = useState<
    Array<{ ruleIdA: string; ruleIdB: string; summary: string; confidence: 'high' | 'medium' }>
  >([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** Transcript snapshot for the active job — used so "Original" stays stable while user edits textarea. */
  const [originalTranscriptForJob, setOriginalTranscriptForJob] = useState('')
  const [inputCaptionFormat, setInputCaptionFormat] = useState<'srt' | 'vtt' | null>(null)
  const [originalCaptionCues, setOriginalCaptionCues] = useState<ReturnType<typeof parseSrt> | null>(null)
  const [focusSegment, setFocusSegment] = useState<number | null>(null)
  const [resultMode, setResultMode] = useState<ResultMode>('summary')
  const [categoryOpen, setCategoryOpen] = useState<Record<string, boolean>>({})
  const [reviewIssueCursor, setReviewIssueCursor] = useState(0)
  const [reviewEdits, setReviewEdits] = useState<Record<number, string>>({})
  const [reviewWarnings, setReviewWarnings] = useState<string[]>([])
  const [fullTranscriptMode, setFullTranscriptMode] = useState<'all' | 'focus'>('all')
  const [focusContextExpanded, setFocusContextExpanded] = useState<Record<number, boolean>>({})
  const originalScrollRef = useRef<HTMLDivElement>(null)
  const formattedScrollRef = useRef<HTMLDivElement>(null)
  const syncScrollLockRef = useRef<'original' | 'formatted' | null>(null)
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
    selectedPreset != null &&
    (selectedPreset !== 'custom' ? true : customFile !== null && rules.length > 0 && !customGuideLoading && !customGuideError)

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
    setCustomGuideError(null)
    setCustomGuideConflicts([])
    setResultMode('summary')
    setReviewIssueCursor(0)
    setReviewEdits({})
    setReviewWarnings([])
    setFullTranscriptMode('all')
    setFocusContextExpanded({})
  }

  const buildRulesPayload = (): ParsedRule[] => {
    if (selectedPreset === 'custom') {
      return rules.map((r) => ({
        id: r.id,
        category: r.category,
        label: r.label,
        currentValue: r.currentValue,
      }))
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

  const getExportText = (): { text: string; warnings: string[] } => {
    const base = jobStatus?.outputText || ''
    if (!base) return { text: '', warnings: [] }
    return applyReviewEditsToOutputText(base, flaggedList, reviewEdits)
  }

  const downloadFormattedTxt = () => {
    const { text, warnings } = getExportText()
    if (!text) return
    if (warnings.length) {
      setReviewWarnings(warnings)
      toast('Some review edits could not be applied. Exporting best-effort output.')
    }
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
    const { text: formattedText, warnings } = getExportText()
    if (!original || !formattedText) return
    if (warnings.length) {
      setReviewWarnings(warnings)
      toast('Some review edits could not be applied. Exporting best-effort output.')
    }
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
    const { text: formattedText, warnings } = getExportText()
    if (!formattedText) return
    if (warnings.length) {
      setReviewWarnings(warnings)
      toast('Some review edits could not be applied. Exporting best-effort output.')
    }
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
    const { text, warnings } = getExportText()
    const payload = {
      ...jobStatus,
      jobId,
      originalText: originalTranscriptForJob,
      outputText: text || jobStatus.outputText,
      reviewWarnings: warnings.length ? warnings : undefined,
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
    const { text, warnings } = getExportText()
    if (!text) return
    if (warnings.length) {
      setReviewWarnings(warnings)
      toast('Some review edits could not be applied. Exporting best-effort output.')
    }
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
    const { text, warnings } = getExportText()
    if (!text) return
    if (warnings.length) {
      setReviewWarnings(warnings)
      toast('Some review edits could not be applied. Exporting best-effort output.')
    }
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
    const { text, warnings } = getExportText()
    if (!text) return
    if (warnings.length) {
      setReviewWarnings(warnings)
      toast('Some review edits could not be applied. Exporting best-effort output.')
    }
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
    setCustomGuideLoading(true)
    setCustomGuideError(null)
    setRules([])
    resetJobUi()
    const fd = new FormData()
    fd.append('file', file)
    api('/api/guidelines/parse-guide', { method: 'POST', body: fd, timeout: 60000 })
      .then(async (res) => {
        const data = (await res.json()) as {
          rules?: Array<{
            id: string
            category: string
            label: string
            currentValue: string
            extractionConfidence?: 'high' | 'medium' | 'needs_review'
            extractionReason?: string
            sourceQuote?: string
          }>
          conflicts?: Array<{ ruleIdA: string; ruleIdB: string; summary: string; confidence: 'high' | 'medium' }>
          error?: string
        }
        if (!res.ok) {
          throw new Error(data.error || 'Failed to parse style guide')
        }
        const list = Array.isArray(data.rules) ? data.rules : []
        if (!list.length) throw new Error('No rules extracted from this guide')
        setCustomGuideConflicts(Array.isArray(data.conflicts) ? data.conflicts : [])
        setRules(
          list.map((r) => ({
            id: r.id,
            category: r.category,
            label: r.label,
            defaultValue: r.currentValue,
            currentValue: r.currentValue,
            isEdited: false,
            extractionConfidence: r.extractionConfidence,
            extractionReason: r.extractionReason,
            sourceQuote: r.sourceQuote,
          }))
        )
        toast.success('Rules extracted — please review before formatting')
      })
      .catch((e) => {
        setCustomGuideError(e instanceof Error ? e.message : 'Failed to parse style guide')
        toast.error('Style guide parsing failed')
      })
      .finally(() => setCustomGuideLoading(false))
  }

  const rulesByCategory = useMemo(() => {
    const map = new Map<string, EditableRule[]>()
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, [])
    }
    for (const r of rules) {
      if (!map.has(r.category)) map.set(r.category, [])
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

  const findSegmentForText = useCallback(
    (needle: string): number | null => {
      const n = (needle || '').trim()
      if (!n) return null
      const nLower = n.toLowerCase()
      for (let i = 0; i < originalSegments.length; i++) {
        const seg = originalSegments[i]
        if (seg.toLowerCase().includes(nLower)) return i + 1
      }
      // Fallback: try first ~80 chars to handle model-added punctuation changes
      const short = n.slice(0, 80).toLowerCase()
      if (short.length >= 12) {
        for (let i = 0; i < originalSegments.length; i++) {
          const seg = originalSegments[i]
          if (seg.toLowerCase().includes(short)) return i + 1
        }
      }
      return null
    },
    [originalSegments]
  )

  useEffect(() => {
    if (jobStatus?.status === 'completed') {
      setResultMode('summary')
      setReviewIssueCursor(0)
      setReviewWarnings([])
      setFullTranscriptMode('all')
      setFocusContextExpanded({})
    }
  }, [jobStatus?.status])

  useEffect(() => {
    if (!selectedPreset || rules.length === 0) return
    setCategoryOpen((prev) => {
      const next: Record<string, boolean> = { ...prev }
      for (const [cat, list] of rulesByCategory.entries()) {
        if (!list.length) continue
        if (typeof next[cat] !== 'boolean') next[cat] = false
      }
      return next
    })
  }, [rules.length, rulesByCategory, selectedPreset])

  const effectiveOutputText = useMemo(() => {
    const base = jobStatus?.outputText
    if (!base) return ''
    const { text, warnings } = applyReviewEditsToOutputText(base, flaggedList, reviewEdits)
    return warnings.length ? text : text
  }, [flaggedList, jobStatus?.outputText, reviewEdits])

  const validationHealth = useMemo(() => {
    const report = jobStatus?.validationReport
    const checks = Array.isArray(report?.checks) ? report!.checks! : []
    const byId = new Map(checks.map((c) => [c.id, c]))
    const speaker = byId.get('speaker_labels')
    const artifacts = byId.get('no_ai_artifacts')
    const outputPresent = byId.get('output_non_empty')
    const caption = byId.get('caption_metadata_preserved')
    const confidencePct = report?.summary?.confidencePct
    return {
      confidencePct: typeof confidencePct === 'number' ? confidencePct : null,
      outputPresent,
      artifacts,
      speaker,
      caption,
      reviewSuggestions: flaggedList.length,
      isCaptionMode: Boolean(inputCaptionFormat),
    }
  }, [flaggedList.length, inputCaptionFormat, jobStatus?.validationReport])

  const onScrollSynced = useCallback((source: 'original' | 'formatted') => {
    const from = source === 'original' ? originalScrollRef.current : formattedScrollRef.current
    const to = source === 'original' ? formattedScrollRef.current : originalScrollRef.current
    if (!from || !to) return
    if (syncScrollLockRef.current && syncScrollLockRef.current !== source) return
    syncScrollLockRef.current = source
    const fromMax = Math.max(1, from.scrollHeight - from.clientHeight)
    const toMax = Math.max(1, to.scrollHeight - to.clientHeight)
    const ratio = from.scrollTop / fromMax
    to.scrollTop = ratio * toMax
    window.setTimeout(() => {
      if (syncScrollLockRef.current === source) syncScrollLockRef.current = null
    }, 0)
  }, [])

  return (
    <>
      <ToolLayout
        breadcrumbs={[{ label: 'Format to client guidelines', href: '/guideline-format' }]}
        title="Turn Raw Transcripts Into Client-Ready Deliverables"
        subtitle="Apply Rev, GoTranscript, or your client’s custom style guide automatically — with validation-backed formatting, QA checks, and a review queue."
        icon={<FileText className="text-violet-600 dark:text-violet-400" strokeWidth={1.75} />}
        sidebar={null}
      >
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-wrap gap-2">
            {[
              'Validation-backed formatting',
              'Caption-safe exports',
              'Segment-linked review',
              'Works with custom client guides',
            ].map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200"
              >
                ✓ {t}
              </span>
            ))}
          </div>
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

              {selectedPreset === 'custom' && rules.length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-semibold">Rules extracted from your guide — please review before formatting.</p>
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-1">
                    We’ll mark ambiguous rules as “Needs review” and warn on conflicts.
                  </p>
                </div>
              )}

              {selectedPreset === 'custom' && customGuideConflicts.length > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 px-4 py-3 space-y-2">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">Potential rule conflicts detected</p>
                  <ul className="space-y-1 text-xs text-red-700 dark:text-red-200">
                    {customGuideConflicts.slice(0, 6).map((c, idx) => (
                      <li key={idx}>
                        <span className="font-semibold">{c.confidence === 'high' ? 'High' : 'Medium'} confidence:</span> {c.summary}
                      </li>
                    ))}
                    {customGuideConflicts.length > 6 && (
                      <li className="text-red-700/80 dark:text-red-200/80">…and {customGuideConflicts.length - 6} more</li>
                    )}
                  </ul>
                </div>
              )}

              {selectedPreset && rules.length > 0 && (
                <div className="space-y-4">
                  {[...CATEGORY_ORDER, ...[...rulesByCategory.keys()].filter((k) => !(CATEGORY_ORDER as readonly string[]).includes(k))].map(
                    (cat) => {
                      const list = rulesByCategory.get(cat) ?? []
                      if (!list.length) return null
                      const isOpen = Boolean(categoryOpen[cat])
                      return (
                        <div
                          key={cat}
                          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-950/30 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setCategoryOpen((p) => ({ ...p, [cat]: !Boolean(p[cat]) }))}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                            aria-expanded={isOpen}
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center text-violet-700 dark:text-violet-300">
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                                {cat}{' '}
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">({list.length} rules)</span>
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {isOpen ? 'Hide' : 'Show'}
                            </span>
                          </button>
                          {isOpen && (
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
                                    {selectedPreset === 'custom' && rule.extractionConfidence && (
                                      <span
                                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                          rule.extractionConfidence === 'high'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                                            : rule.extractionConfidence === 'medium'
                                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                                              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                                        }`}
                                        title={rule.extractionReason || undefined}
                                      >
                                        {rule.extractionConfidence === 'high'
                                          ? 'High confidence'
                                          : rule.extractionConfidence === 'medium'
                                            ? 'Medium confidence'
                                            : 'Needs review'}
                                      </span>
                                    )}
                                  </div>
                                  {selectedPreset === 'custom' && (rule.extractionReason || rule.sourceQuote) && (
                                    <div className="mb-2 space-y-1">
                                      {rule.extractionReason && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{rule.extractionReason}</p>
                                      )}
                                      {rule.sourceQuote && (
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                                          “{rule.sourceQuote}”
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  <AutoGrowTextarea
                                    aria-label={rule.label}
                                    value={rule.currentValue}
                                    onChange={(v) => updateRuleValue(rule.id, v)}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }
                  )}
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
                      {customFile.name} received
                    </p>
                  )}
                  {customGuideLoading && (
                    <p className="text-sm text-gray-700 dark:text-gray-200 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2">
                      Parsing style guide… extracting rules
                    </p>
                  )}
                  {customGuideError && (
                    <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 px-3 py-2">
                      <p className="text-sm text-red-700 dark:text-red-300">{customGuideError}</p>
                    </div>
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
                {isSubmitting ? 'Generating…' : 'Generate Client-Ready Transcript →'}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { key: 'queued', label: 'Preparing transcript…' },
                      { key: 'formatting', label: 'Applying style guide…' },
                      { key: 'validating', label: 'Verifying checks…' },
                      { key: 'completed', label: 'Generating review queue…' },
                    ].map((s) => {
                      const active =
                        jobStatus?.stage === s.key ||
                        (s.key === 'queued' && (jobStatus?.status === 'queued' || jobStatus?.stage === 'queued')) ||
                        (s.key === 'completed' && jobStatus?.status === 'completed')
                      const done =
                        jobStatus?.stage === 'completed' ||
                        (jobStatus?.stage === 'validating' && (s.key === 'queued' || s.key === 'formatting')) ||
                        (jobStatus?.stage === 'formatting' && s.key === 'queued')
                      return (
                        <div
                          key={s.key}
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            active
                              ? 'border-violet-300 dark:border-violet-800 bg-white/70 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100'
                              : 'border-gray-200/60 dark:border-gray-800 bg-white/40 dark:bg-gray-950/20 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{s.label}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{done ? '✓' : active ? '…' : ''}</span>
                          </div>
                        </div>
                      )
                    })}
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
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">System health</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Validation Summary</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Calm checks that answer: “Can I trust this deliverable?”
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Validation confidence</p>
                          <p className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                            {validationHealth.confidencePct ?? jobStatus.validationReport.summary.confidencePct}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-px bg-gray-200/70 dark:bg-gray-700/70" />

                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2 text-sm">
                          {[
                            {
                              key: 'formatting_integrity',
                              label: 'Formatting integrity verified',
                              passed: Boolean(validationHealth.outputPresent?.passed && validationHealth.artifacts?.passed),
                              details:
                                validationHealth.outputPresent?.passed && validationHealth.artifacts?.passed
                                  ? undefined
                                  : validationHealth.outputPresent?.details || validationHealth.artifacts?.details,
                            },
                            {
                              key: 'speaker_preservation',
                              label: 'Speaker preservation verified',
                              passed: validationHealth.speaker?.passed ?? true,
                              details: validationHealth.speaker?.details,
                            },
                            ...(validationHealth.isCaptionMode
                              ? [
                                  {
                                    key: 'caption_export',
                                    label: 'Caption export validated',
                                    passed: validationHealth.caption?.passed ?? true,
                                    details: validationHealth.caption?.details,
                                  },
                                ]
                              : []),
                          ].map((row) => (
                            <div
                              key={row.key}
                              className="flex items-start justify-between gap-3 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/60 dark:bg-gray-950/20 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{row.label}</p>
                                {row.details ? <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{row.details}</p> : null}
                              </div>
                              <span
                                className={`shrink-0 text-xs font-semibold ${
                                  row.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                                }`}
                              >
                                {row.passed ? '✓' : '✕'}
                              </span>
                            </div>
                          ))}

                          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/60 dark:bg-gray-950/20 px-3 py-2">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">Review suggestions</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                Flagged sections that may need a human pass.
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                              {validationHealth.reviewSuggestions ? `⚠ ${validationHealth.reviewSuggestions}` : '✓ 0'}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-violet-200/60 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3">
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            Estimated formatting cleanup reduced by{' '}
                            <span className="font-semibold text-violet-700 dark:text-violet-300">
                              ~{jobStatus.validationReport.summary.qaReductionPct}%
                            </span>
                          </p>
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                            Based on automated cleanup signals + verification coverage — an estimate, not a guarantee.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-700 dark:text-gray-300">
                            <span className="rounded-full border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 px-3 py-1">
                              ✓ {jobStatus.validationReport.summary.verified?.passed ?? 0}/{jobStatus.validationReport.summary.verified?.total ?? 0} verified
                            </span>
                            <span className="rounded-full border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 px-3 py-1">
                              ⚠ {jobStatus.validationReport.summary.likelyCompliant?.passed ?? 0}/{jobStatus.validationReport.summary.likelyCompliant?.total ?? 0} likely compliant
                            </span>
                          </div>
                        </div>
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

                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Ready for review</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                          Start with flagged sections (lowest cognitive load), then review the full transcript.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={flaggedList.length === 0}
                          onClick={() => {
                            setResultMode('review')
                            setReviewIssueCursor(0)
                            setReviewWarnings([])
                          }}
                          className="rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2"
                        >
                          Review Issues ({flaggedList.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultMode('full')}
                          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                        >
                          Open full transcript
                        </button>
                      </div>
                    </div>
                  </div>

                  {resultMode === 'review' && (
                    <div className="space-y-4">
                      {flaggedList.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-4">
                          <p className="text-sm text-gray-800 dark:text-gray-100">No issues flagged. You’re good to export.</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                Issue {reviewIssueCursor + 1} of {flaggedList.length}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">Resolve issues one at a time, then export.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setResultMode('full')}
                                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                              >
                                Full transcript
                              </button>
                              <button
                                type="button"
                                onClick={() => setResultMode('summary')}
                                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                              >
                                Back to summary
                              </button>
                            </div>
                          </div>

                          {(() => {
                            const seg = flaggedList[Math.min(flaggedList.length - 1, Math.max(0, reviewIssueCursor))]
                            const c = (seg?.confidence || '').toLowerCase()
                            const badgeClass =
                              c === 'high'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                                : c === 'low'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                            const segIndex = seg ? findSegmentForText(seg.originalText) : null
                            const canJump = typeof segIndex === 'number' && segIndex > 0
                            const issueIdx = Math.min(flaggedList.length - 1, Math.max(0, reviewIssueCursor))
                            const editValue = typeof reviewEdits[issueIdx] === 'string' ? reviewEdits[issueIdx] : seg?.suggestedText || ''
                            const goNext = () => {
                              const nextWarnings: string[] = []
                              const base = jobStatus.outputText ?? ''
                              if (base) {
                                const { warnings } = applyReviewEditsToOutputText(base, flaggedList, reviewEdits)
                                nextWarnings.push(...warnings)
                              }
                              setReviewWarnings(nextWarnings)
                              setReviewIssueCursor((v) => Math.min(flaggedList.length - 1, v + 1))
                            }
                            return (
                              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-5 space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeClass}`}>
                                        {seg?.confidence || 'medium'}
                                      </span>
                                      <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{seg?.ruleApplied}</span>
                                    </div>
                                    <p className="text-sm text-gray-800 dark:text-gray-100">{seg?.reason}</p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={!canJump}
                                    onClick={() => {
                                      if (!canJump) return
                                      setResultMode('full')
                                      setFocusSegment(segIndex as number)
                                      window.setTimeout(() => {
                                        const el = document.getElementById(`seg-${segIndex}`)
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                      }, 50)
                                    }}
                                    className={`text-xs font-semibold ${
                                      canJump ? 'text-violet-700 dark:text-violet-300 hover:underline' : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                    title={canJump ? `Open full transcript at segment ${segIndex}` : 'Could not locate this text in the original transcript'}
                                  >
                                    {canJump ? `Open at segment ${segIndex}` : 'Open at segment unavailable'}
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                  <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-gray-950/20 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Original</p>
                                    <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed opacity-75">
                                      {seg?.originalText || ''}
                                    </div>
                                  </div>
                                  <div className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/10 p-4">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Formatted</p>
                                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {issueIdx in reviewEdits ? 'Edited' : 'Suggested'}
                                      </span>
                                    </div>
                                    <AutoGrowTextarea
                                      aria-label="Formatted suggestion"
                                      value={editValue}
                                      onChange={(v) => setReviewEdits((p) => ({ ...p, [issueIdx]: v }))}
                                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/20 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (seg?.suggestedText) setReviewEdits((p) => ({ ...p, [issueIdx]: seg.suggestedText }))
                                        goNext()
                                      }}
                                      className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2"
                                    >
                                      Accept & Next
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReviewEdits((p) => {
                                          if (!(issueIdx in p)) return p
                                          const { [issueIdx]: _omit, ...rest } = p
                                          return rest
                                        })
                                        goNext()
                                      }}
                                      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                    >
                                      Skip
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setReviewIssueCursor((v) => Math.max(0, v - 1))}
                                      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                    >
                                      Previous
                                    </button>
                                    <button
                                      type="button"
                                      onClick={goNext}
                                      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                    >
                                      Next
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setResultMode('full')}
                                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                  >
                                    Review full transcript
                                  </button>
                                </div>
                              </div>
                            )
                          })()}
                        </>
                      )}
                    </div>
                  )}

                  {resultMode === 'full' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Transcript view</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                            Original is dimmed (40%). Formatted is primary (60%). Scrolling stays synced — or switch to Focus Mode.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setFullTranscriptMode('all')}
                              className={`px-3 py-2 text-sm font-semibold ${
                                fullTranscriptMode === 'all'
                                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                  : 'text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900/40'
                              }`}
                            >
                              Full
                            </button>
                            <button
                              type="button"
                              disabled={flaggedList.length === 0}
                              onClick={() => setFullTranscriptMode('focus')}
                              className={`px-3 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                                fullTranscriptMode === 'focus'
                                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                  : 'text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900/40'
                              }`}
                              title={flaggedList.length ? 'Show only flagged sections with expandable context' : 'No flagged sections available'}
                            >
                              Focus
                            </button>
                          </div>
                          {flaggedList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setResultMode('review')}
                              className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2"
                            >
                              Review Issues ({flaggedList.length})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setResultMode('summary')}
                            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                          >
                            Back to summary
                          </button>
                        </div>
                      </div>

                      {fullTranscriptMode === 'focus' ? (
                        <div className="space-y-3">
                          {flaggedList.length === 0 ? (
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-4">
                              <p className="text-sm text-gray-800 dark:text-gray-100">No flagged sections. Switch back to Full view to review everything.</p>
                            </div>
                          ) : (
                            flaggedList.map((seg, i) => {
                              const segIndex = findSegmentForText(seg.originalText)
                              const expanded = Boolean(focusContextExpanded[i])
                              const centerIdx = typeof segIndex === 'number' ? segIndex - 1 : null
                              const context =
                                centerIdx != null && originalSegments.length
                                  ? expanded
                                    ? [centerIdx - 1, centerIdx, centerIdx + 1].filter((x) => x >= 0 && x < originalSegments.length)
                                    : [centerIdx]
                                  : []
                              const formatted = typeof reviewEdits[i] === 'string' ? reviewEdits[i] : seg.suggestedText
                              const c = (seg.confidence || '').toLowerCase()
                              const badgeClass =
                                c === 'high'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                                  : c === 'low'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                              return (
                                <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-5 space-y-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeClass}`}>
                                          {seg.confidence || 'medium'}
                                        </span>
                                        <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{seg.ruleApplied}</span>
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                          Issue {i + 1} of {flaggedList.length}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-800 dark:text-gray-100">{seg.reason}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setFocusContextExpanded((p) => ({ ...p, [i]: !Boolean(p[i]) }))}
                                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                      >
                                        {expanded ? 'Collapse context' : 'Expand surrounding context'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={typeof segIndex !== 'number' || segIndex <= 0}
                                        onClick={() => {
                                          if (typeof segIndex !== 'number' || segIndex <= 0) return
                                          setFullTranscriptMode('all')
                                          setFocusSegment(segIndex)
                                          window.setTimeout(() => {
                                            const el = document.getElementById(`seg-${segIndex}`)
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                          }, 50)
                                        }}
                                        className={`rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 text-sm font-semibold px-4 py-2 ${
                                          typeof segIndex === 'number' && segIndex > 0
                                            ? 'text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900/40'
                                            : 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                                        }`}
                                      >
                                        Open in full view
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                    <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-gray-950/20 p-4">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Original</p>
                                      {context.length ? (
                                        <div className="space-y-2">
                                          {context.map((idx) => (
                                            <div key={idx} className="rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-950/20 px-3 py-2">
                                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Segment {idx + 1}</p>
                                              <div className="mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed opacity-75">
                                                {originalSegments[idx]}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed opacity-75">
                                          {seg.originalText}
                                        </div>
                                      )}
                                    </div>
                                    <div className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/10 p-4">
                                      <div className="flex items-center justify-between gap-3 mb-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Formatted</p>
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                          {i in reviewEdits ? 'Edited' : 'Suggested'}
                                        </span>
                                      </div>
                                      <AutoGrowTextarea
                                        aria-label="Formatted suggestion"
                                        value={formatted}
                                        onChange={(v) => setReviewEdits((p) => ({ ...p, [i]: v }))}
                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/20 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                          <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/30 p-4">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Original</h3>
                            <div
                              ref={originalScrollRef}
                              onScroll={() => onScrollSynced('original')}
                              className="h-[60vh] overflow-auto pr-2"
                            >
                              <div className="space-y-3">
                                {originalSegments.length > 0 ? (
                                  originalSegments.map((seg, idx) => {
                                    const n = idx + 1
                                    const isFocused = focusSegment === n
                                    return (
                                      <div
                                        key={n}
                                        id={`seg-${n}`}
                                        className={`rounded-xl border px-3 py-2 text-xs whitespace-pre-wrap font-sans leading-relaxed transition-colors opacity-70 ${
                                          isFocused
                                            ? 'border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30 opacity-100'
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
                                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed opacity-75">
                                    {originalTranscriptForJob}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="lg:col-span-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 shadow-sm">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Formatted</h3>
                            <div
                              ref={formattedScrollRef}
                              onScroll={() => onScrollSynced('formatted')}
                              className="h-[60vh] overflow-auto pr-2"
                            >
                              <div className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans">
                                {diffSegments.length > 0 ? (
                                  diffSegments.map((seg, i) => {
                                    const key = `${i}-${seg.type}-${seg.text.slice(0, 12)}`
                                    if (seg.type === 'added') {
                                      return (
                                        <span key={key} className="bg-emerald-200/60 dark:bg-emerald-900/40 px-0.5 rounded-sm">
                                          {seg.text}
                                        </span>
                                      )
                                    }
                                    if (seg.type === 'removed') {
                                      return (
                                        <span key={key} className="text-red-600 dark:text-red-400 line-through decoration-red-500/70 px-0.5 opacity-70">
                                          {seg.text}
                                        </span>
                                      )
                                    }
                                    return <span key={key}>{seg.text}</span>
                                  })
                                ) : (
                                  <pre className="whitespace-pre-wrap font-sans">{effectiveOutputText}</pre>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {reviewWarnings.length > 0 && (
                        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                          <p className="font-semibold">Some edits could not be applied to the full output:</p>
                          <ul className="mt-2 space-y-1 text-xs">
                            {reviewWarnings.slice(0, 5).map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                            {reviewWarnings.length > 5 ? <li>…and {reviewWarnings.length - 5} more</li> : null}
                          </ul>
                        </div>
                      )}
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
