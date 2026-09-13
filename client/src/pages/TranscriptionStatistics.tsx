import React from 'react'
import { Link } from 'react-router-dom'

void React
import {
  CITATION_HUB_AUTHOR,
  CITATION_HUB_PUBLISHED_AT,
  CITATION_HUB_UPDATED_AT,
  getCitationHubCount,
  getCitationHubDescription,
  getCitationHubH1,
} from '../data/referenceLayer/citationHubMeta'
import {
  getCandidateCount,
  getRejectedStatistics,
  getRetainedByCategory,
  getRetainedStatistics,
  getUniqueSourceOrganizations,
  getUniqueSourceUrls,
} from '../data/referenceLayer/statistics'
import { CATEGORY_LABELS, CATEGORY_ORDER, type StatisticCandidate } from '../data/referenceLayer/types'

const TAKEAWAY_IDS = [
  'who-430m-disabling',
  '3play-90pct-caption-some',
  'whisper-680k-hours',
  'pew-youtube-85-2024',
  'edison-55pct-monthly-158m',
  'fcc-100pct-new-programming',
] as const

function formatDate(iso?: string): string {
  if (!iso) return 'Date not stated on the source page'
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function sourceYear(item: StatisticCandidate): string {
  if (item.publicationDate) return item.publicationDate.slice(0, 4)
  return 'n.d.'
}

function categoryAnchor(category: string): string {
  return `section-${category}`
}

function StatisticCard({ item }: { item: StatisticCandidate }) {
  const org = item.sourceOrganization || 'Source'
  const year = sourceYear(item)
  return (
    <article id={item.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <p className="text-base font-medium leading-relaxed text-gray-900 dark:text-white">
        {item.claim}{' '}
        <span className="font-normal text-gray-600 dark:text-gray-300">
          according to {org} ({year}).
        </span>
      </p>
      {item.context ? (
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.context}</p>
      ) : null}
      <dl className="mt-3 grid gap-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2">
        {item.geography ? (
          <div>
            <dt className="inline font-semibold text-gray-600 dark:text-gray-300">Geography: </dt>
            <dd className="inline">{item.geography}</dd>
          </div>
        ) : null}
        {item.dataPeriod ? (
          <div>
            <dt className="inline font-semibold text-gray-600 dark:text-gray-300">Period: </dt>
            <dd className="inline">{item.dataPeriod}</dd>
          </div>
        ) : null}
        {item.sampleSize ? (
          <div>
            <dt className="inline font-semibold text-gray-600 dark:text-gray-300">Sample: </dt>
            <dd className="inline">{item.sampleSize}</dd>
          </div>
        ) : null}
        <div>
          <dt className="inline font-semibold text-gray-600 dark:text-gray-300">Published: </dt>
          <dd className="inline">
            {item.publicationDate ? formatDate(item.publicationDate) : item.publicationDateUnavailableReason}
          </dd>
        </div>
      </dl>
      {item.caveat ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">Caveat: {item.caveat}</p>
      ) : null}
      {item.sourceUrl ? (
        <p className="mt-3 text-sm">
          <a
            href={item.sourceUrl}
            className="font-medium text-blue-700 hover:underline dark:text-blue-400"
            target="_blank"
            rel="noreferrer"
          >
            Source: {org} — {item.sourceTitle || 'original publication'}
          </a>
        </p>
      ) : null}
    </article>
  )
}

export default function TranscriptionStatistics() {
  const retained = getRetainedStatistics()
  const rejected = getRejectedStatistics()
  const byCategory = getRetainedByCategory()
  const takeaways = TAKEAWAY_IDS.map((id) => retained.find((item) => item.id === id)).filter(Boolean) as StatisticCandidate[]
  const sourceIndex = new Map<string, { organization: string; title: string; url: string; count: number }>()
  for (const item of retained) {
    if (!item.sourceUrl) continue
    const current = sourceIndex.get(item.sourceUrl)
    if (current) {
      current.count += 1
    } else {
      sourceIndex.set(item.sourceUrl, {
        organization: item.sourceOrganization || 'Source',
        title: item.sourceTitle || item.sourceUrl,
        url: item.sourceUrl,
        count: 1,
      })
    }
  }
  const sources = [...sourceIndex.values()].sort((a, b) => a.organization.localeCompare(b.organization))

  return (
    <div className="min-h-screen bg-white py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl space-y-10 px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="text-blue-700 hover:underline dark:text-blue-400">
            Home
          </Link>
          <span className="px-2">/</span>
          <span>Transcription statistics</span>
        </nav>

        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reference · Third-party sources only</p>
          <h1 className="mt-2 text-4xl font-medium text-gray-900 dark:text-white">{getCitationHubH1()}</h1>
          <p className="mt-3 max-w-3xl text-gray-600 dark:text-gray-300">{getCitationHubDescription()}</p>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Written and reviewed by the {CITATION_HUB_AUTHOR}. Published {formatDate(CITATION_HUB_PUBLISHED_AT)}. Last
            updated {formatDate(CITATION_HUB_UPDATED_AT)}.
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Key takeaways</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700 dark:text-gray-300">
            {takeaways.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-blue-700 hover:underline dark:text-blue-400">
                  {item.claim}
                </a>{' '}
                <span className="text-gray-500">
                  ({item.sourceOrganization}, {sourceYear(item)})
                </span>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="On this page" className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Jump to a section</h2>
          <ol className="mt-3 columns-1 gap-x-8 text-sm sm:columns-2">
            {CATEGORY_ORDER.filter((category) => (byCategory.get(category) || []).length > 0).map((category) => (
              <li key={category} className="mb-2 break-inside-avoid">
                <a href={`#${categoryAnchor(category)}`} className="text-blue-700 hover:underline dark:text-blue-400">
                  {CATEGORY_LABELS[category]} ({byCategory.get(category)?.length})
                </a>
              </li>
            ))}
            <li className="mb-2 break-inside-avoid">
              <a href="#methodology" className="text-blue-700 hover:underline dark:text-blue-400">
                Methodology
              </a>
            </li>
            <li className="mb-2 break-inside-avoid">
              <a href="#sources" className="text-blue-700 hover:underline dark:text-blue-400">
                Sources
              </a>
            </li>
          </ol>
        </nav>

        {CATEGORY_ORDER.map((category) => {
          const items = byCategory.get(category) || []
          if (!items.length) return null
          return (
            <section key={category} id={categoryAnchor(category)}>
              <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{CATEGORY_LABELS[category]}</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{items.length} sourced figures</p>
              <div className="mt-4 space-y-4">
                {items.map((item) => (
                  <StatisticCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )
        })}

        <section id="methodology" className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Methodology</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {getCandidateCount()} candidate figures were reviewed; {getCitationHubCount()} met the inclusion criteria and{' '}
            {rejected.length} were rejected. Last verification date: {formatDate(CITATION_HUB_UPDATED_AT)}.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
            <li>
              Candidates were discovered from government fact sheets, standards and broadcast regulators, university and
              peer-reviewed papers, official platform documentation, original datasets, and disclosed industry surveys.
              Competitor “statistics roundups” were used only as discovery leads, then traced back to an original study or
              dataset.
            </li>
            <li>
              A figure was retained only when the original organization, a source URL, and a checkable number could be
              confirmed on that source. Each retained record stores geography, period, sample, and caveats when the source
              provided them.
            </li>
            <li>
              Figures were rejected when the original source could not be found, the number could not be confirmed, context
              changed the meaning, geography or sample was missing where it mattered, the study was superseded, a URL was
              broken, or the claim was marketing, first-party VideoText data, or an unsupported market-size forecast.
            </li>
            <li>
              Publication dates are the date printed on the source when available. Continuously updated fact sheets (for
              example WHO hearing-loss pages) record why a single calendar date is unavailable instead of inventing one.
            </li>
            <li>
              Older statistics were kept when they remain the current official series and a newer equivalent was not
              published. They are labeled with their data period.
            </li>
            <li>
              Statistics from incompatible studies were not averaged or combined.               VideoText operational numbers from{' '}
              <Link to="/open" className="text-blue-700 hover:underline dark:text-blue-400">
                VideoText's operational stats
              </Link>{' '}
              and the Phase 1 WER pilot on{' '}
              <Link to="/research/transcription-accuracy-benchmark-2026" className="text-blue-700 hover:underline dark:text-blue-400">
                the first-party accuracy benchmark
              </Link>{' '}
              are not mixed into these third-party tables.
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {getUniqueSourceOrganizations().length} unique source organizations and {getUniqueSourceUrls().length} unique
            source URLs support the retained set. A successful link check is not the same as proving the number itself.
          </p>
        </section>

        <section id="sources">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Sources</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Each statistic above also links to its underlying source. This index lists every unique primary URL used on
            the page.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} className="text-blue-700 hover:underline dark:text-blue-400" target="_blank" rel="noreferrer">
                  {source.organization}: {source.title}
                </a>
                <span className="text-gray-500"> ({source.count} figure{source.count === 1 ? '' : 's'})</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Related VideoText resources</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Related definitions are in the glossary. VideoText product pages are available if you want to start from a video.
          </p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <li>
              <Link to="/glossary" className="text-blue-700 hover:underline dark:text-blue-400">
                Transcription and subtitle glossary
              </Link>
            </li>
            <li>
              <Link to="/open" className="text-blue-700 hover:underline dark:text-blue-400">
                VideoText operational stats
              </Link>
            </li>
            <li>
              <Link to="/research/transcription-accuracy-benchmark-2026" className="text-blue-700 hover:underline dark:text-blue-400">
                First-party accuracy benchmark
              </Link>
            </li>
            <li>
              <Link to="/video-to-transcript" className="text-blue-700 hover:underline dark:text-blue-400">
                Video to transcript
              </Link>
            </li>
            <li>
              <Link to="/video-to-subtitles" className="text-blue-700 hover:underline dark:text-blue-400">
                Video to subtitles
              </Link>
            </li>
            <li>
              <Link to="/video-to-srt" className="text-blue-700 hover:underline dark:text-blue-400">
                Video to SRT
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Need a transcript from a video?</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Need to turn a video into an editable transcript? Try VideoText. The statistics on this page stay useful
            whether or not you use the product.
          </p>
          <p className="mt-3">
            <Link to="/video-to-transcript" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
              Open video to transcript
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
