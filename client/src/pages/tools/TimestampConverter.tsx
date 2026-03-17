import { useState } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'

function secToHms(sec: number, separator: ',' | '.' = ',') {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec - Math.floor(sec)) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${separator}${String(ms).padStart(3, '0')}`
}

function hmsToSec(hms: string): number | null {
  const clean = hms.trim().replace(',', '.')
  const m = clean.match(/^(\d+):(\d+):(\d+)\.?(\d*)$/)
  if (!m) return null
  const ms = m[4] ? parseInt(m[4].padEnd(3, '0').slice(0, 3)) : 0
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + ms / 1000
}

function secToFrames(sec: number, fps: number) {
  const totalFrames = Math.round(sec * fps)
  const h = Math.floor(totalFrames / (fps * 3600))
  const m = Math.floor((totalFrames % (fps * 3600)) / (fps * 60))
  const s = Math.floor((totalFrames % (fps * 60)) / fps)
  const f = totalFrames % fps
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

function formatSec(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = (sec % 60).toFixed(3)
  let out = ''
  if (h > 0) out += `${h}h `
  if (m > 0 || h > 0) out += `${m}m `
  out += `${s}s`
  return out
}

export default function TimestampConverter() {
  const [input, setInput] = useState('')
  const [inputMode, setInputMode] = useState<'seconds' | 'hms'>('seconds')
  const [fps, setFps] = useState('25')

  const sec = inputMode === 'seconds'
    ? parseFloat(input) || null
    : hmsToSec(input)

  const results = sec !== null ? {
    seconds: sec.toFixed(3),
    hms: `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`,
    srt: secToHms(sec, ','),
    vtt: secToHms(sec, '.'),
    timecode: secToFrames(sec, parseFloat(fps) || 25),
    human: formatSec(sec),
    ms: Math.round(sec * 1000),
  } : null

  const rows = results ? [
    { label: 'Seconds', val: results.seconds, mono: true },
    { label: 'Milliseconds', val: String(results.ms), mono: true },
    { label: 'HH:MM:SS', val: results.hms, mono: true },
    { label: 'SRT format (HH:MM:SS,mmm)', val: results.srt, mono: true },
    { label: 'VTT format (HH:MM:SS.mmm)', val: results.vtt, mono: true },
    { label: `Timecode (${fps} fps)`, val: results.timecode, mono: true },
    { label: 'Human readable', val: results.human, mono: false },
  ] : []

  return (
    <FreeToolLayout
      title="Timestamp Converter — Seconds to HH:MM:SS, SRT, VTT & Timecode"
      description="Convert timestamps between seconds, HH:MM:SS, SRT format (00:00:01,000), VTT format (00:00:01.000), and SMPTE timecode. Instant, free, no account needed."
      hubLink={{ label: 'Free Video Tools', path: '/tools' }}
      contentSections={[
        { heading: 'Timestamp formats in video production', body: 'Video production uses several timestamp formats depending on the workflow. Raw seconds (e.g. 3661.500) are the most portable format and are used by many APIs and databases. HH:MM:SS is human-readable and used in video player displays and YouTube chapter links. SRT subtitles use HH:MM:SS,mmm with a comma before milliseconds, while WebVTT uses a dot instead. SMPTE timecode adds frame numbers (HH:MM:SS:FF) and is the standard in professional editing software and broadcast. Knowing which format your tool expects saves time and prevents errors in subtitle and editing workflows.' },
        { heading: 'What is SMPTE timecode?', body: 'SMPTE timecode is a set of cooperating standards developed by the Society of Motion Picture and Television Engineers for labeling individual frames of video. It encodes hours, minutes, seconds, and frames in the format HH:MM:SS:FF. Timecode is embedded in video files and used by editing applications like Premiere Pro, DaVinci Resolve, and Avid to synchronize footage, log clip positions, and create edit decision lists (EDLs). The frame count portion resets to zero with each new second, so its maximum value is one less than the frame rate — at 25fps, frames go from 00 to 24.' },
        { heading: 'When do you need to convert timestamps?', body: 'Timestamp conversion is needed in several common scenarios. When editing subtitles manually, you may need to convert seconds from a speech-to-text output into SRT or VTT format. When writing YouTube descriptions with chapter markers, you need HH:MM:SS. When syncing audio to video in a DAW, SMPTE timecode is required. When building applications that display video progress, milliseconds or raw seconds are easier to work with programmatically. This converter handles all these cases in a single step, eliminating manual arithmetic and formatting errors.' },
      ]}
      guideTitle="How to convert timestamps"
      guideSteps={[
        { step: 'Choose input mode', desc: '"Seconds" mode: enter a number like 3661 to convert. "HH:MM:SS" mode: enter a timestamp like 01:01:01,000 to convert to all other formats.' },
        { step: 'Type your value', desc: 'The tool converts instantly as you type. All formats update in real time.' },
        { step: 'Copy any format', desc: 'Click the copy icon next to any row to copy that specific format to your clipboard.' },
      ]}
      faqs={[
        { q: 'What is the difference between SRT and VTT timestamp formats?', a: 'SRT uses a comma to separate seconds from milliseconds: 00:01:23,456. VTT uses a dot: 00:01:23.456. Both represent the same point in time — they only differ in punctuation.' },
        { q: 'What is SMPTE timecode?', a: 'SMPTE timecode (HH:MM:SS:FF) includes frame numbers after the colon. 00:01:23:12 at 25fps means 1 minute, 23 seconds, and 12 frames. It\'s used in video editing software and broadcast equipment.' },
        { q: 'How do I convert 3661 seconds to HH:MM:SS?', a: '3661 seconds = 1 hour, 1 minute, 1 second = 01:01:01. Divide by 3600 for hours, take remainder divide by 60 for minutes, remainder is seconds.' },
        { q: 'What frame rate should I use for timecode?', a: 'Use the same frame rate as your video file. Common rates: 24fps (cinema), 25fps (PAL/European TV), 29.97fps (NTSC/US TV), 30fps (web video), 60fps (gaming/YouTube).' },
        { q: 'How do I add timestamps to YouTube descriptions?', a: 'YouTube description timestamps use MM:SS format (or H:MM:SS for videos over 1 hour). Enter your seconds and copy the HH:MM:SS value from this tool, then remove leading zeros.' },
        { q: 'What is drop frame timecode?', a: 'Drop frame timecode is a way of compensating for the slight difference between 30fps and the actual NTSC frame rate of 29.97fps. It periodically skips frame numbers (not actual frames) to keep the timecode in sync with real clock time over long durations. Drop frame timecodes use a semicolon separator (01;00;00;00) while non-drop frame uses a colon (01:00:00:00). Drop frame is used in broadcast TV; non-drop frame is common in film and web video production.' },
        { q: 'How do YouTube chapter timestamps work?', a: 'YouTube creates automatic chapters in a video\'s timeline when you include three or more timestamps in the video description, each on its own line, starting with 0:00. The format is MM:SS or H:MM:SS followed by a chapter title. For example: "0:00 Introduction", "1:45 Main topic", "5:30 Conclusion". Chapters appear as markers in the YouTube progress bar and help viewers navigate to specific sections.' },
      ]}
      relatedTools={[
        { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Adjust all subtitle timestamps by offset' },
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check subtitle timing for errors' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert between subtitle formats' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate timestamped subtitles with AI' },
      ]}
    >
      <div className="space-y-4">
        {/* Mode + Input */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 mb-3">
          {[{ key: 'seconds', label: 'Enter seconds' }, { key: 'hms', label: 'Enter HH:MM:SS' }].map((m) => (
            <button key={m.key} onClick={() => { setInputMode(m.key as typeof inputMode); setInput('') }} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${inputMode === m.key ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
              {m.label}
            </button>
          ))}
        </div>

        <input
          type={inputMode === 'seconds' ? 'number' : 'text'}
          min={0}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={inputMode === 'seconds' ? '3661' : '01:01:01,000'}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3 text-lg font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />

        {inputMode === 'seconds' ? null : (
          <p className="text-xs text-gray-400">Accepts: 01:01:01 / 01:01:01,000 / 01:01:01.000</p>
        )}

        {/* FPS for timecode */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Frame rate (for timecode):</label>
          <div className="flex gap-1">
            {['24', '25', '29.97', '30', '60'].map((f) => (
              <button key={f} onClick={() => setFps(f)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${fps === f ? 'bg-violet-600 text-white' : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">Converted formats</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-48 shrink-0">{row.label}</span>
                  <span className={`flex-1 text-sm text-gray-900 dark:text-white ${row.mono ? 'font-mono' : ''}`}>{row.val}</span>
                  <button onClick={() => navigator.clipboard.writeText(row.val)} className="ml-2 text-xs text-violet-500 hover:text-violet-700 font-medium shrink-0">copy</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
