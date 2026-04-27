import { prisma } from '../db'
import { createMagicLinkToken } from '../routes/auth'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const redis = createRedisClient('client')

type SequenceDay = 0 | 1 | 3 | 7 | 14

const TEMPLATE: Record<SequenceDay, { subject: string; body: string }> = {
  0: {
    subject: 'Your first transcript is 40 seconds away',
    body: 'Upload one video (or paste a YouTube URL) and VideoText will generate transcript + SRT + summary + chapters in one run.',
  },
  1: {
    subject: 'Need subtitles too? One-click SRT/VTT export',
    body: 'Most new users miss this: you can export subtitles, not just transcript text. Tip: turn on speaker labels for interviews and podcasts.',
  },
  3: {
    subject: 'Steal this workflow: video → transcript → summary → chapter timestamps',
    body: 'Use this to repurpose one long video into description copy, show notes, and chapter markers.',
  },
  7: {
    subject: 'Still transcribing manually?',
    body: 'Do one 5-minute test file here and compare output quality + speed. It takes less than a minute.',
  },
  14: {
    subject: 'Last nudge: get your first output today',
    body: 'If your first transcript + subtitle output does not beat your current workflow in speed and quality, just ignore this email.',
  },
}

function getSequenceDay(hoursSinceSignup: number): SequenceDay | null {
  if (hoursSinceSignup < 24) return 0
  if (hoursSinceSignup >= 24 && hoursSinceSignup < 48) return 1
  if (hoursSinceSignup >= 72 && hoursSinceSignup < 96) return 3
  if (hoursSinceSignup >= 168 && hoursSinceSignup < 192) return 7
  if (hoursSinceSignup >= 336 && hoursSinceSignup < 360) return 14
  return null
}

function onboardingHtml(sequenceDay: SequenceDay, ctaUrl: string): string {
  const t = TEMPLATE[sequenceDay]
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
            <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2">${t.subject}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 28px">
            <p style="margin:0;color:#a5a5c8;font-size:15px;line-height:1.65">${t.body}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 30px">
            <a href="${ctaUrl}" style="display:block;background:#7c3aed;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700">Open VideoText</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function runOnboardingEmailSequence(): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  const now = Date.now()
  const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: {
      plan: 'free',
      createdAt: { gte: fifteenDaysAgo },
      email: { not: { startsWith: 'demo-user-' }, contains: '@' },
    },
    select: { id: true, email: true, createdAt: true, usageThisMonth: true },
    orderBy: { createdAt: 'desc' },
  })

  const eligibleUsers = users.filter((user) => {
    const usage = (user.usageThisMonth ?? {}) as { importCount?: number }
    return Number(usage.importCount ?? 0) === 0
  })
  const day0Users = eligibleUsers.filter((u) => {
    const hours = (now - u.createdAt.getTime()) / (60 * 60 * 1000)
    return hours < 24
  })
  const day1Users = eligibleUsers.filter((u) => {
    const hours = (now - u.createdAt.getTime()) / (60 * 60 * 1000)
    return hours >= 24 && hours < 48
  })
  const day3Users = eligibleUsers.filter((u) => {
    const hours = (now - u.createdAt.getTime()) / (60 * 60 * 1000)
    return hours >= 72 && hours < 96
  })
  const day7Users = eligibleUsers.filter((u) => {
    const hours = (now - u.createdAt.getTime()) / (60 * 60 * 1000)
    return hours >= 168 && hours < 192
  })
  const day14Users = eligibleUsers.filter((u) => {
    const hours = (now - u.createdAt.getTime()) / (60 * 60 * 1000)
    return hours >= 336 && hours < 360
  })

  let sent = 0
  for (const user of eligibleUsers) {
    const usage = (user.usageThisMonth ?? {}) as { importCount?: number }
    const importCount = Number(usage.importCount ?? 0)
    if (importCount > 0) continue // already activated

    const hours = (now - user.createdAt.getTime()) / (60 * 60 * 1000)
    const day = getSequenceDay(hours)
    if (day == null) continue

    const lockKey = `onboarding:${user.id}:day-${day}`
    const lock = await redis.set(lockKey, '1', 'EX', 45 * 24 * 60 * 60, 'NX')
    if (lock !== 'OK') continue

    const token = await createMagicLinkToken(user.id)
    const ctaUrl = `${baseUrl}/magic-login?token=${encodeURIComponent(token)}&next=/video-to-transcript`
    const html = onboardingHtml(day, ctaUrl)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: fromEmail, to: [user.email], subject: TEMPLATE[day].subject, html }),
      signal: AbortSignal.timeout(8_000),
    })

    if (res.ok) {
      sent += 1
    } else {
      const body = await res.text().catch(() => '')
      log.warn({ msg: 'Onboarding email send failed', status: res.status, email: user.email, sequenceDay: day, body })
    }
  }

  log.info('Onboarding debug', {
    totalUsers: users.length,
    eligible: eligibleUsers.length,
    day0: day0Users.length,
    day1: day1Users.length,
    day3: day3Users.length,
    day7: day7Users.length,
    day14: day14Users.length,
    sent,
  })
}

export function startOnboardingEmailCron(): void {
  const enabled = process.env.ONBOARDING_EMAILS_ENABLED === 'true'
  if (!enabled) {
    log.info({ msg: 'Onboarding email cron disabled (set ONBOARDING_EMAILS_ENABLED=true to enable)' })
    return
  }

  const intervalMinutes = Number(process.env.ONBOARDING_EMAILS_INTERVAL_MINUTES ?? '15')
  const intervalMs = Math.max(5, Number.isFinite(intervalMinutes) ? intervalMinutes : 15) * 60 * 1000

  runOnboardingEmailSequence().catch((e) => {
    log.warn({ msg: 'Onboarding sequence initial run failed', error: (e as Error)?.message })
  })

  setInterval(() => {
    runOnboardingEmailSequence().catch((e) => {
      log.warn({ msg: 'Onboarding sequence cron run failed', error: (e as Error)?.message })
    })
  }, intervalMs)
}
