import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { ToolLayout } from '../components/figma/ToolLayout'
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
  const [formatSummary, setFormatSummary] = useState<null | {
    presetLabel: string
    rulesSnapshot: { id: string; label: string; value: string }[]
  }>(null)
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

  const canSubmit = transcript.trim().length > 0 && hasGuidelineSelected

  const anyRuleEdited = rules.some((r) => r.isEdited)

  const onSelectPreset = (v: SelectValue) => {
    setSelectValue(v)
    setFormatSummary(null)
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
    setFormatSummary(null)
  }

  const presetLabelForMessage =
    selectedPreset != null && selectedPreset !== 'custom'
      ? PRESET_DATA[selectedPreset].label
      : selectedPreset === 'custom' && customFile
        ? customFile.name
        : 'custom guideline'

  const handleFormat = () => {
    if (!canSubmit) return
    const snapshot =
      selectedPreset && selectedPreset !== 'custom'
        ? rules.map((r) => ({ id: r.id, label: r.label, value: r.currentValue }))
        : []
    setFormatSummary({
      presetLabel: presetLabelForMessage,
      rulesSnapshot: snapshot,
    })
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
            onClick={handleFormat}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 text-sm shadow-md transition-colors"
          >
            Format Transcript →
          </button>

          {formatSummary && (
            <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/25 p-6 space-y-4">
              <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                Guideline enforcement is being set up. Your transcript and <strong>{formatSummary.presetLabel}</strong> have been
                received.
              </p>
              {formatSummary.rulesSnapshot.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Current rule values (edited text)
                  </p>
                  <ul className="space-y-2 max-h-64 overflow-y-auto text-xs text-gray-700 dark:text-gray-300">
                    {formatSummary.rulesSnapshot.map((r) => (
                      <li key={r.id}>
                        <span className="font-medium text-gray-900 dark:text-white">{r.label}: </span>
                        {r.value.length > 180 ? `${r.value.slice(0, 180)}…` : r.value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </ToolLayout>
    </>
  )
}
