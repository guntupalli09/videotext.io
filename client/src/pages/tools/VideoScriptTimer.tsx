import { useState } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'

const RATES = {
  slow: { label: 'Slow / Deliberate', wpm: 100, desc: 'Lectures, tutorials, explainers' },
  normal: { label: 'Normal / Conversational', wpm: 130, desc: 'Most YouTube videos, podcasts' },
  fast: { label: 'Fast / Energetic', wpm: 160, desc: 'YouTube shorts, ads, commentary' },
  vfast: { label: 'Very Fast', wpm: 200, desc: 'Fast-paced commentary, narration' },
}

function formatDuration(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60); const rm = m % 60
  return `${h}h ${rm}m`
}

export default function VideoScriptTimer() {
  const [script, setScript] = useState('')
  const [rate, setRate] = useState<keyof typeof RATES>('normal')
  const [customWpm, setCustomWpm] = useState(130)
  const [useCustom, setUseCustom] = useState(false)

  const words = script.trim() ? script.trim().split(/\s+/).filter(Boolean).length : 0
  const wpm = useCustom ? customWpm : RATES[rate].wpm
  const durationSec = words > 0 && wpm > 0 ? (words / wpm) * 60 : 0

  const ytFormat = (sec: number) => {
    if (sec < 60) return `${Math.round(sec)}s — YouTube Short`
    if (sec <= 600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s — Standard YouTube`
    return `${(sec / 60).toFixed(1)} min — Long-form video`
  }

  return (
    <FreeToolLayout
      title="Video Script Timer — How Long Will My Video Be?"
      description="Paste your video script and instantly estimate video length at your speaking rate. Perfect for planning YouTube videos, ads, shorts, explainers, and presentations."
      contentSections={[
        {
          heading: 'How many words per minute for video?',
          body: (
            <>
              <p>Video speaking rates vary significantly by format and creator style. Here are common benchmarks:</p>
              <ul className="list-disc list-inside mt-2 space-y-1.5">
                <li><strong className="text-gray-900 dark:text-white">100–120 WPM</strong> — Educational content, university lectures, documentation walkthroughs</li>
                <li><strong className="text-gray-900 dark:text-white">120–150 WPM</strong> — Conversational YouTube, podcasts, product demos, interview-style content</li>
                <li><strong className="text-gray-900 dark:text-white">150–180 WPM</strong> — Fast-paced YouTube channels, commentary, reaction content, news narration</li>
                <li><strong className="text-gray-900 dark:text-white">180–220 WPM</strong> — Very fast-paced shorts, TikToks, entertainment commentary</li>
              </ul>
              <p className="mt-2">If you don't know your speaking rate, use our <a href="/tools/words-per-minute-calculator" className="text-violet-600 hover:underline">WPM Calculator</a> to measure it from a recorded clip.</p>
            </>
          ),
        },
        {
          heading: 'Script length by video format',
          body: (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Format</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target length</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Words (at 130 WPM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {[
                      { f: 'YouTube Short / TikTok', l: '30–60s', w: '65–130' },
                      { f: 'Short YouTube video', l: '5–7 min', w: '650–910' },
                      { f: 'Standard YouTube video', l: '8–12 min', w: '1,040–1,560' },
                      { f: 'Long-form YouTube', l: '15–20 min', w: '1,950–2,600' },
                      { f: 'Podcast episode', l: '30–45 min', w: '3,900–5,850' },
                    ].map((r) => (
                      <tr key={r.f}><td className="px-4 py-2 text-gray-900 dark:text-white">{r.f}</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">{r.l}</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">{r.w}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
      ]}
      guideTitle="How to use the video script timer"
      guideSteps={[
        { step: 'Paste your script', desc: 'Copy your full video script into the text box. Word count updates in real time.' },
        { step: 'Select your speaking rate', desc: 'Choose a preset or enter your personal WPM (measure it with our WPM Calculator tool).' },
        { step: 'Read the estimated duration', desc: 'The tool shows estimated length and categorizes it as Short, Standard, or Long-form YouTube.' },
      ]}
      faqs={[
        { q: 'How accurate is the video script timer?', a: 'Very accurate for scripts you read directly. If you ad-lib, pause frequently, or include long pauses, actual duration may be 10–20% longer. For tightly scripted ads and narration it is highly reliable.' },
        { q: 'What is the average speaking rate for YouTube videos?', a: 'Most YouTubers speak at 130–160 WPM. Educational channels tend toward 100–130 WPM. Fast entertainment content runs 160–200 WPM. The Normal preset (130 WPM) is a safe default for most creators.' },
        { q: 'How many words is a 10-minute YouTube video?', a: 'At 130 WPM: ~1,300 words. At 150 WPM: ~1,500 words. At 100 WPM: ~1,000 words. A 10-minute video script is roughly 1,200–1,500 words for most creators.' },
        { q: 'How long should a YouTube Short script be?', a: 'YouTube Shorts are max 60 seconds. At 160 WPM: ~160 words. Aim for 120–150 words to leave room for natural pacing and non-verbal moments.' },
        { q: 'Can I use this for podcast scripts?', a: 'Yes. Conversational podcasting typically runs 130–150 WPM. Use the custom WPM field if you know your personal speaking rate from a recorded clip.' },
        { q: 'How do I find my personal WPM?', a: 'Use our free Words Per Minute Calculator. Record yourself speaking for 1–2 minutes from a script, then enter the text and recording duration to get your exact WPM.' },
        { q: 'Does ad-lib content affect the estimate?', a: 'Yes. This tool estimates duration for a scripted read. If you typically improvise 20% of your content on top of the script, add ~20% to the result. Experienced creators learn to calibrate based on their style.' },
        { q: 'What about intros, outros, and B-roll time?', a: 'The timer only counts speaking time for the pasted text. Add extra time manually for non-spoken elements: a 30-second intro, 20 seconds of B-roll, a 15-second outro = +65 seconds on top of the script estimate.' },
      ]}
      relatedTools={[
        { label: 'Words Per Minute Calculator', path: '/tools/words-per-minute-calculator', desc: 'Measure your own speaking rate' },
        { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Count words in a finished video\'s subtitles' },
        { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'Convert finished video to text' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate subtitles from your recorded video' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your script</label>
            {words > 0 && <span className="text-xs font-medium text-violet-600 dark:text-violet-400">{words.toLocaleString()} words</span>}
          </div>
          <textarea className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm p-4 h-44 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed" placeholder="Paste your script here. The estimated video length will update as you type…" value={script} onChange={(e) => setScript(e.target.value)} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Speaking rate</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {(Object.keys(RATES) as (keyof typeof RATES)[]).map((r) => (
              <button key={r} onClick={() => { setRate(r); setUseCustom(false) }} className={`p-2.5 rounded-lg text-left transition-colors border ${!useCustom && rate === r ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-violet-300'}`}>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{RATES[r].label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{RATES[r].wpm} WPM · {RATES[r].desc}</p>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="custom" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} className="rounded text-violet-600" />
            <label htmlFor="custom" className="text-sm text-gray-700 dark:text-gray-300">Custom WPM:</label>
            <input type="number" min={50} max={300} value={customWpm} onChange={(e) => { setCustomWpm(parseInt(e.target.value) || 130); setUseCustom(true) }} className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
        {words > 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 p-6 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Estimated video length</p>
            <p className="text-5xl font-display font-bold mb-2">{formatDuration(durationSec)}</p>
            <p className="text-sm text-violet-200">{ytFormat(durationSec)}</p>
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
              {[{ label: 'Words', val: words.toLocaleString() }, { label: 'At WPM', val: wpm }, { label: 'Min/s', val: `${(durationSec / 60).toFixed(1)} min` }].map((s) => (
                <div key={s.label}><p className="text-lg font-bold">{s.val}</p><p className="text-xs text-violet-200">{s.label}</p></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 p-8 text-center">
            <p className="text-3xl font-display font-bold text-gray-300 dark:text-gray-600">—</p>
            <p className="text-sm text-gray-400 mt-1">Paste your script above to see the estimate</p>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
