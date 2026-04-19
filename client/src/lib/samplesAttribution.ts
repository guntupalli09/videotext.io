export type SamplesModuleAttribution = {
  sourcePath: string
  samplesHref: string
  clickedAt: number
}

const STORAGE_KEY = 'videotext:samplesModuleAttribution'
const ATTRIBUTION_TTL_MS = 24 * 60 * 60 * 1000

export function saveSamplesModuleAttribution(payload: Omit<SamplesModuleAttribution, 'clickedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    const value: SamplesModuleAttribution = {
      ...payload,
      clickedAt: Date.now(),
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // non-blocking
  }
}

export function getSamplesModuleAttribution(): SamplesModuleAttribution | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SamplesModuleAttribution
    if (!parsed.clickedAt || Date.now() - parsed.clickedAt > ATTRIBUTION_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}
