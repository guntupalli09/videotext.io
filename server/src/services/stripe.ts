import Stripe from 'stripe'
import { getLogger } from '../lib/logger'

const log = getLogger('api')

const REQUIRED_STRIPE_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_PRO',
] as const

/**
 * Fail fast at startup if any required Stripe env var is missing.
 * Call this when the API process starts; do not call from the worker process.
 */
export function assertStripeConfig(): void {
  const missing = REQUIRED_STRIPE_VARS.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0) {
    log.error({ msg: 'Stripe missing required env vars. Set these in the server .env or Docker env and restart the API', missing })
    process.exit(1)
  }
  try {
    getStripePriceConfig()
  } catch (e) {
    log.error({ msg: 'Stripe config error', error: (e as Error)?.message ?? String(e) })
    process.exit(1)
  }
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
assertStripeConfig()

// AUDIT: log Stripe mode at startup so it is always visible in server logs.
// If this prints TEST MODE and you are expecting live payments, your STRIPE_SECRET_KEY
// starts with sk_test_ — swap it for your sk_live_ key.
const stripeMode = stripeSecretKey?.startsWith('sk_live_') ? 'LIVE MODE' : 'TEST MODE'
log.info({ msg: `Stripe initialised — ${stripeMode}`, mode: stripeMode })

export const stripe = new Stripe(stripeSecretKey!, {
  apiVersion: '2026-01-28.clover',
})

export type BillingPlan = 'basic' | 'pro' | 'agency' | 'founding_workflow' | 'business'

export interface StripePriceConfig {
  proPriceId: string
  businessPriceId?: string
  proAnnualPriceId?: string
  // Grandfathered plan price IDs (optional — only needed for webhook handling of old subscribers)
  basicPriceId?: string
  agencyPriceId?: string
  foundingWorkflowPriceId?: string
  basicAnnualPriceId?: string
  agencyAnnualPriceId?: string
}

export function getStripePriceConfig(): StripePriceConfig {
  const proPriceId = process.env.STRIPE_PRICE_PRO
  if (!proPriceId) {
    throw new Error('Stripe price IDs are not fully configured. Expected STRIPE_PRICE_PRO.')
  }

  return {
    proPriceId,
    businessPriceId: process.env.STRIPE_PRICE_BUSINESS || undefined,
    proAnnualPriceId: process.env.STRIPE_PRICE_PRO_ANNUAL || undefined,
    // Grandfathered
    basicPriceId: process.env.STRIPE_PRICE_BASIC || undefined,
    agencyPriceId: process.env.STRIPE_PRICE_AGENCY || undefined,
    foundingWorkflowPriceId: process.env.STRIPE_PRICE_FOUNDING_WORKFLOW_MONTHLY || undefined,
    basicAnnualPriceId: process.env.STRIPE_PRICE_BASIC_ANNUAL || undefined,
    agencyAnnualPriceId: process.env.STRIPE_PRICE_AGENCY_ANNUAL || undefined,
  }
}

export function getPlanFromPriceId(priceId: string): BillingPlan | null {
  try {
    const config = getStripePriceConfig()
    if (priceId === config.proPriceId || (config.proAnnualPriceId && priceId === config.proAnnualPriceId)) return 'pro'
    if (config.businessPriceId && priceId === config.businessPriceId) return 'business'
    // Grandfathered plans
    if (config.basicPriceId && (priceId === config.basicPriceId || priceId === config.basicAnnualPriceId)) return 'basic'
    if (config.agencyPriceId && (priceId === config.agencyPriceId || priceId === config.agencyAnnualPriceId)) return 'agency'
    if (config.foundingWorkflowPriceId && priceId === config.foundingWorkflowPriceId) return 'founding_workflow'
    return null
  } catch {
    return null
  }
}

/**
 * Find a Stripe customer ID by email. Used when the user has a paid plan in our DB but
 * stripeCustomerId is missing (e.g. webhook missed, or account linked after checkout).
 * Prefers a customer that has an active subscription.
 */
export async function findStripeCustomerIdByEmail(email: string): Promise<string | null> {
  if (!email || !email.includes('@')) return null
  try {
    const list = await stripe.customers.list({ email: email.trim().toLowerCase(), limit: 10 })
    if (!list.data?.length) return null
    for (const customer of list.data) {
      if (customer.deleted) continue
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 })
      if (subs.data.length > 0) return customer.id
    }
    return list.data[0]?.deleted ? null : list.data[0].id
  } catch {
    return null
  }
}

/** Fetch active plan and email for a Stripe customer (e.g. after API restart when user is missing from memory). */
export async function getPlanAndEmailForStripeCustomer(
  customerId: string
): Promise<{ plan: BillingPlan; email: string; subscriptionId?: string; currentPeriodEnd?: number } | null> {
  try {
    const [customer, subs] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 }),
    ])
    if (customer.deleted) return null
    const email =
      (customer as Stripe.Customer).email ||
      (customer as Stripe.Customer).metadata?.email ||
      `${customerId}@customer.example.com`
    const sub = subs.data[0]
    if (!sub?.items?.data?.[0]) {
      return null
    }
    const priceId =
      typeof sub.items.data[0].price === 'string'
        ? sub.items.data[0].price
        : sub.items.data[0].price?.id
    const plan = priceId ? getPlanFromPriceId(priceId) : null
    if (!plan) return null
    const subWithPeriod = sub as { current_period_end?: number }
    return {
      plan,
      email,
      subscriptionId: sub.id,
      currentPeriodEnd: subWithPeriod.current_period_end ?? undefined,
    }
  } catch {
    return null
  }
}

/** Fetch subscription period end (for correcting reset date display). Returns null if not found or inactive. */
export async function getSubscriptionPeriodEnd(
  subscriptionId: string
): Promise<{ currentPeriodEnd: Date; currentPeriodStart: Date } | null> {
  try {
    const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as {
      status: string
      current_period_end?: number
      current_period_start?: number
    }
    if (sub.status !== 'active' || !sub.current_period_end) return null
    return {
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      currentPeriodStart: new Date(
        (sub.current_period_start ?? sub.current_period_end) * 1000
      ),
    }
  } catch {
    return null
  }
}

