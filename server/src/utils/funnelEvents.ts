import { Prisma } from '@prisma/client'
import { prisma } from '../db'

type FunnelEventName =
  | 'signup_completed'
  | 'activation_wizard_shown'
  | 'upload_started'
  | 'job_completed'
  | 'first_output_seen'
  | 'upgrade_prompt_seen'
  | 'upgrade_clicked'
  | 'checkout_started'
  | 'payment_completed'

export async function captureFunnelEvent(params: {
  eventName: FunnelEventName
  userId: string
  source: string
  plan?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { createdAt: true, plan: true },
  })
  if (!user) return

  if (params.eventName === 'first_output_seen') {
    const existing = await prisma.eventLog.findFirst({
      where: { userId: params.userId, eventName: 'first_output_seen' },
      select: { id: true },
    })
    if (existing) return
  }

  const jobCount = await prisma.job.count({ where: { userId: params.userId, status: 'completed' } })
  const hoursSinceSignup = Math.max(0, Math.round((Date.now() - user.createdAt.getTime()) / (60 * 60 * 1000)))
  const cohortDate = user.createdAt.toISOString().slice(0, 10)

  await prisma.eventLog.create({
    data: {
      eventName: params.eventName,
      userId: params.userId,
      sessionId: `server:${params.userId}`,
      metadata: {
        plan: (params.plan ?? user.plan ?? 'free').toLowerCase(),
        source: params.source,
        hours_since_signup: hoursSinceSignup,
        job_count: jobCount,
        cohort_date: cohortDate,
        ...(params.metadata ?? {}),
      } as Prisma.InputJsonValue,
    },
  })
}
