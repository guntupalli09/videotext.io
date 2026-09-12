import { getHashnodePostUrl } from './blogSlugMap'

/**
 * Full URL on the editorial subdomain (Hashnode). Use with `<a href>` — not React Router `<Link to>` —
 * so clicks leave videotext.io and land on the canonical blog host.
 */
export function getBlogOutboundUrl(pathname: string): string {
  return getHashnodePostUrl(pathname)
}
