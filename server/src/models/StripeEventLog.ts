/**
 * Stripe webhook idempotency — persisted to Postgres.
 *
 * DESIGN: atomic INSERT … ON CONFLICT DO NOTHING
 * ─────────────────────────────────────────────────────────────────────────────
 * The previous check→process→mark pattern had a TOCTOU race: two concurrent
 * webhook deliveries could both pass the "already processed?" check before
 * either wrote the mark, causing double-processing.
 *
 * The fix: insert the event ID FIRST in a single atomic SQL statement.
 * The primary key constraint on eventId means exactly one INSERT wins across
 * all instances.  The winner (affected rows == 1) processes the event; all
 * others skip immediately.  No lock, no transaction, no extra round-trip.
 */

import { prisma } from '../db'

/**
 * Atomically claim a Stripe event for processing.
 *
 * Returns true  → this instance claimed the event; proceed with handling.
 * Returns false → another instance already claimed it; skip (return 200 to Stripe).
 *
 * Safe under any concurrency: the DB enforces uniqueness.
 */
export async function claimStripeEvent(event: { id: string; type: string }): Promise<boolean> {
  const affected = await prisma.$executeRaw`
    INSERT INTO "StripeEventLog" ("eventId", "eventType", "processedAt")
    VALUES (${event.id}, ${event.type}, NOW())
    ON CONFLICT ("eventId") DO NOTHING
  `
  // $executeRaw returns the number of rows affected.
  // 1 = we inserted (claimed); 0 = conflict (already claimed by another instance).
  return affected === 1
}

/** Purge event log entries older than 30 days (called from nightly maintenance cron). */
export async function purgeOldStripeEvents(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await prisma.stripeEventLog.deleteMany({ where: { processedAt: { lt: cutoff } } })
}
