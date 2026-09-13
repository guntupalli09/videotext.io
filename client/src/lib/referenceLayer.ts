import { CITATION_HUB_PATH, CITATION_HUB_PUBLISHED_AT, CITATION_HUB_UPDATED_AT, getCitationHubDescription, getCitationHubH1, getCitationHubMetaTitle } from '../data/referenceLayer/citationHubMeta'
import { getRetainedStatistics } from '../data/referenceLayer/statistics'
import { SITE_NAME, SITE_URL, getCanonicalUrlForPath } from './seo'
import { getPublishedGlossaryTerms, GLOSSARY_HUB_PATH } from '../data/glossary/inventory'

export { CITATION_HUB_PATH, GLOSSARY_HUB_PATH }

export function getPublishedGlossaryPaths(): string[] {
  return getPublishedGlossaryTerms().map((term) => `/glossary/${term.slug}`)
}

export function getReferenceLayerPaths(): string[] {
  return [CITATION_HUB_PATH, GLOSSARY_HUB_PATH, ...getPublishedGlossaryPaths()]
}

export function isReferenceLayerPath(pathname: string): boolean {
  return getReferenceLayerPaths().includes(pathname)
}

export function getReferenceLayerSeo(): Record<string, { title: string; description: string }> {
  const out: Record<string, { title: string; description: string }> = {
    [CITATION_HUB_PATH]: {
      title: getCitationHubMetaTitle(),
      description: getCitationHubDescription(),
    },
    [GLOSSARY_HUB_PATH]: {
      title: 'Transcription & Subtitle Glossary',
      description: 'Plain-language definitions of transcription, caption, subtitle, speech-recognition, and accessibility terms used in VideoText workflows.',
    },
  }
  for (const term of getPublishedGlossaryTerms()) {
    out[`/glossary/${term.slug}`] = {
      title: term.metaTitle,
      description: term.metaDescription,
    }
  }
  return out
}

export function getReferenceLayerBreadcrumbs(): Record<string, { name: string; path: string }[]> {
  const out: Record<string, { name: string; path: string }[]> = {
    [CITATION_HUB_PATH]: [
      { name: 'Home', path: '/' },
      { name: 'Transcription statistics', path: CITATION_HUB_PATH },
    ],
    [GLOSSARY_HUB_PATH]: [
      { name: 'Home', path: '/' },
      { name: 'Glossary', path: GLOSSARY_HUB_PATH },
    ],
  }
  for (const term of getPublishedGlossaryTerms()) {
    out[`/glossary/${term.slug}`] = [
      { name: 'Home', path: '/' },
      { name: 'Glossary', path: GLOSSARY_HUB_PATH },
      { name: term.term, path: `/glossary/${term.slug}` },
    ]
  }
  return out
}

export function getReferenceArticleDates(pathname: string): { publishedTime: string; modifiedTime: string } | undefined {
  if (pathname === CITATION_HUB_PATH) {
    return {
      publishedTime: `${CITATION_HUB_PUBLISHED_AT}T00:00:00Z`,
      modifiedTime: `${CITATION_HUB_UPDATED_AT}T00:00:00Z`,
    }
  }
  if (pathname === GLOSSARY_HUB_PATH) {
    return {
      publishedTime: '2026-09-13T00:00:00Z',
      modifiedTime: '2026-09-13T00:00:00Z',
    }
  }
  const term = getPublishedGlossaryTerms().find((item) => `/glossary/${item.slug}` === pathname)
  if (!term) return undefined
  return {
    publishedTime: `${term.publishedAt}T00:00:00Z`,
    modifiedTime: `${term.updatedAt}T00:00:00Z`,
  }
}

export function getCitationHubJsonLd(): object[] {
  const stats = getRetainedStatistics()
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: getCitationHubH1(),
      description: getCitationHubDescription(),
      url: getCanonicalUrlForPath(CITATION_HUB_PATH),
      datePublished: CITATION_HUB_PUBLISHED_AT,
      dateModified: CITATION_HUB_UPDATED_AT,
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      mainEntityOfPage: { '@type': 'WebPage', '@id': getCanonicalUrlForPath(CITATION_HUB_PATH) },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: getCitationHubH1(),
      numberOfItems: stats.length,
      itemListElement: stats.slice(0, 20).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.claim,
        url: item.sourceUrl,
      })),
    },
  ]
}

export function getGlossaryHubJsonLd(): object[] {
  const terms = getPublishedGlossaryTerms()
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Transcription and subtitle glossary',
      description: 'Reference definitions for transcription, captions, subtitles, speech recognition, and accessibility terms.',
      url: getCanonicalUrlForPath(GLOSSARY_HUB_PATH),
      datePublished: '2026-09-13',
      dateModified: '2026-09-13',
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Published glossary terms',
      numberOfItems: terms.length,
      itemListElement: terms.map((term, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: term.term,
        url: getCanonicalUrlForPath(`/glossary/${term.slug}`),
      })),
    },
  ]
}

export function getGlossaryTermJsonLd(slug: string): object[] | undefined {
  const term = getPublishedGlossaryTerms().find((item) => item.slug === slug)
  if (!term) return undefined
  const url = getCanonicalUrlForPath(`/glossary/${term.slug}`)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: term.h1,
      description: term.metaDescription,
      url,
      datePublished: term.publishedAt,
      dateModified: term.updatedAt,
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: term.term,
      description: term.definition,
      url,
      inDefinedTermSet: getCanonicalUrlForPath(GLOSSARY_HUB_PATH),
    },
  ]
}

export function getReferenceLayerJsonLd(pathname: string): object[] | undefined {
  if (pathname === CITATION_HUB_PATH) return getCitationHubJsonLd()
  if (pathname === GLOSSARY_HUB_PATH) return getGlossaryHubJsonLd()
  if (pathname.startsWith('/glossary/')) return getGlossaryTermJsonLd(pathname.replace('/glossary/', ''))
  return undefined
}

export function getReferenceLayerPrerenderMeta(): Array<{
  path: string
  title: string
  description: string
  h1: string
  breadcrumbLabel: string
}> {
  const seo = getReferenceLayerSeo()
  return getReferenceLayerPaths().map((path) => {
    const meta = seo[path]
    const term = getPublishedGlossaryTerms().find((item) => `/glossary/${item.slug}` === path)
    return {
      path,
      title: `${meta.title} | ${SITE_NAME}`,
      description: meta.description,
      h1: path === CITATION_HUB_PATH ? getCitationHubH1() : path === GLOSSARY_HUB_PATH ? 'Transcription and subtitle glossary' : term?.h1 || meta.title,
      breadcrumbLabel: term?.term || (path === CITATION_HUB_PATH ? 'Transcription statistics' : 'Glossary'),
    }
  })
}
