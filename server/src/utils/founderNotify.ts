/**
 * Founder billing notifications — a pure side effect of the Stripe webhook.
 *
 * IMPORTANT: nothing in this file may ever throw out to the caller. A failed
 * or misconfigured founder email must never fail Stripe webhook processing
 * or block entitlement activation — see stripeWebhook.ts, which calls these
 * functions after the entitlement/DB work is already complete.
 *
 * Idempotency: this module does not implement its own dedupe. It relies on
 * the existing StripeEventLog atomic claim (models/StripeEventLog.ts),
 * which is checked BEFORE the webhook dispatches to any handler. A Stripe
 * retry of the same event id never reaches this code a second time, so a
 * duplicate delivery can never produce a duplicate founder email. See the
 * idempotency note in stripeWebhook.ts for the full reasoning.
 *
 * Email delivery reuses the existing Resend integration already used by
 * auth.ts / adminSupport.ts / foundingTeam.ts (RESEND_API_KEY /
 * RESEND_FROM_EMAIL) — no new email vendor is introduced.
 */

import type Stripe from 'stripe'
import type { User, PlanType } from '../models/User'
import { prisma } from '../db'
import { getStripePriceConfig } from '../services/stripe'
import { getLogger } from '../lib/logger'

const log = getLogger('api')

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Send one email to the founder billing alert address. Never throws.
 * Safely no-ops (with a warning log) if FOUNDER_BILLING_ALERT_EMAIL or
 * RESEND_API_KEY is not configured.
 */
async function sendFounderEmail(subject: string, textBody: string): Promise<void> {
  try {
    const to = process.env.FOUNDER_BILLING_ALERT_EMAIL?.trim()
    if (!to) {
      log.warn({
        msg: 'founder-notify: FOUNDER_BILLING_ALERT_EMAIL is not set — skipping founder billing notification',
        subject,
      })
      return
    }

    const key = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
    if (!key) {
      log.warn({
        msg: 'founder-notify: RESEND_API_KEY is not set — skipping founder billing notification',
        subject,
      })
      return
    }

    const html = `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap;font-size:13px;line-height:1.5;color:#1a1a2e">${escapeHtml(textBody)}</pre>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })

    if (!res.ok) {
      log.error({
        msg: 'founder-notify: Resend API returned an error',
        status: res.status,
        body: await res.text().catch(() => ''),
        subject,
      })
      return
    }

    log.info({ msg: 'founder-notify: email sent', subject })
  } catch (err) {
    // Any failure here (network error, Resend outage, bad config) must never
    // propagate — this is a notification, not part of the payment transaction.
    log.error({ msg: 'founder-notify: send failed', error: (err as Error).message, subject })
  }
}

function money(cents: number, currency: string): string {
  return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
}

function billingLabel(interval: 'month' | 'year' | null): string {
  if (interval === 'month') return 'monthly'
  if (interval === 'year') return 'annual'
  return 'Unknown'
}

function billingSuffix(interval: 'month' | 'year' | null): string {
  if (interval === 'month') return '/mo'
  if (interval === 'year') return '/yr'
  return ''
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (!days && minutes) parts.push(`${minutes}m`)
  return parts.length ? parts.join(' ') : '<1m'
}

/** Best-effort coupon/promotion label. Returns null if none applied. */
function extractCoupon(invoice: Stripe.Invoice): string | null {
  const discounts = invoice.discounts ?? []
  if (discounts.length === 0) return null
  const labels = discounts.map((d) => {
    if (typeof d === 'string') return d
    const coupon = (d as Stripe.Discount).source?.coupon
    if (coupon && typeof coupon !== 'string') return coupon.name || coupon.id
    if (typeof coupon === 'string') return coupon
    const promo = (d as Stripe.Discount).promotion_code
    if (promo && typeof promo !== 'string') return promo.code
    if (typeof promo === 'string') return promo
    return d.id
  })
  return labels.filter(Boolean).join(', ') || null
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

/**
 * Billing interval from a recognised price ID, via the same env-configured
 * price map used by getPlanFromPriceId (services/stripe.ts).
 *
 * NOTE: we deliberately do NOT use utils/stripeMrr.ts's V1 extraction here —
 * on the account's pinned Stripe API version (2026-01-28.clover) invoice
 * line items no longer carry an expanded `price` object (see the V1/V2
 * comment block in stripeMrr.ts), so `computeNormalizedMonthlyCentsFromInvoice`
 * always returns `billingInterval: null` / `stripePriceId: null` in
 * production today. Comparing the priceId against our own known monthly vs.
 * annual env vars avoids that gap without an extra Stripe API round-trip.
 */
function billingIntervalFromPriceId(priceId: string | null): 'month' | 'year' | null {
  if (!priceId) return null
  try {
    const cfg = getStripePriceConfig()
    if (priceId === cfg.proAnnualPriceId || priceId === cfg.basicAnnualPriceId || priceId === cfg.agencyAnnualPriceId) {
      return 'year'
    }
    if (priceId === cfg.proMonthlyPriceId || priceId === cfg.basicPriceId || priceId === cfg.agencyPriceId) {
      return 'month'
    }
    return null
  } catch {
    return null
  }
}

/**
 * New paying customer — first successful subscription payment.
 * Only call this once entitlement activation is confirmed to have succeeded.
 */
export async function notifyFounderNewCustomer(params: {
  invoice: Stripe.Invoice
  user: User
  activePlan: PlanType
  planBeforePayment: PlanType
  priceId: string | null
}): Promise<void> {
  const { invoice, user, activePlan, planBeforePayment, priceId } = params

  const currency = (invoice.currency ?? 'usd').toUpperCase()
  // amount_paid is the actual cash collected on this invoice (reflects any
  // discount/coupon) — never the plan's list price. See spec: "Discount
  // does not incorrectly report list price as amount paid".
  const amountPaidLabel = money(invoice.amount_paid, currency)
  const interval = billingIntervalFromPriceId(priceId)
  const billing = billingLabel(interval)
  const paymentTime = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000)
    : new Date()
  const coupon = extractCoupon(invoice)
  const subscriptionId = subscriptionIdFromInvoice(invoice)

  // Subject uses the bare "$X.XX/mo" form (matches the spec's exact example);
  // the currency code is spelled out separately in the PURCHASE section below.
  const amountShort = `$${(invoice.amount_paid / 100).toFixed(2)}`
  const subject = `New VideoText Customer — ${user.email} — ${amountShort}${billingSuffix(interval)}`

  let conversionBlock = ''
  try {
    const firstIntent = await prisma.upgradeIntent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })
    if (firstIntent) {
      const timeToConversion = formatDuration(paymentTime.getTime() - firstIntent.createdAt.getTime())
      conversionBlock = [
        '',
        'CONVERSION',
        `Upgrade Source: ${firstIntent.source}`,
        `First Upgrade Click: ${firstIntent.createdAt.toISOString()}`,
        `Time to Conversion: ${timeToConversion}`,
      ].join('\n')
    }
  } catch (err) {
    // Missing conversion context is never fatal — just omit the section.
    log.warn({
      msg: 'founder-notify: could not load UpgradeIntent for conversion block',
      error: (err as Error).message,
      userId: user.id,
    })
  }

  const body = [
    'NEW VIDEOTEXT CUSTOMER',
    '',
    'CUSTOMER',
    `Name: ${user.name || 'Unknown'}`,
    `Email: ${user.email}`,
    `VideoText User ID: ${user.id}`,
    `Account Created: ${user.createdAt.toISOString()}`,
    '',
    'PURCHASE',
    `Plan: ${activePlan}`,
    `Billing: ${billing}`,
    `Amount Paid: ${amountPaidLabel}`,
    `Currency: ${currency}`,
    `Coupon/Promotion: ${coupon ?? 'None'}`,
    `Payment Time: ${paymentTime.toISOString()}`,
    '',
    'VIDEOTEXT STATUS',
    `Plan Before Payment: ${planBeforePayment}`,
    `Plan After Payment: ${activePlan}`,
    `Activation: SUCCESS`,
    `Subscription Status: ${user.subscriptionStatus ?? 'Unknown'}`,
    '',
    'STRIPE',
    `Customer ID: ${user.stripeCustomerId ?? 'Unknown'}`,
    `Subscription ID: ${subscriptionId ?? 'Unknown'}`,
    `Invoice ID: ${invoice.id}`,
    `Price ID: ${priceId ?? 'Unknown'}`,
    conversionBlock,
  ].join('\n')

  await sendFounderEmail(subject, body)
}

/**
 * CRITICAL: Stripe confirmed payment but VideoText failed to grant the
 * expected entitlement. Fires for both new-customer and renewal invoices —
 * this alert is about a broken activation path, not customer acquisition.
 */
export async function notifyFounderActivationFailure(params: {
  invoice: Stripe.Invoice
  user: User
  expectedPlan: PlanType | null
  error: Error | null
}): Promise<void> {
  const { invoice, user, expectedPlan, error } = params

  const currency = (invoice.currency ?? 'usd').toUpperCase()
  const amountPaidLabel = money(invoice.amount_paid, currency)
  const subscriptionId = subscriptionIdFromInvoice(invoice)

  const subject = `URGENT: Stripe Paid but VideoText Activation Failed — ${user.email}`

  const body = [
    'STRIPE CONFIRMED PAYMENT BUT VIDEOTEXT ACTIVATION FAILED',
    '',
    `Customer Email: ${user.email}`,
    `VideoText User ID: ${user.id}`,
    `Amount Paid: ${amountPaidLabel}`,
    `Stripe Customer ID: ${user.stripeCustomerId ?? 'Unknown'}`,
    `Subscription ID: ${subscriptionId ?? 'Unknown'}`,
    `Invoice ID: ${invoice.id}`,
    `Expected Plan: ${expectedPlan ?? 'Unknown (no recognised price ID on invoice)'}`,
    `Actual VideoText Plan: ${user.plan}`,
    `Subscription Status: ${user.subscriptionStatus ?? 'Unknown'}`,
    `Error/Context: ${error?.message ?? 'No recognised Stripe price ID found on invoice line items — plan was not updated'}`,
  ].join('\n')

  await sendFounderEmail(subject, body)
}
