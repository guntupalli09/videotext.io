import { Helmet } from 'react-helmet-async'
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, getCanonicalUrlForPath } from '../lib/seo'

export interface SeoProps {
  title: string
  description?: string
  canonicalPath?: string
  ogImage?: string
  noindex?: boolean
  jsonLd?: object | object[]
  /** Set for blog posts to emit og:type=article and article:published_time */
  articleMeta?: { publishedTime: string; modifiedTime: string }
}

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '/',
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  jsonLd,
  articleMeta,
}: SeoProps) {
  const canonical = getCanonicalUrlForPath(canonicalPath)
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={articleMeta ? 'article' : 'website'} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      {articleMeta && <meta property="article:published_time" content={articleMeta.publishedTime} />}
      {articleMeta && <meta property="article:modified_time" content={articleMeta.modifiedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@videotextio" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* JSON-LD — one <script> tag per schema for clean parser handling */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
