import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSbv, cuesToSrt, downloadText } from '../../lib/subtitleUtils'

export default function SbvToSrt() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.sbv$/i, ''))
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
    if (!src.trim()) { setError('Paste or upload an SBV file first.'); return }
    try {
      const cues = parseSbv(src)
      if (cues.length === 0) { setError('No valid subtitle cues found. Make sure this is a valid SBV file from YouTube.'); return }
      setOutput(cuesToSrt(cues))
    } catch {
      setError('Could not parse the SBV file. Please check the format.')
    }
  }

  function handleDownload() {
    downloadText(output, `${fileName || 'subtitles'}.srt`)
  }

  return (
    <FreeToolLayout
      title="SBV to SRT Converter — Free Online"
      description="Convert YouTube SBV subtitle files to SRT format instantly. Paste your SBV or upload a file — no account required, nothing uploaded to any server."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'What is an SBV file?',
          body: 'SBV (SubViewer) is the native subtitle format used by YouTube. When you download captions directly from YouTube Studio or via the YouTube Data API, they arrive as .sbv files. SBV is a plain text format similar to SRT, but with two key differences: it uses dots instead of commas to separate milliseconds (0:00:01.000 instead of 00:00:01,000) and it omits the sequential block numbers before each cue. Most video editors and subtitle tools do not support SBV natively, which is why converting to SRT is almost always the first step after downloading YouTube captions.',
        },
        {
          heading: 'Why convert SBV to SRT?',
          body: 'SRT (SubRip Text) is the universal subtitle standard supported by virtually every video editor (Premiere Pro, DaVinci Resolve, Final Cut Pro), player (VLC, Plex), and platform (Netflix, Vimeo, Wistia). If you have downloaded subtitles from YouTube and want to edit them, import them into a video editor, translate them, or upload them to another platform, you will need to convert SBV to SRT first. This tool does that conversion entirely in your browser — nothing is uploaded to any server.',
        },
        {
          heading: 'How the conversion works',
          body: 'The converter parses each SBV timestamp block, normalises the timestamp format (dot → comma, zero-pads the hour), assigns sequential block numbers, and outputs standard SRT. The subtitle text and timing are preserved exactly — no content is altered. The conversion is lossless: converting back from SRT to SBV would reproduce the original content faithfully.',
        },
      ]}
      guideTitle="How to convert SBV to SRT"
      guideSteps={[
        { step: 'Upload or paste your SBV file', desc: 'Click the upload zone to select a .sbv file downloaded from YouTube, or paste the raw SBV content into the text box.' },
        { step: 'Click Convert SBV → SRT', desc: 'The tool parses every timestamp block, adds sequential block numbers, and converts the timestamp format to standard SRT.' },
        { step: 'Download the SRT file', desc: 'Click "Download .srt file" to save the result. The SRT file is ready to import into any video editor, subtitle tool, or upload to any platform.' },
      ]}
      faqs={[
        { q: 'Where do SBV files come from?', a: 'SBV files come from YouTube. When you download auto-generated or manually uploaded captions from YouTube Studio (Subtitles section → download), YouTube exports them as .sbv files. The YouTube Data API also returns captions in SBV format.' },
        { q: 'What is the difference between SBV and SRT?', a: 'Both formats store subtitle text with start/end timestamps. SBV uses dots for milliseconds (0:00:01.000) and has no block numbers. SRT uses commas (00:00:01,000) and numbers each block sequentially. SRT is the universal standard; SBV is YouTube-specific.' },
        { q: 'Is the conversion lossless?', a: 'Yes. The tool only changes the timestamp format and adds block numbers. All subtitle text and timing is preserved exactly. No content is modified or lost.' },
        { q: 'Can I convert SRT back to SBV?', a: 'Yes — use our SRT to SBV converter, which does the reverse: strips block numbers and converts the timestamp format back to YouTube\'s SBV style.' },
        { q: 'Does my file get uploaded to any server?', a: 'No. The entire conversion runs in JavaScript in your browser. Your SBV file never leaves your device.' },
        { q: 'Will the converted SRT work in Premiere Pro and DaVinci Resolve?', a: 'Yes. The output is standard SRT format, compatible with Premiere Pro, DaVinci Resolve, Final Cut Pro, Avid, and all major video editors. Import via File → Import (Premiere) or Timeline → Import Subtitle (DaVinci).' },
        { q: 'Can I convert multi-language YouTube captions?', a: 'Yes. Download each language as a separate SBV file from YouTube Studio and convert each one separately. The subtitle text encoding (UTF-8) is preserved, so non-Latin scripts (Chinese, Arabic, Hindi, etc.) convert correctly.' },
      ]}
      relatedTools={[
        { label: 'SRT to SBV Converter', path: '/tools/srt-to-sbv', desc: 'Convert SRT back to YouTube SBV format' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT to WebVTT for web players' },
        { label: 'VTT to SRT Converter', path: '/tools/vtt-to-srt', desc: 'Convert WebVTT back to SubRip format' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT from any video with AI' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 70+ languages' },
        { label: 'YouTube Transcript Generator', path: '/youtube-transcript-generator', desc: 'Get full transcript from any YouTube video' },
      ]}
    >
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-violet-300 dark:hover:border-violet-500 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".sbv,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}.sbv` : 'Click to upload .sbv file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste SBV content below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder={`0:00:01.000,0:00:04.000\nHello world\n\n0:00:05.000,0:00:08.000\nThis is a subtitle`}
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        <button
          onClick={() => convert()}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
        >
          Convert SBV → SRT
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
