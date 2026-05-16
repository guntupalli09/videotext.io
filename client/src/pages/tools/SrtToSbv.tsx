import { useState, useRef } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import { parseSrt, cuesToSbv, downloadText } from '../../lib/subtitleUtils'
import { exportFileStem, joinExportFilename } from '../../lib/exportFileNames'

export default function SrtToSbv() {
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
      setOutput(cuesToSbv(cues))
    } catch {
      setError('Could not parse the SRT file. Please check the format.')
    }
  }

  function handleDownload() {
    downloadText(output, joinExportFilename(exportFileStem(fileName, 'subtitles'), 'converted_srt_to_sbv', '.sbv'))
  }

  return (
    <FreeToolLayout
      title="SRT to SBV Converter — Free Online"
      description="Convert SRT subtitle files to YouTube SBV format instantly. Paste your SRT or upload a file — no account required, nothing uploaded to any server."
      hubLink={{ label: 'Free Subtitle Tools', path: '/subtitle-tools' }}
      contentSections={[
        {
          heading: 'When do you need SRT to SBV?',
          body: 'SBV is the native subtitle format used by YouTube\'s caption system. If you have an SRT file and want to upload it directly to YouTube Studio as a caption track, YouTube accepts SRT — but if you need to edit the captions in YouTube\'s native format, or if you\'re working with tools that specifically output SBV, you may need to convert back. The most common use case is round-trip editing: download SBV from YouTube, convert to SRT to edit in a subtitle editor or translate with an AI tool, then convert back to SBV to upload the edited version.',
        },
        {
          heading: 'SBV vs SRT: key differences',
          body: 'SRT uses commas to separate milliseconds (00:00:01,000) and numbers each subtitle block (1, 2, 3…). SBV uses dots (0:00:01.000) and omits block numbers entirely. YouTube\'s upload system accepts both SRT and SBV, but SBV is YouTube\'s own format. The content — subtitle text and timing — is identical between the two formats.',
        },
      ]}
      guideTitle="How to convert SRT to SBV"
      guideSteps={[
        { step: 'Upload or paste your SRT file', desc: 'Click the upload zone to select a .srt file, or paste the raw SRT content into the text box.' },
        { step: 'Click Convert SRT → SBV', desc: 'The tool parses all SRT cues, strips block numbers, and converts timestamps to YouTube\'s SBV format (dots, no leading zero on hours).' },
        { step: 'Download or copy the SBV output', desc: 'Click "Download .sbv file" to save the result, ready to upload to YouTube Studio or any SBV-compatible tool.' },
      ]}
      faqs={[
        { q: 'Does YouTube accept SRT or SBV for caption upload?', a: 'YouTube accepts both SRT and SBV (as well as VTT, SCC, and TTML) for caption uploads in YouTube Studio. You do not necessarily need to convert SRT to SBV before uploading — SRT will work. SBV is the format YouTube uses when exporting captions.' },
        { q: 'Is the conversion lossless?', a: 'Yes. The tool only changes the timestamp format and removes block numbers. All subtitle text and timing is preserved exactly.' },
        { q: 'Can I convert VTT to SBV?', a: 'This tool converts SRT to SBV. To convert VTT to SBV: first use our VTT to SRT converter, then convert the resulting SRT to SBV here.' },
        { q: 'Does my file get uploaded to any server?', a: 'No. The entire conversion runs in JavaScript in your browser. Your file never leaves your device.' },
        { q: 'Will the converted SBV work in YouTube Studio?', a: 'Yes. The output uses YouTube\'s native SBV format. Upload via YouTube Studio → Subtitles → Add Language → Upload File.' },
      ]}
      relatedTools={[
        { label: 'SBV to SRT Converter', path: '/tools/sbv-to-srt', desc: 'Convert YouTube SBV back to standard SRT' },
        { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT to WebVTT for web players' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate SRT/VTT from any video with AI' },
        { label: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT to 70+ languages' },
        { label: 'YouTube Transcript Generator', path: '/youtube-transcript-generator', desc: 'Get full transcript from any YouTube video' },
        { label: 'Fix Subtitles', path: '/fix-subtitles', desc: 'Auto-correct timing, overlaps & long lines' },
      ]}
    >
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-300 dark:hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".srt,.txt" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName ? `Loaded: ${fileName}.srt` : 'Click to upload .srt file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or paste SRT below</p>
        </div>

        <textarea
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`1\n00:00:01,000 --> 00:00:04,000\nHello world\n\n2\n00:00:05,000 --> 00:00:08,000\nThis is a subtitle`}
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput('') }}
        />

        <button
          onClick={() => convert()}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          Convert SRT → SBV
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {output && (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SBV Output</span>
                <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Copy</button>
              </div>
              <pre className="text-xs text-gray-800 dark:text-gray-200 p-4 font-mono overflow-auto max-h-48 whitespace-pre-wrap">{output.slice(0, 600)}{output.length > 600 ? '\n…' : ''}</pre>
            </div>
            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
            >
              Download .sbv file
            </button>
          </div>
        )}
      </div>
    </FreeToolLayout>
  )
}
