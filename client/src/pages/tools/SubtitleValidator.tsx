import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, detectFormat, validateCues, ValidationIssue } from '../../lib/subtitleUtils'

export default function SubtitleValidator() {
  const [text, setText] = useState('')
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null)
  const [cueCount, setCueCount] = useState(0)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => { setText(ev.target?.result as string); setIssues(null) }
    reader.readAsText(file)
  }

  function handleValidate() {
    setError('')
    if (!text.trim()) { setError('Please upload or paste a subtitle file.'); return }
    try {
      const fmt = detectFormat(text)
      const cues = fmt === 'vtt' ? parseVtt(text) : parseSrt(text)
      if (cues.length === 0) { setError('No subtitle cues found. Check the file format.'); return }
      setCueCount(cues.length)
      setIssues(validateCues(cues))
    } catch {
      setError('Failed to parse the file.')
    }
  }

  const errors = issues?.filter(i => i.severity === 'error') ?? []
  const warnings = issues?.filter(i => i.severity === 'warning') ?? []
  const isValid = issues !== null && errors.length === 0

  return (
    <FreeToolLayout
      title="Subtitle Validator — Check SRT & VTT Files for Errors"
      description="Validate SRT and VTT subtitle files for overlapping timestamps, lines that are too long, empty cues, and reading speed issues. Instant results in your browser."
      guideTitle="How to validate a subtitle file"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the subtitle content. The tool auto-detects the format.' },
        { step: 'Click Validate', desc: 'The tool scans for errors (overlapping cues, bad timestamps, empty text) and warnings (long lines, fast reading speed).' },
        { step: 'Review and fix issues', desc: 'Each issue shows the cue number and description. Fix issues manually or use our AI-powered Fix Subtitles tool.' },
      ]}
      faqs={[
        { q: 'What errors does the validator check for?', a: 'Overlapping timestamps (a cue starts before the previous ends), end time before start time, empty cue text, lines over 42 characters, and reading speed over 21 CPS (characters per second).' },
        { q: 'What is 21 CPS and why does it matter?', a: 'CPS stands for Characters Per Second — how fast a viewer must read a subtitle. The broadcast standard (Netflix, BBC, EBU) is a maximum of 17–21 CPS. Subtitles faster than this are hard for most viewers to read.' },
        { q: 'What is the maximum line length for subtitles?', a: 'The Netflix subtitle specification requires no more than 42 characters per line. YouTube recommends 80 characters per full line. This tool flags lines over 42 characters as warnings.' },
        { q: 'What is an overlapping subtitle?', a: 'An overlap occurs when one subtitle\'s end time is later than the next subtitle\'s start time. This causes both to display simultaneously, which most players handle by cutting one off.' },
        { q: 'How do I fix the issues found?', a: 'Use our free Shift Subtitle Timing tool to adjust all timestamps, or our AI-powered Fix Subtitles tool to automatically correct overlaps, long lines, and timing.' },
      ]}
      relatedTools={[
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'AI auto-correct for timing and format issues' },
        { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Bulk-adjust all timestamps' },
        { label: 'Subtitle Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Detailed CPS analysis per cue' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate clean subtitles from video with AI' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName || 'Click to upload SRT or VTT file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Paste SRT or VTT content here…"
          value={text}
          onChange={(e) => { setText(e.target.value); setIssues(null) }}
        />

        <button onClick={handleValidate} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">
          Validate File
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {issues !== null && (
          <div className="space-y-3">
            {/* Summary */}
            <div className={`rounded-xl p-4 text-center ${isValid ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              <p className={`text-lg font-bold ${isValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {isValid ? '✓ No errors found' : `${errors.length} error${errors.length !== 1 ? 's' : ''}, ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cueCount} cues validated</p>
            </div>

            {/* Issues list */}
            {issues.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {issues.map((issue, i) => (
                  <div key={i} className={`flex gap-3 rounded-lg p-3 text-sm ${issue.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
                    <span className={`text-xs font-bold uppercase tracking-wide mt-0.5 ${issue.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {issue.severity === 'error' ? 'ERR' : 'WARN'}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{issue.message}</span>
                  </div>
                ))}
              </div>
            )}

            {!isValid && (
              <a href="/fix-subtitles" className="block w-full py-2.5 rounded-xl border border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300 font-semibold text-sm text-center hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                Fix issues automatically with AI →
              </a>
            )}
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
