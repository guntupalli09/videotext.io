import type { Request, Response } from 'express'
import crypto from 'crypto'
import Stripe from 'stripe'
import { stripe, getPlanFromPriceId } from '../services/stripe'
import {
  getUserByStripeCustomerId,
  getUserByEmail,
  saveUser,
  User,
  PlanType,
} from '../models/User'
import { prisma } from '../db'
import { getPlanLimits } from '../utils/limits'
import { computeNormalizedMonthlyCentsFromInvoice, computeNormalizedMonthlyCentsFromInvoiceV2 } from '../utils/stripeMrr'
import { generatePasswordSetupToken } from '../utils/auth'
import { claimStripeEvent } from '../models/StripeEventLog'
import { enforceSubscriptionState } from '../utils/subscriptionGuard'
import { MRR_EXTRACTION_V2_SHADOW, MRR_EXTRACTION_V2_WRITE } from '../utils/featureFlags'
import { getLogger } from '../lib/logger'
import {
  trackSubscriptionCancelled,
  trackSubscriptionCancellationReversed,
  trackSubscriptionDeleted,
  trackSubscriptionRenewed,
  trackPaymentFailed,
  trackPlanUpgraded,
} from '../utils/analytics'
import { captureFunnelEvent } from '../utils/funnelEvents'
import { notifyFounderNewCustomer, notifyFounderActivationFailure } from '../utils/founderNotify'
import { sendPaymentFailedCustomerEmail } from '../utils/paymentFailedNotify'

const log = getLogger('api')

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find or create a User row for a Stripe customer.
 *
 * Lookup order:
 *   1. By stripeCustomerId (exact)
 *   2. By email (links an existing email-signup account to Stripe)
 *   3. Create a placeholder (plan=free; invoice.payment_succeeded will grant the plan)
 */
async function ensureUserForStripeCustomer(
  stripeCustomerId: string,
  emailHint?: string | null
): Promise<User> {
  const existingByStripe = await getUserByStripeCustomerId(stripeCustomerId)
  if (existingByStripe) return existingByStripe

  const email = (emailHint ?? '').trim().toLowerCase()
  if (email) {
    const existingByEmail = await getUserByEmail(email)
    if (existingByEmail) {
      existingByEmail.stripeCustomerId = stripeCustomerId
      existingByEmail.updatedAt = new Date()
      await saveUser(existingByEmail)
      log.info({
        msg: 'stripe: linked existing email account to Stripe customer',
        userId: existingByEmail.id,
        stripeCustomerId,
        email,
      })
      return existingByEmail
    }
  }

  const now = new Date()
  const fallbackEmail = email || `${stripeCustomerId}@stripe-placeholder.internal`
  const limits = getPlanLimits('free')
  const user: User = {
    id: crypto.randomUUID(),
    email: fallbackEmail,
    passwordHash: '',
    plan: 'free',
    stripeCustomerId,
    subscriptionId: undefined,
    subscriptionStatus: undefined,
    cancelAtPeriodEnd: false,
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
    overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
    createdAt: now,
    updatedAt: now,
  }
  await saveUser(user)
  log.info({
    msg: 'stripe: created placeholder user for Stripe customer',
    userId: user.id,
    stripeCustomerId,
    email: fallbackEmail,
  })
  return user
}

/**
 * Extract the BillingPlan from the first subscription item whose price ID we recognise.
 * Returns null if none match (e.g. unrecognised price ID — operator must add it to env).
 */
function getPlanFromSubscriptionItems(items: Stripe.SubscriptionItem[]): PlanType | null {
  for (const item of items) {
    const priceId = typeof item.price === 'string' ? item.price : item.price?.id
    if (!priceId) continue
    const plan = getPlanFromPriceId(priceId)
    if (plan) return plan
  }
  return null
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 *
 * Fires immediately when the checkout UI finishes — for card payments this is
 * synchronous with payment; for async methods (ACH, SEPA) payment_status may
 * still be 'unpaid' here.
 *
 * Responsibilities:
 *   - Link subscriptionId to the user record
 *   - Set billingPeriodStart / billingPeriodEnd from the subscription
 *   - Set subscriptionStatus = 'active' (paid) | 'incomplete' (async/unpaid)
 *   - Issue passwordSetupToken for brand-new accounts
 *   - DO NOT grant the plan here — invoice.payment_succeeded is authoritative
 */
async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  eventId: string
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session

  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : ''
  if (!stripeCustomerId) {
    log.warn({ msg: 'stripe: checkout.session.completed — no customer id', eventId })
    return
  }

  const email =
    session.customer_details?.email ||
    (session.metadata?.email ?? null)

  const user = await ensureUserForStripeCustomer(stripeCustomerId, email)
  const now = new Date()

  // Link the subscription and fetch its billing period
  if (session.mode === 'subscription' && typeof session.subscription === 'string') {
    user.subscriptionId = session.subscription

    try {
      const sub = await stripe.subscriptions.retrieve(session.subscription) as Stripe.Subscription & {
        current_period_start?: number
        current_period_end?: number
      }
      if (sub.current_period_end) {
        user.billingPeriodEnd = new Date(sub.current_period_end * 1000)
        user.billingPeriodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : undefined
        user.usageThisMonth = {
          ...user.usageThisMonth,
          resetDate: user.billingPeriodEnd,
        }
      }
    } catch (e) {
      log.warn({
        msg: 'stripe: checkout.session.completed — could not fetch subscription for billing period',
        eventId,
        subscriptionId: session.subscription,
        error: (e as Error).message,
      })
    }

    // payment_status reflects whether money has actually moved yet.
    // 'paid' = card/immediate; 'unpaid' = ACH/SEPA/bank-transfer still pending.
    // We set subscriptionStatus here so the UI can surface "payment pending" states.
    user.subscriptionStatus =
      session.payment_status === 'paid' ? 'active' : 'incomplete'
  }

  // Mint a one-time password-setup token for brand-new accounts (no hash yet).
  if (!user.passwordHash && !user.passwordSetupToken) {
    const { token, expiresAt } = generatePasswordSetupToken()
    user.passwordSetupToken = token
    user.passwordSetupExpiresAt = expiresAt
    user.passwordSetupUsed = false
  }

  user.updatedAt = now
  await saveUser(user)

  log.info({
    msg: 'stripe: checkout.session.completed processed',
    eventId,
    userId: user.id,
    stripeCustomerId,
    paymentStatus: session.payment_status,
    subscriptionId: user.subscriptionId,
    subscriptionStatus: user.subscriptionStatus,
  })
}

/**
 * invoice.payment_succeeded
 *
 * THE single authoritative source for granting paid-plan access.
 * Fires for:
 *   - Initial subscription payment (card: immediately after checkout; async: days later)
 *   - Every recurring renewal
 *   - Proration invoices from plan upgrades
 *
 * Responsibilities:
 *   - Resolve plan from invoice line items (price ID → plan name)
 *   - Grant that plan to the user
 *   - Set subscriptionStatus = 'active' (clears past_due if recovering from failed payment)
 *   - Update billingPeriodStart / billingPeriodEnd
 *   - Reset monthly usage counters
 *   - Create a SubscriptionSnapshot for MRR tracking
 */
async function handleInvoicePaymentSucceeded(
  event: Stripe.Event,
  eventId: string
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice

  const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : ''
  if (!stripeCustomerId) {
    log.warn({ msg: 'stripe: invoice.payment_succeeded — no customer id', eventId })
    return
  }

  const user = await ensureUserForStripeCustomer(
    stripeCustomerId,
    invoice.customer_email ?? undefined
  )
  // Captured before any mutation below, purely for the founder notification
  // (VIDEOTEXT STATUS: "Plan Before Payment") — never used for entitlement logic.
  const planBeforePayment = user.plan

  // Captured BEFORE this invoice's own SubscriptionSnapshot row is inserted
  // below. invoice.billing_reason === 'subscription_create' only tells us
  // this is the first invoice of THIS Stripe subscription object — a
  // customer who cancels and resubscribes months later gets a brand-new
  // subscription id and therefore a fresh 'subscription_create' too, even
  // though they are not a new customer. Checking for any prior
  // SubscriptionSnapshot row for this user (an append-only ledger written
  // on every past payment) lets us tell a true first-time payer apart from
  // a win-back resubscription, purely for the founder-notification wording
  // below — it has no effect on entitlement/plan logic.
  const hasPriorPaidHistory = (await prisma.subscriptionSnapshot.count({
    where: { userId: user.id },
  })) > 0

  // ── Resolve plan from invoice line items ──────────────────────────────────
  // Use the invoice's price details (Stripe 2026 API shape: pricing.price_details.price)
  let activePlan: PlanType | null = null
  let resolvedPriceId: string | null = null
  for (const line of invoice.lines.data) {
    const priceDetails = (line as { pricing?: { price_details?: { price?: string | { id: string } } } }).pricing?.price_details
    const priceId = priceDetails
      ? typeof priceDetails.price === 'string'
        ? priceDetails.price
        : priceDetails.price?.id ?? null
      : null
    if (!priceId) continue
    const plan = getPlanFromPriceId(priceId)
    if (plan) {
      activePlan = plan
      resolvedPriceId = priceId
      break
    }
  }

  if (!activePlan) {
    // This can happen when all price IDs on the invoice are unrecognised
    // (e.g. operator changed prices without updating env vars).  Keep the
    // existing plan so the user does not lose access, but log loudly.
    log.error({
      msg: 'stripe: invoice.payment_succeeded — no recognised price ID in line items; plan NOT updated',
      eventId,
      userId: user.id,
      stripeCustomerId,
      invoiceId: invoice.id,
      lineItemPrices: invoice.lines.data.map((l) => {
        const pd = (l as { pricing?: { price_details?: { price?: unknown } } }).pricing?.price_details
        return pd?.price ?? null
      }),
    })
  }

  // ── Update plan, status, and billing period ───────────────────────────────
  // Wrapped so a failure here (e.g. a DB error on saveUser) is captured
  // rather than aborting the function before the founder activation-failure
  // alert can be sent. The error is re-thrown at the end of this function,
  // unchanged from the original behavior (500 response, event already
  // claimed in StripeEventLog so it will not be silently retried).
  let entitlementError: Error | null = null
  try {
    if (activePlan) {
      user.plan = activePlan
      user.limits = getPlanLimits(activePlan)
    }

    user.subscriptionStatus = 'active'
    user.cancelAtPeriodEnd = false  // Recovering from past_due or completing a checkout clears this

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

    // ── Reset monthly usage for the new billing cycle ───────────────────────
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
    user.overagesThisMonth = {
      ...user.overagesThisMonth,
      minutes: 0,
      totalCharge: 0,
    }

    user.updatedAt = new Date()
    await saveUser(user)
    captureFunnelEvent({
      eventName: 'payment_completed',
      userId: user.id,
      source: 'stripe_invoice_payment_succeeded',
      plan: activePlan ?? user.plan,
      metadata: { invoice_id: invoice.id },
    }).catch(() => {})

    log.info({
      msg: 'stripe: invoice.payment_succeeded processed',
      eventId,
      userId: user.id,
      stripeCustomerId,
      invoiceId: invoice.id,
      plan: activePlan ?? user.plan,
      billingPeriodStart: startDate.toISOString(),
      billingPeriodEnd: endDate.toISOString(),
    })

    if (activePlan) {
      trackPlanUpgraded({
        user_id: user.id,
        plan: activePlan,
        stripe_customer_id: stripeCustomerId,
        email: user.email,
      })

      const mrrData = computeNormalizedMonthlyCentsFromInvoice(invoice)
      trackSubscriptionRenewed({
        user_id: user.id,
        plan: activePlan,
        mrr_cents: mrrData.normalizedMonthlyCents,
        billing_interval: mrrData.billingInterval ?? undefined,
      })
    }

    // ── Create MRR snapshot (non-fatal on failure) ──────────────────────────
    try {
      const mrr = computeNormalizedMonthlyCentsFromInvoice(invoice)

      // Analytics Sprint 1 (revised): shadow-compute the corrected (V2)
      // extraction alongside the legacy one. `mrrForSnapshot` defaults to the
      // legacy result — with both flags off this block is skipped entirely and
      // behavior is byte-for-byte unchanged from before this sprint.
      let mrrForSnapshot = mrr
      if (MRR_EXTRACTION_V2_SHADOW || MRR_EXTRACTION_V2_WRITE) {
        try {
          const mrrV2 = await computeNormalizedMonthlyCentsFromInvoiceV2(stripe, invoice.id)
          const matches =
            mrrV2.normalizedMonthlyCents === mrr.normalizedMonthlyCents &&
            mrrV2.stripeSubscriptionId === mrr.stripeSubscriptionId
          // Operator decision 2026-07-27 (Sprint 1, Option A): MRR is the
          // subscription's CONTRACTUAL value (mrrV2.normalizedMonthlyCents),
          // independent of any temporary invoice discount. `collectedCashCents`
          // is logged here as a distinct, separate figure (invoice.amount_paid)
          // — it must never be summed into or substituted for MRR anywhere.
          log.info({
            msg: 'mrr_extraction_shadow_compare',
            eventId,
            invoiceId: invoice.id,
            legacy: mrr,
            corrected: mrrV2,
            collectedCashCents: invoice.amount_paid,
            isDiscounted: invoice.amount_paid !== mrrV2.normalizedMonthlyCents && mrrV2.normalizedMonthlyCents > 0,
            matches,
          })
          if (MRR_EXTRACTION_V2_WRITE) {
            mrrForSnapshot = mrrV2
          }
        } catch (shadowErr) {
          // Shadow-mode failures must never affect the write path or throw —
          // fall back to the legacy (already-computed) result unconditionally.
          log.warn({
            msg: 'mrr_extraction_shadow_compare_failed',
            eventId,
            invoiceId: invoice.id,
            error: (shadowErr as Error).message,
          })
        }
      }

      const currency = (invoice.currency ?? 'usd').toLowerCase()
      await prisma.subscriptionSnapshot.create({
        data: {
          userId: user.id,
          plan: activePlan ?? user.plan,
          priceMonthly: mrrForSnapshot.normalizedMonthlyCents,
          currency,
          periodStart: startDate,
          periodEnd: endDate,
          status: 'active',
          stripeSubscriptionId: mrrForSnapshot.stripeSubscriptionId,
          stripePriceId: mrrForSnapshot.stripePriceId,
          billingInterval: mrrForSnapshot.billingInterval,
          intervalCount: mrrForSnapshot.intervalCount,
        },
      })
    } catch (err) {
      log.error({
        msg: 'stripe: SubscriptionSnapshot insert failed (invoice.payment_succeeded) — MRR data missing',
        eventId,
        userId: user.id,
        error: (err as Error).message,
      })
    }
  } catch (err) {
    entitlementError = err as Error
    log.error({
      msg: 'stripe: invoice.payment_succeeded — entitlement update failed',
      eventId,
      userId: user.id,
      stripeCustomerId,
      invoiceId: invoice.id,
      error: entitlementError.message,
    })
  }

  // ── Founder billing notification (side effect only) ─────────────────────────
  // Stripe payment is already confirmed (this handler only runs for
  // invoice.payment_succeeded, the authoritative paid-invoice event) and the
  // entitlement work above has already completed (success or failure) before
  // we get here, so the "Activation: SUCCESS" claim in the email is only ever
  // made when saveUser() actually committed the granted plan.
  //
  // Idempotency: this call happens inside a handler that only runs once per
  // real Stripe event id (see claimStripeEvent in the main webhook handler
  // below, which atomically claims the event BEFORE dispatch). A Stripe
  // webhook retry reuses the same event id, so the retry short-circuits as a
  // duplicate before ever reaching this code — no separate notification
  // table is needed for dedupe.
  //
  // "New subscription" vs "renewal" is decided by invoice.billing_reason, a
  // Stripe-authoritative field: 'subscription_create' fires exactly once,
  // on the first invoice of a *subscription object*; every renewal/cycle
  // invoice on that same subscription carries 'subscription_cycle' instead.
  // This is scoped to the subscription, not the customer: a customer who
  // cancels and resubscribes months later gets a new subscription id and
  // therefore another 'subscription_create'. hasPriorPaidHistory (computed
  // above, from the SubscriptionSnapshot ledger) distinguishes that win-back
  // case from an actual first-time payer for the email's wording only —
  // it does not change whether a notification is sent, only whether it's
  // labeled "New Customer" or "Returning Customer".
  const entitlementSucceeded = entitlementError === null && activePlan !== null
  const isFirstSubscriptionPayment = invoice.billing_reason === 'subscription_create'

  if (!entitlementSucceeded) {
    await notifyFounderActivationFailure({
      invoice,
      user,
      expectedPlan: activePlan,
      error: entitlementError,
    }).catch((notifyErr) => {
      log.error({
        msg: 'founder-notify: activation-failure alert threw unexpectedly (swallowed)',
        eventId,
        error: (notifyErr as Error).message,
      })
    })
  } else if (isFirstSubscriptionPayment && activePlan) {
    await notifyFounderNewCustomer({
      invoice,
      user,
      activePlan,
      planBeforePayment,
      priceId: resolvedPriceId,
      isReturningCustomer: hasPriorPaidHistory,
    }).catch((notifyErr) => {
      log.error({
        msg: 'founder-notify: new-customer email threw unexpectedly (swallowed)',
        eventId,
        error: (notifyErr as Error).message,
      })
    })
  }

  if (entitlementError) {
    // Preserve original behavior: surface the failure so it is loud in logs
    // and Stripe sees a 500. The event is already claimed in StripeEventLog,
    // so this will not cause a duplicate founder alert on Stripe's retry.
    throw entitlementError
  }
}

/**
 * invoice.payment_failed
 *
 * Fires when a charge attempt fails (initial or renewal).
 * Stripe will retry according to the Smart Retries / dunning schedule.
 *
 * We mark the subscription as past_due in our DB so:
 *   - The UI can surface a "update payment method" banner
 *   - Admin alerts can fire
 * We do NOT remove plan access here — Stripe is still retrying.
 * If all retries fail, Stripe fires customer.subscription.deleted and we
 * downgrade there (via enforceSubscriptionState).
 */
async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  eventId: string
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice & {
    last_payment_error?: { code?: string; message?: string }
  }

  const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : ''
  if (!stripeCustomerId) {
    log.warn({ msg: 'stripe: invoice.payment_failed — no customer id', eventId })
    return
  }

  const user = await getUserByStripeCustomerId(stripeCustomerId)
  if (!user) {
    log.warn({
      msg: 'stripe: invoice.payment_failed — user not found for customer',
      eventId,
      stripeCustomerId,
    })
    return
  }

  user.subscriptionStatus = 'past_due'
  user.updatedAt = new Date()
  await saveUser(user)

  const err = invoice.last_payment_error
  trackPaymentFailed({
    user_id: user.id,
    plan: user.plan,
    ...(err?.code && { error_code: err.code }),
    ...(err?.message && { error_message: err.message }),
  })

  log.error({
    msg: 'stripe: invoice.payment_failed — subscription marked past_due',
    eventId,
    userId: user.id,
    stripeCustomerId,
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
      : null,
    amountDueCents: invoice.amount_due,
    currency: invoice.currency,
  })

  await sendPaymentFailedCustomerEmail({ user, invoice }).catch((notifyErr) => {
    log.error({
      msg: 'payment-failed-notify: customer email threw unexpectedly (swallowed)',
      eventId,
      error: (notifyErr as Error).message,
    })
  })
}

/**
 * customer.subscription.created
 *
 * Fires when a new subscription object is created in Stripe.
 * For checkouts this fires before checkout.session.completed, so we use it
 * to eagerly link the subscriptionId and record the initial status.
 * Plan grant still happens in invoice.payment_succeeded.
 */
async function handleCustomerSubscriptionCreated(
  event: Stripe.Event,
  eventId: string
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }

  const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : ''
  if (!stripeCustomerId) return

  const user = await getUserByStripeCustomerId(stripeCustomerId)
  if (!user) {
    // User row may not exist yet (checkout.session.completed creates it).
    // That handler will set subscriptionId, so nothing to do here.
    log.info({
      msg: 'stripe: customer.subscription.created — user not found yet, will be created by checkout.session.completed',
      eventId,
      stripeCustomerId,
      subscriptionId: sub.id,
    })
    return
  }

  user.subscriptionId = sub.id
  user.subscriptionStatus = sub.status as string
  user.cancelAtPeriodEnd = sub.cancel_at_period_end ?? false

  if (sub.current_period_start) {
    user.billingPeriodStart = new Date(sub.current_period_start * 1000)
  }
  if (sub.current_period_end) {
    user.billingPeriodEnd = new Date(sub.current_period_end * 1000)
    user.usageThisMonth = { ...user.usageThisMonth, resetDate: user.billingPeriodEnd }
  }

  user.updatedAt = new Date()
  await saveUser(user)

  log.info({
    msg: 'stripe: customer.subscription.created processed',
    eventId,
    userId: user.id,
    stripeCustomerId,
    subscriptionId: sub.id,
    status: sub.status,
  })
}

/**
 * customer.subscription.updated
 *
 * Fires on ANY subscription change: cancel, uncancel, plan upgrade/downgrade,
 * trial end, billing cycle update, etc.
 *
 * Responsibilities:
 *   - Sync subscriptionStatus from Stripe
 *   - Sync cancelAtPeriodEnd
 *   - Sync billingPeriodStart / billingPeriodEnd (they can change on plan switch)
 *   - Detect plan change from subscription items and update plan immediately
 *     (handles both portal downgrades and end-of-period transitions)
 */
async function handleCustomerSubscriptionUpdated(
  event: Stripe.Event,
  eventId: string
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }

  const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : ''
  if (!stripeCustomerId) return

  const user = await getUserByStripeCustomerId(stripeCustomerId)
  if (!user) {
    log.warn({
      msg: 'stripe: customer.subscription.updated — user not found',
      eventId,
      stripeCustomerId,
      subscriptionId: sub.id,
    })
    return
  }

  const previousStatus = user.subscriptionStatus
  const previousPlan = user.plan
  const previousCancelAtPeriodEnd = user.cancelAtPeriodEnd

  // Sync subscription metadata
  user.subscriptionId = sub.id
  user.subscriptionStatus = sub.status as string
  user.cancelAtPeriodEnd = sub.cancel_at_period_end ?? false

  if (sub.current_period_start) {
    user.billingPeriodStart = new Date(sub.current_period_start * 1000)
  }
  if (sub.current_period_end) {
    user.billingPeriodEnd = new Date(sub.current_period_end * 1000)
    user.usageThisMonth = { ...user.usageThisMonth, resetDate: user.billingPeriodEnd }
  }

  // Detect plan change from subscription items.
  // If the price IDs changed (e.g. portal downgrade taking effect), update the plan.
  // This covers end-of-period downgrades where no proration invoice is generated.
  const planFromItems = getPlanFromSubscriptionItems(sub.items?.data ?? [])
  if (planFromItems && planFromItems !== user.plan && user.plan !== 'founding_workflow') {
    user.plan = planFromItems
    user.limits = getPlanLimits(planFromItems)
    log.info({
      msg: 'stripe: customer.subscription.updated — plan changed via subscription items',
      eventId,
      userId: user.id,
      stripeCustomerId,
      previousPlan,
      newPlan: planFromItems,
    })
  }

  user.updatedAt = new Date()
  await saveUser(user)

  // Analytics: detect cancel / uncancel transitions
  if (user.cancelAtPeriodEnd && !previousCancelAtPeriodEnd) {
    const cancelAt = user.billingPeriodEnd ?? new Date()
    trackSubscriptionCancelled({
      user_id: user.id,
      plan: user.plan,
      cancel_at: cancelAt,
    })
  } else if (!user.cancelAtPeriodEnd && previousCancelAtPeriodEnd) {
    trackSubscriptionCancellationReversed({ user_id: user.id, plan: user.plan })
  }

  log.info({
    msg: 'stripe: customer.subscription.updated processed',
    eventId,
    userId: user.id,
    stripeCustomerId,
    subscriptionId: sub.id,
    status: sub.status,
    previousStatus,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    previousCancelAtPeriodEnd,
    plan: user.plan,
    previousPlan,
  })
}

/**
 * customer.subscription.deleted
 *
 * Fires when a subscription is fully canceled (either by the user, by Stripe
 * after exhausting retries, or by the operator).
 *
 * Responsibilities:
 *   - Clear subscriptionId (no active subscription)
 *   - Set subscriptionStatus = 'canceled'
 *   - If billingPeriodEnd has already passed → downgrade to free immediately
 *   - If billingPeriodEnd is still in the future → keep the paid plan until
 *     the period expires; enforceSubscriptionState() handles the lazy downgrade
 *     when any route is next accessed
 *   - Create a SubscriptionSnapshot with status='canceled' for MRR churn tracking
 */
async function handleCustomerSubscriptionDeleted(
  event: Stripe.Event,
  eventId: string
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription & {
    current_period_end?: number
    cancel_at?: number | null
    ended_at?: number | null
  }

  const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : ''
  if (!stripeCustomerId) return

  const user = await getUserByStripeCustomerId(stripeCustomerId)
  if (!user) {
    log.warn({
      msg: 'stripe: customer.subscription.deleted — user not found',
      eventId,
      stripeCustomerId,
      subscriptionId: sub.id,
    })
    return
  }

  const periodEndUnix =
    sub.current_period_end ??
    sub.cancel_at ??
    sub.ended_at ??
    Math.floor(Date.now() / 1000)
  const periodEnd = new Date(periodEndUnix * 1000)
  const periodStart = user.billingPeriodStart ?? new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000)

  const deletedSubscriptionId = sub.id
  user.subscriptionId = undefined
  user.subscriptionStatus = 'canceled'
  user.cancelAtPeriodEnd = false
  user.billingPeriodEnd = periodEnd

  user.updatedAt = new Date()
  await saveUser(user)

  // Immediate downgrade if the billing period has already expired.
  // If still within the grace period, enforceSubscriptionState handles it lazily
  // but EAGERLY — it runs at the top of every resource-consuming route, so
  // API-only users are covered without needing to hit GET /api/usage/current.
  const now = new Date()
  await enforceSubscriptionState(user, now)

  log.info({
    msg: 'stripe: customer.subscription.deleted processed',
    eventId,
    userId: user.id,
    stripeCustomerId,
    subscriptionId: deletedSubscriptionId,
    periodEnd: periodEnd.toISOString(),
    immediateDowngrade: periodEnd < now,
    planAfter: user.plan,
  })

  trackSubscriptionDeleted({ user_id: user.id, plan: user.plan, period_end: periodEnd })

  // MRR churn snapshot
  try {
    await prisma.subscriptionSnapshot.create({
      data: {
        userId: user.id,
        plan: user.plan,
        priceMonthly: 0,
        currency: 'usd',
        periodStart,
        periodEnd,
        status: 'canceled',
        stripeSubscriptionId: deletedSubscriptionId,
        stripePriceId: null,
        billingInterval: null,
        intervalCount: null,
      },
    })
  } catch (err) {
    log.error({
      msg: 'stripe: SubscriptionSnapshot insert failed (customer.subscription.deleted) — MRR churn data missing',
      eventId,
      userId: user.id,
      error: (err as Error).message,
    })
  }
}

// ─── Main webhook handler ─────────────────────────────────────────────────────

export async function stripeWebhookHandler(req: Request, res: Response) {
  // Guard: webhook secret must be configured before serving traffic
  if (!webhookSecret) {
    log.error({ msg: 'stripe: STRIPE_WEBHOOK_SECRET is not set — webhook endpoint disabled' })
    return res.status(500).send('Webhook not configured')
  }

  // Reject requests without a Stripe-Signature header immediately
  const sig = req.headers['stripe-signature']
  if (!sig) {
    log.warn({ msg: 'stripe: request missing Stripe-Signature header — rejected' })
    return res.status(400).send('Missing Stripe-Signature header')
  }

  const buf = req.body as Buffer
  let event: Stripe.Event

  try {
    // constructEvent verifies the HMAC-SHA256 signature over the raw body.
    // Any tampered or replayed payload that doesn't match will throw here.
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    log.error({
      msg: 'stripe: webhook signature verification failed',
      error: (err as Error).message,
    })
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`)
  }

  log.info({
    msg: 'stripe: webhook received',
    eventId: event.id,
    eventType: event.type,
  })

  // ── Atomic idempotency claim ──────────────────────────────────────────────
  // INSERT … ON CONFLICT DO NOTHING: exactly one instance across the fleet
  // will get claimed === true.  All others skip immediately (return 200 so
  // Stripe stops retrying this event).
  const claimed = await claimStripeEvent(event)
  if (!claimed) {
    log.info({
      msg: 'stripe: duplicate event skipped (already claimed by another instance)',
      eventId: event.id,
      eventType: event.type,
    })
    return res.json({ received: true, duplicate: true })
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event, event.id)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event, event.id)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event, event.id)
        break

      case 'customer.subscription.created':
        await handleCustomerSubscriptionCreated(event, event.id)
        break

      case 'customer.subscription.updated':
        await handleCustomerSubscriptionUpdated(event, event.id)
        break

      case 'customer.subscription.deleted':
        await handleCustomerSubscriptionDeleted(event, event.id)
        break

      default:
        // Unhandled event types are silently acknowledged.
        // Add handlers above as needed; do not error on unknown types.
        log.info({ msg: 'stripe: unhandled event type (acknowledged)', eventId: event.id, eventType: event.type })
        break
    }

    log.info({ msg: 'stripe: webhook handled successfully', eventId: event.id, eventType: event.type })
    return res.json({ received: true })
  } catch (error) {
    // On handler error Stripe will retry.  The event ID is already claimed in
    // StripeEventLog, so retries will be treated as duplicates and skipped.
    // To allow a retry to reprocess after a bug fix, delete the event row from
    // StripeEventLog or use the Stripe Dashboard to resend the event with a new ID.
    log.error({
      msg: 'stripe: webhook handler threw — event will NOT be retried automatically',
      eventId: event.id,
      eventType: event.type,
      error: (error as Error).message,
    })
    return res.status(500).send('Webhook handler error')
  }
}
