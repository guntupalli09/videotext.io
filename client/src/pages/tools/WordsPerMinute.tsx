import { useState } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'

const RATES = {
  slow: { label: 'Very slow', color: 'text-blue-600', min: 0, max: 100 },
  measured: { label: 'Slow / measured', color: 'text-blue-600', min: 100, max: 120 },
  normal: { label: 'Normal / conversational', color: 'text-green-600', min: 120, max: 150 },
  fast: { label: 'Fast / energetic', color: 'text-amber-600', min: 150, max: 180 },
  vfast: { label: 'Very fast', color: 'text-red-600', min: 180, max: Infinity },
}

function wpmLabel(wpm: number) {
  for (const key of Object.keys(RATES) as (keyof typeof RATES)[]) {
    if (wpm >= RATES[key].min && wpm < RATES[key].max) return RATES[key]
  }
  return RATES.vfast
}

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

  const result = mode === 'text-time' ? wpm1 : wpm2
  const info = result ? wpmLabel(result) : null

  return (
    <FreeToolLayout
      title="Words Per Minute Calculator — Speaking Rate Checker"
      description="Calculate your speaking rate in words per minute (WPM). Enter text and recording time, or word count and duration. Instant result, no account needed."
      hubLink={{ label: 'Free Video Tools', path: '/tools' }}
      contentSections={[
        {
          heading: 'Why does speaking rate matter for video creators?',
          body: 'Speaking rate directly affects subtitle quality, viewer retention, and content planning. If you speak too quickly (over 180 WPM), subtitles generated from your audio will exceed broadcast CPS limits, making them unreadable and potentially causing Netflix or Amazon QC rejections. If you speak too slowly (under 100 WPM), your videos may feel laborious to watch. Most successful YouTube creators have naturally converged on 130–160 WPM — fast enough to be engaging, slow enough to be understood and captioned properly.',
        },
        {
          heading: 'Speaking rate by content type',
          body: (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Content type</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Typical WPM</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">CPS equivalent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {[
                      { t: 'University lecture', wpm: '100–120', cps: '8–10 CPS' },
                      { t: 'Documentary narration', wpm: '120–140', cps: '10–12 CPS' },
                      { t: 'YouTube tutorial', wpm: '130–150', cps: '11–13 CPS' },
                      { t: 'Podcast conversation', wpm: '140–160', cps: '12–14 CPS' },
                      { t: 'YouTube commentary', wpm: '150–180', cps: '13–16 CPS' },
                      { t: 'TikTok / Shorts', wpm: '160–200', cps: '14–17 CPS' },
                    ].map((r) => (
                      <tr key={r.t}><td className="px-4 py-2 text-gray-900 dark:text-white">{r.t}</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">{r.wpm}</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">{r.cps}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
      ]}
      guideTitle="How to calculate your speaking rate"
      guideSteps={[
        { step: 'Choose your method', desc: 'Option A: Paste the text you spoke + enter recording duration. Option B: Enter word count + duration directly.' },
        { step: 'Enter the duration', desc: 'Record yourself speaking for at least 60 seconds for an accurate measurement. Enter the exact minutes and seconds.' },
        { step: 'Read your WPM', desc: 'The tool calculates your rate and tells you how it compares to typical content types.' },
      ]}
      faqs={[
        { q: 'What is a good speaking rate for YouTube?', a: 'Most successful YouTubers speak at 130–160 WPM. Educational channels tend toward 100–130 WPM. Fast entertainment content runs 160–200 WPM. Under 100 WPM can feel slow on video.' },
        { q: 'What is the average speaking rate for podcasts?', a: 'Podcast conversations typically average 130–150 WPM. Scripted audio runs faster, around 150–170 WPM.' },
        { q: 'How do I measure my WPM accurately?', a: 'Record yourself speaking a specific script for 1–2 minutes. Count the words (or paste them here), then enter the exact duration. Avoid including long pauses in the measured time.' },
        { q: 'Why does speaking rate matter for subtitles?', a: 'Your speaking rate determines subtitle reading difficulty. Speaking at 180 WPM generates subtitles that may exceed Netflix\'s 17 CPS limit. Slower speech produces more readable, broadcast-compliant subtitles.' },
        { q: 'How many words per minute is normal speech?', a: 'Natural conversation is 120–150 WPM. Formal presentations run 100–120 WPM. Rapid speech (auctioneers, speed-readers) can exceed 250 WPM, though this is incomprehensible in subtitles.' },
        { q: 'How does WPM relate to CPS?', a: 'WPM and CPS are related but different. WPM counts words per minute across the whole video. CPS counts characters per second per individual subtitle cue. A 150 WPM speaker averages roughly 13–15 CPS, well within Netflix\'s 17 CPS limit.' },
        { q: 'Can I use this to plan subtitle timing?', a: 'Yes. If you know your WPM, you can estimate how many words will fit in a given subtitle cue duration. A 3-second cue at 150 WPM speaker rate holds approximately 7–8 words.' },
        { q: 'My rate is 200 WPM — will my subtitles fail QC?', a: 'Potentially. At 200 WPM with average English word length (~4.7 chars + space = ~5.7 chars), CPS is approximately 200 × 5.7 / 60 ≈ 19 CPS — above Netflix\'s 17 CPS limit. Consider speaking slightly slower or extending subtitle display durations.' },
      ]}
      relatedTools={[
        { label: 'Video Script Timer', path: '/tools/video-script-timer', desc: 'Estimate video length from your script' },
        { label: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Check per-cue CPS against broadcast standards' },
        { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'AI transcript with timing data' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate subtitles from your video' },
      ]}
    >
      <div className="space-y-5">
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
          {[{ key: 'text-time', label: 'Paste text + time' }, { key: 'word-count', label: 'Word count + time' }].map((m) => (
            <button key={m.key} onClick={() => setMode(m.key as typeof mode)} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === m.key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>{m.label}</button>
          ))}
        </div>
        {mode === 'text-time' ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paste the text you spoke</label>
                {words > 0 && <span className="text-xs text-blue-600 font-medium">{words} words</span>}
              </div>
              <textarea className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm p-4 h-36 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" placeholder="Paste the text you read or spoke…" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">How long did it take?</p>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">Minutes</label><input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="2" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">Seconds</label><input type="number" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="30" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div><label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Word count</label><input type="number" min={1} value={wordCount} onChange={(e) => setWordCount(e.target.value)} placeholder="650" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Duration</p>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">Minutes</label><input type="number" min={0} value={wc2Min} onChange={(e) => setWc2Min(e.target.value)} placeholder="5" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">Seconds</label><input type="number" min={0} max={59} value={wc2Sec} onChange={(e) => setWc2Sec(e.target.value)} placeholder="0" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
            </div>
          </div>
        )}
        {result && info && (
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1">Your speaking rate</p>
            <p className="text-6xl font-display font-bold">{result}</p>
            <p className="text-lg text-blue-200 mt-1">words per minute</p>
            <p className="mt-3 text-sm bg-white/20 inline-block rounded-full px-4 py-1">{info.label}</p>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
