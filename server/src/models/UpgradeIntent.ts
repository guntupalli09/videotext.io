import { prisma } from '../db'

export type UpgradeIntentSource = 'upgrade_clicked' | 'checkout_session_started'

export async function recordUpgradeIntent(params: {
  userId: string
  source: UpgradeIntentSource
  occurredAt?: Date
}): Promise<void> {
  await prisma.upgradeIntent.create({
    data: {
      userId: params.userId,
      source: params.source,
      createdAt: params.occurredAt ?? new Date(),
    },
  })
}
