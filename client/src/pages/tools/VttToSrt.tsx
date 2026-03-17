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
      description="Convert WebVTT (.vtt) subtitle files to SubRip (.srt) format instantly in your browser. No upload, no account, no file size limit."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What is WebVTT (VTT)?',
          body: 'WebVTT (Web Video Text Tracks) is the W3C standard for web-based subtitles and captions. It\'s required by the HTML5 <track> element and used by YouTube, Vimeo, and virtually every browser-based player. VTT files start with a WEBVTT header line and use dot notation for milliseconds: 00:01:23.456. The format also supports CSS positioning cues, speaker labels (through <v> tags), and metadata tracks — features that SRT does not have.',
        },
        {
          heading: 'Why convert VTT back to SRT?',
          body: 'While VTT is the web standard, most offline video editing workflows require SRT. Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro, Avid Media Composer, and Capcut all import SRT natively. Broadcast quality-control (QC) tools commonly parse SRT. Translation platforms like Smartling, Transifex, and most human translation agencies accept SRT. If you downloaded subtitles from a web platform (YouTube, Vimeo, Wistia) and need to edit them in a desktop editor, converting VTT → SRT is the first step.',
        },
        {
          heading: 'What is lost when converting VTT to SRT?',
          body: 'Basic text and timing is preserved losslessly. However, VTT-specific features — CSS positioning cues (line:, position:), speaker voice tags (<v Speaker>), chapter markers, and metadata tracks — are stripped because SRT does not support them. For typical subtitle files containing only dialogue timing and text, nothing meaningful is lost.',
        },
      ]}
      guideTitle="How to convert VTT to SRT"
      guideSteps={[
        { step: 'Upload or paste your VTT file', desc: 'Click "Choose file" to upload a .vtt file, or paste the WebVTT content directly into the text box.' },
        { step: 'Conversion happens automatically', desc: 'The tool strips the WEBVTT header, converts dot timestamps to comma format, and adds sequential cue index numbers.' },
        { step: 'Download your SRT file', desc: 'Hit "Download .srt" to save the converted file, ready for video editing software, translation platforms, or broadcast QC tools.' },
      ]}
      faqs={[
        { q: 'Why convert VTT to SRT?', a: 'Most offline video editors (Adobe Premiere, DaVinci Resolve, Final Cut Pro) require SRT. VTT is for web players; SRT is for editors and broadcast workflows.' },
        { q: 'Will I lose any styling from my VTT file?', a: 'VTT supports CSS-style tags and positioning cues that SRT does not. Basic text and timing is preserved, but <v Speaker> tags, positioning directives (line:, position:), and CSS classes will be stripped.' },
        { q: 'What is WebVTT used for?', a: 'WebVTT is the standard subtitle format for HTML5 <video> elements. It\'s used by YouTube, Vimeo, and most browser-based players. The W3C specification requires VTT for native browser subtitle tracks.' },
        { q: 'Does the converted SRT work in Adobe Premiere?', a: 'Yes. Adobe Premiere Pro imports SRT files via the Graphics > Import Captions from File menu. The converted file will import correctly with all timing and text preserved.' },
        { q: 'Can I convert multiple VTT files at once?', a: 'This free tool processes one file at a time. For bulk conversion across dozens of files, use our Batch Processing tool which handles multiple video files in parallel.' },
        { q: 'Does my file get uploaded anywhere?', a: 'No. All processing happens locally in your browser using JavaScript. Your subtitle file never leaves your device, regardless of file size.' },
        { q: 'What if my VTT has speaker labels like <v John>?', a: 'Speaker voice tags are stripped during conversion. The spoken text within those tags is preserved, but the speaker attribution itself is removed since SRT has no equivalent syntax.' },
        { q: 'Is there a file size limit?', a: 'No. Since conversion runs entirely in your browser, there is no server-side size restriction. Very large files (thousands of cues) may take a second to process but will complete successfully.' },
      ]}
      relatedTools={[
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT → WebVTT format' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'AI auto-correct timing & overlaps in SRT/VTT' },
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check for errors before converting' },
        { label: 'Merge SRT Files', path: '/tools/merge-srt-files', desc: 'Combine two subtitle tracks into one' },
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
            <button
              onClick={() => { const blob = new Blob([output], { type: 'text/plain' }); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = `${fileName || 'subtitles'}.srt`; a.click(); URL.revokeObjectURL(u) }}
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
