import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseVtt, cuesToSrt } from '../../lib/subtitleUtils'

export default function VttToSrt() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.vtt$/i, ''))
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setText(content)
      convert(content)
    }
    reader.readAsText(file)
  }

  function convert(src = text) {
    setError('')
    if (!src.trim()) { setError('Paste or upload a VTT file first.'); return }
    if (!src.includes('-->')) { setError('No timing lines found. Please check this is a valid VTT file.'); return }
    try {
      const cues = parseVtt(src)
      if (cues.length === 0) { setError('No valid cues found. Make sure this is a valid WebVTT file.'); return }
      setOutput(cuesToSrt(cues))
    } catch {
      setError('Could not parse the VTT file. Please check the format.')
    }
  }

  return (
    <FreeToolLayout
      title="VTT to SRT Converter — Free Online"
      description="Convert WebVTT (.vtt) subtitle files to SubRip (.srt) format instantly in your browser. No upload, no account."
      guideTitle="How to convert VTT to SRT"
      guideSteps={[
        { step: 'Upload or paste your VTT file', desc: 'Click "Choose file" to upload a .vtt file, or paste the WebVTT content in the box below.' },
        { step: 'Click Convert', desc: 'The tool strips the WEBVTT header, converts dot-separated timestamps to comma format, and numbers each cue.' },
        { step: 'Download the SRT file', desc: 'Hit "Download .srt" to save the file, ready for video editing software like Premiere, DaVinci Resolve, or Final Cut.' },
      ]}
      faqs={[
        { q: 'Why convert VTT to SRT?', a: 'Most offline video editors (Adobe Premiere, DaVinci Resolve, Final Cut Pro) require SRT format. VTT is for web players; SRT is for editors and broadcast workflows.' },
        { q: 'Will I lose any styling from my VTT file?', a: 'VTT supports CSS-style tags and positioning cues that SRT does not. Basic text and timing is preserved, but any <c.color> or positioning metadata will be stripped.' },
        { q: 'What is WebVTT used for?', a: 'WebVTT is the standard subtitle format for HTML5 <video> elements. It\'s used by YouTube, Vimeo, and most browser-based players. The W3C specification requires VTT for native browser subtitle tracks.' },
        { q: 'Does my file get uploaded anywhere?', a: 'No. All processing happens locally in your browser. Your subtitle file never leaves your device.' },
        { q: 'Can I convert multiple files at once?', a: 'This free tool processes one file at a time. For bulk conversion, check our Batch Processing tool which supports multiple files.' },
      ]}
      relatedTools={[
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT → WebVTT format' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'Auto-correct timing & overlaps in SRT/VTT' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT from video with AI' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 50+ languages' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 dark:hover:border-violet-500 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".vtt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}.vtt` : 'Click to upload .vtt file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste VTT content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder={`WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello world\n\n00:00:05.000 --> 00:00:08.000\nThis is a subtitle`}
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        <button onClick={() => convert()} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">
          Convert VTT → SRT
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {output && (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SRT Output</span>
                <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs text-violet-600 hover:text-violet-700 font-medium">Copy</button>
              </div>
              <pre className="text-xs text-gray-800 dark:text-gray-200 p-4 font-mono overflow-auto max-h-48 whitespace-pre-wrap">{output.slice(0, 600)}{output.length > 600 ? '\n…' : ''}</pre>
            </div>
            <button onClick={() => { const blob = new Blob([output], { type: 'text/plain' }); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = `${fileName || 'subtitles'}.srt`; a.click(); URL.revokeObjectURL(u) }} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors">
              Download .srt file
            </button>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
