import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import FreeToolResultGate from '../../components/FreeToolResultGate'
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
      description="Validate SRT and VTT subtitle files for overlapping timestamps, long lines, empty cues, and reading speed violations. Instant, browser-based, no account required."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What does subtitle validation check for?',
          body: (
            <>
              <p>A subtitle validator inspects your file for issues that cause problems in players, broadcast systems, and quality-control pipelines. This tool checks for:</p>
              <ul className="list-disc list-inside mt-2 space-y-1.5">
                <li><strong className="text-gray-900 dark:text-white">Overlapping cues</strong> — when one subtitle ends after the next one begins, causing both to show at the same time</li>
                <li><strong className="text-gray-900 dark:text-white">Bad timestamps</strong> — end time before start time, or zero-duration cues</li>
                <li><strong className="text-gray-900 dark:text-white">Empty cues</strong> — numbered subtitle blocks with no text content</li>
                <li><strong className="text-gray-900 dark:text-white">Long lines</strong> — lines over 42 characters, which exceed the Netflix subtitle specification</li>
                <li><strong className="text-gray-900 dark:text-white">Fast reading speed</strong> — cues with more than 21 characters per second (CPS), which exceeds EBU and Netflix standards</li>
              </ul>
            </>
          ),
        },
        {
          heading: 'Why do subtitle errors matter?',
          body: 'On consumer players, overlapping subtitles are often cut off or displayed incorrectly. On Netflix and broadcast platforms, subtitle files with specification violations are rejected during quality control and must be resubmitted. For accessibility (closed captions for the deaf and hard of hearing), errors like fast reading speed or missing text make the content unusable for the audience who depends on it. Validating before upload prevents rejected deliverables and viewer complaints.',
        },
      ]}
      guideTitle="How to validate a subtitle file"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the subtitle content. The tool auto-detects format.' },
        { step: 'Click Validate', desc: 'The tool scans every cue for errors (overlaps, bad timing) and warnings (long lines, fast reading speed).' },
        { step: 'Review and fix', desc: 'Each issue shows the cue number and a description. Fix manually or use our AI-powered Fix Subtitles tool.' },
      ]}
      faqs={[
        { q: 'What errors does the validator check for?', a: 'Overlapping timestamps, end time before start time, empty cue text, lines over 42 characters (Netflix spec), and reading speed over 21 CPS (EBU standard).' },
        { q: 'What is 21 CPS and why does it matter?', a: 'CPS stands for Characters Per Second — how fast a viewer must read a subtitle. Netflix limits captions to 17 CPS; EBU allows 21 CPS. Subtitles faster than this are hard for most viewers to read in the available time.' },
        { q: 'What is the maximum line length for subtitles?', a: 'Netflix requires no more than 42 characters per line. YouTube recommends 80 characters per full line. BBC specifies 37 characters. This tool flags lines over 42 characters as warnings.' },
        { q: 'What is an overlapping subtitle?', a: 'An overlap occurs when one subtitle\'s end time is later than the next subtitle\'s start time. Both would show simultaneously, which most players handle by cutting one off or displaying both stacked.' },
        { q: 'How do I fix the issues found?', a: 'Use our free Shift Subtitle Timing tool to adjust timestamps in bulk, or our AI-powered Fix Subtitles tool to automatically correct overlaps, long lines, and timing.' },
        { q: 'Will my file pass Netflix quality control after validation?', a: 'Passing this validator means your file meets common structural requirements (no overlaps, line lengths, CPS). Netflix QC also checks language-specific requirements, style guide compliance, and encoding. This tool covers the technical checks.' },
        { q: 'What is a "zero-duration" cue?', a: 'A zero-duration cue has the same start and end time (e.g., 00:00:01,000 --> 00:00:01,000). It displays for zero seconds and is invisible to viewers. It\'s usually a transcription error.' },
        { q: 'I have 50 warnings but no errors — is my file usable?', a: 'Yes. Warnings indicate best-practice violations (like slightly long lines) but won\'t cause playback failures. Errors (overlapping timestamps, bad timing) may cause visible issues. Fix errors first; address warnings if the file is for broadcast delivery.' },
      ]}
      relatedTools={[
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'AI auto-correct overlaps, timing & long lines' },
        { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Bulk-adjust all timestamps' },
        { label: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Detailed CPS analysis per cue' },
        { label: 'Character Limit Checker', path: '/tools/subtitle-character-checker', desc: 'Netflix/YouTube line length check' },
        { label: 'Merge SRT Files', path: '/tools/merge-srt-files', desc: 'Combine two subtitle files' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate clean AI subtitles from video' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName || 'Click to upload SRT or VTT file'}</p>
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
            {/* Summary — always visible */}
            <div className={`rounded-xl p-4 text-center ${isValid ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              <p className={`text-lg font-bold ${isValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {isValid ? '✓ No errors found' : `${errors.length} error${errors.length !== 1 ? 's' : ''}, ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cueCount} cues validated</p>
            </div>

            {/* Detailed issue list — gated */}
            {issues.length > 0 && (
              <FreeToolResultGate title="Sign up to view the full issue list">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {issues.map((issue, i) => (
                    <div key={i} className={`flex gap-3 rounded-lg p-3 text-sm ${issue.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide mt-0.5 ${issue.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>{issue.severity === 'error' ? 'ERR' : 'WARN'}</span>
                      <span className="text-gray-700 dark:text-gray-300">{issue.message}</span>
                    </div>
                  ))}
                </div>
              </FreeToolResultGate>
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
