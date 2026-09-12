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

function readAttributionParams(search?: string): {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  resolvedSource: string | null
  hasExplicitUtm: boolean
} {
  const params = new URLSearchParams(search ?? (typeof window !== 'undefined' ? window.location.search : ''))
  const utmSource = params.get('utm_source')?.trim() || null
  const utmMedium = params.get('utm_medium')?.trim() || null
  const utmCampaign = params.get('utm_campaign')?.trim() || null
  const hasExplicitUtm = !!(utmSource || utmMedium || utmCampaign)

  let resolvedSource = utmSource
  if (!resolvedSource) {
    for (const [param, source] of CLICK_ID_SOURCES) {
      if (params.get(param)) {
        resolvedSource = source
        break
      }
    }
  }

  return { utmSource, utmMedium, utmCampaign, resolvedSource, hasExplicitUtm }
}

/**
 * Capture UTM params + referrer into localStorage.
 * - First touch: write once when external referrer or click-id appears.
 * - Campaign links (explicit UTMs, e.g. guideline CTAs): always refresh so signup
 *   and job events attribute to the page that sent the user to the tool.
 */
export function captureAttributionFromUrl(search?: string): void {
  if (typeof window === 'undefined') return
  try {
    const { utmMedium, utmCampaign, resolvedSource, hasExplicitUtm } = readAttributionParams(search)
    const existing = getStoredAttribution()

    const referrer = document.referrer?.trim() || null
    const referrerIsExternal = referrer ? !referrer.startsWith(window.location.origin) : false

    if (hasExplicitUtm) {
      const attribution: StoredAttribution = {
        utmSource: resolvedSource ?? existing?.utmSource ?? null,
        utmMedium: utmMedium ?? existing?.utmMedium ?? null,
        utmCampaign: utmCampaign ?? existing?.utmCampaign ?? null,
        referrer:
          utmMedium === 'guideline_cta' && referrer
            ? referrer
            : referrerIsExternal
              ? referrer
              : existing?.referrer ?? null,
      }
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution))
      return
    }

    if (existing) return

    if (!resolvedSource && !utmCampaign && !referrerIsExternal) return

    const attribution: StoredAttribution = {
      utmSource: resolvedSource,
      utmMedium: null,
      utmCampaign: null,
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

/** Payload shape for signup API (maps stored fields to server body keys). */
export function getSignupAttributionPayload(): {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
} | null {
  const a = getStoredAttribution()
  if (!a) return null
  if (!a.utmSource && !a.utmMedium && !a.utmCampaign && !a.referrer) return null
  return {
    ...(a.utmSource ? { utmSource: a.utmSource } : {}),
    ...(a.utmMedium ? { utmMedium: a.utmMedium } : {}),
    ...(a.utmCampaign ? { utmCampaign: a.utmCampaign } : {}),
    ...(a.referrer ? { referrer: a.referrer } : {}),
  }
}
