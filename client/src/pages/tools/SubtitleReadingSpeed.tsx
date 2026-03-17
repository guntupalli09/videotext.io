import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, detectFormat, parseTimeToMs, stripTags } from '../../lib/subtitleUtils'

interface CueStats {
  index: number
  text: string
  startTime: string
  durationSec: number
  chars: number
  cps: number
  status: 'ok' | 'warning' | 'error'
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
        return {
          index: c.index,
          text: stripTags(c.text),
          startTime: c.startTime,
          durationSec,
          chars,
          cps,
          status: cps > limit + 4 ? 'error' : cps > limit ? 'warning' : 'ok',
        }
      })
      const tooFast = stats.filter((s) => s.cps > limit).length
      const avgCps = stats.reduce((a, s) => a + s.cps, 0) / stats.length
      setSummary({ total: cues.length, tooFast, avgCps })
      setResults(stats)
    } catch {
      setError('Failed to parse file.')
    }
  }

  const statusColor = {
    ok: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
  }

  return (
    <FreeToolLayout
      title="Subtitle Reading Speed Checker — CPS Analyzer"
      description="Check if your subtitles are readable. Analyze every cue's characters-per-second (CPS) against Netflix, BBC, and EBU broadcast standards. Free, browser-based."
      guideTitle="How to check subtitle reading speed"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the subtitle text. Both formats are supported.' },
        { step: 'Select a broadcast standard', desc: 'Netflix and BBC allow up to 17 CPS; EBU (European Broadcasting Union) allows 21 CPS. Netflix is the most strict.' },
        { step: 'Review results per cue', desc: 'Green = readable, Yellow = slightly fast, Red = too fast. Click any cue to see the text and timing details.' },
      ]}
      faqs={[
        { q: 'What is CPS in subtitles?', a: 'CPS stands for Characters Per Second — how many characters a viewer must read per second to keep up with the subtitle. A CPS of 17 means 17 characters (including spaces) pass by each second.' },
        { q: 'What is the maximum CPS for Netflix?', a: 'Netflix\'s subtitle specification limits captions to 17 CPS. This is measured per cue: characters in the cue divided by its duration in seconds.' },
        { q: 'What CPS standard should I use?', a: 'Netflix and BBC use 17 CPS for SDH (hearing-impaired) and general captions. EBU allows up to 21 CPS. For global streaming platforms, 17 CPS is the safest choice.' },
        { q: 'My subtitles are too fast — how do I fix them?', a: 'You can extend the cue duration (so the CPS drops), shorten the text, or split the cue into two cues. Our AI-powered Fix Subtitles tool can auto-correct these issues.' },
        { q: 'Does reading speed matter for YouTube?', a: 'Yes. YouTube auto-generates subtitles, but for manually uploaded files, fast subtitles frustrate viewers and hurt your audience retention. Aim for under 20 CPS for YouTube.' },
      ]}
      relatedTools={[
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Full validation: overlaps, length, timing' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'AI auto-fix for reading speed issues' },
        { label: 'Subtitle Character Checker', path: '/tools/subtitle-character-checker', desc: 'Netflix/YouTube line length check' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate broadcast-ready subtitles with AI' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName || 'Click to upload SRT or VTT file'}</p>
          <p className="text-xs text-gray-400 mt-1">or paste content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Paste SRT or VTT content…"
          value={text}
          onChange={(e) => { setText(e.target.value); setResults(null) }}
        />

        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Broadcast standard</p>
          <div className="flex gap-2">
            {(['netflix', 'bbc', 'ebu'] as const).map((s) => (
              <button key={s} onClick={() => setStandard(s)} className={`flex-1 py-2 rounded-lg text-sm font-medium uppercase tracking-wide transition-colors ${standard === s ? 'bg-violet-600 text-white' : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {s} ({limits[s]} CPS)
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleAnalyze} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">
          Analyze Reading Speed
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {results !== null && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Total cues', val: summary.total },
                { label: 'Too fast', val: summary.tooFast, bad: summary.tooFast > 0 },
                { label: 'Avg CPS', val: summary.avgCps.toFixed(1) },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl p-3 ${s.bad ? 'bg-red-50 dark:bg-red-900/20' : 'bg-violet-50 dark:bg-violet-900/20'}`}>
                  <p className={`text-xl font-bold ${s.bad ? 'text-red-700 dark:text-red-400' : 'text-violet-700 dark:text-violet-300'}`}>{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {results.map((r) => (
                <div key={r.index} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${statusColor[r.status]}`}>
                  <span className="font-mono font-bold w-8 shrink-0">#{r.index}</span>
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{r.text.slice(0, 60)}{r.text.length > 60 ? '…' : ''}</span>
                  <span className="font-bold shrink-0">{r.cps.toFixed(1)} CPS</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
