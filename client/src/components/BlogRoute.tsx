import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getBlogOutboundUrl } from '../lib/blogOutbound'

const Blog = lazy(() => import('../pages/Blog'))

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <p className="text-blue-600 font-medium">Loading…</p>
    </div>
  )
}

/**
 * Production: Hashnode at blog.videotext.io is the canonical blog — redirect immediately (no duplicate live copy).
 * Development: render in-app Blog for local preview.
 */
export default function BlogRoute() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (import.meta.env.PROD) {
      window.location.replace(getBlogOutboundUrl(pathname))
    }
  }, [pathname])

  if (import.meta.env.PROD) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500 dark:text-gray-400 text-sm" role="status">
        Opening blog…
      </div>
    )
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Blog />
    </Suspense>
  )
}
