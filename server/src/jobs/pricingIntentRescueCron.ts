import { prisma } from '../db'
import { getLogger } from '../lib/logger'
import { createRedisClient } from '../utils/redis'
import { generateUnsubscribeToken } from '../routes/newsletter'
import { sendGrowthEmail } from '../utils/mailer'
import {
  RELEVANT_EVENT_NAMES,
  isUserConverted,
  type IntentEventRecord,
} from '../services/conversionIntent'

const log = getLogger('worker')
const redis = createRedisClient('client')

// How far back to look for new pricing-intent events each tick. Wider than the
// tick interval on purpose so a slow/late tick or a missed run never drops a visit.
const LOOKBACK_MS = 10 * 60 * 1000
// How often we check for new intent events. This is the "immediately" lever —
// a visitor can wait at most this long before their email goes out.
const TICK_MS = 60 * 1000
// Don't re-email the same person more than once in this window, even if they
// keep revisiting pricing — avoids turning a nudge into spam.
const COOLDOWN_SECONDS = 3 * 24 * 60 * 60

const TOOL_LABELS: Record<string, string> = {
  'video-to-transcript': 'transcript',
  'voice-to-transcript': 'voice-to-text',
  'video-to-subtitles': 'subtitles',
  'translate-subtitles': 'translation',
  'fix-subtitles': 'subtitle fix',
  'burn-subtitles': 'subtitle burn',
  'compress-video': 'compression',
  'batch-process': 'batch',
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 1) return `${seconds}s`
  if (mins < 60) return `${mins}-minute`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}-hour`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function emailHtml(bodyHtml: string, ctaUrl: string, unsubLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#161628;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e">
        <tr><td style="padding:34px 36px 12px">
          <p style="margin:0;color:#e5e5f5;font-size:15px;line-height:1.65">${bodyHtml}</p>
        </td></tr>
        <tr><td style="padding:0 36px 30px">
          <a href="${ctaUrl}" style="display:block;background:#2563EB;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700">See Pro — $7.99/mo</a>
        </td></tr>
        <tr><td style="padding:16px 36px 24px;border-top:1px solid #2d2d4e;text-align:center">
          <p style="margin:0;color:#404060;font-size:11px">VideoText.io · <a href="${unsubLink}" style="color:#404060">unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function runPricingIntentRescueCron(): Promise<void> {
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) return

  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const apiBaseUrl = (process.env.API_BASE_URL || 'https://api.videotext.io').replace(/\/$/, '')
  const since = new Date(Date.now() - LOOKBACK_MS)

  const events = await prisma.eventLog.findMany({
    where: { eventName: { in: RELEVANT_EVENT_NAMES }, userId: { not: null }, createdAt: { gte: since } },
    select: { userId: true, eventName: true, createdAt: true, metadata: true },
    orderBy: { createdAt: 'asc' },
  })
  if (events.length === 0) return

  const byUser = new Map<string, IntentEventRecord[]>()
  for (const e of events) {
    if (!e.userId) continue
    const list = byUser.get(e.userId) ?? []
    list.push({ eventName: e.eventName, createdAt: e.createdAt, metadata: e.metadata as Record<string, unknown> | null })
    byUser.set(e.userId, list)
  }

  const userIds = [...byUser.keys()]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true, plan: true, newsletterSubscribed: true },
  })

  let eligible = 0
  let sent = 0
  let skipped = 0

  for (const user of users) {
    if (isUserConverted(user.plan)) { skipped++; continue }
    if (!user.email || !user.email.includes('@') || user.email.startsWith('demo-user-')) { skipped++; continue }
    if (user.newsletterSubscribed === false) { skipped++; continue }

    const lockKey = `pricing_intent_rescue:${user.id}`
    const lock = await redis.set(lockKey, '1', 'EX', COOLDOWN_SECONDS, 'NX')
    if (lock !== 'OK') { skipped++; continue }

    eligible++

    // Pull real usage history to personalize — never fabricate a tool or duration
    // the user hasn't actually run.
    const jobs = await prisma.job.findMany({
      where: { userId: user.id, status: 'completed' },
      select: { toolType: true, videoDurationSec: true },
      orderBy: { completedAt: 'desc' },
      take: 20,
    })

    const firstName = (user.name || '').trim().split(/\s+/)[0] || ''
    const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,'

    let bodyHtml: string
    if (jobs.length > 0) {
      const toolCounts = new Map<string, number>()
      for (const j of jobs) toolCounts.set(j.toolType, (toolCounts.get(j.toolType) ?? 0) + 1)
      const topTool = [...toolCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      const toolLabel = TOOL_LABELS[topTool] ?? topTool
      const longestSec = jobs.reduce((max, j) => Math.max(max, j.videoDurationSec ?? 0), 0)
      const durationClause = longestSec > 0 ? ` — including one about ${formatDuration(longestSec)} long` : ''

      bodyHtml =
        `${greeting}<br><br>` +
        `Santhosh here, founder of VideoText. Saw you were just looking at pricing. You've already run ${jobs.length} ${toolLabel} job${jobs.length === 1 ? '' : 's'} through the free plan${durationClause}, so I'm guessing you know exactly what Pro would remove: the length caps and watermark.<br><br>` +
        `Pro is $7.99/month — same ${toolLabel} tool, no limits.`
    } else {
      bodyHtml =
        `${greeting}<br><br>` +
        `Santhosh here, founder of VideoText. Saw you were just looking at pricing. Happy to answer anything before you commit — what are you looking to use VideoText for?<br><br>` +
        `Pro is $7.99/month if you're ready, no complicated tiers.`
    }

    const unsubToken = generateUnsubscribeToken(user.email)
    const apiUnsubLink = `${apiBaseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(user.email)}&token=${unsubToken}`
    const html = emailHtml(bodyHtml, `${baseUrl}/pricing`, apiUnsubLink)

    const ok = await sendGrowthEmail({
      to: user.email,
      subject: jobs.length > 0 ? 'Saw you checking out Pro pricing' : 'Any questions on VideoText pricing?',
      html,
      unsubscribeUrl: apiUnsubLink,
    })
    if (ok) sent++
    else skipped++
  }

  if (eligible > 0) {
    log.info({ msg: 'Pricing intent rescue cron summary', eligible, sent, skipped })
  }
}

export function startPricingIntentRescueCron(): void {
  const enabled = process.env.PRICING_INTENT_RESCUE_EMAILS_ENABLED === 'true'
  if (!enabled) {
    log.info({ msg: 'Pricing intent rescue cron disabled (set PRICING_INTENT_RESCUE_EMAILS_ENABLED=true to enable)' })
    return
  }

  runPricingIntentRescueCron().catch((e) => {
    log.warn({ msg: 'Pricing intent rescue cron initial run failed', error: (e as Error)?.message })
  })

  setInterval(() => {
    runPricingIntentRescueCron().catch((e) => {
      log.warn({ msg: 'Pricing intent rescue cron run failed', error: (e as Error)?.message })
    })
  }, TICK_MS)
}
