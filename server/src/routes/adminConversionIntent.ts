/**
 * Founder-only Conversion Intent dashboard API.
 * GET /api/admin/conversion-intent?range=24h|7d|30d|all
 *   -> funnel counts/rates, a de-duplicated (one row per user) people list
 *      with each user's strongest purchase intent, and a Hot Leads flag.
 *
 * Data source: the app's own Postgres tables — EventLog (client-submitted,
 * authenticated-only events), User (authoritative plan/subscriptionStatus),
 * and UpgradeIntent. This deliberately does NOT query PostHog: there is no
 * server-side PostHog query/HogQL client anywhere in the running app (only
 * a standalone maintenance script, scripts/posthog-intelligence.py, which is
 * not part of the server), so building one would be new infrastructure this
 * task is meant to report on, not invent.
 *
 * Honesty limitation (see UI copy `anonymousVisitorNote` in the response):
 * POST /api/events (and therefore EventLog) requires an authenticated userId
 * to attribute a row. Anonymous pricing-page visits and upgrade clicks are
 * never written to EventLog at all under this design, so this endpoint
 * cannot and does not report an "anonymous visitor" count — that volume is
 * only observable in PostHog itself, which this dashboard does not query.
 *
 * Auth: founder-only, via the shared isFounderAccountEmail() helper (same
 * pattern as requireFounder() in adminDashboard.ts).
 */

import express, { Request, Response } from 'express'
import { prisma } from '../db'
import { getAuthFromRequest } from '../utils/auth'
import { getUser } from '../models/User'
import { isFounderAccountEmail } from '../utils/founderAccount'
import { getLogger } from '../lib/logger'
import {
  RELEVANT_EVENT_NAMES,
  isValidRange,
  rangeStartDate,
  classifyUser,
  isHotLead,
  isUserConverted,
  computeFunnelRates,
  type IntentEventRecord,
  type IntentLevel,
} from '../services/conversionIntent'

const log = getLogger('api')
const router = express.Router()
export default router

async function requireFounder(req: Request, res: Response): Promise<string | null> {
  const auth = getAuthFromRequest(req)
  if (!auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return null }
  const user = await getUser(auth.userId)
  if (!user) { res.status(401).json({ message: 'Unauthorized' }); return null }
  if (!isFounderAccountEmail((user as { email?: string }).email)) {
    res.status(403).json({ message: 'Forbidden' })
    return null
  }
  return auth.userId
}

const ANONYMOUS_VISITOR_NOTE =
  'Anonymous visitor counts require PostHog query access, which this dashboard does not have — ' +
  'EventLog only records events from authenticated users, so anonymous pricing-page/upgrade-click ' +
  'volume cannot be shown here without fabricating a number.'

router.get('/conversion-intent', async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await requireFounder(req, res)
    if (!userId) return res as Response

    const rangeParam = req.query.range
    const range = isValidRange(rangeParam) ? rangeParam : '30d'
    const since = rangeStartDate(range)

    const events = await prisma.eventLog.findMany({
      where: {
        eventName: { in: RELEVANT_EVENT_NAMES },
        userId: { not: null },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { userId: true, eventName: true, createdAt: true, metadata: true },
      orderBy: { createdAt: 'asc' },
    })

    const byUser = new Map<string, IntentEventRecord[]>()
    for (const e of events) {
      if (!e.userId) continue
      const list = byUser.get(e.userId) ?? []
      list.push({ eventName: e.eventName, createdAt: e.createdAt, metadata: e.metadata as Record<string, unknown> | null })
      byUser.set(e.userId, list)
    }

    const userIds = [...byUser.keys()]
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true, plan: true, subscriptionStatus: true },
        })
      : []
    const userMap = new Map(users.map((u) => [u.id, u]))

    const pricingVisitorIds = new Set<string>()
    const upgradeClickerIds = new Set<string>()
    const checkoutStarterIds = new Set<string>()
    const convertedIds = new Set<string>()

    const people: Array<{
      userId: string
      email: string
      name: string | null
      plan: string
      converted: boolean
      intentLevel: IntentLevel
      source: string | null
      tool: string | null
      remainingImports: number | null
      billingChoice: string | null
      lastActivityAt: string | null
      events: { eventName: string; createdAt: string }[]
    }> = []

    for (const [uid, evts] of byUser.entries()) {
      const user = userMap.get(uid)
      // Defensive: EventLog rows require an authenticated userId at write time,
      // so an unresolvable user shouldn't happen — skip gracefully rather than crash.
      if (!user) continue

      const converted = isUserConverted(user.plan)
      const classified = classifyUser(evts, converted)

      for (const e of evts) {
        if (e.eventName === 'pricing_page_view') pricingVisitorIds.add(uid)
        if (e.eventName === 'upgrade_clicked') upgradeClickerIds.add(uid)
        if (e.eventName === 'checkout_started' || e.eventName === 'checkout_session_created' || e.eventName === 'stripe_redirect') {
          checkoutStarterIds.add(uid)
        }
      }
      if (converted) convertedIds.add(uid)

      people.push({
        userId: uid,
        email: user.email,
        name: user.name,
        plan: user.plan,
        converted,
        intentLevel: classified.intentLevel,
        source: classified.props.source,
        tool: classified.props.tool,
        remainingImports: classified.props.remainingImports,
        billingChoice: classified.props.billingChoice,
        lastActivityAt: classified.lastActivityAt ? classified.lastActivityAt.toISOString() : null,
        events: classified.events.map((e) => ({ eventName: e.eventName, createdAt: e.createdAt.toISOString() })),
      })
    }

    // Most recent activity first.
    people.sort((a, b) => {
      const at = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
      const bt = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
      return bt - at
    })

    const hotLeads = people
      .filter((p) => !p.converted && isHotLead(p.intentLevel))
      .sort((a, b) => {
        const at = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
        const bt = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
        return bt - at
      })

    const counts = {
      pricingVisitors: pricingVisitorIds.size,
      upgradeClickers: upgradeClickerIds.size,
      checkoutStarters: checkoutStarterIds.size,
      converted: convertedIds.size,
    }
    const rates = computeFunnelRates(counts)

    return res.json({
      range,
      funnel: {
        counts,
        rates,
        rawEventCounts: {
          pricing_page_view: events.filter((e) => e.eventName === 'pricing_page_view').length,
          upgrade_clicked: events.filter((e) => e.eventName === 'upgrade_clicked').length,
          checkout_started: events.filter((e) => e.eventName === 'checkout_started').length,
          checkout_session_created: events.filter((e) => e.eventName === 'checkout_session_created').length,
          stripe_redirect: events.filter((e) => e.eventName === 'stripe_redirect').length,
        },
        anonymousVisitorNote: ANONYMOUS_VISITOR_NOTE,
      },
      people,
      hotLeads,
    })
  } catch (err) {
    log.error({ msg: '[admin/conversion-intent]', error: String(err) })
    return res.status(500).json({ message: 'Internal server error' })
  }
})
