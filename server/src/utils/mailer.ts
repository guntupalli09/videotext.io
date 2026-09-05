/**
 * Sends transactional/growth email via Gmail SMTP, using an App Password —
 * not Resend. Resend cannot send "as" a gmail.com address (Gmail's DMARC
 * policy rejects/spam-folds unauthorized senders claiming @gmail.com), and
 * the founder wants these emails to genuinely come from
 * santhoshguntupalli06@gmail.com, the same address all manual outreach this
 * quarter has come from — so this goes straight through Gmail's own SMTP,
 * same as if he sent it himself.
 *
 * Scope: this replaces Resend only in the growth-adjacent crons
 * (pricingIntentRescueCron, upgradeRescueCron, onboardingEmailCron,
 * paymentFailedNotify) — NOT auth.ts (OTP/login), adminSupport.ts, or
 * foundingTeam.ts, which are unrelated to marketing/growth and weren't
 * part of this change.
 *
 * Requires GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD in env. Gmail's
 * send limit for a regular account is ~500/day, comfortably above this
 * app's growth-email volume.
 */
import nodemailer from 'nodemailer'
import { getLogger } from '../lib/logger'

const log = getLogger('worker')

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (transporter) return transporter
  const user = process.env.GMAIL_SMTP_USER
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD
  if (!user || !pass) return null

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  })
  return transporter
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  fromName?: string
  unsubscribeUrl?: string
}

/** Sends one email via Gmail SMTP. Returns true on success, false on any failure (never throws). */
export async function sendGrowthEmail(opts: SendEmailOptions): Promise<boolean> {
  const t = getTransporter()
  const user = process.env.GMAIL_SMTP_USER
  if (!t || !user) {
    log.warn({ msg: 'mailer: GMAIL_SMTP_USER or GMAIL_SMTP_APP_PASSWORD not set — skipping send' })
    return false
  }

  try {
    await t.sendMail({
      from: `${opts.fromName || 'Santhosh'} <${user}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.unsubscribeUrl
        ? { headers: { 'List-Unsubscribe': `<${opts.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
        : {}),
    })
    return true
  } catch (e) {
    log.warn({ msg: 'mailer: send failed', to: opts.to, error: (e as Error)?.message })
    return false
  }
}
