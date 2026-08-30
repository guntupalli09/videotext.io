/**
 * Integration tests for founder "new paying customer" / activation-failure
 * notifications wired into the Stripe webhook (routes/stripeWebhook.ts +
 * utils/founderNotify.ts).
 *
 * Runs against a real Postgres instance (server/.env.development /
 * DATABASE_URL), same pattern as tests/adminConversionIntent.integration.test.ts.
 * Skips itself cleanly if DATABASE_URL isn't reachable.
 *
 * Exercises the REAL webhook entrypoint (stripeWebhookHandler), including
 * Stripe signature verification (via stripe.webhooks.generateTestHeaderString)
 * and the existing StripeEventLog idempotency claim — nothing about the
 * hardened webhook path is bypassed or mocked.
 *
 * The only thing mocked is `fetch`, to intercept outbound Resend API calls
 * instead of sending real email.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'

import { prisma } from '../src/db'
import { stripe } from '../src/services/stripe'
import { stripeWebhookHandler } from '../src/routes/stripeWebhook'

let dbAvailable = true

// ─── fetch mock (intercepts Resend calls only) ───────────────────────────────

type CapturedEmail = { subject: string; to: string[]; html: string; from: string }
let capturedEmails: CapturedEmail[] = []
let fetchShouldFail = false
const originalFetch = globalThis.fetch

function installFetchMock() {
  capturedEmails = []
  fetchShouldFail = false
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (
    url: string,
    init?: { body?: string }
  ) => {
    if (url !== 'https://api.resend.com/emails') {
      throw new Error(`unexpected fetch call in test: ${url}`)
    }
    if (fetchShouldFail) {
      return { ok: false, status: 500, text: async () => 'resend outage' } as Response
    }
    const body = JSON.parse(init?.body ?? '{}')
    capturedEmails.push(body)
    return { ok: true, status: 200, text: async () => '' } as Response
  }) as typeof fetch
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

// ─── fixture builders ─────────────────────────────────────────────────────────

function fakeInvoice(opts: {
  invoiceId: string
  customerId: string
  email: string
  priceId: string
  amountPaidCents: number
  billingReason: string
  subscriptionId?: string
  discounts?: unknown[]
}) {
  const now = Math.floor(Date.now() / 1000)
  return {
    id: opts.invoiceId,
    object: 'invoice',
    customer: opts.customerId,
    customer_email: opts.email,
    customer_name: null,
    currency: 'usd',
    amount_paid: opts.amountPaidCents,
    billing_reason: opts.billingReason,
    status_transitions: { paid_at: now },
    discounts: opts.discounts ?? [],
    parent: {
      type: 'subscription_details',
      subscription_details: { subscription: opts.subscriptionId ?? `sub_${opts.customerId}` },
    },
    period_start: now,
    period_end: now + 30 * 24 * 60 * 60,
    lines: {
      data: [
        {
          period: { start: now, end: now + 30 * 24 * 60 * 60 },
          pricing: { price_details: { price: opts.priceId } },
        },
      ],
    },
  }
}

function fakeEvent(id: string, invoiceObject: unknown) {
  return {
    id,
    object: 'event',
    api_version: '2026-01-28.clover',
    created: Math.floor(Date.now() / 1000),
    type: 'invoice.payment_succeeded',
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: { object: invoiceObject },
  }
}

/** Sign a fake event payload exactly the way Stripe signs real webhooks. */
function signedRequest(eventPayload: unknown) {
  const payload = JSON.stringify(eventPayload)
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  })
  const req = {
    headers: { 'stripe-signature': header },
    body: Buffer.from(payload),
  }
  let statusCode = 200
  let jsonBody: unknown
  let sentBody: unknown
  const res = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(body: unknown) {
      jsonBody = body
      return this
    },
    send(body: unknown) {
      sentBody = body
      return this
    },
  }
  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    getSent: () => sentBody,
  }
}

async function callWebhook(eventPayload: unknown) {
  const { req, res, getStatus, getJson, getSent } = signedRequest(eventPayload)
  await stripeWebhookHandler(req as never, res as never)
  return { status: getStatus(), json: getJson(), sent: getSent() }
}

function uniqueId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

const MONTHLY_PRICE_ID = process.env.STRIPE_PRO_MONTHLY_PRICE_ID!
const ANNUAL_PRICE_ID = process.env.STRIPE_PRO_ANNUAL_PRICE_ID!

test('setup: connect to test DB', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbAvailable = false
  }
})

test('1. first $7.99 monthly payment sends exactly one new-customer notification', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
  })

  const { status, json } = await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  assert.equal(status, 200)
  assert.deepEqual(json, { received: true })
  assert.equal(capturedEmails.length, 1)
  assert.match(capturedEmails[0].subject, /^New VideoText Customer — /)
  assert.match(capturedEmails[0].subject, /\$7\.99\/mo$/)

  restoreFetch()
})

test('2. first $69.99 annual payment sends exactly one new-customer notification', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: ANNUAL_PRICE_ID,
    amountPaidCents: 6999,
    billingReason: 'subscription_create',
  })

  const { status } = await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  assert.equal(status, 200)
  assert.equal(capturedEmails.length, 1)
  assert.match(capturedEmails[0].subject, /\$69\.99\/yr$/)

  restoreFetch()
})

test('3. monthly renewal sends no new-customer notification', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_cycle',
  })

  const { status } = await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  assert.equal(status, 200)
  assert.equal(capturedEmails.length, 0)

  restoreFetch()
})

test('4. annual renewal sends no new-customer notification', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: ANNUAL_PRICE_ID,
    amountPaidCents: 6999,
    billingReason: 'subscription_cycle',
  })

  const { status } = await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  assert.equal(status, 200)
  assert.equal(capturedEmails.length, 0)

  restoreFetch()
})

test('5. duplicate Stripe webhook delivery (same event id) sends at most one notification', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const eventId = uniqueId('evt')
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
  })
  const event = fakeEvent(eventId, invoice)

  const first = await callWebhook(event)
  assert.equal(first.status, 200)
  assert.equal(capturedEmails.length, 1)

  // Stripe retries reuse the same event id.
  const second = await callWebhook(event)
  assert.equal(second.status, 200)
  assert.deepEqual(second.json, { received: true, duplicate: true })
  assert.equal(capturedEmails.length, 1, 'duplicate delivery must not send a second email')

  restoreFetch()
})

test('6. payment succeeds + Pro activation succeeds -> email reports Activation: SUCCESS', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
  })

  await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  assert.equal(capturedEmails.length, 1)
  assert.match(capturedEmails[0].html, /Activation: SUCCESS/)

  const dbUser = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
  assert.equal(dbUser?.plan, 'pro')

  restoreFetch()
})

test('7. payment succeeds but entitlement activation fails -> URGENT alert, webhook still succeeds', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: 'price_totally_unrecognised_by_videotext',
    amountPaidCents: 799,
    billingReason: 'subscription_create',
  })

  const { status, json } = await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  // Webhook processing must not fail even though activation failed.
  assert.equal(status, 200)
  assert.deepEqual(json, { received: true })

  assert.equal(capturedEmails.length, 1)
  assert.match(capturedEmails[0].subject, /^URGENT: Stripe Paid but VideoText Activation Failed — /)
  assert.match(capturedEmails[0].html, new RegExp(email))

  restoreFetch()
})

test('8. email provider failure never blocks payment/entitlement processing', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  fetchShouldFail = true
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
  })

  const { status, json } = await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  assert.equal(status, 200)
  assert.deepEqual(json, { received: true })

  const dbUser = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
  assert.equal(dbUser?.plan, 'pro', 'entitlement must still be granted even though Resend failed')

  restoreFetch()
})

test('9. missing FOUNDER_BILLING_ALERT_EMAIL: webhook still succeeds, no email attempted', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  delete process.env.FOUNDER_BILLING_ALERT_EMAIL
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
  })

  const { status, json } = await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  assert.equal(status, 200)
  assert.deepEqual(json, { received: true })
  assert.equal(capturedEmails.length, 0)

  const dbUser = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
  assert.equal(dbUser?.plan, 'pro')

  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  restoreFetch()
})

test('10. notification includes correct customer email and VideoText user id', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
  })

  await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  const dbUser = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
  assert.ok(dbUser)

  assert.equal(capturedEmails.length, 1)
  assert.match(capturedEmails[0].html, new RegExp(`Email: ${email}`))
  assert.match(capturedEmails[0].html, new RegExp(`VideoText User ID: ${dbUser!.id}`))

  restoreFetch()
})

test('11. notification includes the actual amount paid', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
  })

  await callWebhook(fakeEvent(uniqueId('evt'), invoice))

  assert.equal(capturedEmails.length, 1)
  assert.match(capturedEmails[0].html, /Amount Paid: \$7\.99 USD/)

  restoreFetch()
})

test('12. discounted invoice reports the actual discounted amount paid, not list price', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`
  // List price is $7.99/mo, but a 100%-off-first-month promo means only
  // $0.00 was actually collected on this invoice.
  const invoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 0,
    billingReason: 'subscription_create',
    discounts: ['di_test_promo_abc'],
  })

  const { status } = await callWebhook(fakeEvent(uniqueId('evt'), invoice))
  assert.equal(status, 200)

  assert.equal(capturedEmails.length, 1)
  assert.match(capturedEmails[0].subject, /\$0\.00\/mo$/)
  assert.match(capturedEmails[0].html, /Amount Paid: \$0\.00 USD/)
  assert.match(capturedEmails[0].html, /Coupon\/Promotion: di_test_promo_abc/)
  assert.doesNotMatch(capturedEmails[0].html, /Amount Paid: \$7\.99/)

  restoreFetch()
})

test('13. win-back resubscription (new subscription_create on an old customer) is labeled Returning, not New Customer', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  installFetchMock()
  process.env.FOUNDER_BILLING_ALERT_EMAIL = 'founder@example.com'
  process.env.RESEND_API_KEY = 're_test_key'

  const customerId = uniqueId('cus')
  const email = `${customerId}@example.com`

  // First-ever payment: a true first-time customer.
  const firstInvoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
    subscriptionId: uniqueId('sub'),
  })
  await callWebhook(fakeEvent(uniqueId('evt'), firstInvoice))
  assert.equal(capturedEmails.length, 1)
  assert.match(capturedEmails[0].subject, /^New VideoText Customer — /)
  assert.match(capturedEmails[0].html, /Customer Type: New$/m)

  // Months later: same customer cancelled and started a brand-new
  // subscription. Stripe fires 'subscription_create' again (it's scoped to
  // the new subscription object, not the customer) — this must NOT be
  // reported as a new customer.
  const winBackInvoice = fakeInvoice({
    invoiceId: uniqueId('in'),
    customerId,
    email,
    priceId: MONTHLY_PRICE_ID,
    amountPaidCents: 799,
    billingReason: 'subscription_create',
    subscriptionId: uniqueId('sub'),
  })
  await callWebhook(fakeEvent(uniqueId('evt'), winBackInvoice))

  assert.equal(capturedEmails.length, 2)
  assert.match(capturedEmails[1].subject, /^New Subscription \(Returning Customer\) — /)
  assert.doesNotMatch(capturedEmails[1].subject, /^New VideoText Customer/)
  assert.match(capturedEmails[1].html, /Customer Type: Returning/)

  restoreFetch()
})

test('cleanup', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  // Best-effort cleanup of rows created by this file's uniqueId()-prefixed fixtures.
  await prisma.user.deleteMany({ where: { email: { contains: '@example.com' } } })
  await prisma.stripeEventLog.deleteMany({ where: { eventType: 'invoice.payment_succeeded' } })
})
