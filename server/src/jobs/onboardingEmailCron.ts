import { prisma } from '../db'
import { createMagicLinkToken } from '../routes/auth'
import { generateUnsubscribeToken } from '../routes/newsletter'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'
import { captureFunnelEvent } from '../utils/funnelEvents'

const redis = createRedisClient('client')
const log = getLogger('worker')

type OnboardingStage = 'first_3to6h' | 'day1' | 'day3' | 'day7'

type StageConfig = {
  minHours: number
  maxHours: number
  idempotencyKey: (userId: string) => string
  subject: string
  body: string
}

const STAGE_CONFIG: Record<OnboardingStage, StageConfig> = {
  first_3to6h: {
    minHours: 3,
    maxHours: 6,
    idempotencyKey: (userId) => `onboarding:first:${userId}`,
    subject: 'Your first transcript is 40 seconds away',
    body: 'Open VideoText and drop in one video (or paste a YouTube URL) to generate your first transcript instantly.',
  },
  day1: {
    minHours: 24,
    maxHours: 36,
    idempotencyKey: (userId) => `onboarding:day1:${userId}`,
    subject: 'Ready to finish your first transcript?',
    body: 'Jump back in and convert your next video to transcript + subtitles in one flow.',
  },
  day3: {
    minHours: 72,
    maxHours: 96,
    idempotencyKey: (userId) => `onboarding:day3:${userId}`,
    subject: 'One link to ship your transcript today',
    body: 'Use this magic link to open VideoText and turn your next upload into a clean transcript in minutes.',
  },
  day7: {
    minHours: 168,
    maxHours: 216,
    idempotencyKey: (userId) => `onboarding:day7:${userId}`,
    subject: 'Still planning to try VideoText?',
    body: 'Open VideoText now and run one quick test to see how fast your transcript can be done.',
  },
}

const STAGES: OnboardingStage[] = ['first_3to6h', 'day1', 'day3', 'day7']

function isUserInStage(hoursSinceSignup: number, stage: OnboardingStage): boolean {
  const config = STAGE_CONFIG[stage]
  return hoursSinceSignup >= config.minHours && hoursSinceSignup < config.maxHours
}

function onboardingHtml(stage: OnboardingStage, ctaUrl: string, unsubLink: string): string {
  const template = STAGE_CONFIG[stage]
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
            <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2">${template.subject}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 28px">
            <p style="margin:0;color:#a5a5c8;font-size:15px;line-height:1.65">${template.body}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 30px">
            <a href="${ctaUrl}" style="display:block;background:#2563EB;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700">Open /video-to-transcript</a>
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

export async function runOnboardingEmailSequence(): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  const debugOnboarding = process.env.DEBUG_ONBOARDING === 'true'
  const now = Date.now()

  const users = await prisma.user.findMany({
    where: { plan: 'free', newsletterSubscribed: { not: false } },
    select: { id: true, email: true, createdAt: true, usageThisMonth: true },
  })

  const eligibleUsers = users.filter((user) => {
    const usage = (user.usageThisMonth ?? {}) as { importCount?: number }
    return Number(usage.importCount ?? 0) === 0
  })
  const jobsByUser = await prisma.job.groupBy({
    by: ['userId'],
    where: {
      userId: { in: eligibleUsers.map((u) => u.id) },
    },
    _count: { _all: true },
  })
  const jobCountByUserId = new Map(jobsByUser.map((row) => [row.userId, row._count._all]))

  const stageCandidates: Record<OnboardingStage, number> = {
    first_3to6h: 0,
    day1: 0,
    day3: 0,
    day7: 0,
  }
  const stageSent: Record<OnboardingStage, number> = {
    first_3to6h: 0,
    day1: 0,
    day3: 0,
    day7: 0,
  }

  let sent = 0
  let skipped = 0
  for (const user of eligibleUsers) {
    const hoursSinceSignup = (now - new Date(user.createdAt).getTime()) / (1000 * 60 * 60)
    const stage = STAGES.find((value) => isUserInStage(hoursSinceSignup, value))
    if (!stage) continue
    stageCandidates[stage] += 1

    const key = STAGE_CONFIG[stage].idempotencyKey(user.id)
    const alreadySent = await redis.get(key)
    if (alreadySent) {
      skipped += 1
      continue
    }

    const jobCount = jobCountByUserId.get(user.id) ?? 0
    if (jobCount >= 2) continue

    const token = await createMagicLinkToken(user.id)
    const ctaUrl = `${baseUrl}/magic-login?token=${encodeURIComponent(token)}&next=/video-to-transcript`
    const unsubToken = generateUnsubscribeToken(user.email)
    const apiUnsubLink = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(user.email)}&token=${unsubToken}`
    const html = onboardingHtml(stage, ctaUrl, apiUnsubLink)
    const subject = STAGE_CONFIG[stage].subject

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: fromEmail,
        to: [user.email],
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${apiUnsubLink}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      signal: AbortSignal.timeout(8_000),
    })

    if (res.ok) {
      sent += 1
      stageSent[stage] += 1
      if (stage === 'first_3to6h') {
        captureFunnelEvent({
          eventName: 'activation_wizard_shown',
          userId: user.id,
          source: 'onboarding_email_cron',
          plan: 'free',
          metadata: { sequence_stage: stage },
        }).catch(() => {})
      }
      await redis.set(key, '1', 'EX', 60 * 60 * 24 * 45)
    } else {
      const body = await res.text().catch(() => '')
      log.warn({ msg: 'Onboarding email send failed', status: res.status, email: user.email, stage, body })
    }
  }

  log.info({
    msg: 'Onboarding debug',
    totalUsers: users.length,
    eligible: eligibleUsers.length,
    debugOnboarding,
    stageCandidates,
    stageSent,
    sent,
    skipped,
    timestamp: new Date().toISOString(),
  })
}

export async function startOnboardingEmailCron(): Promise<void> {
  if (process.env.ONBOARDING_EMAILS_ENABLED !== 'true') return

  const intervalMinutes = Number(process.env.ONBOARDING_EMAILS_INTERVAL_MINUTES || 15)
  log.info({ msg: 'Onboarding scheduler started', intervalMinutes })

  await runOnboardingEmailSequence()

  setInterval(async () => {
    try {
      await runOnboardingEmailSequence()
    } catch (err) {
      log.error({ msg: 'Onboarding cron error', error: (err as Error)?.message })
    }
  }, intervalMinutes * 60 * 1000)
}
