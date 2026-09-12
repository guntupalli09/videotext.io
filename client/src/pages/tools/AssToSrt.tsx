import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseAss, cuesToSrt, downloadText } from '../../lib/subtitleUtils'
import { exportFileStem, joinExportFilename } from '../../lib/exportFileNames'

export default function AssToSrt() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.(ass|ssa)$/i, ''))
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
    if (!src.trim()) { setError('Paste or upload an ASS/SSA file first.'); return }
    if (!src.includes('[Events]') && !src.includes('Dialogue:')) {
      setError('This does not look like an ASS/SSA file. Make sure it contains [Events] and Dialogue: lines.')
      return
    }
    try {
      const cues = parseAss(src)
      if (cues.length === 0) { setError('No Dialogue cues found. The file may use a non-standard format.'); return }
      setOutput(cuesToSrt(cues))
    } catch {
      setError('Could not parse the ASS/SSA file. Please check the format.')
    }
  }

  function handleDownload() {
    downloadText(output, joinExportFilename(exportFileStem(fileName, 'subtitles'), 'converted_ass_to_srt', '.srt'))
  }

  return (
    <FreeToolLayout
      title="ASS / SSA to SRT Converter — Free Online"
      description="Convert ASS or SSA subtitle files to SRT format. Strips styling tags, preserves all dialogue text and timing. No upload, runs in your browser."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What are ASS and SSA subtitle files?',
          body: 'ASS (Advanced SubStation Alpha) and its predecessor SSA (SubStation Alpha) are feature-rich subtitle formats developed for anime fansubbing. They support complex typesetting, per-cue styling, karaoke effects, motion tags, and custom fonts. ASS is the most common format for Blu-ray rips, anime torrents, and MKV containers — tools like Aegisub, MKVToolNix, and mpv all use ASS natively. The downside is that most video editors and online platforms do not support ASS. To use these subtitles in Premiere Pro, DaVinci Resolve, YouTube, or Netflix, you need to convert to SRT or VTT first.',
        },
        {
          heading: 'What happens to ASS styling during conversion?',
          body: 'SRT supports only basic formatting tags (<b>, <i>, <u>) and most players strip even those. This converter removes all ASS override tags — position codes like {\\an8}, colour tags like {\\c&H...&}, font size tags, and motion paths. The dialogue text itself is preserved exactly. Line break codes (\\N, \\n) are converted to real newlines in the SRT output. If your ASS file uses animated karaoke syllables or scene typesetting that is visually critical, those effects cannot be preserved in plain SRT.',
        },
        {
          heading: 'ASS vs SSA — what is the difference?',
          body: 'SSA (SubStation Alpha v4) is the older format, and ASS (Advanced SubStation Alpha v4+) is the extended version with additional features like per-line style overrides and vector clip masks. Both use the same basic structure ([Script Info], [V4 Styles], [Events]) and both are handled by this converter. You can upload files with either .ass or .ssa extension.',
        },
      ]}
      guideTitle="How to convert ASS/SSA to SRT"
      guideSteps={[
        { step: 'Upload or paste your ASS/SSA file', desc: 'Click the upload zone to select a .ass or .ssa file, or paste the raw content into the text box.' },
        { step: 'Click Convert ASS → SRT', desc: 'The tool parses the [Events] section, extracts all Dialogue lines, strips styling tags, and outputs standard numbered SRT blocks.' },
        { step: 'Download the SRT file', desc: 'Click "Download .srt file". The output is compatible with all video editors, subtitle tools, and streaming platforms.' },
      ]}
      faqs={[
        { q: 'Can I convert SSA files as well as ASS?', a: 'Yes. Both .ass and .ssa files use the same basic structure. Upload either format and the converter will handle it correctly.' },
        { q: 'Will styled text (bold, italic) be preserved?', a: 'No. ASS uses its own tag system ({\\b1} for bold, {\\i1} for italic) which is different from SRT\'s HTML-like tags. The converter strips all ASS styling tags. If you need formatting in the SRT, you would need to manually add <b> and <i> tags after conversion.' },
        { q: 'What happens to signs and typeset subtitles?', a: 'Typeset signs (overlaid text positioned at specific locations on screen) will be included in the SRT output as regular subtitle cues with their text content preserved, but the positioning and styling will be lost. All text from Dialogue lines is extracted regardless of style name.' },
        { q: 'Can I extract subtitles from an MKV file?', a: 'This tool converts ASS/SSA files to SRT. To extract ASS tracks from an MKV container first, use MKVToolNix (free, open-source) to demux the subtitle track to a standalone .ass file, then convert it here.' },
        { q: 'Does my file get uploaded to any server?', a: 'No. The entire conversion runs in JavaScript in your browser. Your file never leaves your device.' },
        { q: 'Why are some cues missing in the output?', a: 'This converter only extracts "Dialogue" event lines. Comment lines, signs marked as non-dialogue styles, and any lines in the [V4+ Styles] section are not included. If a Dialogue line has an empty text field after stripping tags, it is also skipped.' },
      ]}
      relatedTools={[
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT to WebVTT for web players' },
        { label: 'TTML to SRT Converter', path: '/tools/ttml-to-srt', desc: 'Convert Netflix/broadcast TTML to SRT' },
        { label: 'SBV to SRT Converter', path: '/tools/sbv-to-srt', desc: 'Convert YouTube SBV captions to SRT' },
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check your converted SRT for errors' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT from any video with AI' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 70+ languages' },
      ]}
    >
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-300 dark:hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".ass,.ssa,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}` : 'Click to upload .ass or .ssa file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste ASS/SSA content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello world\nDialogue: 0,0:00:04.00,0:00:06.00,Default,,0,0,0,,{\\i1}Styled line{\\i0}`}
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        <button
          onClick={() => convert()}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          Convert ASS → SRT
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
