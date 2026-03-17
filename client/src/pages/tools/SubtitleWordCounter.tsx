import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, detectFormat, parseTimeToMs, stripTags } from '../../lib/subtitleUtils'

export default function SubtitleWordCounter() {
  const [text, setText] = useState('')
  const [stats, setStats] = useState<null | {
    words: number; chars: number; cues: number; durationMin: number;
    avgWpm: number; avgCps: number; longestCue: string; longestChars: number
  }>(null)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => { setText(ev.target?.result as string); setStats(null) }
    reader.readAsText(file)
  }

  function handleCount() {
    setError('')
    if (!text.trim()) { setError('Please upload or paste a subtitle file.'); return }
    try {
      const fmt = detectFormat(text)
      const cues = fmt === 'vtt' ? parseVtt(text) : parseSrt(text)
      if (cues.length === 0) { setError('No subtitle cues found.'); return }
      const allText = cues.map((c) => stripTags(c.text)).join(' ')
      const words = allText.trim().split(/\s+/).filter(Boolean).length
      const chars = allText.replace(/\s+/g, '').length
      const lastEnd = parseTimeToMs(cues[cues.length - 1].endTime)
      const firstStart = parseTimeToMs(cues[0].startTime)
      const durationMin = (lastEnd - firstStart) / 60000
      const avgWpm = durationMin > 0 ? words / durationMin : 0
      const avgCps = durationMin > 0 ? chars / (durationMin * 60) : 0
      let longestCue = ''
      let longestChars = 0
      for (const c of cues) {
        const t = stripTags(c.text)
        if (t.length > longestChars) { longestChars = t.length; longestCue = t }
      }
      setStats({ words, chars, cues: cues.length, durationMin, avgWpm, avgCps, longestCue, longestChars })
    } catch {
      setError('Failed to parse the file.')
    }
  }

  return (
    <FreeToolLayout
      title="Subtitle Word Counter — Words, Characters & Speaking Stats"
      description="Count words and characters in any SRT or VTT subtitle file. Get estimated speaking time, average CPS, and WPM stats instantly in your browser."
      guideTitle="How to count words in a subtitle file"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the content directly. Both SRT and VTT formats are supported.' },
        { step: 'Click Count', desc: 'The tool strips all timing codes and numbers, then counts words and characters across all cues.' },
        { step: 'Review your stats', desc: 'See total word count, character count, estimated speaking rate (WPM), and average CPS to plan content length.' },
      ]}
      faqs={[
        { q: 'Why count words in subtitles?', a: 'Word counts help estimate video script length, plan translation budgets (many services charge per word), compare content density across episodes, or repurpose subtitles as written content.' },
        { q: 'How is speaking rate (WPM) calculated?', a: 'WPM = total words ÷ video duration in minutes. The duration is measured from the first subtitle start to the last subtitle end, so it reflects speaking time rather than total video length.' },
        { q: 'What is a normal speaking rate for video?', a: 'Conversational speech is typically 120–150 WPM. Presentations run 100–130 WPM. Fast-paced YouTube content can hit 160–200 WPM. Subtitles at over 180 WPM tend to be hard to follow.' },
        { q: 'Does this count words in HTML tags like <b> or <i>?', a: 'No. HTML formatting tags are stripped before counting. Only spoken text words are counted.' },
        { q: 'Can I use this to estimate translation cost?', a: 'Yes. Most translation services quote per word. The total word count from this tool gives you an accurate estimate for subtitle translation budgets.' },
      ]}
      relatedTools={[
        { label: 'SRT to Plain Text', path: '/tools/srt-to-text', desc: 'Extract clean text for repurposing' },
        { label: 'Subtitle Reading Speed', path: '/tools/subtitle-reading-speed', desc: 'Detailed CPS per-cue analysis' },
        { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'AI transcript with word-level data' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT to 50+ languages' },
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
          onChange={(e) => { setText(e.target.value); setStats(null) }}
        />

        <button onClick={handleCount} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">
          Count Words & Stats
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                { label: 'Words', val: stats.words.toLocaleString() },
                { label: 'Characters', val: stats.chars.toLocaleString() },
                { label: 'Cues', val: stats.cues },
                { label: 'Duration', val: `${stats.durationMin.toFixed(1)} min` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3">
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { label: 'Avg speaking rate', val: `${Math.round(stats.avgWpm)} WPM` },
                { label: 'Avg reading speed', val: `${stats.avgCps.toFixed(1)} CPS` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3">
                  <p className="text-xl font-bold text-gray-800 dark:text-white">{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {stats.longestCue && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Longest cue ({stats.longestChars} chars)</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{stats.longestCue.slice(0, 120)}{stats.longestCue.length > 120 ? '…' : ''}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
