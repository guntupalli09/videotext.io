/**
 * MRR-safe normalization for SubscriptionSnapshot.priceMonthly.
 * Uses only recurring subscription line items; ignores invoice.amount_paid
 * (which can include annual payments, proration, overage, tax, one-time charges).
 *
 * Currency: priceMonthly is in the invoice's currency (cents). For MRR queries to be
 * meaningful, either assume a single currency (e.g. USD-only) or convert to a base
 * currency before summing; raw summation across multiple currencies is invalid.
 */

import type Stripe from 'stripe'

/** Line item shape from Stripe invoice (supports both legacy and expanded price). */
type InvoiceLineLike = {
  type?: string
  price?: Stripe.Price | string | null
  subscription?: string | { id: string } | null
  period?: { start?: number; end?: number }
}

export interface NormalizedMrrResult {
  normalizedMonthlyCents: number
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  billingInterval: 'month' | 'year' | null
  intervalCount: number | null
}

/**
 * Extract unit_amount (cents) and recurring interval from a Stripe line item.
 * Handles both expanded Price object and pricing details where available.
 */
function getPriceRecurring(line: InvoiceLineLike): {
  unitAmount: number
  interval: 'month' | 'year'
  intervalCount: number
} | null {
  const price = line.price as Stripe.Price | string | null | undefined
  if (!price || typeof price === 'string') return null
  const recurring = price.recurring
  if (!recurring || !recurring.interval) return null
  const interval = recurring.interval as 'month' | 'year'
  if (interval !== 'month' && interval !== 'year') return null
  const unitAmount = price.unit_amount
  if (typeof unitAmount !== 'number' || unitAmount < 0) return null
  const intervalCount = Math.max(1, recurring.interval_count ?? 1)
  return { unitAmount, interval, intervalCount }
}

/**
 * Compute normalized monthly recurring revenue in cents from invoice line items.
 * Only includes lines with type === 'subscription' and price.recurring != null.
 * Ignores: invoiceitem, tax, overage, one-time.
 */
export function computeNormalizedMonthlyCentsFromLines(
  lines: InvoiceLineLike[]
): NormalizedMrrResult {
  let normalizedMonthlyCents = 0
  let first: {
    stripeSubscriptionId: string
    stripePriceId: string
    billingInterval: 'month' | 'year'
    intervalCount: number
  } | null = null

  for (const line of lines) {
    if ((line as { type?: string }).type !== 'subscription') continue
    const recurring = getPriceRecurring(line)
    if (!recurring) continue

    const { unitAmount, interval, intervalCount } = recurring
    let lineMonthly: number
    if (interval === 'month') {
      lineMonthly = unitAmount / intervalCount
    } else {
      lineMonthly = unitAmount / 12 / intervalCount
    }
    normalizedMonthlyCents += Math.round(lineMonthly)

    const sub = (line as { subscription?: string | { id: string } }).subscription
    const pr = (line as { price?: Stripe.Price | string }).price
    if (!first && sub && pr) {
      const priceId = typeof pr === 'string' ? pr : (pr as Stripe.Price).id
      first = {
        stripeSubscriptionId: typeof sub === 'string' ? sub : sub.id,
        stripePriceId: priceId,
        billingInterval: interval,
        intervalCount,
      }
    }
  }

  return {
    normalizedMonthlyCents,
    stripeSubscriptionId: first?.stripeSubscriptionId ?? null,
    stripePriceId: first?.stripePriceId ?? null,
    billingInterval: first?.billingInterval ?? null,
    intervalCount: first?.intervalCount ?? null,
  }
}

/**
 * Compute normalized MRR from a full Stripe Invoice (convenience wrapper).
 */
export function computeNormalizedMonthlyCentsFromInvoice(
  invoice: Stripe.Invoice
): NormalizedMrrResult {
  const data = (invoice.lines?.data ?? []) as InvoiceLineLike[]
  return computeNormalizedMonthlyCentsFromLines(data)
}

/**
 * Compute normalized monthly cents directly from a Stripe Subscription's
 * items (no invoice needed) — used to populate SubscriptionCurrentState from
 * customer.subscription.created/updated/deleted, which carry a Subscription
 * object, not an Invoice. Same normalization rule as the invoice-based
 * functions above (annual / 12, divided by interval_count).
 */
export function normalizedMonthlyCentsFromSubscriptionItems(
  items: Stripe.SubscriptionItem[]
): number {
  let normalizedMonthlyCents = 0
  for (const item of items) {
    const price = typeof item.price === 'string' ? null : item.price
    const recurring = price?.recurring
    if (!price || !recurring?.interval) continue
    const intervalCount = Math.max(1, recurring.interval_count ?? 1)
    const unitAmount = price.unit_amount ?? 0
    const quantity = item.quantity ?? 1
    const lineAmount = unitAmount * quantity
    normalizedMonthlyCents += Math.round(
      recurring.interval === 'year' ? lineAmount / 12 / intervalCount : lineAmount / intervalCount
    )
  }
  return normalizedMonthlyCents
}

// ─────────────────────────────────────────────────────────────────────────
// V2 extraction — corrected for the account's pinned Stripe API version
// (2026-01-28.clover). The functions above (`computeNormalizedMonthlyCentsFromLines`
// / `computeNormalizedMonthlyCentsFromInvoice`) were written against an older
// Invoice Line Item shape. Confirmed via a read-only production Stripe
// investigation (2026-07-27) that in this API version:
//   - `line.type` no longer exists; classification moved to `line.parent.type`
//     (`'subscription_item_details'` for recurring subscription lines).
//   - `line.price` is always null; the price now lives at
//     `line.pricing.price_details.price` — a bare string ID unless the
//     invoice was fetched with an explicit `expand` parameter.
//   - `line.subscription` / `invoice.subscription` are always null; the real
//     subscription id is at `line.parent.subscription_item_details.subscription`.
// These functions are additive — the V1 functions above are untouched and
// remain the only code path used while the MRR_EXTRACTION_V2_* flags
// (server/src/utils/featureFlags.ts) are off, preserving current behavior
// exactly. See docs/analytics/SPRINT_PLAN.md (Sprint 1, revised) and
// IMPLEMENTATION_PROGRESS.md for the full root-cause writeup.
// ─────────────────────────────────────────────────────────────────────────

/** Shape of an invoice line item's `parent` field in the 2026-01-28.clover API version. */
type InvoiceLineParentV2 = {
  type?: string
  subscription_item_details?: {
    subscription?: string | null
    subscription_item?: string | null
    proration?: boolean
  } | null
  invoice_item_details?: unknown
}

/** Shape of an invoice line item's `pricing` field in the 2026-01-28.clover API version. */
type InvoiceLinePricingV2 = {
  price_details?: {
    price?: string | Stripe.Price | null
    product?: string | null
  } | null
  unit_amount_decimal?: string | null
}

export type InvoiceLineLikeV2 = {
  id?: string
  parent?: InvoiceLineParentV2 | null
  pricing?: InvoiceLinePricingV2 | null
  period?: { start?: number; end?: number }
}

/**
 * Recurring-price cache for the fallback path (a line's price came back as a
 * bare string id even after requesting expand — e.g. a transient API quirk).
 * Prices change amount rarely; a short TTL keeps this safe without adding a
 * Stripe call on every single invoice line.
 */
const PRICE_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const priceCache = new Map<string, { price: Stripe.Price; fetchedAt: number }>()

async function resolvePriceV2(
  stripeClient: Pick<Stripe, 'prices'>,
  priceRef: string | Stripe.Price | null | undefined
): Promise<Stripe.Price | null> {
  if (!priceRef) return null
  if (typeof priceRef !== 'string') return priceRef // already an expanded object

  const cached = priceCache.get(priceRef)
  if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
    return cached.price
  }
  try {
    const price = await stripeClient.prices.retrieve(priceRef)
    priceCache.set(priceRef, { price, fetchedAt: Date.now() })
    return price
  } catch {
    // Never throw out of the fallback path — a failed lookup means this line
    // is skipped (treated as non-recurring/unresolvable), not a crash.
    return null
  }
}

function getPriceRecurringV2(price: Stripe.Price | null): {
  unitAmount: number
  interval: 'month' | 'year'
  intervalCount: number
} | null {
  if (!price) return null
  const recurring = price.recurring
  if (!recurring || !recurring.interval) return null
  const interval = recurring.interval as 'month' | 'year'
  if (interval !== 'month' && interval !== 'year') return null
  const unitAmount = price.unit_amount
  if (typeof unitAmount !== 'number' || unitAmount < 0) return null
  const intervalCount = Math.max(1, recurring.interval_count ?? 1)
  return { unitAmount, interval, intervalCount }
}

/**
 * Corrected line-classification check for the 2026-01-28.clover shape.
 * A line represents recurring subscription revenue (initial charge, renewal,
 * or a proration adjustment for an upgrade/downgrade) when its parent type is
 * 'subscription_item_details' — the `proration` boolean inside distinguishes
 * upgrade/downgrade adjustment lines from regular renewal lines, but both are
 * legitimate recurring-revenue lines and must both be included.
 */
function isRecurringSubscriptionLineV2(line: InvoiceLineLikeV2): boolean {
  return line.parent?.type === 'subscription_item_details' && Boolean(line.parent.subscription_item_details)
}

/**
 * Compute normalized MRR from invoice lines using the corrected (V2) field
 * paths, resolving each line's price via the already-expanded object when
 * present (preferred — zero extra API calls) or via a cached
 * `prices.retrieve()` call as a fallback (see resolvePriceV2).
 *
 * Callers should fetch the invoice with
 * `expand: ['lines.data.pricing.price_details.price']` so the preferred,
 * no-extra-call path is used; the fallback exists purely for resilience if a
 * line still comes back with a bare price id.
 */
export async function computeNormalizedMonthlyCentsFromLinesV2(
  stripeClient: Pick<Stripe, 'prices'>,
  lines: InvoiceLineLikeV2[]
): Promise<NormalizedMrrResult> {
  let normalizedMonthlyCents = 0
  let first: {
    stripeSubscriptionId: string
    stripePriceId: string
    billingInterval: 'month' | 'year'
    intervalCount: number
  } | null = null

  for (const line of lines) {
    if (!isRecurringSubscriptionLineV2(line)) continue

    const priceRef = line.pricing?.price_details?.price
    const price = await resolvePriceV2(stripeClient, priceRef)
    const recurring = getPriceRecurringV2(price)
    if (!recurring || !price) continue

    const { unitAmount, interval, intervalCount } = recurring
    const lineMonthly = interval === 'month' ? unitAmount / intervalCount : unitAmount / 12 / intervalCount
    normalizedMonthlyCents += Math.round(lineMonthly)

    const subscriptionId = line.parent?.subscription_item_details?.subscription
    if (!first && subscriptionId) {
      first = {
        stripeSubscriptionId: subscriptionId,
        stripePriceId: price.id,
        billingInterval: interval,
        intervalCount,
      }
    }
  }

  return {
    normalizedMonthlyCents,
    stripeSubscriptionId: first?.stripeSubscriptionId ?? null,
    stripePriceId: first?.stripePriceId ?? null,
    billingInterval: first?.billingInterval ?? null,
    intervalCount: first?.intervalCount ?? null,
  }
}

/**
 * Re-fetches the invoice by id with the price expansion needed for
 * zero-extra-call resolution, then computes corrected MRR from it.
 * This is a separate Stripe API call from the webhook payload itself —
 * required because Stripe webhook event payloads cannot be expanded after
 * delivery; only a fresh `invoices.retrieve` supports the `expand` param.
 * Never throws: on any failure, returns a zeroed result and the caller is
 * expected to log the error separately (see stripeWebhook.ts shadow-compare).
 */
export async function computeNormalizedMonthlyCentsFromInvoiceV2(
  stripeClient: Pick<Stripe, 'invoices' | 'prices'>,
  invoiceId: string
): Promise<NormalizedMrrResult> {
  const emptyResult: NormalizedMrrResult = {
    normalizedMonthlyCents: 0,
    stripeSubscriptionId: null,
    stripePriceId: null,
    billingInterval: null,
    intervalCount: null,
  }
  try {
    const expandedInvoice = await stripeClient.invoices.retrieve(invoiceId, {
      expand: ['lines.data.pricing.price_details.price'],
    })
    const lines = (expandedInvoice.lines?.data ?? []) as unknown as InvoiceLineLikeV2[]
    return await computeNormalizedMonthlyCentsFromLinesV2(stripeClient, lines)
  } catch {
    return emptyResult
  }
}
