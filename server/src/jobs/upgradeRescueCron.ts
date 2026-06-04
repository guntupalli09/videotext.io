import { prisma } from '../db'
import { getLogger } from '../lib/logger'
import { createRedisClient } from '../utils/redis'
import { generateUnsubscribeToken } from '../routes/newsletter'

const log = getLogger('api')
const redis = createRedisClient('client')

const RESCUE_SUBJECT = 'Finish your upgrade and keep your transcript workflow running'

function upgradeRescueHtml(ctaUrl: string, unsubLink: string): string {
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
            <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2">${RESCUE_SUBJECT}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 28px">
            <p style="margin:0;color:#a5a5c8;font-size:15px;line-height:1.65">Pick up where you left off. Upgrade now to keep your transcript workflow moving without limits.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 30px">
            <a href="${ctaUrl}" style="display:block;background:#2563EB;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700">Go to pricing</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 36px 24px;border-top:1px solid #2d2d4e;text-align:center">
            <p style="margin:0;color:#404060;font-size:11px">VideoText.io · <a href="${unsubLink}" style="color:#404060">unsubscribe</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function runUpgradeRescueCron(): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const now = Date.now()
  const minCreatedAt = new Date(now - 24 * 60 * 60 * 1000)
  const maxCreatedAt = new Date(now - 2 * 60 * 60 * 1000)

  const intents = await prisma.upgradeIntent.findMany({
    where: {
      createdAt: {
        gte: minCreatedAt,
        lte: maxCreatedAt,
      },
    },
    select: { id: true, userId: true, source: true, createdAt: true, user: { select: { email: true, plan: true, newsletterSubscribed: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const dedupedByUser = new Map<string, (typeof intents)[number]>()
  for (const intent of intents) {
    if (!dedupedByUser.has(intent.userId)) dedupedByUser.set(intent.userId, intent)
  }

  let eligible = 0
  let sent = 0
  let skipped = 0

  for (const intent of dedupedByUser.values()) {
    const email = intent.user?.email
    const plan = intent.user?.plan || 'free'

    if (!email || !email.includes('@') || email.startsWith('demo-user-')) {
      skipped += 1
      continue
    }
    if (plan !== 'free') {
      skipped += 1
      continue
    }
    if (intent.user?.newsletterSubscribed === false) {
      skipped += 1
      continue
    }

    const paymentCompleted = await prisma.eventLog.findFirst({
      where: {
        userId: intent.userId,
        eventName: 'payment_completed',
        createdAt: { gte: intent.createdAt },
      },
      select: { id: true },
    })

    if (paymentCompleted) {
      skipped += 1
      continue
    }

    eligible += 1

    const intentDate = intent.createdAt.toISOString().slice(0, 10)
    const lockKey = `upgrade_rescue:first:${intent.userId}:${intentDate}`
    const lock = await redis.set(lockKey, '1', 'EX', 35 * 24 * 60 * 60, 'NX')
    if (lock !== 'OK') {
      skipped += 1
      continue
    }

    const unsubToken = generateUnsubscribeToken(email)
    const unsubLink = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken}`
    const html = upgradeRescueHtml(`${baseUrl}/pricing`, unsubLink)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: RESCUE_SUBJECT,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubLink}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      signal: AbortSignal.timeout(8_000),
    })

    if (res.ok) {
      sent += 1
    } else {
      skipped += 1
      const body = await res.text().catch(() => '')
      log.warn({ msg: 'Upgrade rescue email send failed', status: res.status, userId: intent.userId, source: intent.source, body })
    }
  }

  log.info({ msg: 'Upgrade rescue cron summary', eligible, sent, skipped })
}

export function startUpgradeRescueCron(): void {
  const enabled = process.env.UPGRADE_RESCUE_EMAILS_ENABLED === 'true'
  if (!enabled) {
    log.info({ msg: 'Upgrade rescue cron disabled (set UPGRADE_RESCUE_EMAILS_ENABLED=true to enable)' })
    return
  }

  runUpgradeRescueCron().catch((e) => {
    log.warn({ msg: 'Upgrade rescue cron initial run failed', error: (e as Error)?.message })
  })

  setInterval(() => {
    runUpgradeRescueCron().catch((e) => {
      log.warn({ msg: 'Upgrade rescue cron run failed', error: (e as Error)?.message })
    })
  }, 60 * 60 * 1000)
}
