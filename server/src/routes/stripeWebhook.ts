import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { stripe, getPlanFromPriceId } from '../services/stripe'
import {
  getUserByStripeCustomerId,
  getUserByEmail,
  getUserByPasswordToken,
  saveUser,
  User,
  PlanType,
} from '../models/User'
import { prisma } from '../db'
import { getPlanLimits } from '../utils/limits'
import { computeNormalizedMonthlyCentsFromInvoice } from '../utils/stripeMrr'
import { generatePasswordSetupToken } from '../utils/auth'
import { hasProcessedStripeEvent, markStripeEventProcessed } from '../models/StripeEventLog'
import { getLogger } from '../lib/logger'
import {
  trackSubscriptionCancelled,
  trackSubscriptionCancellationReversed,
  trackSubscriptionDeleted,
  trackSubscriptionRenewed,
  trackPaymentFailed,
} from '../utils/analytics'

const log = getLogger('api')

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * Get or create a user for this Stripe customer. If an account already exists
 * with the same email (e.g. user signed up with email then paid), we link that
 * account to Stripe so email login shows the correct plan on all devices.
 */
async function ensureUserForStripeCustomer(
  stripeCustomerId: string,
  emailHint?: string | null
): Promise<User> {
  const existingByStripe = await getUserByStripeCustomerId(stripeCustomerId)
  if (existingByStripe) {
    return existingByStripe
  }

  const email = (emailHint || '').trim().toLowerCase()
  if (email) {
    const existingByEmail = await getUserByEmail(email)
    if (existingByEmail) {
      existingByEmail.stripeCustomerId = stripeCustomerId
      existingByEmail.updatedAt = new Date()
      await saveUser(existingByEmail)
      return existingByEmail
    }
  }

  const now = new Date()
  const fallbackEmail = email || `${stripeCustomerId}@example.com`
  const defaultPlan: PlanType = 'free'
  const limits = getPlanLimits(defaultPlan)

  const user: User = {
    id: stripeCustomerId,
    email: fallbackEmail,
    passwordHash: '',
    plan: defaultPlan,
    stripeCustomerId,
    subscriptionId: undefined,
    billingPeriodStart: undefined,
    billingPeriodEnd: undefined,
    passwordSetupToken: undefined,
    passwordSetupExpiresAt: undefined,
    passwordSetupUsed: false,
    usageThisMonth: {
      totalMinutes: 0,
      videoCount: 0,
      batchCount: 0,
      languageCount: 0,
      translatedMinutes: 0,
      importCount: 0,
      resetDate: now,
      importCountToday: 0,
      importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      dailyMinutesToday: 0,
      dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
    limits,
    overagesThisMonth: {
      minutes: 0,
      languages: 0,
      batches: 0,
      totalCharge: 0,
    },
    createdAt: now,
    updatedAt: now,
  }

  await saveUser(user)
  return user
}

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session

  const stripeCustomerId = (session.customer as string) || ''
  if (!stripeCustomerId) {
    return
  }

  const email =
    session.customer_details?.email || (session.metadata && session.metadata.email) || null
  const purchaseType = session.metadata?.purchaseType
  const planFromMetadata = session.metadata?.plan as PlanType | undefined

  let user = await ensureUserForStripeCustomer(stripeCustomerId, email)
  const now = new Date()

  // Link subscription and set billing period from Stripe (so "Resets" shows correct date, e.g. 1 month after purchase)
  if (session.mode === 'subscription' && typeof session.subscription === 'string') {
    user.subscriptionId = session.subscription
    try {
      const subscription = (await stripe.subscriptions.retrieve(
        session.subscription
      )) as { current_period_end?: number; current_period_start?: number }
      const periodEnd = subscription.current_period_end
      if (periodEnd) {
        const endDate = new Date(periodEnd * 1000)
        user.billingPeriodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : undefined
        user.billingPeriodEnd = endDate
        user.usageThisMonth = {
          ...user.usageThisMonth,
          importCount: user.usageThisMonth.importCount ?? 0,
          resetDate: endDate,
        }
      }
    } catch (e) {
      log.warn({ msg: 'Stripe could not fetch subscription for billing period', error: (e as Error)?.message ?? String(e) })
    }
  }

  // Activate subscription plan
  if (purchaseType === 'subscription' && planFromMetadata) {
    if (planFromMetadata === 'basic' || planFromMetadata === 'pro' || planFromMetadata === 'agency' || planFromMetadata === 'founding_workflow' || planFromMetadata === 'business') {
      user.plan = planFromMetadata
      user.limits = getPlanLimits(planFromMetadata)
    }
  }

  // Generate password setup token for new paid users (only if not already set by session-details)
  if (!user.passwordHash && !user.passwordSetupToken) {
    const { token, expiresAt } = generatePasswordSetupToken()
    user.passwordSetupToken = token
    user.passwordSetupExpiresAt = expiresAt
    user.passwordSetupUsed = false
  }

  user.updatedAt = now
  await saveUser(user)
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice

  const stripeCustomerId = (invoice.customer as string) || ''
  if (!stripeCustomerId) {
    return
  }

  let user = await ensureUserForStripeCustomer(
    stripeCustomerId,
    invoice.customer_email || undefined
  )

  // Determine active subscription plan from line items (Stripe API: pricing.price_details.price)
  let activePlan: PlanType | null = null
  for (const line of invoice.lines.data) {
    const priceDetails = line.pricing?.price_details
    const priceId =
      !priceDetails
        ? null
        : typeof priceDetails.price === 'string'
          ? priceDetails.price
          : priceDetails.price?.id ?? null
    if (!priceId) continue
    const plan = getPlanFromPriceId(priceId)
    if (plan) {
      activePlan = plan
      break
    }
  }

  if (activePlan) {
    user.plan = activePlan
    user.limits = getPlanLimits(activePlan)
  }

  // Use Stripe timestamps ONLY for billing period
  const periodStart =
    (invoice.lines.data[0]?.period?.start ??
      invoice.period_start ??
      Math.floor(Date.now() / 1000)) * 1000
  const periodEnd =
    (invoice.lines.data[0]?.period?.end ??
      invoice.period_end ??
      Math.floor(Date.now() / 1000)) * 1000

  const startDate = new Date(periodStart)
  const endDate = new Date(periodEnd)

  user.billingPeriodStart = startDate
  user.billingPeriodEnd = endDate

  // Reset usage strictly using Stripe billing period (preserve importCount for model shape)
  user.usageThisMonth = {
    ...user.usageThisMonth,
    totalMinutes: 0,
    videoCount: 0,
    batchCount: 0,
    languageCount: 0,
    translatedMinutes: 0,
    importCount: user.usageThisMonth.importCount ?? 0,
    resetDate: endDate,
  }

  // Clear overages for new cycle
  user.overagesThisMonth.minutes = 0
  user.overagesThisMonth.totalCharge = 0

  user.updatedAt = new Date()
  await saveUser(user)

  if (activePlan) {
    const mrrData = computeNormalizedMonthlyCentsFromInvoice(invoice)
    trackSubscriptionRenewed({
      user_id: user.id,
      plan: activePlan,
      mrr_cents: mrrData.normalizedMonthlyCents,
      billing_interval: mrrData.billingInterval ?? undefined,
    })
  }

  try {
    const plan = activePlan ?? user.plan
    const mrr = computeNormalizedMonthlyCentsFromInvoice(invoice)
    const currency = (invoice.currency ?? 'usd').toLowerCase()
    await prisma.subscriptionSnapshot.create({
      data: {
        userId: user.id,
        plan,
        priceMonthly: mrr.normalizedMonthlyCents,
        currency,
        periodStart: startDate,
        periodEnd: endDate,
        status: 'active',
        stripeSubscriptionId: mrr.stripeSubscriptionId,
        stripePriceId: mrr.stripePriceId,
        billingInterval: mrr.billingInterval,
        intervalCount: mrr.intervalCount,
      },
    })
  } catch (err) {
    log.warn({ msg: 'SubscriptionSnapshot insert failed (invoice.payment_succeeded)', error: (err as Error)?.message ?? String(err) })
  }
}

/**
 * Fires when a subscription is changed (e.g. user cancels via portal → cancel_at_period_end=true).
 * We store the cancellation date so the UI can show "Access until [date]" without instant downgrade.
 * The actual downgrade to Free happens in usage.ts when billingPeriodEnd passes.
 */
async function handleCustomerSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription & {
    cancel_at_period_end?: boolean
    cancel_at?: number | null
    current_period_end?: number
  }
  const stripeCustomerId = (subscription.customer as string) || ''
  if (!stripeCustomerId) return

  const user = await getUserByStripeCustomerId(stripeCustomerId)
  if (!user) return

  if (subscription.cancel_at_period_end) {
    // User cancelled — keep plan active until period end, record the cancellation date
    const cancelAt =
      (subscription.cancel_at ?? subscription.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000
    user.usageThisMonth = {
      ...user.usageThisMonth,
      subscriptionCancelingAt: new Date(cancelAt),
    }
    user.updatedAt = new Date()
    await saveUser(user)
    trackSubscriptionCancelled({
      user_id: user.id,
      plan: user.plan,
      cancel_at: new Date(cancelAt),
    })
  } else if (user.usageThisMonth.subscriptionCancelingAt) {
    // Cancellation was reversed (e.g. user re-subscribed) — clear the flag
    user.usageThisMonth = {
      ...user.usageThisMonth,
      subscriptionCancelingAt: undefined,
    }
    user.updatedAt = new Date()
    await saveUser(user)
    trackSubscriptionCancellationReversed({ user_id: user.id, plan: user.plan })
  }
}

async function handleCustomerSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription & {
    current_period_end?: number
  }
  const stripeCustomerId = (subscription.customer as string) || ''
  if (!stripeCustomerId) {
    return
  }

  const user = await getUserByStripeCustomerId(stripeCustomerId)
  if (!user) {
    return
  }

  const periodEnd =
    (subscription.current_period_end ??
      subscription.cancel_at ??
      subscription.ended_at ??
      Math.floor(Date.now() / 1000)) * 1000

  const endDate = new Date(periodEnd)

  // Keep access until period_end, but mark subscription as gone
  const periodStart = user.billingPeriodStart ?? new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  const deletedSubscriptionId = subscription.id
  user.subscriptionId = undefined
  user.billingPeriodEnd = endDate
  user.usageThisMonth.resetDate = endDate
  user.updatedAt = new Date()
  await saveUser(user)

  trackSubscriptionDeleted({ user_id: user.id, plan: user.plan, period_end: endDate })

  try {
    await prisma.subscriptionSnapshot.create({
      data: {
        userId: user.id,
        plan: user.plan,
        priceMonthly: 0,
        currency: 'usd',
        periodStart,
        periodEnd: endDate,
        status: 'canceled',
        stripeSubscriptionId: deletedSubscriptionId,
        stripePriceId: null,
        billingInterval: null,
        intervalCount: null,
      },
    })
  } catch (err) {
    log.warn({ msg: 'SubscriptionSnapshot insert failed (customer.subscription.deleted)', error: (err as Error)?.message ?? String(err) })
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice & {
    last_payment_error?: { code?: string; message?: string }
  }
  const stripeCustomerId = (invoice.customer as string) || ''
  if (!stripeCustomerId) return

  const user = await getUserByStripeCustomerId(stripeCustomerId)
  if (!user) return

  const err = invoice.last_payment_error
  trackPaymentFailed({
    user_id: user.id,
    plan: user.plan,
    ...(err?.code && { error_code: err.code }),
    ...(err?.message && { error_message: err.message }),
  })
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!webhookSecret) {
    log.error({ msg: 'STRIPE_WEBHOOK_SECRET is not configured.' })
    return res.status(500).send('Webhook not configured')
  }

  const sig = req.headers['stripe-signature'] as string | undefined
  const buf = req.body as Buffer

  let event: Stripe.Event

  try {
    // constructEvent verifies the HMAC-SHA256 signature using the webhook secret,
    // rejecting any payload that wasn't sent by Stripe.
    event = stripe.webhooks.constructEvent(buf, sig || '', webhookSecret)
  } catch (err: any) {
    log.error({ msg: 'Stripe webhook signature verification failed', error: (err as Error)?.message ?? String(err) })
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Idempotency: skip if already processed (Postgres-backed, survives restarts)
  if (await hasProcessedStripeEvent(event.id)) {
    return res.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event)
        break
      case 'customer.subscription.updated':
        await handleCustomerSubscriptionUpdated(event)
        break
      case 'customer.subscription.deleted':
        await handleCustomerSubscriptionDeleted(event)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event)
        break
      default:
        // Ignore all other event types
        break
    }

    await markStripeEventProcessed(event)
    return res.json({ received: true })
  } catch (error: any) {
    log.error({ msg: 'Error handling Stripe webhook event', eventType: event.type, error: (error as Error)?.message ?? String(error) })
    return res.status(500).send('Webhook handler error')
  }
}

