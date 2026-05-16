import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, cuesToSrt, mergeCues, detectFormat, downloadText } from '../../lib/subtitleUtils'
import { joinExportFilename } from '../../lib/exportFileNames'

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
    if (!fileA.content.trim() || !fileB.content.trim()) { setError('Please upload both subtitle files.'); return }
    try {
      const parseFmt = (content: string) => {
        const fmt = detectFormat(content)
        return fmt === 'vtt' ? parseVtt(content) : parseSrt(content)
      }
      const cuesA = parseFmt(fileA.content)
      const cuesB = parseFmt(fileB.content)
      if (cuesA.length === 0 || cuesB.length === 0) { setError('One of the files has no valid subtitle cues.'); return }
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
      description="Merge two SRT or VTT subtitle files into one sorted, renumbered file. Ideal for dual-language tracks, chapter subtitles, and combining SDH with standard captions."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'When would you merge two subtitle files?',
          body: (
            <>
              <p>Merging subtitle files is useful in several real-world scenarios:</p>
              <ul className="list-disc list-inside mt-2 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                <li><strong className="text-gray-900 dark:text-white">Dual-language subtitles</strong> — combining an English translation track with the original-language subtitles so both appear in the same file</li>
                <li><strong className="text-gray-900 dark:text-white">SDH + standard captions</strong> — merging Subtitles for the Deaf and Hard of Hearing (sound effects, speaker labels) with a standard dialogue track</li>
                <li><strong className="text-gray-900 dark:text-white">Chapter-based subtitles</strong> — when a long video was split into chapters for transcription and you need one unified file</li>
                <li><strong className="text-gray-900 dark:text-white">Corrected segments</strong> — replacing timing-fixed cues from one file back into the original</li>
              </ul>
            </>
          ),
        },
        {
          heading: 'How does the merge work?',
          body: 'The tool parses both subtitle files (SRT or VTT), combines all cues into a single list, sorts them by start timestamp, and renumbers them from 1. Cues from both files are interleaved in chronological order. The output is always SRT format. If cues from File A and File B overlap at the same moment, both are kept — run the merged file through our Subtitle Validator to check for any overlaps afterward.',
        },
      ]}
      guideTitle="How to merge SRT files"
      guideSteps={[
        { step: 'Upload File A', desc: 'Click the first upload zone and select your first subtitle file. SRT and VTT formats are both accepted.' },
        { step: 'Upload File B', desc: 'Click the second upload zone for the file you want to merge in.' },
        { step: 'Click Merge & Download', desc: 'The tool sorts all cues by start time, renumbers them, and downloads a clean SRT file.' },
      ]}
      faqs={[
        { q: 'What does merging subtitle files actually do?', a: 'It combines all cues from two files into one file, sorted by start time and renumbered sequentially from 1. Useful for dual-language subtitles, SDH + standard tracks, or chapter-based subtitle files.' },
        { q: 'Can I merge SRT and VTT files together?', a: 'Yes. The tool accepts SRT or VTT for each slot independently and outputs a merged SRT file. Mixed formats work fine.' },
        { q: 'What if two subtitles overlap at the same time?', a: 'Both cues are preserved in the output. If you want to detect and fix overlaps afterward, run the merged file through our free Subtitle Validator tool.' },
        { q: 'Is the merged file sorted chronologically?', a: 'Yes. All cues from both files are sorted by start time before renumbering, so the output is always in the correct order regardless of how the input files were ordered.' },
        { q: 'Can I merge more than two files?', a: 'This tool merges two files at a time. To merge three or more, merge the first two, download the result, then upload that as File A and upload the third file as File B.' },
        { q: 'Will timing shift if one file has an offset from the other?', a: 'No — the merge preserves original timestamps from both files. If File B starts at 00:10:00 and File A ends at 00:09:55, they will overlap. Use the Shift Subtitle Timing tool on either file first if you need to realign them.' },
        { q: 'Can I use this to add sound effect captions to a subtitle file?', a: 'Yes. This is a common SDH (Subtitles for the Deaf and Hard of Hearing) workflow: prepare a separate file with sound effect labels like [MUSIC] or [DOOR SLAMS], then merge it with the dialogue subtitle file.' },
        { q: 'Does the output format match the input?', a: 'The output is always SRT format regardless of whether the inputs were SRT or VTT. If you need VTT output, run the result through the SRT to VTT converter.' },
      ]}
      relatedTools={[
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check merged file for overlaps and errors' },
        { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Align timestamps before merging' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert merged SRT output to VTT' },
        { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Count words in the merged file' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate subtitles from video with AI' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate the merged file to 70+ languages' },
      ]}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{ ref: refA, file: fileA, slot: 'a' as const, label: 'File A' }, { ref: refB, file: fileB, slot: 'b' as const, label: 'File B' }].map(({ ref, file, slot, label }) => (
            <div key={slot} onClick={() => ref.current?.click()} className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${file.content ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}>
              <input ref={ref} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={(e) => readFile(e, slot)} />
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name || 'Click to upload SRT or VTT'}</p>
            </div>
          ))}
        </div>

        <button onClick={handleMerge} disabled={!fileA.content || !fileB.content} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium text-sm transition-colors">
          Merge Files
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {output && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ label: 'File A cues', val: stats.a }, { label: 'File B cues', val: stats.b }, { label: 'Merged total', val: stats.total }].map((s) => (
                <div key={s.label} className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
                  <p className="text-xl font-medium text-blue-700 dark:text-blue-300">{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => downloadText(output, joinExportFilename('merged_subtitles', 'combined_from_two_files', '.srt'))}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-colors"
            >
              Download merged SRT
            </button>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
