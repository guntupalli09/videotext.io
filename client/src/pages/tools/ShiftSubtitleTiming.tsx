import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, cuesToSrt, cuesToVtt, shiftCues, detectFormat, downloadText } from '../../lib/subtitleUtils'
import { exportFileStem, joinExportFilename } from '../../lib/exportFileNames'

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
    downloadText(
      output,
      joinExportFilename(exportFileStem(fileName, 'subtitles'), `timing_shifted_${format}`, `.${format}`)
    )
  }

  return (
    <FreeToolLayout
      title="Subtitle Time Shifter — Delay or Advance All Subtitle Timestamps"
      description="Fix out-of-sync subtitles by shifting every timestamp forward or backward by any number of seconds. Works with SRT and VTT files. Free, browser-based, instant."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'Why are subtitles out of sync?',
          body: 'Subtitle sync issues happen when the subtitle file was created for a different version of the video. Common causes include: the video file has a longer intro or credits than the version the subtitle was made for; the video was re-encoded at a different frame rate (e.g., 24fps to 25fps shifts timing by ~4%); the video was trimmed or extended after subtitles were generated; or the subtitle was downloaded for a theatrical version of a film when you have the extended cut. In all these cases, every subtitle cue is offset by a consistent amount — which is exactly what this tool corrects.',
        },
        {
          heading: 'Forward vs backward — which do I choose?',
          body: 'Choose "Forward" if your subtitles appear too early — the text shows up before the person speaks. Choose "Backward" if your subtitles appear too late — the text appears after the person has already spoken. A simple test: if the first subtitle appears 2 seconds before the first word is spoken, shift backward by 2 seconds. If it appears 2 seconds after, shift forward by 2 seconds.',
        },
        {
          heading: 'What if only part of the video is out of sync?',
          body: 'This tool applies a uniform shift to all cues, which only fixes sync issues caused by a constant offset. If your video has multiple sync breaks at different points (common in subtitles for multi-episode compilations or videos with variable frame rates), you will need a subtitle editing tool like Subtitle Edit (desktop, free) or our AI-powered Fix Subtitles tool which can analyze and correct per-segment timing.',
        },
      ]}
      guideTitle="How to shift subtitle timing"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste your subtitle content. The tool auto-detects SRT and VTT formats from the file content.' },
        { step: 'Enter the offset in seconds', desc: 'Type how many seconds to shift. Decimals are supported (e.g., 1.5 seconds). Select Forward if subtitles are early, Backward if they are late.' },
        { step: 'Download the adjusted file', desc: 'Click "Shift timing" and download the corrected subtitle file in the same format (SRT or VTT) as the original.' },
      ]}
      faqs={[
        { q: 'My subtitles are 2 seconds behind the audio — what do I do?', a: 'Upload your file, enter 2 in the offset box, and select "Forward". This shifts all timestamps 2 seconds earlier, bringing subtitles in sync with the audio.' },
        { q: 'Can I shift by fractions of a second?', a: 'Yes. The offset field accepts decimal values. Enter 0.5 for half a second, 1.5 for one and a half seconds, etc.' },
        { q: 'Can I shift subtitles backward past zero?', a: 'The tool clamps any timestamp that would go negative to 00:00:00,000. If the first cue starts at 0:00:01 and you shift backward 5 seconds, it becomes 0:00:00,000 rather than negative.' },
        { q: 'What file formats are supported?', a: 'SRT (.srt) and WebVTT (.vtt) are fully supported. The tool auto-detects the format. The output file preserves the same format as the input.' },
        { q: 'Will the cue index numbers change?', a: 'No. Index numbers are preserved from the original file. Only the timestamp values are modified.' },
        { q: 'What causes frame rate sync issues?', a: 'A video encoded at 25fps will run slightly faster than the same video at 24fps. Over a 90-minute movie, this creates a drift of about 3.6 minutes. The sync error grows over time, which is why a constant offset shift won\'t fully fix it. This is called "frame rate mismatch" and requires a stretch/compress operation rather than a shift.' },
        { q: 'Why are my subtitles 2 hours ahead?', a: 'This often means the subtitle was created with a different time base. For example, a subtitle starting at 01:00:00,000 for content that starts at 00:00:00 — common in broadcast timecode workflows. Shift backward by 3600 seconds (1 hour) to fix it.' },
        { q: 'Does this work for ASS/SSA subtitle formats?', a: 'No. This tool supports SRT and VTT only. For ASS/SSA formats, use Aegisub or Subtitle Edit on desktop.' },
      ]}
      relatedTools={[
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check for overlaps after shifting' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert between subtitle formats' },
        { label: 'Merge SRT Files', path: '/tools/merge-srt-files', desc: 'Combine two subtitle tracks' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'AI-powered subtitle timing correction' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate fresh subtitles from video with AI' },
        { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Analyze word count and speaking stats' },
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

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Offset (seconds)</label>
            <input
              type="number" min="0.1" step="0.1" value={offsetSec}
              onChange={(e) => setOffsetSec(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Direction</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              {(['forward', 'backward'] as const).map((d) => (
                <button key={d} onClick={() => setDirection(d)} className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${direction === d ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
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
