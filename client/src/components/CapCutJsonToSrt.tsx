import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { parseCapCutJson } from '../lib/capcutJsonParser'
import { cuesToSrt, downloadText } from '../lib/subtitleUtils'

export default function CapCutJsonToSrt() {
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [cueCount, setCueCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  function convert(src = text) {
    setError('')
    setOutput('')
    setCueCount(0)
    if (!src.trim()) {
      setError('Paste CapCut caption JSON or upload a .json file.')
      return
    }
    try {
      const cues = parseCapCutJson(src)
      setCueCount(cues.length)
      setOutput(cuesToSrt(cues))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse JSON. Check the file is valid CapCut caption export JSON.')
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setText(content)
      convert(content)
    }
    reader.readAsText(file)
  }

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Already have CapCut JSON?</p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">CapCut JSON → SRT (free, in browser)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
          If you exported caption JSON from CapCut or a third-party extractor, convert it to SRT here — nothing uploads. No JSON? Export MP4 without burned captions and{' '}
          <Link to="/video-to-subtitles" className="text-blue-600 hover:underline">generate SRT from the video</Link> instead.
        </p>

        <div
          className="mt-4 border-2 border-dashed border-amber-200 dark:border-amber-700 rounded-lg p-4 text-center cursor-pointer hover:border-amber-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload CapCut .json</p>
          <p className="text-xs text-gray-400 mt-1">or paste JSON below</p>
        </div>

        <textarea
          className="mt-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono p-3 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder='Paste CapCut caption JSON…'
          value={text}
          onChange={(e) => { setText(e.target.value); setOutput(''); setError('') }}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => convert()}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
          >
            Convert to SRT
          </button>
          {output && (
            <button
              type="button"
              onClick={() => downloadText(output, 'capcut-captions.srt')}
              className="px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-200 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              Download SRT
            </button>
          )}
        </div>

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {output && (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
            {cueCount} cue{cueCount === 1 ? '' : 's'} ready.{' '}
            <Link to="/subtitle-grammar-fixer" className="underline">Run QC fix</Link>
            {' · '}
            <Link to="/translate-subtitles" className="underline">Translate</Link>
          </p>
        )}
      </div>
    </section>
  )
}
