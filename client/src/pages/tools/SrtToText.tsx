import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import FreeToolResultGate from '../../components/FreeToolResultGate'
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
      title="SRT to Plain Text — Extract Transcript from Subtitle Files"
      description="Strip timing codes and cue numbers from SRT or VTT files to get clean plain text. Perfect for repurposing subtitles as blog posts, show notes, or transcripts."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What does SRT to text extraction actually do?',
          body: 'An SRT or VTT file contains three types of lines: (1) cue index numbers (1, 2, 3…), (2) timestamp lines (00:00:01,000 --> 00:00:04,000), and (3) the subtitle text itself. This tool removes the first two types and returns only the text — essentially giving you the spoken transcript of the video. HTML formatting tags like <b>, <i>, and <font> are also stripped from the output.',
        },
        {
          heading: 'Practical uses for extracted subtitle text',
          body: (
            <>
              <p>Extracted subtitle text has many content repurposing uses:</p>
              <ul className="list-disc list-inside mt-2 space-y-1.5">
                <li><strong className="text-gray-900 dark:text-white">Blog posts and articles</strong> — video transcripts converted to written content with light editing</li>
                <li><strong className="text-gray-900 dark:text-white">Show notes and summaries</strong> — podcast episodes or webinar recordings summarized from their transcripts</li>
                <li><strong className="text-gray-900 dark:text-white">Social media captions</strong> — pulling key quotes from long-form video content</li>
                <li><strong className="text-gray-900 dark:text-white">Translation input</strong> — sending text to a translation service without subtitle formatting overhead</li>
                <li><strong className="text-gray-900 dark:text-white">Search indexing</strong> — extracting video content for full-text search databases</li>
              </ul>
            </>
          ),
        },
        {
          heading: 'SRT text vs AI transcript — what\'s the difference?',
          body: 'SRT-extracted text is exactly what the subtitles say — no more, no less. It has no speaker labels, no paragraph structure, and no summaries. An AI-generated transcript (like VideoText\'s Video to Transcript tool) adds speaker diarization, automatic paragraphs, chapter markers, and a summary. If you already have an SRT file, this tool is the fastest way to get the text. If you are starting from a video file, AI transcription produces richer output.',
        },
      ]}
      guideTitle="How to extract text from an SRT file"
      guideSteps={[
        { step: 'Upload your SRT or VTT file', desc: 'Click "Choose file" or paste the subtitle content. Both SRT and VTT are supported.' },
        { step: 'Optionally keep timestamps', desc: 'Toggle "Include timestamps" if you want [00:00:01,000] markers before each line — useful for rough transcripts with timing reference.' },
        { step: 'Extract, copy, or download', desc: 'Click "Extract Text". Copy all text to clipboard or download as a .txt file.' },
      ]}
      faqs={[
        { q: 'What does this tool remove from an SRT file?', a: 'It removes cue index numbers (1, 2, 3…), all timestamp lines, blank separator lines, and HTML tags like <b>, <i>, <u>, <font>. Only the spoken text remains.' },
        { q: 'Can I use the extracted text as a blog post?', a: 'Yes. Many creators convert video transcripts to blog posts. The text will need light editing for grammar, paragraph breaks, and context — but it\'s a fast way to repurpose video content as written articles.' },
        { q: 'Will the line order be preserved?', a: 'Yes. Cues are output in their original order, so the reading flow of the extracted text matches the video.' },
        { q: 'What is the difference between an SRT transcript and a video transcript?', a: 'SRT files contain the same spoken words broken into subtitle cues. When extracted, the text is essentially a raw transcript without speaker labels. AI-generated transcripts (from VideoText) add speakers, paragraphs, chapters, and summaries.' },
        { q: 'Does the "include timestamps" option work with VTT files?', a: 'Yes. Timestamps are extracted from whichever format you upload (SRT or VTT) and formatted as [HH:MM:SS,mmm] in the output.' },
        { q: 'How accurate is the extracted text?', a: 'The extraction is 100% accurate — every character in the subtitle text is preserved exactly. The underlying accuracy of the subtitles themselves depends on how they were generated (manual vs auto).' },
        { q: 'Can I use the text for AI summarization?', a: 'Yes. Paste the extracted text into ChatGPT, Claude, or another AI tool to generate summaries, key takeaways, or social media posts from your video content.' },
        { q: 'Is there a word limit for the extraction?', a: 'No. The extraction runs in your browser with no server limits. Feature-length film subtitle files with thousands of cues process in under a second.' },
      ]}
      relatedTools={[
        { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Get word count and speaking stats' },
        { label: 'Video to Transcript', path: '/video-to-transcript', desc: 'AI transcript with speakers, chapters & summary' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert between subtitle formats' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'Clean up timing and text before extraction' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT to 50+ languages' },
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Validate file before extraction' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName ? `Loaded: ${fileName}` : 'Click to upload SRT or VTT file'}</p>
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
          <FreeToolResultGate title="Your plain text is ready">
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
                <button onClick={() => navigator.clipboard.writeText(output)} className="flex-1 py-2.5 rounded-xl border border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300 font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">Copy all</button>
                <button onClick={() => downloadText(output, `${fileName || 'transcript'}.txt`)} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors">Download .txt</button>
              </div>
            </div>
          </FreeToolResultGate>
        )}
      </div>
    </FreeToolLayout>
  )
}
