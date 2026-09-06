import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, detectFormat, stripTags } from '../../lib/subtitleUtils'

interface CueCheck {
  index: number; text: string; lines: string[]; longestLine: number; lineCount: number; pass: boolean; issues: string[]
}

const STANDARDS = {
  netflix: { maxChars: 42, maxLines: 2, name: 'Netflix' },
  youtube: { maxChars: 80, maxLines: 3, name: 'YouTube' },
  bbc: { maxChars: 37, maxLines: 2, name: 'BBC' },
  custom: { maxChars: 42, maxLines: 2, name: 'Custom' },
}

export default function SubtitleCharacterChecker() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<CueCheck[] | null>(null)
  const [standard, setStandard] = useState<keyof typeof STANDARDS>('netflix')
  const [customMax, setCustomMax] = useState(42)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [passCount, setPassCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => { setText(ev.target?.result as string); setResults(null) }
    reader.readAsText(file)
  }

  function handleCheck() {
    setError('')
    if (!text.trim()) { setError('Please upload or paste a subtitle file.'); return }
    const cfg = standard === 'custom' ? { maxChars: customMax, maxLines: 2 } : STANDARDS[standard]
    try {
      const fmt = detectFormat(text)
      const cues = fmt === 'vtt' ? parseVtt(text) : parseSrt(text)
      if (cues.length === 0) { setError('No cues found.'); return }
      const checks: CueCheck[] = cues.map((c) => {
        const clean = stripTags(c.text)
        const lines = clean.split('\n')
        const longestLine = lines.reduce((m, l) => Math.max(m, l.length), 0)
        const issues: string[] = []
        if (longestLine > cfg.maxChars) issues.push(`Line too long: ${longestLine} chars (max ${cfg.maxChars})`)
        if (lines.length > cfg.maxLines) issues.push(`Too many lines: ${lines.length} (max ${cfg.maxLines})`)
        return { index: c.index, text: clean, lines, longestLine, lineCount: lines.length, pass: issues.length === 0, issues }
      })
      setPassCount(checks.filter((c) => c.pass).length)
      setResults(checks)
    } catch { setError('Failed to parse file.') }
  }

  const failing = results?.filter((r) => !r.pass) ?? []

  return (
    <FreeToolLayout
      title="Subtitle Character Limits — Pass/Fail"
      description="Check SRT or VTT line lengths against Netflix (42), YouTube (80), or BBC (37) limits. Instant pass/fail per cue. Free, in-browser, no account."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'Why do subtitle character limits matter?',
          body: 'Subtitle character limits exist because display screens have finite width. On a standard TV or monitor, a subtitle line exceeding 42 characters may wrap or be clipped at the edges of the screen, especially on older displays or when subtitles are rendered at small sizes. Netflix enforces 42 characters per line as a hard delivery requirement — files that violate this are rejected by their quality control system. The BBC\'s 37-character limit was set to ensure readability on lower-resolution TV screens. YouTube is more permissive at 80 characters, but long lines still wrap on mobile devices.',
        },
        {
          heading: 'Character limit standards by platform',
          body: (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Platform</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Max chars/line</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Max lines</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {[
                      { p: 'Netflix', c: 42, l: 2 },
                      { p: 'BBC', c: 37, l: 2 },
                      { p: 'Amazon Prime', c: 42, l: 2 },
                      { p: 'YouTube', c: 80, l: 3 },
                      { p: 'Vimeo', c: 80, l: 2 },
                    ].map((r) => (
                      <tr key={r.p}>
                        <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{r.p}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{r.c}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{r.l}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
      ]}
      guideTitle="How to check subtitle character limits"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the content. Both SRT and VTT are supported.' },
        { step: 'Select a platform standard', desc: 'Choose Netflix (42), BBC (37), YouTube (80), or enter a custom character limit.' },
        { step: 'Review failing cues', desc: 'Every cue that exceeds the limit is listed with the exact character count. Fix manually or use our Fix Subtitles tool.' },
      ]}
      faqs={[
        { q: 'What is the Netflix subtitle character limit?', a: 'Netflix requires a maximum of 42 characters per line, with a maximum of 2 lines per cue. Lines longer than 42 characters cause subtitle rejection during content quality checks.' },
        { q: 'Does the character count include spaces?', a: 'Yes. All characters including spaces and punctuation count. "Hello, how are you today?" is 25 characters including the comma, space, and question mark.' },
        { q: 'What is the YouTube subtitle character limit?', a: 'YouTube allows up to 80 characters per line and 3 lines per cue. However, on most displays only 2 lines are visible at once, so 2 lines is still recommended.' },
        { q: 'What counts as one line?', a: 'Each newline character in a cue creates a new line. A cue with text on two lines (separated by a line break) counts as 2 lines. The character count is checked per individual line, not the total cue length.' },
        { q: 'My subtitles fail the Netflix check — how do I fix them?', a: 'Options: (1) Shorten the text, (2) split the cue into two shorter cues, or (3) use our AI-powered Fix Subtitles tool which can auto-reformat long lines to meet specifications.' },
        { q: 'What is the BBC subtitle specification?', a: 'The BBC Subtitle Guidelines specify a maximum of 37 characters per line and 2 lines per cue. BBC content is often re-used for broadcast across multiple markets, so the stricter limit accommodates multiple rendering environments.' },
        { q: 'Do HTML tags like <b> count toward the character limit?', a: 'No. HTML tags are stripped before character counting. Only the visible text characters count toward the limit.' },
        { q: 'Can I set a custom character limit?', a: 'Yes. Select "Custom" from the platform options and enter any maximum characters per line value to check against your own style guide or broadcaster specification.' },
      ]}
      relatedTools={[
        { label: 'Free Subtitle Tools', path: '/subtitle-tools', desc: 'Converters, timing, validator, and more' },
        { label: 'SRT File Generator', path: '/srt-generator', desc: 'Create a timed SRT from video' },
        { label: 'Video to SRT Converter', path: '/video-to-srt', desc: 'Convert a video file to SRT' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 70+ languages' },
        { label: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Check CPS against broadcast standards' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'Auto-fix long lines and formatting' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName || 'Click to upload SRT or VTT file'}</p>
          <p className="text-xs text-gray-400 mt-1">or paste content below</p>
        </div>
        <textarea className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Paste SRT or VTT content…" value={text} onChange={(e) => { setText(e.target.value); setResults(null) }} />
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Platform standard</p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(STANDARDS) as (keyof typeof STANDARDS)[]).map((s) => (
              <button key={s} onClick={() => setStandard(s)} className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors ${standard === s ? 'bg-blue-600 text-white' : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{STANDARDS[s].name}</button>
            ))}
          </div>
          {standard === 'custom' && (
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">Max chars per line:</label>
              <input type="number" min={10} max={200} value={customMax} onChange={(e) => setCustomMax(parseInt(e.target.value) || 42)} className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
        <button onClick={handleCheck} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">Check Character Limits</button>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {results !== null && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ label: 'Total cues', val: results.length }, { label: 'Pass', val: passCount }, { label: 'Fail', val: results.length - passCount, bad: results.length - passCount > 0 }].map((s) => (
                <div key={s.label} className={`rounded-xl p-3 ${(s as {bad?: boolean}).bad ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                  <p className={`text-xl font-bold ${(s as {bad?: boolean}).bad ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-300'}`}>{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {failing.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {failing.map((r) => (
                  <div key={r.index} className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs">
                    <p className="font-bold text-red-700 dark:text-red-400 mb-0.5">Cue #{r.index}</p>
                    <p className="text-gray-700 dark:text-gray-300 truncate">{r.text.slice(0, 80)}</p>
                    {r.issues.map((issue, i) => <p key={i} className="text-red-500 mt-0.5">{issue}</p>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
