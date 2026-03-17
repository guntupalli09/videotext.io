import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, cuesToSrt, mergeCues, detectFormat, downloadText } from '../../lib/subtitleUtils'

export default function MergeSrtFiles() {
  const [fileA, setFileA] = useState({ name: '', content: '' })
  const [fileB, setFileB] = useState({ name: '', content: '' })
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ a: 0, b: 0, total: 0 })
  const refA = useRef<HTMLInputElement>(null)
  const refB = useRef<HTMLInputElement>(null)

  function readFile(e: React.ChangeEvent<HTMLInputElement>, slot: 'a' | 'b') {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (slot === 'a') setFileA({ name: file.name, content })
      else setFileB({ name: file.name, content })
      setOutput('')
    }
    reader.readAsText(file)
  }

  function handleMerge() {
    setError('')
    if (!fileA.content.trim() || !fileB.content.trim()) {
      setError('Please upload both subtitle files.')
      return
    }
    try {
      const parseFmt = (content: string) => {
        const fmt = detectFormat(content)
        return fmt === 'vtt' ? parseVtt(content) : parseSrt(content)
      }
      const cuesA = parseFmt(fileA.content)
      const cuesB = parseFmt(fileB.content)
      if (cuesA.length === 0 || cuesB.length === 0) {
        setError('One of the files has no valid subtitle cues.')
        return
      }
      const merged = mergeCues(cuesA, cuesB)
      setStats({ a: cuesA.length, b: cuesB.length, total: merged.length })
      setOutput(cuesToSrt(merged))
    } catch {
      setError('Failed to parse one or both files.')
    }
  }

  return (
    <FreeToolLayout
      title="Merge SRT Files — Combine Two Subtitle Files Free"
      description="Merge two SRT or VTT subtitle files into one, sorted by timestamp. Perfect for combining foreign and native language tracks. No account needed."
      guideTitle="How to merge SRT files"
      guideSteps={[
        { step: 'Upload File A', desc: 'Click the first upload zone and select your first subtitle file (SRT or VTT).' },
        { step: 'Upload File B', desc: 'Click the second upload zone and select the subtitle file you want to merge in.' },
        { step: 'Click Merge & Download', desc: 'The tool combines both files, sorts all cues by start time, renumbers them, and outputs a clean SRT file.' },
      ]}
      faqs={[
        { q: 'What does merging subtitle files do?', a: 'It combines cues from two subtitle files into one file, sorted by start time and renumbered. Useful for dual-language subtitles, SDH + standard tracks, or combining chapter-based subtitle files.' },
        { q: 'Can I merge SRT and VTT files together?', a: 'Yes. The tool accepts both SRT and VTT for each slot and outputs a merged SRT file.' },
        { q: 'What if two subtitles overlap at the same time?', a: 'Both cues are preserved in the output. If you want to fix overlaps afterward, use our Subtitle Validator or Fix Subtitles tool.' },
        { q: 'Is the merged file sorted chronologically?', a: 'Yes. All cues from both files are sorted by start time before renumbering, so the output is always in order.' },
        { q: 'Can I merge more than two files?', a: 'This tool merges two files at a time. To merge three or more, merge the first two, then merge the result with the third file.' },
      ]}
      relatedTools={[
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check merged file for overlaps' },
        { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Adjust timestamps before merging' },
        { label: 'SRT to VTT', path: '/tools/srt-to-vtt', desc: 'Convert merged SRT to VTT format' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate subtitles from video with AI' },
      ]}
    >
      <div className="space-y-4">
        {/* Two upload zones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{ ref: refA, file: fileA, slot: 'a' as const, label: 'File A' }, { ref: refB, file: fileB, slot: 'b' as const, label: 'File B' }].map(({ ref, file, slot, label }) => (
            <div
              key={slot}
              onClick={() => ref.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${file.content ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-violet-300'}`}
            >
              <input ref={ref} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={(e) => readFile(e, slot)} />
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {file.name || 'Click to upload SRT or VTT'}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={handleMerge}
          disabled={!fileA.content || !fileB.content}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
        >
          Merge Files
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {output && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ label: 'File A cues', val: stats.a }, { label: 'File B cues', val: stats.b }, { label: 'Merged total', val: stats.total }].map((s) => (
                <div key={s.label} className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3">
                  <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => downloadText(output, 'merged_subtitles.srt')}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
            >
              Download merged SRT
            </button>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
