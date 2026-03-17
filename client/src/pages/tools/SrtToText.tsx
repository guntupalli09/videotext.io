import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, parseVtt, detectFormat, stripTags, downloadText } from '../../lib/subtitleUtils'

export default function SrtToText() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [includeTimestamps, setIncludeTimestamps] = useState(false)
  const [stats, setStats] = useState({ cues: 0, words: 0, chars: 0 })
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.(srt|vtt)$/i, ''))
    const reader = new FileReader()
    reader.onload = (ev) => { setText(ev.target?.result as string); setOutput('') }
    reader.readAsText(file)
  }

  function handleConvert() {
    setError('')
    if (!text.trim()) { setError('Please upload or paste a subtitle file.'); return }
    try {
      const fmt = detectFormat(text)
      const cues = fmt === 'vtt' ? parseVtt(text) : parseSrt(text)
      if (cues.length === 0) { setError('No subtitle cues found.'); return }
      const lines: string[] = []
      for (const c of cues) {
        const clean = stripTags(c.text).trim()
        if (!clean) continue
        if (includeTimestamps) lines.push(`[${c.startTime}]  ${clean}`)
        else lines.push(clean)
      }
      const result = lines.join('\n')
      const words = result.split(/\s+/).filter(Boolean).length
      setStats({ cues: cues.length, words, chars: result.length })
      setOutput(result)
    } catch {
      setError('Failed to parse the subtitle file.')
    }
  }

  return (
    <FreeToolLayout
      title="SRT to Text Converter — Extract Plain Text from Subtitles"
      description="Strip timing and index numbers from SRT or VTT files and extract clean plain text. Perfect for repurposing subtitles as blog posts, transcripts, or scripts."
      guideTitle="How to extract text from an SRT file"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the subtitle content. Both SRT and VTT formats are supported.' },
        { step: 'Choose output options', desc: 'Optionally keep timestamps if you want a rough transcript with timing markers.' },
        { step: 'Convert and download', desc: 'Click "Extract text" to get clean plain text stripped of all timing codes and cue numbers.' },
      ]}
      faqs={[
        { q: 'What does this tool remove from an SRT file?', a: 'It removes the cue index numbers (1, 2, 3…), all timestamp lines (00:00:01,000 --> 00:00:04,000), and blank separator lines. You get only the spoken text.' },
        { q: 'Can I use the extracted text as a blog post?', a: 'Yes. Many creators convert video transcripts to blog posts. The extracted text will need light editing for grammar and paragraph breaks, but it\'s a fast way to repurpose video content.' },
        { q: 'Will HTML formatting tags be removed?', a: 'Yes. Common subtitle tags like <b>, <i>, <u>, and <font> are stripped from the output text.' },
        { q: 'What is the difference between SRT text and a transcript?', a: 'SRT files contain the same spoken words, but broken into short subtitle cues with timing. When extracted, the text is essentially a transcript, though without speaker labels. For AI-generated transcripts with speakers, use VideoText\'s Video to Transcript tool.' },
        { q: 'Does the line order get preserved?', a: 'Yes. Cues are output in their original order, so the reading flow of the extracted text matches the video.' },
      ]}
      relatedTools={[
        { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Count words and get speaking stats' },
        { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'AI transcript with speakers & chapters' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert subtitle formats' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'Clean up subtitle timing and text' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}` : 'Click to upload SRT or VTT file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Paste SRT or VTT content here…"
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={includeTimestamps} onChange={(e) => setIncludeTimestamps(e.target.checked)} className="rounded text-violet-600" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Include timestamps in output</span>
        </label>

        <button onClick={handleConvert} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">
          Extract Text
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {output && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ label: 'Cues', val: stats.cues }, { label: 'Words', val: stats.words.toLocaleString() }, { label: 'Characters', val: stats.chars.toLocaleString() }].map((s) => (
                <div key={s.label} className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3">
                  <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plain Text</span>
                <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs text-violet-600 font-medium">Copy</button>
              </div>
              <pre className="text-sm text-gray-800 dark:text-gray-200 p-4 overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">{output.slice(0, 800)}{output.length > 800 ? '\n…' : ''}</pre>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(output)} className="flex-1 py-2.5 rounded-xl border border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300 font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                Copy all text
              </button>
              <button onClick={() => downloadText(output, `${fileName || 'transcript'}.txt`)} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors">
                Download .txt
              </button>
            </div>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
