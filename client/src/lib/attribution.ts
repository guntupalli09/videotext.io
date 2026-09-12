const ATTRIBUTION_STORAGE_KEY = 'videotext:attribution'

export interface StoredAttribution {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  referrer: string | null
}

/**
 * Click-id params map to a source even without utm_source (e.g. ads that only append gclid).
 * Checked in order; first match wins.
 */
const CLICK_ID_SOURCES: Array<[param: string, source: string]> = [
  ['gclid', 'google_ads'],
  ['gbraid', 'google_ads'],
  ['wbraid', 'google_ads'],
  ['fbclid', 'facebook_ads'],
  ['msclkid', 'bing_ads'],
  ['ttclid', 'tiktok_ads'],
]

/**
 * Capture first-touch UTM params + referrer into localStorage. Called on every page
 * load; only writes once per browser so later internal navigation never overwrites the
 * original acquisition source. Safe to call repeatedly.
 */
export function captureAttributionFromUrl(search?: string): void {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(ATTRIBUTION_STORAGE_KEY)) return

    const params = new URLSearchParams(search ?? window.location.search)
    const utmSource = params.get('utm_source')?.trim() || null
    const utmMedium = params.get('utm_medium')?.trim() || null
    const utmCampaign = params.get('utm_campaign')?.trim() || null

    let resolvedSource = utmSource
    if (!resolvedSource) {
      for (const [param, source] of CLICK_ID_SOURCES) {
        if (params.get(param)) {
          resolvedSource = source
          break
        }
      }
    }

    const referrer = document.referrer?.trim() || null
    // Skip same-site referrers (internal navigation before signup) so "direct" isn't
    // misreported for a visitor who just clicked around the site first.
    const referrerIsExternal = referrer ? !referrer.startsWith(window.location.origin) : false

    if (!resolvedSource && !utmMedium && !utmCampaign && !referrerIsExternal) return

    const attribution: StoredAttribution = {
      utmSource: resolvedSource,
      utmMedium,
      utmCampaign,
      referrer: referrerIsExternal ? referrer : null,
    }
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    // ignore (blocked storage, privacy mode)
  }
}

export function getStoredAttribution(): StoredAttribution | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredAttribution
  } catch {
    return null
  }
}
