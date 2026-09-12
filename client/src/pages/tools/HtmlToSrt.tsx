import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseHtmlCaptions, cuesToSrt, downloadText } from '../../lib/subtitleUtils'
import { exportFileStem, joinExportFilename } from '../../lib/exportFileNames'

export default function HtmlToSrt() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.html?$/i, ''))
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
    if (!src.trim()) { setError('Paste or upload an HTML caption/transcript file first.'); return }
    try {
      const cues = parseHtmlCaptions(src)
      if (cues.length === 0) {
        setError('No timed captions found. This tool reads elements with data-start/begin timing attributes, or plain text with bracketed timestamps like [00:00:12].')
        return
      }
      setOutput(cuesToSrt(cues))
    } catch {
      setError('Could not parse this HTML file. Please check the format.')
    }
  }

  function handleDownload() {
    downloadText(output, joinExportFilename(exportFileStem(fileName, 'subtitles'), 'converted_html_to_srt', '.srt'))
  }

  return (
    <FreeToolLayout
      title="HTML to SRT Converter — Free Online"
      description="Convert HTML captions or transcript exports to SubRip (.srt) format instantly in your browser. Supports data-start timing attributes, TTML-style begin/end attributes, and bracketed timestamps. No upload, no account."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What is an HTML caption/transcript export?',
          body: 'Many caption editors, transcript tools, and video platforms export timed text as HTML rather than SRT or VTT — for example, elements tagged with data-start/data-end attributes (common in caption-editor exports), begin/end attributes (an HTML-flavored variant of TTML), or plain paragraphs prefixed with a bracketed timestamp like [00:00:12]. This tool reads all three shapes and converts them into a clean, standard SRT file.',
        },
        {
          heading: 'Why convert HTML captions to SRT?',
          body: 'SRT is the format nearly every video editor and platform expects — Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro, CapCut, and YouTube Studio all import SRT directly. An HTML export from a caption tool or transcript service usually cannot be imported as-is; converting it to SRT makes it usable in your editing workflow.',
        },
        {
          heading: 'Which HTML formats are supported?',
          body: 'This tool auto-detects three common shapes: (1) elements with data-start/data-start-ms and data-end/data-end-ms attributes, (2) elements with begin/end attributes (TTML-style timing embedded in HTML), and (3) plain text blocks where each caption starts with a bracketed or parenthesized timestamp such as [00:00:12] or (1:02:03.456). If your file uses a different structure, try exporting as VTT or SRT directly from the source tool instead.',
        },
      ]}
      guideTitle="How to convert HTML to SRT"
      guideSteps={[
        { step: 'Upload or paste your HTML file', desc: 'Click "Choose file" to upload an .html export, or paste the HTML/text content directly into the box.' },
        { step: 'Conversion happens automatically', desc: 'The tool detects the timing format (data attributes, begin/end attributes, or bracketed timestamps) and builds numbered SRT cues.' },
        { step: 'Download your SRT file', desc: 'Hit "Download .srt" to save the converted file, ready for your video editor or platform of choice.' },
      ]}
      faqs={[
        { q: 'What HTML caption formats does this support?', a: 'Elements with data-start/data-end (or data-start-ms/data-end-ms) attributes, elements with begin/end attributes, and plain text with bracketed timestamps like [00:00:12] at the start of each caption.' },
        { q: 'My file didn\'t convert — why?', a: 'This tool needs a recognizable timing marker on each caption block. If your HTML export uses a custom structure, check whether the source tool can export VTT or SRT directly instead.' },
        { q: 'Does the converted SRT work in Premiere or CapCut?', a: 'Yes. The output is standard SRT with sequential numbering and HH:MM:SS,mmm timestamps, importable in any major video editor.' },
        { q: 'Does my file get uploaded anywhere?', a: 'No. All parsing happens locally in your browser using JavaScript. Your file never leaves your device.' },
        { q: 'Is there a file size limit?', a: 'No server-side limit — conversion runs entirely in your browser.' },
      ]}
      relatedTools={[
        { label: 'VTT to SRT Converter', path: '/tools/vtt-to-srt', desc: 'Convert WebVTT → SRT format' },
        { label: 'TTML to SRT Converter', path: '/tools/ttml-to-srt', desc: 'Convert TTML/DFXP → SRT format' },
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check for errors before converting' },
        { label: 'Merge SRT Files', path: '/tools/merge-srt-files', desc: 'Combine two subtitle tracks into one' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT from video with AI' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 70+ languages' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-300 dark:hover:border-blue-500 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".html,.htm,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}.html` : 'Click to upload .html file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste HTML content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`<p data-start="1.0" data-end="4.0">Hello world</p>\n<p data-start="5.0" data-end="8.0">This is a caption</p>\n\nor:\n[00:00:01] Hello world\n[00:00:05] This is a caption`}
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        <button onClick={() => convert()} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">
          Convert HTML → SRT
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {output && (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SRT Output</span>
                <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Copy</button>
              </div>
              <pre className="text-xs text-gray-800 dark:text-gray-200 p-4 font-mono overflow-auto max-h-48 whitespace-pre-wrap">{output.slice(0, 600)}{output.length > 600 ? '\n…' : ''}</pre>
            </div>
            <button onClick={handleDownload} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors">
              Download .srt file
            </button>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
