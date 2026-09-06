import { Link } from 'react-router-dom'

const FEATURED = [
  'Spanish',
  'Hindi',
  'Arabic',
  'French',
  'German',
  'Portuguese',
  'Chinese (Simplified)',
  'Japanese',
  'Korean',
  'English',
  'Italian',
  'Russian',
  'Turkish',
  'Vietnamese',
  'Indonesian',
] as const

function langParam(name: string): string {
  return encodeURIComponent(name)
}

/** In-page language exits — stay on /translate-subtitles, no new URLs. */
export default function TranslateLangCluster() {
  return (
    <section id="translate-languages" className="max-w-4xl mx-auto px-4 mt-10" aria-labelledby="translate-lang-heading">
      <h2 id="translate-lang-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
        Translate subtitles to a language
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Same tool, 70+ languages, timestamps preserved. These links stay on this page and pre-select the target.
      </p>
      <ul className="flex flex-wrap gap-2">
        {FEATURED.map((lang) => (
          <li key={lang}>
            <Link
              to={`/translate-subtitles?to=${langParam(lang)}`}
              className="inline-flex rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-blue-700 dark:text-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              Translate subtitles to {lang}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
