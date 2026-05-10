import { BLOG_URL } from './seo'

/**
 * Full URL on the editorial subdomain (Hashnode). Use with `<a href>` — not React Router `<Link to>` —
 * so clicks leave videotext.io and land on the canonical blog host.
 */
export function getBlogOutboundUrl(pathname: string): string {
  const base = BLOG_URL.replace(/\/$/, '')
  if (pathname === '/blog' || pathname === '/blog/') return `${base}/`
  if (pathname.startsWith('/blog/')) return `${base}${pathname.slice('/blog'.length)}`
  return `${base}/`
}
