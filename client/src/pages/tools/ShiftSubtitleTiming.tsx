import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, cuesToSrt, cuesToVtt, shiftCues, detectFormat, downloadText } from '../../lib/subtitleUtils'

export default function ShiftSubtitleTiming() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [format, setFormat] = useState<'srt' | 'vtt'>('srt')
  const [offsetSec, setOffsetSec] = useState('2')
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    setFormat(ext === 'vtt' ? 'vtt' : 'srt')
    setFileName(file.name.replace(/\.(srt|vtt)$/i, ''))
    const reader = new FileReader()
    reader.onload = (ev) => setText(ev.target?.result as string)
    reader.readAsText(file)
  }

  function handleConvert() {
    setError('')
    if (!text.trim()) { setError('Please upload or paste a subtitle file first.'); return }
    const secs = parseFloat(offsetSec)
    if (isNaN(secs) || secs <= 0) { setError('Enter a positive number of seconds.'); return }
    const offsetMs = (direction === 'forward' ? 1 : -1) * secs * 1000
    try {
      const detectedFmt = detectFormat(text)
      const fmt = detectedFmt !== 'unknown' ? detectedFmt : format
      const cues = fmt === 'vtt' ? parseVtt(text) : parseSrt(text)
      if (cues.length === 0) { setError('No valid subtitle cues found.'); return }
      const shifted = shiftCues(cues, offsetMs, fmt === 'srt')
      setOutput(fmt === 'vtt' ? cuesToVtt(shifted) : cuesToSrt(shifted))
      setFormat(fmt)
    } catch {
      setError('Failed to parse subtitle file.')
    }
  }

  function handleDownload() {
    downloadText(output, `${fileName || 'subtitles'}_shifted.${format}`)
  }

  return (
    <FreeToolLayout
      title="Subtitle Time Shifter — Delay or Advance Subtitles"
      description="Shift all subtitle timestamps forward or backward by any number of seconds. Fix out-of-sync subtitles instantly. Works with SRT and VTT files."
      guideTitle="How to shift subtitle timing"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste your subtitle content. The tool auto-detects SRT and VTT formats.' },
        { step: 'Enter the offset in seconds', desc: 'Type how many seconds to shift. Use "Forward" if subtitles appear too early, "Backward" if they appear too late.' },
        { step: 'Download the adjusted file', desc: 'Click "Shift timing" and download your corrected subtitle file. All cues are shifted uniformly.' },
      ]}
      faqs={[
        { q: 'My subtitles are 2 seconds behind the audio — what do I do?', a: 'Upload your file, enter 2 in the offset box, and select "Forward". This shifts all timestamps 2 seconds earlier, bringing them in sync.' },
        { q: 'Can I shift subtitles backward past zero?', a: 'The tool clamps any negative timestamps to 00:00:00,000. If an early cue would go negative, it is set to zero.' },
        { q: 'Does this work for partial sync issues?', a: 'This tool shifts ALL cues by the same offset. If only part of your video is out of sync (e.g., after a cut), you may need a subtitle editor.' },
        { q: 'What file formats are supported?', a: 'SRT (.srt) and WebVTT (.vtt) are supported. The tool auto-detects the format from the file content.' },
        { q: 'Why are my subtitles out of sync?', a: "Common causes: the video has an intro/outro that the subtitle file doesn't account for, the subtitle was made for a different cut of the video, or a different frame rate was used." },
      ]}
      relatedTools={[
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check for overlaps and timing errors' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT to WebVTT format' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'AI-powered subtitle timing correction' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate new subtitles from video with AI' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}.${format}` : 'Click to upload SRT or VTT file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste subtitle content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Paste SRT or VTT content here…"
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        {/* Controls */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Offset (seconds)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={offsetSec}
              onChange={(e) => setOffsetSec(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Direction</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              {(['forward', 'backward'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${direction === d ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  {d === 'forward' ? '▶ Forward' : '◀ Backward'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleConvert} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">
          Shift Timing
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {output && (
          <div className="space-y-3">
            <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 text-center">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">Timing shifted successfully!</p>
            </div>
            <button onClick={handleDownload} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors">
              Download shifted file
            </button>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
