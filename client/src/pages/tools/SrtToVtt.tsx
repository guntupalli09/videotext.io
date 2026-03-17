import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, cuesToVtt, downloadText } from '../../lib/subtitleUtils'

export default function SrtToVtt() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.srt$/i, ''))
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
    if (!src.trim()) { setError('Paste or upload an SRT file first.'); return }
    try {
      const cues = parseSrt(src)
      if (cues.length === 0) { setError('No valid subtitle cues found. Make sure this is a valid SRT file.'); return }
      setOutput(cuesToVtt(cues))
    } catch {
      setError('Could not parse the SRT file. Please check the format.')
    }
  }

  function handleDownload() {
    downloadText(output, `${fileName || 'subtitles'}.vtt`)
  }

  return (
    <FreeToolLayout
      title="SRT to VTT Converter — Free Online"
      description="Convert SRT subtitle files to WebVTT (VTT) format instantly. Paste your SRT or upload a file — no account required."
      guideTitle="How to convert SRT to VTT"
      guideSteps={[
        { step: 'Upload or paste your SRT file', desc: 'Click "Choose file" or paste the SRT content directly into the text box.' },
        { step: 'Click Convert', desc: 'The tool converts the timestamp format and adds the WEBVTT header required by browsers and players.' },
        { step: 'Download your VTT file', desc: 'Click "Download VTT" to save the converted file ready for HTML5 video, YouTube, or your CMS.' },
      ]}
      faqs={[
        { q: 'What is the difference between SRT and VTT?', a: 'SRT (SubRip Text) uses comma-separated milliseconds in timestamps (00:00:01,000) and is widely supported by video editors. VTT (WebVTT) uses dot-separated milliseconds (00:00:01.000), starts with a WEBVTT header, and is required for HTML5 <track> elements, YouTube, and most web players.' },
        { q: 'Is this conversion lossless?', a: 'Yes. The tool only changes the timestamp separator (comma → dot) and adds the WEBVTT header. All subtitle text and timing is preserved exactly.' },
        { q: 'Which players require VTT format?', a: 'HTML5 video players, Vimeo, Wistia, Brightcove, and most web-based players require VTT. YouTube accepts both SRT and VTT.' },
        { q: 'Can I convert VTT back to SRT?', a: 'Yes — use our free VTT to SRT converter tool.' },
        { q: 'Does this tool store my subtitle file?', a: 'No. The conversion happens entirely in your browser using JavaScript. Nothing is uploaded to any server.' },
      ]}
    >
      <div className="space-y-4">
        {/* Upload */}
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 dark:hover:border-violet-500 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}.srt` : 'Click to upload .srt file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste SRT below</p>
        </div>

        {/* Paste area */}
        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder={`1\n00:00:01,000 --> 00:00:04,000\nHello world\n\n2\n00:00:05,000 --> 00:00:08,000\nThis is a subtitle`}
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        <button
          onClick={() => convert()}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
        >
          Convert SRT → VTT
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {output && (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">VTT Output</span>
                <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs text-violet-600 hover:text-violet-700 font-medium">Copy</button>
              </div>
              <pre className="text-xs text-gray-800 dark:text-gray-200 p-4 font-mono overflow-auto max-h-48 whitespace-pre-wrap">{output.slice(0, 600)}{output.length > 600 ? '\n…' : ''}</pre>
            </div>
            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
            >
              Download .vtt file
            </button>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
