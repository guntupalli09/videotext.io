import { prisma } from '../db'
import { createMagicLinkToken } from '../routes/auth'
import { createRedisClient } from '../utils/redis'

const redis = createRedisClient('client')

type RunOptions = { force?: boolean }

export async function runOnboardingEmails(options: RunOptions = {}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const from = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  const now = Date.now()

  const users = await prisma.user.findMany({
    where: { plan: 'free' },
    select: { id: true, email: true, createdAt: true },
  })

  const jobCounts = await prisma.job.groupBy({ by: ['userId'], _count: true })
  const jobMap = new Map(jobCounts.map((j) => [j.userId, j._count]))
  const eligibleUsers = users.filter((u) => (jobMap.get(u.id) || 0) < 2)
  const candidates = options.force
    ? eligibleUsers
    : eligibleUsers.filter((u) => {
        const hours = (now - new Date(u.createdAt).getTime()) / (1000 * 60 * 60)
        return hours >= 3 && hours <= 6
      })

  let sent = 0
  let skipped = 0
  for (const user of candidates) {
    const hoursSinceSignup = (now - new Date(user.createdAt).getTime()) / (1000 * 60 * 60)
    const jobCount = jobMap.get(user.id) || 0
    console.log('[ONBOARDING_USER]', { email: user.email, hoursSinceSignup, jobCount })

    const key = `onboarding:first:${user.id}`
    const alreadySent = await redis.get(key)
    if (alreadySent) {
      skipped += 1
      continue
    }

    const token = await createMagicLinkToken(user.id)
    const magicLink = `${baseUrl}/magic-login?token=${encodeURIComponent(token)}&next=/video-to-transcript`
    const text = `Hi there,

You signed up but haven’t tried it yet.

Upload one video (or paste a YouTube link) and get:
• Transcript
• Subtitles (SRT/VTT)
• Summary + chapters

All in ~40 seconds.

Try it now:
${magicLink}

No setup. No friction.

— VideoText`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from, to: [user.email], subject: 'Your video → transcript in 40 seconds (try this)', text }),
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      skipped += 1
      continue
    }
    await redis.set(key, '1', 'EX', 60 * 60 * 24 * 7)
    sent += 1
  }

  console.log('[ONBOARDING]', {
    totalUsers: users.length,
    eligibleUsers: eligibleUsers.length,
    candidates: candidates.length,
    sent,
    skipped,
    timestamp: new Date().toISOString(),
  })
}

export async function startOnboardingEmailCron(): Promise<void> {
  if (process.env.ONBOARDING_EMAILS_ENABLED !== 'true') return

  const intervalMinutes = Number(process.env.ONBOARDING_EMAILS_INTERVAL_MINUTES || 15)
  console.log('[CRON] Onboarding scheduler started', { intervalMinutes })

  await runOnboardingEmails()
  if (process.env.DEBUG_ONBOARDING === 'true') {
    await runOnboardingEmails({ force: true })
  }

  setInterval(async () => {
    try {
      await runOnboardingEmails()
    } catch (err) {
      console.error('Onboarding cron error:', err)
    }
  }, intervalMinutes * 60 * 1000)
}
