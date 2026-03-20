import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import FreeToolResultGate from '../../components/FreeToolResultGate'
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
      description="Convert SRT subtitle files to WebVTT (VTT) format instantly. Paste your SRT or upload a file — no account required, nothing uploaded to any server."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What is an SRT file?',
          body: 'SRT (SubRip Text) is the most widely used subtitle format in the world. Originally developed for the SubRip software, it stores subtitle cues as numbered blocks, each containing a start/end timestamp pair and one or more lines of text. Timestamps use a comma to separate seconds from milliseconds: 00:01:23,456. SRT files are plain text, making them easy to open in any text editor, and they are natively supported by VLC, most video editing software, and streaming services including Netflix, YouTube, and Amazon Prime.',
        },
        {
          heading: 'What is a VTT (WebVTT) file?',
          body: 'WebVTT (Web Video Text Tracks) is the W3C standard subtitle format for the web. It is the format required by the HTML5 <track> element, which allows browsers to display native subtitles on <video> elements without JavaScript. VTT is structurally identical to SRT but uses a dot to separate seconds from milliseconds (00:01:23.456) and begins with a required WEBVTT header line. VTT also supports optional features like CSS styling, positioning cues, and metadata tracks that SRT does not.',
        },
        {
          heading: 'When should you convert SRT to VTT?',
          body: 'Convert SRT to VTT when: (1) You are embedding video on a website and need to use the HTML5 <track> element for accessibility compliance. (2) Your video hosting platform — Vimeo, Wistia, Brightcove, or Kaltura — requires VTT format. (3) You are building a web app or CMS that serves subtitles from a CDN. YouTube accepts both formats, but most web players default to VTT. If you are only working in a desktop video editor, keep the SRT file — no conversion is needed.',
        },
      ]}
      guideTitle="How to convert SRT to VTT"
      guideSteps={[
        { step: 'Upload or paste your SRT file', desc: 'Click the upload zone to select a .srt file, or paste the raw SRT content into the text box below it.' },
        { step: 'Click Convert SRT → VTT', desc: 'The tool converts every timestamp separator (comma → dot) and prepends the required WEBVTT header. All cue text and timing is preserved exactly.' },
        { step: 'Download or copy the VTT output', desc: 'Click "Download .vtt file" to save the result, or use the Copy button to paste directly into your CMS, CDN config, or code.' },
      ]}
      faqs={[
        { q: 'What is the difference between SRT and VTT?', a: 'SRT uses comma-separated milliseconds (00:00:01,000) and is the standard for video editors and offline tools. VTT uses dot-separated milliseconds (00:00:01.000), adds a WEBVTT header, and is required for HTML5 web players. Functionally they store the same information — timing and text.' },
        { q: 'Is this conversion lossless?', a: 'Yes. The tool only changes the timestamp separator (comma → dot) and adds the WEBVTT header line. All subtitle text, line breaks, and timing is preserved exactly.' },
        { q: 'Which video players require VTT format?', a: 'HTML5 <video> with <track>, Vimeo, Wistia, Brightcove, JW Player, Kaltura, and most web-based players require VTT. Desktop players (VLC, Plex, Kodi) prefer SRT. YouTube accepts both.' },
        { q: 'Can I convert VTT back to SRT?', a: 'Yes — use our free VTT to SRT converter, which does the reverse: strips the WEBVTT header and swaps dots back to commas.' },
        { q: 'Does VTT support styling that SRT doesn\'t?', a: 'Yes. VTT supports CSS class cues (<c.classname>), positioning (line:, position: align:), and ::cue CSS rules for custom styling. SRT supports only basic HTML-like tags (<b>, <i>, <u>) which most players strip anyway.' },
        { q: 'Will the converted VTT work on YouTube?', a: 'Yes. YouTube accepts both SRT and VTT uploads in the subtitles editor. The converted VTT will import correctly with all timing intact.' },
        { q: 'Does my subtitle file get uploaded to VideoText servers?', a: 'No. The entire conversion runs in JavaScript in your browser. Your file never leaves your device. This is also why there\'s no file size limit.' },
        { q: 'What if my SRT has HTML formatting like <b> or <i>?', a: 'HTML tags are preserved in the output VTT. VTT officially supports <b>, <i>, <u>, and <ruby> tags, so formatted text will carry through correctly to players that support it.' },
      ]}
      relatedTools={[
        { label: 'VTT to SRT Converter', path: '/tools/vtt-to-srt', desc: 'Convert WebVTT back to SubRip format' },
        { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check your SRT/VTT for errors before converting' },
        { label: 'Merge SRT Files', path: '/tools/merge-srt-files', desc: 'Combine two subtitle files into one' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT from any video with AI' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 50+ languages' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'Auto-correct timing, overlaps & long lines' },
      ]}
    >
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 dark:hover:border-violet-500 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".srt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}.srt` : 'Click to upload .srt file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste SRT below</p>
        </div>

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
          <FreeToolResultGate title="Your VTT file is ready">
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
          </FreeToolResultGate>
        )}
      </div>
    </FreeToolLayout>
  )
}
