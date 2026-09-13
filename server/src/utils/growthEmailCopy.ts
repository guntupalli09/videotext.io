import { PRICING_TIER_SPECS, formatMoney, resolvePricingTier, type PricingTier } from './geoPricing'
import type { IntentEventRecord } from '../services/conversionIntent'

export function toolTypeToCta(toolType?: string | null): { path: string; label: string } {
  switch (toolType) {
    case 'video-to-subtitles':
    case 'subtitles':
      return { path: '/video-to-subtitles', label: 'Open Video to Subtitles' }
    case 'translate-subtitles':
    case 'translation':
      return { path: '/translate-subtitles', label: 'Open Translate Subtitles' }
    case 'fix-subtitles':
      return { path: '/fix-subtitles', label: 'Open Fix Subtitles' }
    case 'burn-subtitles':
      return { path: '/burn-subtitles', label: 'Open Burn Subtitles' }
    case 'compress-video':
      return { path: '/compress-video', label: 'Open Compress Video' }
    case 'voice-to-text':
    case 'voice-to-transcript':
    case 'voice-recorder':
      return { path: '/voice-recorder', label: 'Open Voice to Text' }
    case 'guideline-formatting':
    case 'brand-guideline':
    case 'guideline-format':
      return { path: '/guideline-format', label: 'Open Guideline Format' }
    default:
      return { path: '/video-to-transcript', label: 'Open Video to Transcript' }
  }
}

export function proPriceLabelFromIntent(events: IntentEventRecord[], country?: string | null): string {
  for (const event of [...events].reverse()) {
    const tier = event.metadata?.pricing_tier
    if (typeof tier === 'string' && tier in PRICING_TIER_SPECS) {
      const spec = PRICING_TIER_SPECS[tier as PricingTier]
      return `${formatMoney(spec.monthly.amountCents, spec.monthly.currency)}/mo`
    }
  }
  const resolved = resolvePricingTier(country ?? null)
  const spec = PRICING_TIER_SPECS[resolved]
  return `${formatMoney(spec.monthly.amountCents, spec.monthly.currency)}/mo`
}
