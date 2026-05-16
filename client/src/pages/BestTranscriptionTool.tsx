import { Link } from 'react-router-dom'

const comparisonRows = [
  { tool: 'VideoText', speed: '3–5 min for long videos', bestFor: 'Recorded workflows', output: 'Transcript + subtitles + summary' },
  { tool: 'Otter', speed: 'Real-time meetings', bestFor: 'Live notes', output: 'Transcript only' },
  { tool: 'Descript', speed: 'Editing workflows', bestFor: 'Creators', output: 'Timeline editing + transcript' },
  { tool: 'Rev', speed: 'Human transcription', bestFor: 'Accuracy-heavy', output: 'Text output' },
  { tool: 'Sonix', speed: 'General transcription', bestFor: 'Mixed use', output: 'Transcript' },
  { tool: 'TurboScribe', speed: 'General transcription', bestFor: 'Quick raw transcript', output: 'Transcript' },
  { tool: 'Temi', speed: 'Automated transcription', bestFor: 'Basic text-first use', output: 'Transcript' },
]

export default function BestTranscriptionTool() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 space-y-4">
        <h1 className="text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Fastest Transcription Tool for Long Videos (Transcript + Subtitles in One Workflow)
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Convert long videos into transcript, subtitles, summary, and chapters in minutes — no manual editing or tool switching.
        </p>
        <p className="font-medium text-blue-700 dark:text-blue-300">👉 2-hour video → transcript + subtitles + summary in ~3–5 minutes</p>
        <p className="font-medium text-gray-700 dark:text-gray-300">👉 Built for recorded video workflows — not meetings</p>
      </header>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">What is the fastest transcription tool for long videos?</h2>
        <p className="text-gray-700 dark:text-gray-300">
          If your workflow is converting recorded video/audio into publish-ready content quickly, tools built for structured output outperform meeting-focused tools.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
          <li>process entire files in minutes</li>
          <li>generate transcript + subtitles together</li>
          <li>avoid manual cleanup and reformatting</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300">👉 Need to transcribe your own files? <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/video-to-transcript">Convert video to transcript</Link>.</p>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Transcribe Long Videos in Minutes (Not Hours)</h2>
        <p className="text-gray-700 dark:text-gray-300">Most transcription tools slow down on long files.</p>
        <p className="text-gray-700 dark:text-gray-300">This workflow is optimized for 1–2 hour videos, podcasts and interviews, and recorded content (not live meetings). For creator workflows, start with <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/youtube-transcript-generator">YouTube transcript generation</Link> or go directly from <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/video-to-transcript">video to transcript</Link>.</p>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Transcript + Subtitles + Summary in One Workflow</h2>
        <p className="text-gray-700 dark:text-gray-300">Instead of using multiple tools (transcript → tool 1, subtitles → tool 2, summary → tool 3), this approach gives transcript, subtitles (SRT/VTT), summary, and chapters in one pass.</p>
        <p className="text-gray-700 dark:text-gray-300">👉 Need subtitles only? <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/video-to-subtitles">Generate subtitles automatically</Link>.</p>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Fastest Way to Transcribe Video Content</h2>
        <ul className="list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
          <li>long videos processed in minutes</li>
          <li>no timeline editing required</li>
          <li>instant structured output</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300">Need multilingual delivery? <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/translate-subtitles">Translate subtitles and transcripts</Link> after transcription.</p>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Get Structured Transcripts (Not Raw Text)</h2>
        <p className="text-gray-700 dark:text-gray-300">Most tools output raw transcripts. This workflow includes speaker-labeled transcript, timestamps, summary, and chapters. If you need final on-screen captions, you can <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/burn-subtitles">burn subtitles into video</Link> directly.</p>
      </section>

      <section className="mb-10 space-y-4 overflow-x-auto">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Fast Transcription Tools Compared (VideoText vs Otter vs Descript vs Rev vs Sonix)</h2>
        <table className="min-w-full divide-y divide-gray-200 text-left dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-3 py-2 font-medium">Tool</th><th className="px-3 py-2 font-medium">Speed</th><th className="px-3 py-2 font-medium">Best for</th><th className="px-3 py-2 font-medium">Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {comparisonRows.map((row) => (
              <tr key={row.tool}>
                <td className="px-3 py-2">{row.tool}</td><td className="px-3 py-2">{row.speed}</td><td className="px-3 py-2">{row.bestFor}</td><td className="px-3 py-2">{row.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Best Transcription Tool for Different Use Cases</h2>
        <p className="text-gray-700 dark:text-gray-300"><strong>For long videos:</strong> fast batch processing and structured outputs matter most.</p>
        <p className="text-gray-700 dark:text-gray-300"><strong>For YouTube creators:</strong> need transcript + subtitles + chapters in one pass using <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/youtube-transcript-generator">YouTube transcript workflows</Link>.</p>
        <p className="text-gray-700 dark:text-gray-300"><strong>For podcasters:</strong> clean transcript + summary for show notes, then export with <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/video-to-subtitles">subtitle generation</Link>.</p>
        <p className="text-gray-700 dark:text-gray-300"><strong>For meetings:</strong> use tools like Otter (real-time capture).</p>
      </section>

      <section className="mb-10 space-y-3">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Complete Video-to-Content Workflow</h2>
        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
          <li><Link className="text-blue-600 hover:underline dark:text-blue-400" to="/video-to-transcript">Video to transcript</Link></li>
          <li><Link className="text-blue-600 hover:underline dark:text-blue-400" to="/youtube-transcript-generator">YouTube transcript</Link></li>
          <li><Link className="text-blue-600 hover:underline dark:text-blue-400" to="/video-to-subtitles">Subtitle generator</Link></li>
          <li><Link className="text-blue-600 hover:underline dark:text-blue-400" to="/translate-subtitles">Translate subtitles</Link></li>
          <li><Link className="text-blue-600 hover:underline dark:text-blue-400" to="/burn-subtitles">Burn subtitles</Link></li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Frequently Asked Questions</h2>
        <div><h3 className="font-medium">What is the fastest way to transcribe long videos?</h3><p className="text-gray-700 dark:text-gray-300">Using tools optimized for batch processing and structured outputs reduces time significantly.</p></div>
        <div><h3 className="font-medium">Can I generate transcript and subtitles together?</h3><p className="text-gray-700 dark:text-gray-300">Yes. Some tools provide transcript + subtitle outputs in a single workflow.</p></div>
        <div><h3 className="font-medium">What is the best transcription tool for YouTube videos?</h3><p className="text-gray-700 dark:text-gray-300">Tools that process long videos quickly and generate structured outputs are best suited.</p></div>
        <div><h3 className="font-medium">How long does it take to transcribe a 2-hour video?</h3><p className="text-gray-700 dark:text-gray-300">With optimized tools, it can take just a few minutes instead of hours.</p></div>
        <div><h3 className="font-medium">Do I need multiple tools for transcription and subtitles?</h3><p className="text-gray-700 dark:text-gray-300">No. Modern workflows combine transcript, subtitles, and summary generation in one pass.</p></div>
      </section>
    </div>
  )
}
