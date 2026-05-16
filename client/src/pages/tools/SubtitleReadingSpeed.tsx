import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, detectFormat, parseTimeToMs, stripTags } from '../../lib/subtitleUtils'

interface CueStats {
  index: number; text: string; startTime: string; durationSec: number; chars: number; cps: number; status: 'ok' | 'warning' | 'error'
}

export default function SubtitleReadingSpeed() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<CueStats[] | null>(null)
  const [summary, setSummary] = useState({ total: 0, tooFast: 0, avgCps: 0 })
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [standard, setStandard] = useState<'netflix' | 'bbc' | 'ebu'>('netflix')
  const fileRef = useRef<HTMLInputElement>(null)

  const limits = { netflix: 17, bbc: 17, ebu: 21 }
  const limit = limits[standard]

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => { setText(ev.target?.result as string); setResults(null) }
    reader.readAsText(file)
  }

  function handleAnalyze() {
    setError('')
    if (!text.trim()) { setError('Please upload or paste a subtitle file.'); return }
    try {
      const fmt = detectFormat(text)
      const cues = fmt === 'vtt' ? parseVtt(text) : parseSrt(text)
      if (cues.length === 0) { setError('No cues found.'); return }
      const stats: CueStats[] = cues.map((c) => {
        const durationMs = parseTimeToMs(c.endTime) - parseTimeToMs(c.startTime)
        const durationSec = durationMs / 1000
        const chars = stripTags(c.text).replace(/\n/g, ' ').length
        const cps = durationSec > 0 ? chars / durationSec : 0
        return { index: c.index, text: stripTags(c.text), startTime: c.startTime, durationSec, chars, cps, status: cps > limit + 4 ? 'error' : cps > limit ? 'warning' : 'ok' }
      })
      const tooFast = stats.filter((s) => s.cps > limit).length
      const avgCps = stats.reduce((a, s) => a + s.cps, 0) / stats.length
      setSummary({ total: cues.length, tooFast, avgCps })
      setResults(stats)
    } catch { setError('Failed to parse file.') }
  }

  const statusColor = {
    ok: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
  }

  return (
    <FreeToolLayout
      title="Subtitle Reading Speed Checker — CPS Analyzer"
      description="Analyze every subtitle cue's Characters Per Second (CPS) against Netflix (17), BBC (17), and EBU (21) broadcast standards. Instant per-cue pass/fail, free."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What is CPS in subtitles?',
          body: 'CPS (Characters Per Second) measures how fast a viewer must read each subtitle cue. It is calculated as: CPS = number of characters (including spaces) ÷ cue duration in seconds. A subtitle cue that says "Hello, how are you?" (20 chars) and lasts 2 seconds has a CPS of 10 — well within safe limits. A 42-character cue that lasts only 1 second has a CPS of 42, which is far too fast for any viewer to read.',
        },
        {
          heading: 'CPS standards by platform',
          body: (
            <>
              <p>Different organizations set different CPS limits based on audience research:</p>
              <ul className="list-disc list-inside mt-2 space-y-1.5">
                <li><strong className="text-gray-900 dark:text-white">Netflix</strong> — maximum 17 CPS for most languages; 20 CPS for Asian character languages</li>
                <li><strong className="text-gray-900 dark:text-white">BBC</strong> — maximum 17 CPS for all content, strict across all programmes</li>
                <li><strong className="text-gray-900 dark:text-white">EBU (European Broadcasting Union)</strong> — maximum 21 CPS, referenced in EBU-TT and EBU STL specifications</li>
                <li><strong className="text-gray-900 dark:text-white">Amazon Prime</strong> — follows Netflix-equivalent specs at 17 CPS</li>
              </ul>
              <p className="mt-2">For most content, 17 CPS is the safe target. This tool highlights anything above your chosen standard.</p>
            </>
          ),
        },
      ]}
      guideTitle="How to check subtitle reading speed"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the subtitle content.' },
        { step: 'Select a broadcast standard', desc: 'Netflix and BBC allow 17 CPS; EBU allows 21 CPS. Netflix is most commonly used for streaming delivery.' },
        { step: 'Review per-cue results', desc: 'Green = readable, Yellow = slightly fast, Red = too fast. Hover any cue to see the text.' },
      ]}
      faqs={[
        { q: 'What is CPS in subtitles?', a: 'CPS stands for Characters Per Second — how many characters a viewer must read per second. It is: total characters in cue ÷ cue duration in seconds. The broadcast safe limit is 17–21 CPS depending on platform.' },
        { q: 'What is the maximum CPS for Netflix?', a: 'Netflix limits subtitles to 17 CPS for English and most western languages. Asian languages (Chinese, Japanese, Korean) are allowed up to 20 CPS due to higher information density per character.' },
        { q: 'What CPS standard should I use for YouTube?', a: 'YouTube has no strict CPS enforcement, but targeting under 20 CPS is recommended for viewer comfort. Use the EBU (21 CPS) standard as a minimum check for YouTube content.' },
        { q: 'Does space count in CPS?', a: 'Yes. All characters including spaces and punctuation count toward the CPS total. "Hello world" is 11 characters including the space.' },
        { q: 'My subtitles are too fast — how do I fix them?', a: 'Options: extend the cue duration (so CPS drops), shorten the text, or split the cue into two cues. Our AI-powered Fix Subtitles tool can auto-correct reading speed violations.' },
        { q: 'Does reading speed matter for YouTube?', a: 'Yes. Fast subtitles frustrate viewers and hurt audience retention. While YouTube does not reject uploads for high CPS, viewer experience and accessibility are affected. Aim for under 20 CPS for all content.' },
        { q: 'What is a safe CPS for hearing-impaired viewers?', a: 'Research suggests viewers with hearing impairments read subtitles more slowly on average. BBC and Netflix both use 17 CPS precisely to accommodate this audience. For SDH (Subtitles for the Deaf and Hard of Hearing), always use 17 CPS or lower.' },
        { q: 'What if a cue has zero duration?', a: 'A zero-duration cue has infinite CPS (division by zero). The tool shows these as errors rather than a numeric CPS value. Fix the timing before delivery.' },
      ]}
      relatedTools={[
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Full error & overlap validation' },
        { label: 'Character Limit Checker', path: '/tools/subtitle-character-checker', desc: 'Check Netflix/YouTube line length limits' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'AI auto-fix for reading speed violations' },
        { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Overall speaking rate stats' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate broadcast-ready subtitles with AI' },
        { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Adjust timing to bring CPS into range' },
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
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Broadcast standard</p>
          <div className="flex gap-2">
            {(['netflix', 'bbc', 'ebu'] as const).map((s) => (
              <button key={s} onClick={() => setStandard(s)} className={`flex-1 py-2 rounded-lg text-sm font-medium uppercase tracking-wide transition-colors ${standard === s ? 'bg-blue-600 text-white' : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {s} ({limits[s]} CPS)
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleAnalyze} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors">Analyze Reading Speed</button>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {results !== null && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ label: 'Total cues', val: summary.total }, { label: 'Too fast', val: summary.tooFast, bad: summary.tooFast > 0 }, { label: 'Avg CPS', val: summary.avgCps.toFixed(1) }].map((s) => (
                <div key={s.label} className={`rounded-xl p-3 ${(s as {bad?: boolean}).bad ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                  <p className={`text-xl font-medium ${(s as {bad?: boolean}).bad ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-300'}`}>{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {results.map((r) => (
                <div key={r.index} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${statusColor[r.status]}`}>
                  <span className="font-mono font-medium w-8 shrink-0">#{r.index}</span>
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{r.text.slice(0, 60)}{r.text.length > 60 ? '…' : ''}</span>
                  <span className="font-medium shrink-0">{r.cps.toFixed(1)} CPS</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
