import React, { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getGuideBySlug, getRelatedGuides, guideSlugFromPath } from '../../lib/guides'
import { CTA_SLOT, getGuideHtmlSync, loadGuideHtml } from '../../lib/guideHtml'
import NotFound from '../NotFound'

void React

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

interface CtaProps {
  cta: { path: string; name: string; blurb: string; action: string }
  variant: 'inline' | 'end'
}

function ToolCta({ cta, variant }: CtaProps) {
  return (
    <aside
      className={
        variant === 'inline'
          ? 'my-8 rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40'
          : 'rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900'
      }
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white">{cta.name}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{cta.blurb}</p>
      <Link
        to={cta.path}
        className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        {cta.action}
      </Link>
    </aside>
  )
}

export default function GuideArticle() {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const { pathname } = useLocation()
  const slug = paramSlug || guideSlugFromPath(pathname)
  const guide = slug ? getGuideBySlug(slug) : undefined

  // Primed during prerender; fetched on demand in the browser.
  const [html, setHtml] = useState<string | undefined>(() => (slug ? getGuideHtmlSync(slug) : undefined))

  useEffect(() => {
    if (!slug || html !== undefined) return
    let cancelled = false
    void loadGuideHtml(slug).then((loaded) => {
      if (!cancelled && loaded !== undefined) setHtml(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [slug, html])

  if (!guide) return <NotFound />

  // The build inserts CTA_SLOT before the second H2 so the first CTA lands after
  // a section of substance rather than interrupting the intro.
  const [bodyBefore, bodyAfter] = (() => {
    if (html === undefined) return ['', '']
    const at = html.indexOf(CTA_SLOT)
    return at === -1 ? [html, ''] : [html.slice(0, at), html.slice(at + CTA_SLOT.length)]
  })()

  const related = getRelatedGuides(guide.slug)
  const published = guide.date ? formatDate(guide.date) : ''

  return (
    <div className="min-h-screen bg-white py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl space-y-8 px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="text-blue-700 hover:underline dark:text-blue-400">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link to="/guides" className="text-blue-700 hover:underline dark:text-blue-400">
            Guides
          </Link>
        </nav>

        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Guide</p>
          <h1 className="mt-2 text-4xl font-medium leading-tight text-gray-900 dark:text-white">{guide.title}</h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            VideoText editorial team{published ? ` · ${published}` : ''} · {guide.readMinutes} min read
          </p>
        </header>

        {html === undefined ? (
          <p className="text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
            Loading guide…
          </p>
        ) : (
          <>
            <article className="guide-body" dangerouslySetInnerHTML={{ __html: bodyBefore }} />
            <ToolCta cta={guide.ctas[0]} variant="inline" />
            {bodyAfter && <article className="guide-body" dangerouslySetInnerHTML={{ __html: bodyAfter }} />}
          </>
        )}

        <ToolCta cta={guide.ctas[1]} variant="end" />

        {related.length > 0 && (
          <section>
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Related guides</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link to={`/guides/${item.slug}`} className="text-blue-700 hover:underline dark:text-blue-400">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
