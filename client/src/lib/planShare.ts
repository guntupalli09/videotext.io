/** Match server `planAllowsTranscriptShare` in server/src/routes/share.ts */
export function planIncludesTranscriptShare(): boolean {
  if (typeof window === 'undefined') return false
  const p = (localStorage.getItem('plan') || 'free').toLowerCase()
  return p === 'pro' || p === 'agency' || p === 'business' || p === 'founding_workflow'
}
