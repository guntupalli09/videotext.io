/**
 * Customer-facing "your payment didn't go through" email — a pure side
 * effect of the Stripe webhook's invoice.payment_failed handler.
 *
 * Gap this closes: handleInvoicePaymentFailed (stripeWebhook.ts) already
 * marks the subscription past_due and logs/tracks the event, but never told
 * the customer. Stripe keeps retrying per its Smart Retries schedule, and
 * if every retry fails the subscription is silently canceled with no
 * warning ever sent — a real, observed cause of churn (see cancellation
 * reasons in Stripe: several past subscriptions show reason
 * "payment_failed", not "cancellation_requested").
 *
 * IMPORTANT: this must never throw out to the caller — see the .catch()
 * pattern at the call site in stripeWebhook.ts. A failed or misconfigured
 * email must never fail webhook processing.
 *
 * Idempotency: relies on the same StripeEventLog atomic claim the rest of
 * the webhook relies on (checked before any handler runs), so a Stripe
 * retry of the same event id never reaches this code twice. Each *distinct*
 * invoice.payment_failed event (day 1, day 3, day 5 of Stripe's retry
 * schedule) is a real, separate failure and intentionally gets its own
 * email — that's the dunning reminder cadence, not a duplicate.
 *
 * This is a transactional/billing email, not marketing — it is not gated
 * on newsletterSubscribed and carries no unsubscribe link, consistent with
 * how Stripe's own dunning emails and this app's receipt emails work.
 */

import type Stripe from 'stripe'
import type { User } from '../models/User'
import { getLogger } from '../lib/logger'

const log = getLogger('api')

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatAmount(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2)
  return `${amount} ${currency.toUpperCase()}`
}

function emailHtml(opts: { greeting: string; amountLine: string; retryLine: string; ctaUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#161628;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e">
        <tr>
          <td style="padding:34px 36px 12px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.3">Your VideoText payment didn't go through</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 20px">
            <p style="margin:0;color:#e5e5f5;font-size:15px;line-height:1.65">${escapeHtml(opts.greeting)}</p>
            <p style="margin:16px 0 0;color:#a5a5c8;font-size:14px;line-height:1.65">${escapeHtml(opts.amountLine)}</p>
            <p style="margin:12px 0 0;color:#a5a5c8;font-size:14px;line-height:1.65">${escapeHtml(opts.retryLine)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 30px">
            <a href="${opts.ctaUrl}" style="display:block;background:#2563EB;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700">Update payment method</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 36px 24px;border-top:1px solid #2d2d4e;text-align:center">
            <p style="margin:0;color:#404060;font-size:11px">VideoText.io · Questions? Just reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendPaymentFailedCustomerEmail(opts: {
  user: User
  invoice: Stripe.Invoice
}): Promise<void> {
  const { user, invoice } = opts
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    log.warn({ msg: 'payment-failed-notify: RESEND_API_KEY not set — skipping customer email' })
    return
  }
  if (!user.email || !user.email.includes('@') || user.email.startsWith('demo-user-')) {
    log.warn({ msg: 'payment-failed-notify: user has no usable email — skipping', userId: user.id })
    return
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')

  const firstName = (user.name || '').trim().split(/\s+/)[0] || ''
  const greeting = firstName
    ? `Hi ${firstName}, your last VideoText payment didn't go through. This can happen with an expired card, insufficient funds, or a bank decline — nothing on our end.`
    : `Your last VideoText payment didn't go through. This can happen with an expired card, insufficient funds, or a bank decline — nothing on our end.`

  const amountLine = invoice.amount_due
    ? `Amount due: ${formatAmount(invoice.amount_due, invoice.currency || 'usd')}`
    : ''

  const retryLine = invoice.next_payment_attempt
    ? `We'll automatically try again on ${new Date(invoice.next_payment_attempt * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, but updating your card now avoids losing access if that retry fails too.`
    : `We'll keep retrying automatically for a few days, but updating your card now avoids any interruption if those retries fail too.`

  const html = emailHtml({ greeting, amountLine, retryLine, ctaUrl: `${baseUrl}/pricing` })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: fromEmail,
        to: [user.email],
        subject: 'Your VideoText payment didn\'t go through',
        html,
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      log.error({
        msg: 'payment-failed-notify: Resend API returned an error',
        status: res.status,
        body: await res.text().catch(() => ''),
        userId: user.id,
      })
    }
  } catch (e) {
    log.error({ msg: 'payment-failed-notify: send threw', userId: user.id, error: (e as Error)?.message })
  }
}
