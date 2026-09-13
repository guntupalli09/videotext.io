import { Link } from 'react-router-dom'
import { CLUSTER_LABELS, type GlossaryCluster } from '../../data/glossary/types'
import { GLOSSARY_PUBLISHED_AT, getPublishedGlossaryTerms } from '../../data/glossary/inventory'

const CLUSTER_ORDER: GlossaryCluster[] = [
  'transcription-asr',
  'captions-subtitles',
  'formats',
  'speakers',
  'timing',
  'localization',
  'accessibility',
  'quality',
  'video-audio-workflow',
]

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function GlossaryHub() {
  const terms = [...getPublishedGlossaryTerms()].sort((a, b) => a.term.localeCompare(b.term))
  const letters = [...new Set(terms.map((term) => term.term[0].toUpperCase()))].sort()
  const byCluster = new Map<GlossaryCluster, typeof terms>()
  for (const cluster of CLUSTER_ORDER) byCluster.set(cluster, [])
  for (const term of terms) {
    const list = byCluster.get(term.cluster) || []
    list.push(term)
    byCluster.set(term.cluster, list)
  }

  return (
    <div className="min-h-screen bg-white py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl space-y-10 px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="text-blue-700 hover:underline dark:text-blue-400">
            Home
          </Link>
          <span className="px-2">/</span>
          <span>Glossary</span>
        </nav>

        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reference library</p>
          <h1 className="mt-2 text-4xl font-medium text-gray-900 dark:text-white">Transcription and subtitle glossary</h1>
          <p className="mt-3 max-w-3xl text-gray-600 dark:text-gray-300">
            Plain-language definitions of the terms used to transcribe speech, caption video, and move subtitle files
            through a production workflow.
          </p>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {terms.length} published definitions. Written by the VideoText editorial team. Updated {formatDate(GLOSSARY_PUBLISHED_AT)}.
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Browse by topic</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CLUSTER_ORDER.map((cluster) => {
              const count = byCluster.get(cluster)?.length || 0
              if (!count) return null
              return (
                <li key={cluster}>
                  <a href={`#cluster-${cluster}`} className="text-blue-700 hover:underline dark:text-blue-400">
                    {CLUSTER_LABELS[cluster]} ({count})
                  </a>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">A–Z index</h2>
          <nav aria-label="Glossary A to Z" className="mt-4 flex flex-wrap gap-2">
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-gray-800 dark:text-blue-400 dark:hover:bg-gray-900"
              >
                {letter}
              </a>
            ))}
          </nav>
        </section>

        {CLUSTER_ORDER.map((cluster) => {
          const items = byCluster.get(cluster) || []
          if (!items.length) return null
          return (
            <section key={cluster} id={`cluster-${cluster}`}>
              <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{CLUSTER_LABELS[cluster]}</h2>
              <ul className="mt-4 space-y-2">
                {items.map((term) => (
                  <li key={term.slug}>
                    <Link to={`/glossary/${term.slug}`} className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                      {term.term}
                    </Link>
                    <span className="text-gray-600 dark:text-gray-400"> — {term.definition}</span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">All published terms</h2>
          {letters.map((letter) => (
            <div key={letter} id={`letter-${letter}`} className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{letter}</h3>
              <ul className="mt-2 space-y-1">
                {terms
                  .filter((term) => term.term[0].toUpperCase() === letter)
                  .map((term) => (
                    <li key={`az-${term.slug}`}>
                      <Link to={`/glossary/${term.slug}`} className="text-blue-700 hover:underline dark:text-blue-400">
                        {term.term}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">Related VideoText resources</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <li>
              <Link to="/transcription-statistics" className="text-blue-700 hover:underline dark:text-blue-400">
                Transcription statistics
              </Link>
            </li>
            <li>
              <Link to="/video-to-transcript" className="text-blue-700 hover:underline dark:text-blue-400">
                Video to transcript
              </Link>
            </li>
            <li>
              <Link to="/video-to-srt" className="text-blue-700 hover:underline dark:text-blue-400">
                Video to SRT
              </Link>
            </li>
            <li>
              <Link to="/fix-subtitles" className="text-blue-700 hover:underline dark:text-blue-400">
                Fix subtitles
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
