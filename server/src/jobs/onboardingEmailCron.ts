import { prisma } from '../db'
import { createMagicLinkToken } from '../routes/auth'
import { generateUnsubscribeToken } from '../routes/newsletter'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'
import { captureFunnelEvent } from '../utils/funnelEvents'
import { sendGrowthEmail } from '../utils/mailer'
import { toolTypeToCta } from '../utils/growthEmailCopy'

const redis = createRedisClient('client')
const log = getLogger('worker')

type OnboardingStage = 'first_3to6h' | 'day1' | 'day3' | 'day7'
type ReturnStage = 'return_day1' | 'return_day3' | 'return_day7'

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
    body: 'Open VideoText and drop in one video file to generate your first transcript instantly.',
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

const RETURN_STAGE_CONFIG: Record<ReturnStage, StageConfig> = {
  return_day1: {
    minHours: 24,
    maxHours: 36,
    idempotencyKey: (userId) => `onboarding:return:day1:${userId}`,
    subject: 'Pick up your last VideoText job',
    body: 'Your last result is gone after a few hours — start another pass on the same tool while it is still fresh.',
  },
  return_day3: {
    minHours: 72,
    maxHours: 96,
    idempotencyKey: (userId) => `onboarding:return:day3:${userId}`,
    subject: 'Another clean transcript is one upload away',
    body: 'Open the tool you used last and drop in the next file. Free accounts get 3 imports each calendar month.',
  },
  return_day7: {
    minHours: 168,
    maxHours: 216,
    idempotencyKey: (userId) => `onboarding:return:day7:${userId}`,
    subject: 'Need another transcript this week?',
    body: 'Jump back into VideoText and run the same tool you used last time.',
  },
}

const STAGES: OnboardingStage[] = ['first_3to6h', 'day1', 'day3', 'day7']
const RETURN_STAGES: ReturnStage[] = ['return_day1', 'return_day3', 'return_day7']

function isUserInStage(hours: number, config: StageConfig): boolean {
  return hours >= config.minHours && hours < config.maxHours
}

function onboardingHtml(subject: string, body: string, ctaUrl: string, ctaLabel: string, unsubLink: string): string {
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
            <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2">${subject}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 28px">
            <p style="margin:0;color:#a5a5c8;font-size:15px;line-height:1.65">${body}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 30px">
            <a href="${ctaUrl}" style="display:block;background:#2563EB;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700">${ctaLabel}</a>
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

async function lastCompletedJobByUser(userIds: string[]): Promise<Map<string, { toolType: string; completedAt: Date | null }>> {
  const map = new Map<string, { toolType: string; completedAt: Date | null }>()
  if (userIds.length === 0) return map
  const jobs = await prisma.job.findMany({
    where: {
      userId: { in: userIds },
      status: 'completed',
      completedAt: { gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
    },
    select: { userId: true, toolType: true, completedAt: true },
    orderBy: { completedAt: 'desc' },
  })
  for (const job of jobs) {
    if (!map.has(job.userId)) map.set(job.userId, { toolType: job.toolType, completedAt: job.completedAt })
  }
  return map
}

async function sendOnboardingMail(opts: {
  userId: string
  email: string
  subject: string
  body: string
  toolType?: string | null
  idempotencyKey: string
  sequenceStage: string
  trackActivation?: boolean
}): Promise<boolean> {
  const alreadySent = await redis.get(opts.idempotencyKey)
  if (alreadySent) return false

  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const apiBaseUrl = (process.env.API_BASE_URL || 'https://api.videotext.io').replace(/\/$/, '')
  const cta = toolTypeToCta(opts.toolType)
  const token = await createMagicLinkToken(opts.userId)
  const ctaUrl = `${baseUrl}/magic-login?token=${encodeURIComponent(token)}&next=${encodeURIComponent(cta.path)}`
  const unsubToken = generateUnsubscribeToken(opts.email)
  const apiUnsubLink = `${apiBaseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(opts.email)}&token=${unsubToken}`
  const html = onboardingHtml(opts.subject, opts.body, ctaUrl, cta.label, apiUnsubLink)

  const ok = await sendGrowthEmail({ to: opts.email, subject: opts.subject, html, unsubscribeUrl: apiUnsubLink })
  if (!ok) {
    log.warn({ msg: 'Onboarding email send failed', email: opts.email, stage: opts.sequenceStage })
    return false
  }
  if (opts.trackActivation) {
    captureFunnelEvent({
      eventName: 'activation_wizard_shown',
      userId: opts.userId,
      source: 'onboarding_email_cron',
      plan: 'free',
      metadata: { sequence_stage: opts.sequenceStage },
    }).catch(() => {})
  }
  await redis.set(opts.idempotencyKey, '1', 'EX', 60 * 60 * 24 * 45)
  return true
}

export async function runOnboardingEmailSequence(): Promise<void> {
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) return

  const debugOnboarding = process.env.DEBUG_ONBOARDING === 'true'
  const now = Date.now()

  const users = await prisma.user.findMany({
    where: { plan: 'free', newsletterSubscribed: { not: false } },
    select: { id: true, email: true, createdAt: true, usageThisMonth: true, lastActiveAt: true },
  })

  const neverImported = users.filter((user) => {
    const usage = (user.usageThisMonth ?? {}) as { importCount?: number }
    return Number(usage.importCount ?? 0) === 0
  })
  const imported = users.filter((user) => {
    const usage = (user.usageThisMonth ?? {}) as { importCount?: number }
    return Number(usage.importCount ?? 0) > 0
  })

  const jobsByUser = await prisma.job.groupBy({
    by: ['userId'],
    where: {
      userId: { in: neverImported.map((u) => u.id) },
    },
    _count: { _all: true },
  })
  const jobCountByUserId = new Map(jobsByUser.map((row) => [row.userId, row._count._all]))
  const lastJobByUser = await lastCompletedJobByUser([...neverImported, ...imported].map((u) => u.id))

  const stageCandidates: Record<string, number> = {
    first_3to6h: 0,
    day1: 0,
    day3: 0,
    day7: 0,
    return_day1: 0,
    return_day3: 0,
    return_day7: 0,
  }
  const stageSent: Record<string, number> = { ...stageCandidates }

  let sent = 0
  let skipped = 0

  for (const user of neverImported) {
    const hoursSinceSignup = (now - new Date(user.createdAt).getTime()) / (1000 * 60 * 60)
    const stage = STAGES.find((value) => isUserInStage(hoursSinceSignup, STAGE_CONFIG[value]))
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

    const ok = await sendOnboardingMail({
      userId: user.id,
      email: user.email,
      subject: STAGE_CONFIG[stage].subject,
      body: STAGE_CONFIG[stage].body,
      toolType: lastJobByUser.get(user.id)?.toolType,
      idempotencyKey: key,
      sequenceStage: stage,
      trackActivation: stage === 'first_3to6h',
    })
    if (ok) {
      sent += 1
      stageSent[stage] += 1
    }
  }

  for (const user of imported) {
    const lastJob = lastJobByUser.get(user.id)
    const lastAt = user.lastActiveAt ?? lastJob?.completedAt ?? user.createdAt
    const hoursSinceActive = (now - new Date(lastAt).getTime()) / (1000 * 60 * 60)
    const stage = RETURN_STAGES.find((value) => isUserInStage(hoursSinceActive, RETURN_STAGE_CONFIG[value]))
    if (!stage) continue
    stageCandidates[stage] += 1

    const key = RETURN_STAGE_CONFIG[stage].idempotencyKey(user.id)
    const alreadySent = await redis.get(key)
    if (alreadySent) {
      skipped += 1
      continue
    }

    const ok = await sendOnboardingMail({
      userId: user.id,
      email: user.email,
      subject: RETURN_STAGE_CONFIG[stage].subject,
      body: RETURN_STAGE_CONFIG[stage].body,
      toolType: lastJob?.toolType,
      idempotencyKey: key,
      sequenceStage: stage,
    })
    if (ok) {
      sent += 1
      stageSent[stage] += 1
    }
  }

  log.info({
    msg: 'Onboarding debug',
    totalUsers: users.length,
    eligible: neverImported.length,
    returnEligible: imported.length,
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
