import crypto from 'crypto'
import { prisma } from '../db'
import { generateUnsubscribeToken } from '../routes/newsletter'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'

const redis = createRedisClient('client')
const log = getLogger('worker')

export function makeFeedbackEmailToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'changeme'
  return crypto.createHmac('sha256', secret).update(`email_feedback:${userId}`).digest('hex').slice(0, 24)
}

function feedbackEmailHtml(
  baseUrl: string,
  userId: string,
  token: string,
  unsubLink: string
): string {
  const rateUrl = (n: number) =>
    `${baseUrl}/api/feedback/email-rate?userId=${encodeURIComponent(userId)}&rating=${n}&token=${encodeURIComponent(token)}`

  const starCells = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<td style="padding:0 5px"><a href="${rateUrl(n)}" style="display:block;width:52px;height:52px;line-height:52px;text-align:center;background:#1e1e36;border:1px solid #2d2d4e;border-radius:10px;color:#fbbf24;text-decoration:none;font-size:26px">★</a></td>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#161628;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e">
        <tr>
          <td style="padding:36px 36px 12px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.3">How was your first transcription?</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 20px">
            <p style="margin:0;color:#a5a5c8;font-size:15px;line-height:1.65;text-align:center">You just ran your first job on VideoText. We'd love to know how it went — takes one click.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 28px;text-align:center">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr>${starCells}</tr>
              <tr>
                <td colspan="5" style="padding-top:10px;text-align:center">
                  <p style="margin:0;color:#5a5a7a;font-size:11px">1 = poor &nbsp;&nbsp;&nbsp; 5 = excellent</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 28px;text-align:center">
            <p style="margin:0;color:#a5a5c8;font-size:13px">Want to share more? <a href="${baseUrl}" style="color:#2563EB;text-decoration:none;font-weight:600">Open VideoText →</a></p>
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

export async function runFeedbackEmailCron(): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  const now = Date.now()

  // Target: users whose first completed job finished 2–6 hours ago
  const windowStart = new Date(now - 6 * 60 * 60 * 1000)
  const windowEnd = new Date(now - 2 * 60 * 60 * 1000)

  const recentlyCompleted = await prisma.job.findMany({
    where: {
      status: 'completed',
      completedAt: { gte: windowStart, lte: windowEnd },
      userId: { not: '' },
    },
    select: { userId: true },
    distinct: ['userId'],
  })

  const candidateIds = recentlyCompleted.map((j) => j.userId).filter(Boolean)
  if (candidateIds.length === 0) return

  // Keep only users with no completed jobs before the window (truly their first)
  const priorJobs = await prisma.job.groupBy({
    by: ['userId'],
    where: {
      userId: { in: candidateIds },
      status: 'completed',
      completedAt: { lt: windowStart },
    },
    _count: { _all: true },
  })
  const hasPriorJob = new Set(priorJobs.map((r) => r.userId))
  const firstTimerIds = candidateIds.filter((id) => !hasPriorJob.has(id))
  if (firstTimerIds.length === 0) return

  const users = await prisma.user.findMany({
    where: {
      id: { in: firstTimerIds },
      newsletterSubscribed: { not: false },
      email: { not: { startsWith: 'demo-user-' }, contains: '@' },
    },
    select: { id: true, email: true },
  })

  let sent = 0
  let skipped = 0

  for (const user of users) {
    const key = `feedback_email:first_job:${user.id}`
    const alreadySent = await redis.get(key)
    if (alreadySent) {
      skipped++
      continue
    }

    const token = makeFeedbackEmailToken(user.id)
    const unsubToken = generateUnsubscribeToken(user.email)
    const unsubLink = `${baseUrl}/unsubscribe?email=${encodeURIComponent(user.email)}&token=${unsubToken}`
    const apiUnsubLink = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(user.email)}&token=${unsubToken}`
    const html = feedbackEmailHtml(baseUrl, user.id, token, unsubLink)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: fromEmail,
        to: [user.email],
        subject: 'Quick question: how was your first VideoText job?',
        html,
        headers: {
          'List-Unsubscribe': `<${apiUnsubLink}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      signal: AbortSignal.timeout(8_000),
    })

    if (res.ok) {
      sent++
      await redis.set(key, '1', 'EX', 60 * 60 * 24 * 90)
    } else {
      skipped++
      const body = await res.text().catch(() => '')
      log.warn({ msg: 'Feedback email send failed', status: res.status, email: user.email, body })
    }
  }

  log.info({
    msg: 'Feedback email cron',
    candidates: candidateIds.length,
    firstTimers: firstTimerIds.length,
    eligible: users.length,
    sent,
    skipped,
  })
}

export function startFeedbackEmailCron(): void {
  if (process.env.FEEDBACK_EMAILS_ENABLED !== 'true') return

  runFeedbackEmailCron().catch((e) => {
    log.warn({ msg: 'Feedback email cron initial run failed', error: (e as Error)?.message })
  })

  setInterval(() => {
    runFeedbackEmailCron().catch((e) => {
      log.warn({ msg: 'Feedback email cron run failed', error: (e as Error)?.message })
    })
  }, 15 * 60 * 1000)
}
