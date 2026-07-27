/**
 * Analytics Sprint 1 (revised) — MRR extraction validation report.
 *
 * Read-only against Stripe (GET calls only — invoices.list, invoices.retrieve,
 * subscriptions.list). Never creates, updates, cancels, or deletes anything.
 * Writes nothing to the database. Compares the legacy (currently-inert)
 * extraction against the corrected V2 extraction for real production data,
 * covering the categories required before Sprint 1's write-path flag
 * (MRR_EXTRACTION_V2_WRITE) may be considered for enabling:
 *   - real invoices, active subscriptions, monthly price, annual price,
 *     upgrades/downgrades, cancellations, trial subscriptions.
 *
 * Usage (from server/):
 *   npx tsx src/scripts/mrr-extraction-validation-report.ts
 */

import 'dotenv/config'
import Stripe from 'stripe'
import {
  computeNormalizedMonthlyCentsFromInvoice,
  computeNormalizedMonthlyCentsFromInvoiceV2,
} from '../utils/stripeMrr'

const API_VERSION = '2026-01-28.clover' // must match server/src/services/stripe.ts exactly

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY not set — cannot run validation report.')
  process.exit(1)
}
const stripe = new Stripe(stripeSecretKey, { apiVersion: API_VERSION as Stripe.LatestApiVersion })

interface InvoiceComparisonRow {
  invoiceId: string
  amountPaid: number
  currency: string
  description: string
  legacy: ReturnType<typeof computeNormalizedMonthlyCentsFromInvoice>
  corrected: Awaited<ReturnType<typeof computeNormalizedMonthlyCentsFromInvoiceV2>>
  matches: boolean
  legacyCorrectlyExtracted: boolean
  correctedCorrectlyExtracted: boolean
  isDiscounted: boolean
}

async function compareInvoice(invoice: Stripe.Invoice): Promise<InvoiceComparisonRow> {
  const legacy = computeNormalizedMonthlyCentsFromInvoice(invoice)
  const corrected = await computeNormalizedMonthlyCentsFromInvoiceV2(stripe, invoice.id!)
  const description = invoice.lines.data[0]?.description ?? '(no line description)'
  const line = invoice.lines.data[0]
  const isDiscounted = (line?.discount_amounts?.length ?? 0) > 0
  const contractualLineAmount = line?.amount ?? null // pre-discount price commitment for this line

  return {
    invoiceId: invoice.id!,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    description,
    legacy,
    corrected,
    matches:
      legacy.normalizedMonthlyCents === corrected.normalizedMonthlyCents &&
      legacy.stripeSubscriptionId === corrected.stripeSubscriptionId,
    legacyCorrectlyExtracted: legacy.normalizedMonthlyCents > 0,
    // "Correctly extracted" is checked against the CONTRACTUAL line amount
    // (pre-discount), matching stripeMrr.ts's own documented design intent
    // ("ignores invoice.amount_paid" — see file header). This is NOT the same
    // as "matches what was actually collected this invoice" when a discount/
    // promo code applies — isDiscounted below flags exactly those cases so
    // the distinction is visible, not silently collapsed into a pass/fail.
    correctedCorrectlyExtracted:
      contractualLineAmount === null ||
      contractualLineAmount === undefined ||
      corrected.normalizedMonthlyCents === contractualLineAmount,
    isDiscounted,
  }
}

async function main(): Promise<void> {
  const report: Record<string, unknown> = { generatedAt: new Date().toISOString() }

  // ── 1. Real invoices (recent paid) ──────────────────────────────────────
  const recentPaid = await stripe.invoices.list({ status: 'paid', limit: 10 })
  const invoiceRows = await Promise.all(recentPaid.data.map(compareInvoice))
  report.recentPaidInvoices = invoiceRows

  const allCorrected = invoiceRows.every((r) => r.correctedCorrectlyExtracted)
  const anyLegacyCorrect = invoiceRows.some((r) => r.legacyCorrectlyExtracted)
  const discountedInvoices = invoiceRows.filter((r) => r.isDiscounted)
  report.summary = {
    sampleSize: invoiceRows.length,
    legacyExtractionEverWorks: anyLegacyCorrect, // expected: false, confirming the bug
    correctedExtractionAlwaysMatchesContractualLineAmount: allCorrected,
    discountedInvoiceCount: discountedInvoices.length,
    discountedInvoiceIds: discountedInvoices.map((r) => r.invoiceId),
    openQuestion:
      discountedInvoices.length > 0
        ? 'FLAGGED FOR OPERATOR DECISION: ' +
          discountedInvoices.length +
          ' of ' +
          invoiceRows.length +
          ' sampled invoices had a discount/promo code applied (amount_paid < contractual line amount). ' +
          'The corrected extraction reports the CONTRACTUAL price (matching the existing code\'s documented ' +
          'design intent of ignoring invoice.amount_paid), not the actual amount collected. This is a ' +
          'pre-existing design choice made operational for the first time by this fix, not a defect ' +
          'introduced by it — but it is a business decision (contractual run-rate vs. actual collected ' +
          'cash for discounted periods) that should be confirmed before enabling MRR_EXTRACTION_V2_WRITE.'
        : undefined,
  }

  // ── 2. Active subscriptions ──────────────────────────────────────────────
  const activeSubs = await stripe.subscriptions.list({ status: 'active', limit: 20 })
  report.activeSubscriptions = activeSubs.data.map((s) => {
    const item = s.items.data[0]
    const price = typeof item?.price === 'string' ? null : item?.price
    return {
      id: s.id,
      status: s.status,
      priceId: price?.id ?? (typeof item?.price === 'string' ? item.price : null),
      interval: price?.recurring?.interval ?? null,
      unitAmount: price?.unit_amount ?? null,
      // Confirms the separately-approved getPlanFromSubscriptionItems() check:
      // Subscription.items.data[].price is still a full object in this API
      // version (not restructured like Invoice line items were).
      priceIsExpandedObject: price !== null && price !== undefined,
    }
  })

  // ── 3. Monthly vs. annual price coverage ────────────────────────────────
  const intervals = new Set(
    (report.activeSubscriptions as { interval: string | null }[]).map((s) => s.interval).filter(Boolean)
  )
  report.pricingIntervalCoverage = {
    monthlyObserved: intervals.has('month'),
    annualObserved: intervals.has('year'),
    note: intervals.has('year')
      ? undefined
      : 'No live annual ("year" interval) subscriber found in active subscriptions sample. ' +
        'No STRIPE_PRICE_*_ANNUAL env vars are configured in this environment either. ' +
        'The /12 annual-normalization branch in stripeMrr.ts is exercised by the existing ' +
        'unit-test-equivalent logic path (computeNormalizedMonthlyCentsFromLines/V2 handle ' +
        '"year" identically regardless of whether a live example exists) but has NOT been ' +
        'validated against a real annual invoice. Flagged as an accepted, documented gap.',
  }

  // ── 4. Upgrades / downgrades (proration lines) ──────────────────────────
  const prorationLines = invoiceRows.filter((r) => r.description.toLowerCase().includes('proration'))
  report.upgradeDowngradeCoverage = {
    prorationLineFoundInSample: prorationLines.length > 0,
    note:
      prorationLines.length > 0
        ? undefined
        : 'No proration (upgrade/downgrade) line item found in the sampled invoices. Structurally, ' +
          'proration lines are classified with the same line.parent.type === "subscription_item_details" ' +
          'as regular renewal lines (confirmed via the raw investigation dump — proration is a boolean ' +
          'flag inside subscription_item_details, not a different parent.type), so isRecurringSubscriptionLineV2() ' +
          'in stripeMrr.ts already covers this case by construction. Flagged as analytically covered but not ' +
          'confirmed against a live upgrade/downgrade event.',
  }

  // ── 5. Cancellations ─────────────────────────────────────────────────────
  const canceledSubs = await stripe.subscriptions.list({ status: 'canceled', limit: 5 })
  report.cancellations = {
    sampleSize: canceledSubs.data.length,
    note:
      'Cancellation handling (handleCustomerSubscriptionDeleted in stripeWebhook.ts) does not call ' +
      'computeNormalizedMonthlyCentsFromInvoice/V2 at all — it hardcodes priceMonthly=0 for the ' +
      'cancellation SubscriptionSnapshot row by design. This bug and its fix do not affect that path; ' +
      'confirmed unaffected, not modified.',
  }

  // ── 6. Trial subscriptions ────────────────────────────────────────────────
  const trialingSubs = await stripe.subscriptions.list({ status: 'trialing', limit: 5 })
  report.trialSubscriptions = {
    sampleSize: trialingSubs.data.length,
    note:
      trialingSubs.data.length > 0
        ? undefined
        : 'No live trialing subscriptions found in this account. Not applicable to validate directly; ' +
          'flagged as an accepted, documented gap (same as annual pricing above).',
  }

  console.log(JSON.stringify(report, null, 2))

  console.log('\n=== Sprint 1 validation verdict ===')
  console.log(`Sample size (real paid invoices): ${invoiceRows.length}`)
  console.log(`Legacy extraction ever produces a non-zero result: ${anyLegacyCorrect} (expected: false)`)
  console.log(`Corrected extraction matches the contractual line amount for every sampled invoice: ${allCorrected} (required: true)`)
  console.log(`Discounted/promo invoices in sample: ${discountedInvoices.length} of ${invoiceRows.length} — see summary.openQuestion if > 0`)
  console.log(`Active subscriptions sampled: ${activeSubs.data.length}`)
  console.log(`Monthly interval observed live: ${intervals.has('month')}`)
  console.log(`Annual interval observed live: ${intervals.has('year')} (see pricingIntervalCoverage.note if false)`)
}

main().catch((err) => {
  console.error('Validation report failed:', err)
  process.exitCode = 1
})
