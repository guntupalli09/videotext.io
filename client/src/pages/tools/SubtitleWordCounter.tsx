import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, detectFormat, parseTimeToMs, stripTags } from '../../lib/subtitleUtils'

export default function SubtitleWordCounter() {
  const [text, setText] = useState('')
  const [stats, setStats] = useState<null | { words: number; chars: number; cues: number; durationMin: number; avgWpm: number; avgCps: number; longestCue: string; longestChars: number }>(null)
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
      let longestCue = '', longestChars = 0
      for (const c of cues) { const t = stripTags(c.text); if (t.length > longestChars) { longestChars = t.length; longestCue = t } }
      setStats({ words, chars, cues: cues.length, durationMin, avgWpm, avgCps, longestCue, longestChars })
    } catch { setError('Failed to parse the file.') }
  }

  return (
    <FreeToolLayout
      title="Subtitle Word Counter — Words, Characters & Speaking Stats"
      description="Count words and characters in any SRT or VTT subtitle file. Get estimated speaking rate (WPM), average CPS, and video duration stats instantly in your browser."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What can you learn from subtitle word counts?',
          body: (
            <>
              <p>Counting words in a subtitle file gives you useful production data:</p>
              <ul className="list-disc list-inside mt-2 space-y-1.5">
                <li><strong className="text-gray-900 dark:text-white">Translation budgeting</strong> — most translation agencies charge per source word; this gives you an accurate count before requesting a quote</li>
                <li><strong className="text-gray-900 dark:text-white">Script consistency</strong> — compare word counts across multiple episodes or segments for production planning</li>
                <li><strong className="text-gray-900 dark:text-white">Content repurposing</strong> — know how much text you have before converting subtitles to a blog post or article</li>
                <li><strong className="text-gray-900 dark:text-white">Speaking rate analysis</strong> — check if your speaker is within the 100–160 WPM range recommended for clear video content</li>
                <li><strong className="text-gray-900 dark:text-white">Quality control</strong> — unusually low or high word counts can flag transcription errors or truncated files</li>
              </ul>
            </>
          ),
        },
        {
          heading: 'How speaking rate (WPM) is calculated',
          body: 'WPM (Words Per Minute) is calculated as: total words in the subtitle file ÷ the subtitle duration in minutes. The duration is measured from the first cue\'s start time to the last cue\'s end time — this reflects actual speaking time rather than total video length (which may include silent intros, music, or b-roll). A typical conversational speaker averages 120–150 WPM. Fast-paced YouTube commentary reaches 160–200 WPM. Lectures and educational content typically run 100–130 WPM.',
        },
      ]}
      guideTitle="How to count words in a subtitle file"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the subtitle content. Both formats are supported.' },
        { step: 'Click Count', desc: 'The tool strips timing codes, counts words and characters, then calculates duration and speaking rate.' },
        { step: 'Review stats', desc: 'See total word count, character count, duration, WPM speaking rate, and average CPS.' },
      ]}
      faqs={[
        { q: 'Why count words in subtitles?', a: 'Word counts help estimate translation budgets, plan content length, compare video series for consistency, and analyze speaking rates.' },
        { q: 'How is speaking rate (WPM) calculated?', a: 'WPM = total words ÷ subtitle duration in minutes (from first cue start to last cue end). This measures actual speaking time, not total video length.' },
        { q: 'What is a normal speaking rate for video?', a: 'Conversational speech is 120–150 WPM. Presentations run 100–130 WPM. Fast-paced YouTube content can reach 160–200 WPM. Subtitles at over 180 WPM tend to be hard to follow.' },
        { q: 'Does this count words in HTML tags like <b>?', a: 'No. HTML tags are stripped before counting. Only spoken text words are counted.' },
        { q: 'Can I use this to estimate translation cost?', a: 'Yes. Most translation services quote per word. The total word count gives you an accurate figure for subtitle translation budget calculations.' },
        { q: 'What is CPS vs WPM?', a: 'WPM (Words Per Minute) measures overall speaking rate across the whole video. CPS (Characters Per Second) measures how fast a viewer must read each individual subtitle cue. WPM is a content planning metric; CPS is a readability and broadcast compliance metric.' },
        { q: 'How accurate is the word count?', a: 'The count is based on whitespace-separated tokens — essentially counting the number of words in the subtitle text after stripping all formatting. Hyphenated words count as one word; contractions count as one word.' },
        { q: 'What is the "longest cue" stat?', a: 'It shows the single subtitle cue with the most characters. This is useful for checking whether any cue has unusually long text that might cause display issues.' },
      ]}
      relatedTools={[
        { label: 'SRT to Plain Text', path: '/tools/srt-to-text', desc: 'Extract clean text for repurposing' },
        { label: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Detailed CPS per-cue analysis' },
        { label: 'Video Script Timer', path: '/tools/video-script-timer', desc: 'Estimate video length from word count' },
        { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'AI transcript with full word data' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT to 70+ languages' },
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check file for errors before counting' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName || 'Click to upload SRT or VTT file'}</p>
          <p className="text-xs text-gray-400 mt-1">or paste content below</p>
        </div>
        <textarea className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Paste SRT or VTT content here…" value={text} onChange={(e) => { setText(e.target.value); setStats(null) }} />
        <button onClick={handleCount} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">Count Words & Stats</button>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[{ label: 'Words', val: stats.words.toLocaleString() }, { label: 'Characters', val: stats.chars.toLocaleString() }, { label: 'Cues', val: stats.cues }, { label: 'Duration', val: `${stats.durationMin.toFixed(1)} min` }].map((s) => (
                <div key={s.label} className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3">
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[{ label: 'Avg speaking rate', val: `${Math.round(stats.avgWpm)} WPM` }, { label: 'Avg reading speed', val: `${stats.avgCps.toFixed(1)} CPS` }].map((s) => (
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
