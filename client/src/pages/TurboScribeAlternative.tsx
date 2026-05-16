import { Link } from 'react-router-dom'

const rows = [
  { feature: 'Transcript export', videotext: 'Included', turbo: 'Included' },
  { feature: 'SRT/VTT subtitles', videotext: 'Included in same run', turbo: 'Separate workflow' },
  { feature: 'AI summary + bullets', videotext: 'Included', turbo: 'Limited' },
  { feature: 'Auto chapters', videotext: 'Included', turbo: 'Not core' },
  { feature: 'Speaker labels', videotext: 'Included', turbo: 'Basic' },
  { feature: 'Compressed output', videotext: 'Included', turbo: 'Not bundled' },
]

export default function TurboScribeAlternative() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <section className="max-w-5xl mx-auto px-6 py-14">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-600 dark:text-blue-400">TurboScribe Alternative</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-medium text-gray-900 dark:text-white">
          Switching from TurboScribe?
        </h1>
        <p className="mt-4 text-base text-gray-600 dark:text-gray-300 max-w-3xl">
          If you need more than transcript text, VideoText gives transcript + subtitles + speaker labels + summary + chapters in one upload flow.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/video-to-transcript" className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-600 text-white font-medium">
            Try VideoText Free
          </Link>
          <Link to="/pricing" className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium">
            See Free vs Pro
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Feature</th>
                <th className="text-left px-4 py-3 font-medium text-blue-700 dark:text-blue-300">VideoText</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">TurboScribe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{r.feature}</td>
                  <td className="px-4 py-3 text-blue-700 dark:text-blue-300 font-medium">{r.videotext}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.turbo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
