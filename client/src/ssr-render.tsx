/**
 * Server-side rendering helper for comparison and vs pages.
 * Called by scripts/prerender.ts during the build to inject full React HTML
 * into each page's static dist/index.html so non-JS crawlers see complete content.
 *
 * Only include purely presentational components here — no browser APIs,
 * no localStorage, no useEffect/useState, no useLocation/useNavigate.
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

const SSR_PAGES: Record<string, React.ComponentType> = {
  '/temi-vs-videotext': TemiVsVideoText,
  '/videotext-vs-rev': VideoTextVsRev,
  '/otter-vs-videotext': OtterVsVideoText,
  '/descript-vs-videotext': DescriptVsVideoText,
  '/videotext-vs-turboscribe': VideoTextVsTurboScribe,
}

/**
 * Renders a React page component to a full HTML string using renderToString.
 * Returns null if no SSR page is registered for the given routePath.
 */
export function renderPageToHtml(routePath: string): string | null {
  const Component = SSR_PAGES[routePath]
  if (!Component) return null
  try {
    return renderToString(
      <StaticRouter location={routePath}>
        <HelmetProvider>
          <Component />
        </HelmetProvider>
      </StaticRouter>
    )
  } catch (err) {
    console.error(`[ssr-render] renderToString failed for ${routePath}:`, err)
    return null
  }
}
