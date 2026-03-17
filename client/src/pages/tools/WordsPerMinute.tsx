import { useState } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'

export default function WordsPerMinute() {
  const [mode, setMode] = useState<'text-time' | 'word-count'>('text-time')
  const [text, setText] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [wordCount, setWordCount] = useState('')
  const [wc2Min, setWc2Min] = useState('')
  const [wc2Sec, setWc2Sec] = useState('')

  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
  const totalSec1 = (parseFloat(minutes) || 0) * 60 + (parseFloat(seconds) || 0)
  const wpm1 = totalSec1 > 0 && words > 0 ? Math.round((words / totalSec1) * 60) : null

  const wc = parseInt(wordCount) || 0
  const totalSec2 = (parseFloat(wc2Min) || 0) * 60 + (parseFloat(wc2Sec) || 0)
  const wpm2 = totalSec2 > 0 && wc > 0 ? Math.round((wc / totalSec2) * 60) : null

  function wpmLabel(wpm: number) {
    if (wpm < 100) return { label: 'Very slow', color: 'text-blue-600' }
    if (wpm < 120) return { label: 'Slow / measured', color: 'text-blue-600' }
    if (wpm < 150) return { label: 'Normal / conversational', color: 'text-green-600' }
    if (wpm < 180) return { label: 'Fast / energetic', color: 'text-amber-600' }
    return { label: 'Very fast', color: 'text-red-600' }
  }

  const result = mode === 'text-time' ? wpm1 : wpm2
  const info = result ? wpmLabel(result) : null

  return (
    <FreeToolLayout
      title="Words Per Minute Calculator — Speaking Rate Checker"
      description="Calculate your speaking rate in words per minute (WPM). Paste text + enter recording time, or enter word count + duration. Instant result, no account needed."
      guideTitle="How to calculate your speaking rate"
      guideSteps={[
        { step: 'Choose your method', desc: 'Option A: Paste the text you spoke and enter how long it took. Option B: Enter word count and duration directly.' },
        { step: 'Enter the duration', desc: 'Record yourself speaking for at least 60 seconds for the most accurate measurement. Enter minutes and seconds.' },
        { step: 'See your WPM', desc: 'The tool calculates WPM and tells you how it compares to typical speaking rates for YouTube, podcasts, and presentations.' },
      ]}
      faqs={[
        { q: 'What is a good speaking rate for YouTube?', a: 'Most successful YouTubers speak at 130–160 WPM. Education channels tend toward 100–130 WPM. Fast entertainment content runs 160–200 WPM. Under 100 WPM can feel slow on video.' },
        { q: 'What is the average speaking rate for podcasts?', a: 'Podcast conversations typically average 130–150 WPM. Interview formats run slower with natural pauses. Scripted audio runs faster, around 150–170 WPM.' },
        { q: 'How do I measure my WPM accurately?', a: 'Record yourself speaking a specific script for 1–2 minutes. Count the words (or use the tool to count them), then enter the exact duration. Avoid including long pauses in the duration.' },
        { q: 'Why does speaking rate matter for subtitles?', a: 'Your speaking rate directly determines subtitle reading difficulty. If you speak at 180 WPM, subtitles need to display quickly — which may exceed the 17–21 CPS broadcast standard. Slower speech produces more readable subtitles.' },
        { q: 'How many words per minute is normal speech?', a: 'Natural conversational speech is 120–150 WPM. Formal presentations run 100–120 WPM. Rapid speech (auctioneers, speedrunners) can reach 250+ WPM, though this is unintelligible in subtitles.' },
      ]}
      relatedTools={[
        { label: 'Video Script Timer', path: '/tools/video-script-timer', desc: 'Estimate video length from your script' },
        { label: 'Subtitle Reading Speed', path: '/tools/subtitle-reading-speed', desc: 'Check CPS for subtitle readability' },
        { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'AI transcript with timing data' },
        { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Count words in subtitle files' },
      ]}
    >
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
          {[
            { key: 'text-time', label: 'Paste text + time' },
            { key: 'word-count', label: 'Word count + time' },
          ].map((m) => (
            <button key={m.key} onClick={() => setMode(m.key as typeof mode)} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === m.key ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'text-time' ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paste the text you spoke</label>
                {words > 0 && <span className="text-xs text-violet-600 font-medium">{words} words</span>}
              </div>
              <textarea
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm p-4 h-36 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white"
                placeholder="Paste the text you read or spoke…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">How long did it take?</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Minutes</label>
                  <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="2" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Seconds</label>
                  <input type="number" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="30" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Word count</label>
              <input type="number" min={1} value={wordCount} onChange={(e) => setWordCount(e.target.value)} placeholder="650" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Duration</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Minutes</label>
                  <input type="number" min={0} value={wc2Min} onChange={(e) => setWc2Min(e.target.value)} placeholder="5" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Seconds</label>
                  <input type="number" min={0} max={59} value={wc2Sec} onChange={(e) => setWc2Sec(e.target.value)} placeholder="0" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && info && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 p-6 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Your speaking rate</p>
            <p className="text-6xl font-display font-bold">{result}</p>
            <p className="text-lg text-violet-200 mt-1">words per minute</p>
            <p className="mt-3 text-sm bg-white/20 inline-block rounded-full px-4 py-1">{info.label}</p>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
