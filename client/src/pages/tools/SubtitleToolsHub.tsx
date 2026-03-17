import { Link } from 'react-router-dom'

const SUBTITLE_TOOLS = [
  {
    category: 'Subtitle Converters',
    tools: [
      { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT subtitles to WebVTT format for web video players' },
      { label: 'VTT to SRT Converter', path: '/tools/vtt-to-srt', desc: 'Convert WebVTT files back to SRT for video editing and players' },
    ],
  },
  {
    category: 'Subtitle Timing Tools',
    tools: [
      { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Delay or advance all subtitle timestamps to fix sync issues' },
      { label: 'Merge SRT Files', path: '/tools/merge-srt-files', desc: 'Combine two subtitle files with automatic offset calculation' },
    ],
  },
  {
    category: 'Subtitle Analysis & Validation',
    tools: [
      { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check SRT/VTT files for timing gaps, overlaps, and format errors' },
      { label: 'Subtitle Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Check CPS against Netflix, BBC, and EBU broadcast standards' },
      { label: 'Subtitle Character Limit Checker', path: '/tools/subtitle-character-checker', desc: 'Find subtitle lines that exceed Netflix and platform character limits' },
    ],
  },
  {
    category: 'Subtitle Text Tools',
    tools: [
      { label: 'SRT to Plain Text', path: '/tools/srt-to-text', desc: 'Extract readable transcript text from SRT subtitle files' },
      { label: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter', desc: 'Count words, characters, cues, and speaking rate from subtitles' },
    ],
  },
]

const STANDARDS = [
  { platform: 'Netflix', cps: '20 (EN)', chars: '42', lines: '2', notes: '17 CPS for most languages' },
  { platform: 'BBC iPlayer', cps: '17', chars: '37', lines: '2', notes: 'EBU R37 compliant' },
  { platform: 'Amazon Prime', cps: '17', chars: '42', lines: '2', notes: 'Similar to Netflix guidelines' },
  { platform: 'YouTube', cps: 'No limit', chars: 'No limit', lines: '3', notes: 'Auto-captions may wrap' },
  { platform: 'Apple TV+', cps: '17', chars: '40', lines: '2', notes: 'Follows EBU STL spec' },
  { platform: 'Disney+', cps: '17', chars: '42', lines: '2', notes: 'IMSC-1 compatible required' },
]

export default function SubtitleToolsHub() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-800 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-200 text-sm font-semibold uppercase tracking-widest mb-3">Free Online Tools</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Free Subtitle Tools for Creators</h1>
          <p className="text-lg text-violet-100 max-w-2xl mx-auto">SRT, VTT, timing, validation, and analysis — all browser-based, no account needed, no upload limits.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">

        {/* Tool Grid */}
        {SUBTITLE_TOOLS.map((group) => (
          <section key={group.category}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{group.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.tools.map((tool) => (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="block rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-400 hover:shadow-sm transition-all group"
                >
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400 text-sm">{tool.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{tool.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* What are subtitle tools */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">What are subtitle tools used for?</h2>
          <div className="prose prose-gray dark:prose-invert max-w-none text-sm leading-relaxed space-y-3">
            <p>Subtitle tools handle the technical work of creating, editing, converting, and validating subtitle files. Most video creators need them at some point — whether that's converting an SRT file from a transcription service into VTT format for a web player, checking that subtitle timing is in sync with the video, or validating that files meet broadcast platform requirements before delivery.</p>
            <p>The two most common subtitle formats are SRT (SubRip Text) and VTT (WebVTT). SRT was created in the late 1990s and remains the most widely supported format across media players, editing software, and platforms. VTT is the web standard specified by the W3C and is required for HTML5 video players, YouTube's native captions API, and modern streaming web interfaces. Most subtitle workflows involve converting between these two formats at least once.</p>
            <p>Timing issues are the most common subtitle problem. If the original transcript was created from a different video cut, or if the audio was shifted during editing, subtitles can appear seconds early or late. A timing shift tool lets you add or subtract a fixed offset from every cue to bring them back into sync. For more complex sync issues where different parts of the video need different corrections, you may need to re-time manually in a dedicated subtitle editor.</p>
          </div>
        </section>

        {/* Standards Table */}
        <section>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-4">Subtitle standards by streaming platform</h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Platform', 'Max CPS', 'Max chars/line', 'Max lines', 'Notes'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {STANDARDS.map((row) => (
                  <tr key={row.platform}>
                    <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{row.platform}</td>
                    <td className="px-4 py-2.5 font-mono text-violet-700 dark:text-violet-400">{row.cps}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">{row.chars}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.lines}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">CPS = characters per second. Limits may vary by language. Always verify against current platform delivery specs before submitting.</p>
        </section>

        {/* SRT vs VTT */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">SRT vs VTT — which format should you use?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">Use SRT when…</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                <li>• Uploading to YouTube, Netflix, Amazon, or Vimeo</li>
                <li>• Importing into Premiere Pro, DaVinci Resolve, or Final Cut</li>
                <li>• Distributing to media players (VLC, MPC, Plex)</li>
                <li>• Sharing with clients or translation teams</li>
                <li>• Maximum compatibility is required</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">Use VTT when…</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                <li>• Embedding captions in an HTML5 &lt;video&gt; element</li>
                <li>• Using a JavaScript video player (Video.js, Plyr, JW)</li>
                <li>• Deploying to a web app or SPA</li>
                <li>• Using chapter markers or region styling</li>
                <li>• The VTT spec's cue settings or styling are needed</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 p-8 text-center text-white">
          <h2 className="text-2xl font-display font-bold mb-2">Need subtitles generated automatically?</h2>
          <p className="text-violet-100 mb-6 text-sm max-w-md mx-auto">Upload your video and get accurate, timestamped subtitles in SRT or VTT format — powered by AI, ready in minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/video-to-subtitles" className="inline-block bg-white text-violet-700 font-semibold px-6 py-3 rounded-xl hover:bg-violet-50 transition-colors text-sm">Generate subtitles with AI →</Link>
            <Link to="/video-to-transcript" className="inline-block border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm">Transcribe video instantly</Link>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Frequently asked questions</h2>
          <div className="space-y-5">
            {[
              { q: 'Are these subtitle tools really free?', a: 'Yes, completely. All tools on this page run in your browser with no server processing. There are no file size limits, no account requirements, and no usage restrictions. They work using pure JavaScript in your browser.' },
              { q: 'Do subtitle files get uploaded to a server?', a: 'No. When you use tools like the Subtitle Validator or Shift Timing tool, your file is read by your browser locally using the HTML5 File API. The file content is processed in JavaScript in your browser tab and never leaves your device.' },
              { q: 'What subtitle formats are supported?', a: 'Most tools support SRT (SubRip Text) and VTT (WebVTT) — the two most widely used formats. SRT is universally compatible with editing software and platforms. VTT is the web standard required for HTML5 players. Some tools only accept SRT, so if you have a VTT file, use the VTT to SRT converter first.' },
              { q: 'How do I fix subtitles that are out of sync?', a: 'Use the Shift Subtitle Timing tool. If subtitles are consistently early by the same amount, enter a negative offset (e.g. -1.5 seconds). If they appear too late, enter a positive offset. For subtitles that drift over time (not a fixed offset), you\'ll need to re-time them manually in a subtitle editor like Subtitle Edit.' },
              { q: 'What is CPS and why does it matter?', a: 'CPS stands for characters per second — how fast a subtitle requires the viewer to read. Netflix\'s limit is 17 CPS for most languages (20 CPS for English). Subtitles above the limit are too fast to read comfortably and will fail QC checks for broadcast delivery. Use the Subtitle Reading Speed Checker to identify cues that exceed the limit.' },
              { q: 'What is the maximum number of characters per subtitle line?', a: 'This varies by platform: Netflix allows 42 characters per line, BBC iPlayer 37, and Apple TV+ 40. Lines over these limits may wrap awkwardly or fail delivery QC. Use the Subtitle Character Limit Checker to scan your file for long lines before submitting.' },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{q}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Back to all tools */}
        <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link to="/tools" className="text-sm text-violet-600 hover:text-violet-700 font-medium">← All free video tools</Link>
        </div>

      </div>
    </div>
  )
}
