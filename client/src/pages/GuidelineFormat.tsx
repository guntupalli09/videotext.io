import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { ToolLayout } from '../components/figma/ToolLayout'
import { api, getAuthToken } from '../lib/api'
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
  outputText: string | null
  diffData: DiffSegment[] | null
  flaggedSegments: FlaggedSegment[] | null
  appliedRules: string[] | null
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
    setIsSubmitting(true)
    setSubmitError(null)
    setJobStatus(null)
    setJobId(null)
    setOriginalTranscriptForJob(transcript.trim())
    try {
      const res = await api('/api/guidelines/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptText: transcript.trim(),
          rules: rulesPayload,
          presetId: selectedPreset,
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
    toast('Please upload a .txt or .docx file')
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
  const showProcessingMessage = isSubmitting && jobStatus && (jobStatus.status === 'queued' || jobStatus.status === 'processing')

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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Transcript</h2>
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
                  accept=".txt,text/plain"
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Built-in presets: Rev, GoTranscript, TranscribeMe, Scribie
              </h2>

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
                <div className="space-y-6">
                  {CATEGORY_ORDER.map((cat) => {
                    const list = rulesByCategory.get(cat) ?? []
                    if (!list.length) return null
                    return (
                      <div key={cat}>
                        <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-3">{cat}</h3>
                        <div className="space-y-4">
                          {list.map((rule) => (
                            <div
                              key={rule.id}
                              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/80 dark:bg-gray-950/40"
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
                                      Reset to default
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
                      </div>
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

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submitFormat()}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 text-sm shadow-md transition-colors"
          >
            Format Transcript →
          </button>

          {(showLoadingMessage || showProcessingMessage || submitError || jobStatus) && (
            <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/25 p-6 space-y-4">
              {showLoadingMessage && (
                <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                  Applying style guide rules to your transcript… This takes 30–60 seconds for a 1-hour transcript.
                </p>
              )}
              {showProcessingMessage && (
                <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">Formatting in progress…</p>
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
                      <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {originalTranscriptForJob}
                      </pre>
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
