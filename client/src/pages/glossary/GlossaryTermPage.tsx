import { Link, useParams } from 'react-router-dom'
import { getGlossaryTermBySlug, getPublishedGlossaryTerms } from '../../data/glossary/inventory'
import NotFound from '../NotFound'

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function GlossaryTermPage() {
  const { slug } = useParams<{ slug: string }>()
  const term = slug ? getGlossaryTermBySlug(slug) : undefined
  if (!term) return <NotFound />

  const published = getPublishedGlossaryTerms()
  const related = term.relatedTerms
    .map((relatedSlug) => published.find((item) => item.slug === relatedSlug))
    .filter(Boolean)
    .slice(0, 8)

  return (
    <div className="min-h-screen bg-white py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl space-y-8 px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="text-blue-700 hover:underline dark:text-blue-400">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link to="/glossary" className="text-blue-700 hover:underline dark:text-blue-400">
            Glossary
          </Link>
          <span className="px-2">/</span>
          <span>{term.term}</span>
        </nav>

        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Definition</p>
          <h1 className="mt-2 text-4xl font-medium text-gray-900 dark:text-white">{term.h1}</h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            VideoText editorial team. Updated {formatDate(term.updatedAt)}.
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Direct definition</h2>
          <p className="mt-3 text-lg leading-relaxed text-gray-800 dark:text-gray-200">{term.definition}</p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Key takeaways</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700 dark:text-gray-300">
            {term.takeaways.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {term.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700 dark:text-gray-300">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {term.faqs?.length ? (
          <section>
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Frequently asked questions</h2>
            <dl className="mt-4 space-y-4">
              {term.faqs.map((faq) => (
                <div key={faq.q}>
                  <dt className="font-medium text-gray-900 dark:text-white">{faq.q}</dt>
                  <dd className="mt-1 text-gray-700 dark:text-gray-300">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Related terms</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((item) =>
              item ? (
                <li key={item.slug}>
                  <Link
                    to={`/glossary/${item.slug}`}
                    className="inline-block rounded-full border border-gray-200 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50 dark:border-gray-800 dark:text-blue-400 dark:hover:bg-gray-900"
                  >
                    {item.term}
                  </Link>
                </li>
              ) : null,
            )}
            <li>
              <Link
                to="/glossary"
                className="inline-block rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
              >
                All glossary terms
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Sources</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {term.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} className="text-blue-700 hover:underline dark:text-blue-400" target="_blank" rel="noreferrer">
                  {source.organization}: {source.title}
                </a>
              </li>
            ))}
          </ol>
        </section>

        {term.relatedTools.length ? (
          <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-sm dark:border-blue-900 dark:bg-blue-950/30">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Related VideoText workflow</h2>
            <ul className="mt-3 space-y-2">
              {term.relatedTools.map((tool) => (
                <li key={tool.path}>
                  <Link to={tool.path} className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
