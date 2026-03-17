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
  const h = Math.floor(m / 60)
  const rm = m % 60
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
    if (sec < 60) return `${Math.round(sec)}s → YouTube Short`
    if (sec <= 600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s → Standard YouTube`
    return `${(sec / 60).toFixed(1)} min → Long-form`
  }

  return (
    <FreeToolLayout
      title="Video Script Timer — Estimate Video Length from Script"
      description="Paste your video script and instantly see how long the video will be. Choose your speaking pace — perfect for YouTube, ads, explainers, and shorts planning."
      guideTitle="How to use the video script timer"
      guideSteps={[
        { step: 'Paste your script', desc: 'Copy your full script text into the box. The word count updates instantly as you type.' },
        { step: 'Select your speaking rate', desc: 'Choose from slow (lectures), normal (YouTube), fast (shorts), or enter a custom WPM based on your own speaking pace.' },
        { step: 'Read the estimated duration', desc: 'The tool calculates estimated video length. Use this to decide if your script needs trimming or expanding.' },
      ]}
      faqs={[
        { q: 'How accurate is the video script timer?', a: 'Very accurate for scripts you\'ll read or present directly. If you ad-lib or pause frequently, actual duration may be 10–20% longer. For tightly scripted videos (ads, narration), it\'s highly reliable.' },
        { q: 'What is the average speaking rate for YouTube videos?', a: 'Most YouTubers speak at 130–160 WPM. Educational content tends toward 100–130 WPM. Fast-paced entertainment content can reach 160–200 WPM. The "Normal" preset (130 WPM) is a safe default.' },
        { q: 'How many words is a 5-minute YouTube video?', a: 'At 130 WPM: ~650 words. At 150 WPM: ~750 words. At 100 WPM: ~500 words. A 5-minute video script is roughly 600–750 words for most creators.' },
        { q: 'How long should a YouTube Short script be?', a: 'YouTube Shorts are max 60 seconds. At 160 WPM (energetic pace), that\'s ~160 words. Aim for 120–150 words to leave room for intros and outros.' },
        { q: 'Can I use this for podcast scripts?', a: 'Yes. Conversational podcasting typically runs 130–150 WPM. Interview-style may vary more. Use the custom WPM field if you know your personal speaking rate.' },
      ]}
      relatedTools={[
        { label: 'Words Per Minute Calculator', path: '/tools/words-per-minute-calculator', desc: 'Measure your own speaking rate' },
        { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'Convert finished video to text transcript' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate subtitles from your recorded video' },
        { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Count words in existing subtitle files' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your script</label>
            {words > 0 && <span className="text-xs font-medium text-violet-600 dark:text-violet-400">{words.toLocaleString()} words</span>}
          </div>
          <textarea
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm p-4 h-44 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
            placeholder="Paste your script here. The estimated video length will update as you type…"
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        </div>

        {/* Speaking rate */}
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Speaking rate</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {(Object.keys(RATES) as (keyof typeof RATES)[]).map((r) => (
              <button
                key={r}
                onClick={() => { setRate(r); setUseCustom(false) }}
                className={`p-2.5 rounded-lg text-left transition-colors border ${!useCustom && rate === r ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-violet-300'}`}
              >
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{RATES[r].label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{RATES[r].wpm} WPM · {RATES[r].desc}</p>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="custom" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} className="rounded text-violet-600" />
            <label htmlFor="custom" className="text-sm text-gray-700 dark:text-gray-300">Custom WPM:</label>
            <input
              type="number" min={50} max={300} value={customWpm}
              onChange={(e) => { setCustomWpm(parseInt(e.target.value) || 130); setUseCustom(true) }}
              className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Result */}
        {words > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 p-6 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Estimated video length</p>
            <p className="text-5xl font-display font-bold mb-2">{formatDuration(durationSec)}</p>
            <p className="text-sm text-violet-200">{ytFormat(durationSec)}</p>
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Words', val: words.toLocaleString() },
                { label: 'At WPM', val: wpm },
                { label: 'Min/s', val: `${(durationSec / 60).toFixed(1)} min` },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg font-bold">{s.val}</p>
                  <p className="text-xs text-violet-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {words === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 p-8 text-center">
            <p className="text-3xl font-display font-bold text-gray-300 dark:text-gray-600">—</p>
            <p className="text-sm text-gray-400 mt-1">Paste your script above to see the estimate</p>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
