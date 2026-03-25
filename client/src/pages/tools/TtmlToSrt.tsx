import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseTtml, cuesToSrt, downloadText } from '../../lib/subtitleUtils'

export default function TtmlToSrt() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.(ttml|xml|dfxp)$/i, ''))
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
    if (!src.trim()) { setError('Paste or upload a TTML/DFXP file first.'); return }
    if (!src.includes('<tt') && !src.includes('<body') && !src.includes('<p ') && !src.includes('<p>')) {
      setError('This does not look like a TTML file. Valid TTML files contain XML with <tt>, <body>, and <p> elements.')
      return
    }
    try {
      const cues = parseTtml(src)
      if (cues.length === 0) { setError('No subtitle cues found. The TTML file may not contain <p begin="…"> elements.'); return }
      setOutput(cuesToSrt(cues))
    } catch {
      setError('Could not parse the TTML file. Please check the XML is well-formed.')
    }
  }

  function handleDownload() {
    downloadText(output, `${fileName || 'subtitles'}.srt`)
  }

  return (
    <FreeToolLayout
      title="TTML to SRT Converter — Free Online"
      description="Convert TTML, DFXP, or EBU-TT subtitle files to SRT format instantly. Used for Netflix, broadcast, and enterprise video. Runs entirely in your browser."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What is TTML (Timed Text Markup Language)?',
          body: 'TTML (W3C Timed Text Markup Language) is an XML-based subtitle format used in professional broadcast and streaming workflows. Netflix uses TTML for its internal caption delivery (often called IMSC or EBU-TT-D). DFXP (Distribution Format Exchange Profile) is an earlier TTML dialect used by some enterprise video platforms. EBU-TT is the European Broadcasting Union\'s TTML profile, widely used in broadcast TV across Europe. All three share the same core XML structure: a <tt> root element, a <body> section, and <p begin="…" end="…"> elements for each subtitle cue.',
        },
        {
          heading: 'Why convert TTML to SRT?',
          body: 'TTML is ideal for delivery but difficult to work with in everyday tools. Video editors (Premiere Pro, DaVinci Resolve), most subtitle editors, YouTube, Vimeo, and the majority of video tools and platforms do not accept TTML directly. SRT is the universal format they all support. Converting TTML to SRT gives you a file you can immediately edit, translate, or upload anywhere. This converter handles TTML, DFXP, and EBU-TT files — all are parsed using the same XML structure.',
        },
        {
          heading: 'What gets preserved in the conversion?',
          body: 'The converter preserves subtitle text content and timing (begin/end timestamps) exactly. TTML-specific features — custom fonts, colours, positioning, region definitions, and style attributes — are stripped because SRT does not support them. <br/> elements in the TTML are converted to line breaks in the SRT output. HTML entity references (&amp;, &lt;, etc.) are decoded to their actual characters.',
        },
      ]}
      guideTitle="How to convert TTML to SRT"
      guideSteps={[
        { step: 'Upload or paste your TTML file', desc: 'Click the upload zone to select a .ttml, .dfxp, or .xml file, or paste the raw XML content into the text box.' },
        { step: 'Click Convert TTML → SRT', desc: 'The tool parses the XML, extracts all <p> elements with begin/end attributes, and outputs numbered SRT blocks with standard timestamps.' },
        { step: 'Download the SRT file', desc: 'Click "Download .srt file". The output is compatible with Premiere Pro, DaVinci, YouTube, Vimeo, and all major subtitle tools.' },
      ]}
      faqs={[
        { q: 'What TTML variants does this converter support?', a: 'The converter supports standard W3C TTML, DFXP (Distribution Format Exchange Profile), EBU-TT, EBU-TT-D, and IMSC 1.0/1.1. All are XML-based and use <p begin="…" end="…"> elements for cues.' },
        { q: 'What timestamp formats does TTML support?', a: 'TTML supports several timestamp formats: HH:MM:SS.mmm (clock time, most common), offset expressions like "1.5s" or "1500ms", and SMPTE timecode with frame counts. This converter handles all common formats.' },
        { q: 'Is Netflix TTML supported?', a: 'Netflix uses IMSC (a TTML profile) for caption delivery. IMSC files are valid TTML and will parse correctly. Note that Netflix IMSC files often use region-based positioning — the text content is extracted but position/region data is not preserved in SRT.' },
        { q: 'Can I convert DFXP files?', a: 'Yes. DFXP is a TTML dialect. Change the file extension to .xml or .ttml if the uploader doesn\'t accept .dfxp, or paste the content directly.' },
        { q: 'Does my file get uploaded to any server?', a: 'No. Parsing is done entirely in your browser using the built-in DOMParser API. Your file never leaves your device.' },
        { q: 'Will the SRT work for Netflix or YouTube upload?', a: 'SRT files converted from TTML will work for YouTube subtitle uploads. Netflix does not accept external SRT uploads from content creators — they use their own delivery pipeline. For standard platform uploads (YouTube, Vimeo, Wistia), the converted SRT is fully compatible.' },
      ]}
      relatedTools={[
        { label: 'ASS to SRT Converter', path: '/tools/ass-to-srt', desc: 'Convert ASS/SSA anime subtitles to SRT' },
        { label: 'SBV to SRT Converter', path: '/tools/sbv-to-srt', desc: 'Convert YouTube SBV captions to SRT' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT to WebVTT for web players' },
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check your converted SRT for errors' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT from any video with AI' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 70+ languages' },
      ]}
    >
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 dark:hover:border-violet-500 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".ttml,.dfxp,.xml,.tt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}` : 'Click to upload .ttml, .dfxp, or .xml file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste TTML/XML content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder={`<?xml version="1.0"?>\n<tt xmlns="http://www.w3.org/ns/ttml">\n  <body><div>\n    <p begin="00:00:01.000" end="00:00:03.000">Hello world</p>\n    <p begin="00:00:04.000" end="00:00:06.000">Second subtitle</p>\n  </div></body>\n</tt>`}
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        <button
          onClick={() => convert()}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
        >
          Convert TTML → SRT
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
            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
            >
              Download .srt file
            </button>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
