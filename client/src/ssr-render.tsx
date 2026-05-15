/**
 * Server-side rendering helper for build-time prerendering.
 *
 * Two SSR modes are intentionally supported:
 * 1. `react-page`: hand-audited presentational React pages that can be rendered directly.
 * 2. `seo-document`: registry/meta driven semantic HTML for SEO landing pages whose
 *    interactive uploader/editor remains client-only during hydration.
 *
 * This keeps browser-heavy product flows out of Node while ensuring crawlers see
 * headings, paragraphs, FAQs, comparisons, and internal links for every important
 * indexable page.
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import TemiVsVideoText from './pages/TemiVsVideoText'
import VideoTextVsRev from './pages/VideoTextVsRev'
import OtterVsVideoText from './pages/OtterVsVideoText'
import DescriptVsVideoText from './pages/DescriptVsVideoText'
import VideoTextVsTurboScribe from './pages/VideoTextVsTurboScribe'
import BestOtterAlternatives from './pages/BestOtterAlternatives'
import BestDescriptAlternatives from './pages/BestDescriptAlternatives'
import { ROUTE_SEO } from './lib/seoMeta'
import { getAllSeoEntries, getPageLabel, getRelatedSuggestionsForEntry, getSeoEntry, type FaqItem, type SeoDeepContent, type SeoRegistryEntry, type SeoTutorialContent } from './lib/seoRegistry'
import { getCanonicalPathForRoute, resolveInternalLinkPath } from './lib/primaryUrls'

type SsrMode = 'react-page' | 'seo-document'

interface StaticRouteContent {
  path: string
  title: string
  description: string
  h1: string
  intro: string
  faq?: FaqItem[]
  related?: { path: string; title: string }[]
  deepContent?: SeoDeepContent
  tutorialContent?: SeoTutorialContent
  primaryCta?: { text: string; path: string }
}

const SSR_PAGES: Record<string, React.ComponentType> = {
  '/temi-vs-videotext': TemiVsVideoText,
  '/videotext-vs-rev': VideoTextVsRev,
  '/otter-vs-videotext': OtterVsVideoText,
  '/descript-vs-videotext': DescriptVsVideoText,
  '/videotext-vs-turboscribe': VideoTextVsTurboScribe,
  '/best-otter-alternatives': BestOtterAlternatives,
  '/best-descript-alternatives': BestDescriptAlternatives,
}

const CORE_STATIC_CONTENT: Record<string, Omit<StaticRouteContent, 'path' | 'title' | 'description'>> = {
  '/site-index': {
    h1: 'All VideoText Pages',
    intro: 'Browse every prerendered VideoText route from one crawlable HTML index, including transcription tools, subtitle utilities, comparison pages, alternatives, and programmatic SEO landing pages.',
    primaryCta: { text: 'Start with Video to Transcript', path: '/video-to-transcript' },
    deepContent: {
      proofPoints: [
        'This index concentrates discoverability for crawlers and LLM agents.',
        'Every important page links back to core transcription, subtitle, and formatting workflows.',
        'The page is generated during prerender so route inventory and output stay aligned.',
      ],
      workflowSteps: [
        { title: '1. Crawl route groups', detail: 'Search engines can find core product pages, alternatives, free tools, and programmatic SEO pages from one HTML document.' },
        { title: '2. Follow internal links', detail: 'Crawler navigation and related workflow links connect long-tail pages to revenue pages.' },
        { title: '3. Validate coverage', detail: 'The SSR audit reports whether every indexable page has meaningful HTML output.' },
      ],
      ctaText: 'Open the transcription tool',
      ctaPath: '/video-to-transcript',
    },
    faq: [
      { q: 'Why does VideoText have a site index?', a: 'The index gives crawlers and LLM agents a simple HTML map of prerendered pages and improves discovery of deep workflow pages.' },
      { q: 'Is the site index generated automatically?', a: 'Yes. It is included in the prerender inventory and validated by the SSR audit.' },
    ],
    related: [
      { path: '/video-to-transcript', title: 'Video to Transcript' },
      { path: '/video-to-subtitles', title: 'Video to Subtitles' },
      { path: '/alternatives', title: 'Alternatives Hub' },
      { path: '/tools', title: 'Free Tools' },
    ],
  },
  '/video-to-transcript': {
    h1: 'Video to Transcript — Free AI Transcription, 98.5% Accurate',
    intro:
      'Upload any video or paste a YouTube URL and get a full transcript, SRT/VTT subtitles, AI summary, and auto-generated chapters in one pass. VideoText is built for creators, teams, researchers, and agencies that need searchable text from long recordings without manual cleanup.',
    primaryCta: { text: 'Transcribe a video now', path: '/video-to-transcript' },
    deepContent: {
      proofPoints: [
        'One upload produces transcript text, subtitle files, summary, chapters, and share-ready exports.',
        'Works with common video and audio formats including MP4, MOV, WebM, MP3, WAV, and M4A.',
        'Zero-retention workflow: uploads and generated outputs are not kept after processing completes.',
      ],
      workflowSteps: [
        { title: '1. Upload a video or paste a URL', detail: 'Drag in a file or start from a public media URL. Choose language, speaker labels, and export options before processing.' },
        { title: '2. Generate transcript, subtitles, summary, and chapters', detail: 'VideoText processes the audio and prepares structured outputs in the same workflow, so you do not need multiple tools.' },
        { title: '3. Review, edit, and export', detail: 'Copy text, download TXT/DOCX/PDF/JSON, export SRT/VTT captions, or continue into subtitle translation and style-guide formatting.' },
      ],
      outputExamples: [
        { title: 'Searchable transcript', body: 'Turn a long recording into text that can be searched, quoted, edited, and repurposed.' },
        { title: 'Subtitle files', body: 'Generate SRT and VTT captions for YouTube, Vimeo, courses, webinars, and social clips.' },
        { title: 'Summary and chapters', body: 'Create a quick recap and navigable chapter markers for viewers who need the key moments fast.' },
      ],
      useCases: [
        { title: 'Creators and marketers', body: 'Repurpose videos into articles, social captions, newsletters, and searchable show notes.' },
        { title: 'Researchers and journalists', body: 'Scan interviews, lectures, and source footage without replaying every minute.' },
        { title: 'Agencies and teams', body: 'Standardize transcript, subtitle, and handoff outputs across many client recordings.' },
      ],
      comparisonRows: [
        { feature: 'Outputs from one upload', videotext: 'Transcript, SRT/VTT, summary, chapters, and exports', alternatives: 'Usually transcript-only or requires multiple tools' },
        { feature: 'Long recording workflow', videotext: 'Designed for asynchronous processing and structured exports', alternatives: 'Often forces manual timeline cleanup' },
        { feature: 'Privacy posture', videotext: 'Files deleted after processing', alternatives: 'Uploads may remain in project libraries' },
      ],
      ctaText: 'Upload a video, get transcript in minutes',
      ctaPath: '/video-to-transcript',
    },
    faq: [
      { q: 'How do I convert a video to a transcript?', a: 'Upload a video file or paste a supported URL, choose your options, and start transcription. VideoText returns transcript text plus optional subtitle, summary, and chapter outputs.' },
      { q: 'Does VideoText generate subtitles too?', a: 'Yes. The same flow can produce SRT and VTT files in addition to the transcript, which makes the page useful for captioning and publishing workflows.' },
      { q: 'Is this page safe to server render?', a: 'The SEO content is server-rendered while uploader, editor, and billing interactions remain client-only after hydration.' },
    ],
    related: [
      { path: '/youtube-transcript-generator', title: 'YouTube Transcript Generator' },
      { path: '/video-to-subtitles', title: 'Video to Subtitles' },
      { path: '/translate-subtitles', title: 'Translate Subtitles' },
      { path: '/guideline-format', title: 'Transcript Style Guide Formatter' },
      { path: '/fastest-transcription-tool', title: 'Fastest Transcription Tool' },
    ],
  },
}

function titleToH1(title: string): string {
  return title.replace(/\s*[—–|].*$/, '').trim() || title
}

function buildFallbackDeepContent(label: string, description: string): SeoDeepContent {
  return {
    proofPoints: [
      `${label} is part of the VideoText transcription, subtitle, and workflow toolkit.`,
      'This route is rendered as semantic HTML at build time so crawlers see more than an empty SPA shell.',
      'Interactive controls remain browser-hydrated, preserving the existing client application behavior.',
    ],
    workflowSteps: [
      { title: '1. Understand the workflow', detail: description },
      { title: '2. Use the matching VideoText tool', detail: 'Follow the related links to transcript, subtitle, translation, formatting, or free utility flows that match the page intent.' },
      { title: '3. Export a usable asset', detail: 'Turn media, subtitles, or transcript text into an output that is ready for publishing, editing, accessibility, or team handoff.' },
    ],
    outputExamples: [
      { title: 'Semantic route summary', body: description },
      { title: 'Crawlable internal links', body: 'The prerendered document links to high-value VideoText workflows so search engines can discover deeper pages.' },
      { title: 'Hydration-safe app shell', body: 'The static content is available immediately, and the React SPA takes over for uploads, editors, and account-specific behavior.' },
    ],
  }
}

function getStaticRouteContent(routePath: string): StaticRouteContent | null {
  const canonicalPath = getCanonicalPathForRoute(routePath)
  const seoEntry = getSeoEntry(routePath) || getSeoEntry(canonicalPath)
  if (seoEntry) return contentFromSeoEntry(seoEntry)

  const meta = ROUTE_SEO[routePath] || ROUTE_SEO[canonicalPath]
  const core = CORE_STATIC_CONTENT[routePath] || CORE_STATIC_CONTENT[canonicalPath]
  if (meta && core) {
    return {
      path: routePath,
      title: meta.title,
      description: meta.description,
      ...core,
    }
  }

  if (core) {
    const h1 = core.h1 || titleToH1(routePath.slice(1).replace(/-/g, ' '))
    const description = core.intro || `${h1} on VideoText.`
    return {
      path: routePath,
      title: `${h1} | VideoText`,
      description,
      ...core,
    }
  }

  if (meta) {
    const label = getPageLabel(routePath) || titleToH1(meta.title)
    return {
      path: routePath,
      title: meta.title,
      description: meta.description,
      h1: titleToH1(meta.title),
      intro: meta.description,
      primaryCta: { text: 'Start free with VideoText', path: '/video-to-transcript' },
      deepContent: {
        ...buildFallbackDeepContent(label, meta.description),
        ctaText: 'Open the main transcription tool',
        ctaPath: '/video-to-transcript',
      },
      faq: [
        { q: `What is ${label}?`, a: meta.description },
        { q: 'Does this prerendered page replace the app?', a: 'No. It provides semantic HTML for crawlers and fast first content, then the existing Vite React SPA hydrates and preserves the full client experience.' },
        { q: 'Where should I start?', a: 'Start with Video to Transcript for media-to-text workflows, Video to Subtitles for captions, or the related links below for specialized tools.' },
      ],
      related: [
        { path: '/video-to-transcript', title: 'Video to Transcript' },
        { path: '/video-to-subtitles', title: 'Video to Subtitles' },
        { path: '/translate-subtitles', title: 'Translate Subtitles' },
        { path: '/guideline-format', title: 'Transcript Style Guide Formatter' },
        { path: '/tools', title: 'Free Transcript and Subtitle Tools' },
      ].filter((item) => item.path !== routePath),
    }
  }

  return null
}

function contentFromSeoEntry(entry: SeoRegistryEntry): StaticRouteContent {
  return {
    path: entry.path,
    title: entry.title,
    description: entry.description,
    h1: entry.h1,
    intro: entry.intro,
    faq: entry.faq,
    deepContent: entry.deepContent || buildFallbackDeepContent(entry.breadcrumbLabel, entry.description),
    tutorialContent: entry.tutorialContent,
    related: getRelatedSuggestionsForEntry(entry),
    primaryCta: {
      text: entry.deepContent?.ctaText || entry.tutorialContent?.ctaText || 'Start this workflow',
      path: resolveInternalLinkPath(entry.deepContent?.ctaPath || entry.tutorialContent?.ctaPath || `/${entry.toolKey}`),
    },
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="vt-ssr-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StaticSeoDocument({ content }: { content: StaticRouteContent }) {
  const deep = content.deepContent
  const tutorial = content.tutorialContent
  const related = content.related || []
  const primaryCta = content.primaryCta || { text: 'Start free', path: '/video-to-transcript' }

  return (
    <main className="vt-ssr-document" data-ssr-mode="seo-document">
      <style>{`
        .vt-ssr-document{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:960px;margin:0 auto;padding:48px 20px;color:#111827;line-height:1.65;background:#fff}
        .vt-ssr-eyebrow{color:#6d28d9;font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px}
        .vt-ssr-document h1{font-size:clamp(34px,6vw,60px);line-height:1.02;margin:0 0 18px;font-weight:900;letter-spacing:-.04em;color:#111827}
        .vt-ssr-intro{font-size:20px;line-height:1.75;color:#374151;margin:0 0 28px;max-width:860px}
        .vt-ssr-actions{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 40px}.vt-ssr-actions a{border-radius:999px;padding:12px 18px;text-decoration:none;font-weight:800}.vt-ssr-primary{background:#7c3aed;color:#fff}.vt-ssr-secondary{background:#f5f3ff;color:#5b21b6}
        .vt-ssr-section{border-top:1px solid #e5e7eb;padding-top:30px;margin-top:34px}.vt-ssr-section h2{font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:850;color:#111827}.vt-ssr-section h3{font-size:18px;margin:0 0 8px;color:#111827}.vt-ssr-section p,.vt-ssr-section li{color:#374151;font-size:16px}.vt-ssr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}.vt-ssr-card{border:1px solid #e5e7eb;border-radius:18px;padding:18px;background:#fafafa}.vt-ssr-card p{margin:0}.vt-ssr-proof li{margin:8px 0}.vt-ssr-table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden}.vt-ssr-table th,.vt-ssr-table td{border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top;padding:12px}.vt-ssr-table th{background:#f9fafb;color:#111827}.vt-ssr-faq details{border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin:10px 0;background:#fff}.vt-ssr-faq summary{cursor:pointer;font-weight:800;color:#111827}.vt-ssr-links{display:flex;flex-wrap:wrap;gap:10px}.vt-ssr-links a{display:inline-flex;border:1px solid #ddd6fe;border-radius:999px;padding:8px 12px;color:#5b21b6;background:#faf5ff;text-decoration:none;font-weight:700}
      `}</style>
      <p className="vt-ssr-eyebrow">VideoText SEO landing page</p>
      <h1>{content.h1 || titleToH1(content.title)}</h1>
      <p className="vt-ssr-intro">{content.intro || content.description}</p>
      <div className="vt-ssr-actions">
        <a className="vt-ssr-primary" href={primaryCta.path}>{primaryCta.text}</a>
        <a className="vt-ssr-secondary" href="/pricing">View pricing</a>
      </div>

      {deep?.proofPoints?.length ? (
        <Section title="Why teams use this workflow">
          <ul className="vt-ssr-proof">{deep.proofPoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </Section>
      ) : null}

      {deep?.workflowSteps?.length ? (
        <Section title="How it works">
          <div className="vt-ssr-grid">{deep.workflowSteps.map((step) => <article className="vt-ssr-card" key={step.title}><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div>
        </Section>
      ) : null}

      {tutorial?.steps?.length ? (
        <Section title="Step-by-step tutorial">
          <div className="vt-ssr-grid">{tutorial.steps.map((step) => <article className="vt-ssr-card" key={step.title}><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.outputExamples?.length ? (
        <Section title="Outputs you can use immediately">
          <div className="vt-ssr-grid">{deep.outputExamples.map((item) => <article className="vt-ssr-card" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.comparisonRows?.length ? (
        <Section title="How VideoText compares">
          <table className="vt-ssr-table">
            <thead><tr><th>Feature</th><th>VideoText</th><th>Alternatives</th></tr></thead>
            <tbody>{deep.comparisonRows.map((row) => <tr key={row.feature}><td>{row.feature}</td><td>{row.videotext}</td><td>{row.alternatives}</td></tr>)}</tbody>
          </table>
        </Section>
      ) : null}

      {deep?.useCases?.length ? (
        <Section title="Use cases">
          <div className="vt-ssr-grid">{deep.useCases.map((item) => <article className="vt-ssr-card" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {content.faq?.length ? (
        <Section title="Frequently asked questions">
          <div className="vt-ssr-faq">{content.faq.map((item) => <details open key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
        </Section>
      ) : null}

      {related.length ? (
        <Section title="Related VideoText workflows">
          <nav className="vt-ssr-links" aria-label="Related workflows">{related.map((item) => <a key={`${item.path}-${item.title}`} href={item.path}>{item.title}</a>)}</nav>
        </Section>
      ) : null}
    </main>
  )
}

export function getSsrPagePaths(): string[] {
  const paths = new Set<string>(Object.keys(SSR_PAGES))
  for (const entry of getAllSeoEntries()) paths.add(entry.path)
  for (const path of Object.keys(CORE_STATIC_CONTENT)) paths.add(path)
  return [...paths].sort()
}

export function getSsrRenderMode(routePath: string): SsrMode | null {
  if (SSR_PAGES[routePath]) return 'react-page'
  return getStaticRouteContent(routePath) ? 'seo-document' : null
}

/**
 * Renders a route to a semantic HTML string. Returns null when the route is not
 * registered for SSR-safe build-time rendering.
 */
export function renderPageToHtml(routePath: string): string | null {
  const Component = SSR_PAGES[routePath]
  try {
    if (Component) {
      return renderToString(
        <StaticRouter location={routePath}>
          <HelmetProvider>
            <Component />
          </HelmetProvider>
        </StaticRouter>
      )
    }

    const content = getStaticRouteContent(routePath)
    if (!content) return null

    return renderToString(
      <StaticRouter location={routePath}>
        <HelmetProvider>
          <StaticSeoDocument content={content} />
        </HelmetProvider>
      </StaticRouter>
    )
  } catch (err) {
    console.error(`[ssr-render] renderToString failed for ${routePath}:`, err)
    return null
  }
}
