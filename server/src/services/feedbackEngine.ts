/**
 * feedbackEngine.ts — Analytics computations for the feedback system.
 * Funnel metrics, user segmentation, PMF score, feature ranking engine,
 * decision engine, issue clusters, trends, and segment-specific views.
 */

import { prisma } from '../db'

// ─── Funnel Metrics ───────────────────────────────────────────────────────────

export async function computeFunnelMetrics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [uploadCount, resultCount, exportCount, returnCount] = await Promise.all([
    prisma.eventLog.count({ where: { eventName: 'upload_started', createdAt: { gte: since } } }),
    prisma.eventLog.count({ where: { eventName: 'transcription_completed', createdAt: { gte: since } } }),
    prisma.eventLog.count({ where: { eventName: 'export_clicked', createdAt: { gte: since } } }),
    prisma.eventLog.count({ where: { eventName: 'session_returned', createdAt: { gte: since } } }),
  ])

  const uploadToResult = uploadCount > 0 ? resultCount / uploadCount : 0
  const resultToExport = resultCount > 0 ? exportCount / resultCount : 0
  const exportToReturn = exportCount > 0 ? returnCount / exportCount : 0

  const stages = [
    { stage: 'upload → result', rate: uploadToResult },
    { stage: 'result → export', rate: resultToExport },
    { stage: 'export → return', rate: exportToReturn },
  ]
  const worstStage = stages.reduce((w, s) => s.rate < w.rate ? s : w, stages[0])

  let insight: string
  if (worstStage.rate < 0.3) {
    const msgs: Record<string, string> = {
      'upload → result': 'Critical drop-off at upload → result — processing reliability issue likely',
      'result → export': 'Critical drop-off at result → export — output quality issue likely',
      'export → return': 'Critical drop-off at export → return — retention/value issue likely',
    }
    insight = msgs[worstStage.stage] ?? `Critical drop-off at ${worstStage.stage}`
  } else if (worstStage.rate < 0.6) {
    insight = `Notable drop-off at ${worstStage.stage} — worth investigating`
  } else {
    insight = 'Funnel health looks good — no critical drop-offs detected'
  }

  return {
    uploadCount,
    resultCount,
    exportCount,
    returnCount,
    uploadToResultRate: round2(uploadToResult),
    resultToExportRate: round2(resultToExport),
    exportToReturnRate: round2(exportToReturn),
    biggestDropOff: worstStage.stage,
    worstRate: round2(worstStage.rate),
    insight,
  }
}

// ─── Decision Engine ──────────────────────────────────────────────────────────

/** Top-level decision summary: bottleneck + correlated issue + segment + action. */
export async function computeDecisionEngine() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [funnel, events] = await Promise.all([
    computeFunnelMetrics(),
    prisma.feedbackEvent.findMany({
      where: { dismissed: false, createdAt: { gte: since30 }, category: { not: null } },
      select: { category: true, freeText: true, userScore: true, userId: true, triggerType: true },
    }),
  ])

  if (events.length === 0) {
    return {
      bottleneck: funnel.biggestDropOff,
      bottleneckRate: Math.round(funnel.worstRate * 100),
      topCorrelatedIssue: null,
      topIssueWeightedCount: 0,
      mostAffectedSegment: null,
      recommendedAction: 'Collect more feedback to surface actionable insights.',
    }
  }

  // Build weighted category map
  const catMap: Record<string, { count: number; weighted: number; userIds: string[] }> = {}
  for (const ev of events) {
    const cat = ev.category!
    if (!catMap[cat]) catMap[cat] = { count: 0, weighted: 0, userIds: [] }
    const w = ev.userScore != null ? (ev.userScore >= 15 ? 3 : ev.userScore >= 5 ? 2 : 1) : 1
    catMap[cat].count += 1
    catMap[cat].weighted += w
    if (ev.userId) catMap[cat].userIds.push(ev.userId)
  }

  const topEntry = Object.entries(catMap)
    .filter(([cat]) => cat !== 'uncategorized' && cat !== 'other')
    .sort(([, a], [, b]) => b.weighted - a.weighted)[0]

  if (!topEntry) {
    return {
      bottleneck: funnel.biggestDropOff,
      bottleneckRate: Math.round(funnel.worstRate * 100),
      topCorrelatedIssue: null,
      topIssueWeightedCount: 0,
      mostAffectedSegment: null,
      recommendedAction: 'No structured categories found — check feedback options.',
    }
  }

  const [topIssueName, topIssueData] = topEntry

  // Most affected segment for top issue
  let mostAffectedSegment: string | null = null
  const topIssueUserIds = [...new Set(topIssueData.userIds)]
  if (topIssueUserIds.length > 0) {
    const metrics = await prisma.userMetrics.findMany({
      where: { userId: { in: topIssueUserIds } },
      select: { segment: true },
    })
    const segCount: Record<string, number> = {}
    for (const m of metrics) segCount[m.segment] = (segCount[m.segment] ?? 0) + 1
    mostAffectedSegment = Object.entries(segCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
  }

  return {
    bottleneck: funnel.biggestDropOff,
    bottleneckRate: Math.round(funnel.worstRate * 100),
    topCorrelatedIssue: topIssueName,
    topIssueWeightedCount: topIssueData.weighted,
    mostAffectedSegment,
    recommendedAction: generateRecommendedAction(funnel.biggestDropOff, topIssueName),
  }
}

function generateRecommendedAction(bottleneck: string, issue: string): string {
  const il = issue.toLowerCase()
  if (il.includes('accura') || il.includes('quality') || il.includes('wrong') || il.includes('error')) {
    return `Fix transcription accuracy — "${issue}" complaints directly correlate with drop-off at ${bottleneck}`
  }
  if (il.includes('slow') || il.includes('speed') || il.includes('fast') || il.includes('time')) {
    return `Reduce processing time — speed issues are blocking users at ${bottleneck}`
  }
  if (il.includes('price') || il.includes('cost') || il.includes('paid') || il.includes('free')) {
    return `Re-evaluate pricing communication — cost friction is linked to drop-off at ${bottleneck}`
  }
  if (il.includes('format') || il.includes('export') || il.includes('download')) {
    return `Improve export options — formatting friction is preventing completion at ${bottleneck}`
  }
  if (il.includes('speaker') || il.includes('label') || il.includes('diarization')) {
    return `Improve speaker identification — this is blocking satisfied users from exporting at ${bottleneck}`
  }
  if (bottleneck === 'upload → result') {
    return `Fix upload reliability — "${issue}" is the top complaint during processing`
  }
  if (bottleneck === 'result → export') {
    return `Improve output quality — "${issue}" is preventing users from exporting`
  }
  return `Address "${issue}" — it's the top driver of drop-off at ${bottleneck}`
}

// ─── Top Issue Clusters (replaces keyword cloud) ──────────────────────────────

export async function computeTopIssueClusters() {
  const now = Date.now()
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000)
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const prev7Start = new Date(now - 14 * 24 * 60 * 60 * 1000)

  const [events, recent7, prev7] = await Promise.all([
    prisma.feedbackEvent.findMany({
      where: { dismissed: false, createdAt: { gte: since30 }, category: { not: null } },
      select: { category: true, freeText: true, userScore: true, userId: true, triggerType: true },
    }),
    prisma.feedbackEvent.findMany({
      where: { dismissed: false, createdAt: { gte: since7 }, category: { not: null } },
      select: { category: true },
    }),
    prisma.feedbackEvent.findMany({
      where: { dismissed: false, createdAt: { gte: prev7Start, lt: since7 }, category: { not: null } },
      select: { category: true },
    }),
  ])

  // Build category map
  const catMap: Record<string, {
    count: number; weighted: number; examples: string[]; userIds: string[]; triggerTypes: string[]
  }> = {}
  for (const ev of events) {
    const cat = ev.category!
    if (!catMap[cat]) catMap[cat] = { count: 0, weighted: 0, examples: [], userIds: [], triggerTypes: [] }
    const w = ev.userScore != null ? (ev.userScore >= 15 ? 3 : ev.userScore >= 5 ? 2 : 1) : 1
    catMap[cat].count += 1
    catMap[cat].weighted += w
    catMap[cat].triggerTypes.push(ev.triggerType)
    if (ev.userId) catMap[cat].userIds.push(ev.userId)
    if (ev.freeText?.trim() && catMap[cat].examples.length < 2) {
      catMap[cat].examples.push(ev.freeText.trim().slice(0, 100))
    }
  }

  // 7d trend counts
  const r7: Record<string, number> = {}
  for (const e of recent7) r7[e.category!] = (r7[e.category!] ?? 0) + 1
  const p7: Record<string, number> = {}
  for (const e of prev7) p7[e.category!] = (p7[e.category!] ?? 0) + 1

  // Segment lookup
  const allUserIds = [...new Set(Object.values(catMap).flatMap(c => c.userIds))]
  const userSegs = allUserIds.length > 0
    ? await prisma.userMetrics.findMany({
        where: { userId: { in: allUserIds } },
        select: { userId: true, segment: true },
      })
    : []
  const segMap = Object.fromEntries(userSegs.map(u => [u.userId, u.segment]))

  return Object.entries(catMap)
    .filter(([cat]) => cat !== 'uncategorized' && cat !== 'other')
    .sort(([, a], [, b]) => b.weighted - a.weighted)
    .slice(0, 5)
    .map(([cat, d]) => {
      const r = r7[cat] ?? 0
      const p = p7[cat] ?? 0
      const delta = r - p
      const trend: 'rising' | 'stable' | 'falling' = delta > 1 ? 'rising' : delta < -1 ? 'falling' : 'stable'

      // Top segment
      const segCount: Record<string, number> = {}
      for (const uid of d.userIds) {
        const seg = segMap[uid] ?? 'explorer'
        segCount[seg] = (segCount[seg] ?? 0) + 1
      }
      const topSegment = Object.entries(segCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

      // Funnel stage from trigger type
      const trigCount: Record<string, number> = {}
      for (const t of d.triggerTypes) trigCount[t] = (trigCount[t] ?? 0) + 1
      const topTrigger = Object.entries(trigCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

      return {
        issue: cat,
        weightedMentions: d.weighted,
        frequency: d.count,
        trend,
        trendDelta: delta,
        topSegment,
        funnelStage: triggerToFunnelStage(topTrigger),
        example: d.examples[0] ?? null,
      }
    })
}

function triggerToFunnelStage(trigger: string | null): string {
  if (trigger === 'result') return 'result → export'
  if (trigger === 'export') return 'export stage'
  if (trigger === 'dropoff') return 'result → export'
  if (trigger === 'pmf') return 'retention'
  if (trigger === 'competitor') return 'retention'
  return 'unknown'
}

// ─── Segment-Specific Issues ──────────────────────────────────────────────────

export async function computeSegmentIssues() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const events = await prisma.feedbackEvent.findMany({
    where: { dismissed: false, createdAt: { gte: since30 }, category: { not: null } },
    select: { category: true, freeText: true, userScore: true, userId: true },
  })

  const userIds = [...new Set(events.map(e => e.userId).filter((id): id is string => id != null))]
  const userMetrics = userIds.length > 0
    ? await prisma.userMetrics.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, segment: true },
      })
    : []
  const segMap = Object.fromEntries(userMetrics.map(u => [u.userId, u.segment]))

  const SEGMENTS = ['explorer', 'activated', 'power_user', 'paying'] as const
  const result: Record<string, { issue: string; count: number; weighted: number }[]> = {}

  for (const seg of SEGMENTS) {
    const segEvents = events.filter(e => (e.userId ? segMap[e.userId] === seg : seg === 'explorer'))
    const catMap: Record<string, { count: number; weighted: number }> = {}
    for (const ev of segEvents) {
      const cat = ev.category!
      if (!catMap[cat]) catMap[cat] = { count: 0, weighted: 0 }
      const w = ev.userScore != null ? (ev.userScore >= 15 ? 3 : ev.userScore >= 5 ? 2 : 1) : 1
      catMap[cat].count += 1
      catMap[cat].weighted += w
    }
    result[seg] = Object.entries(catMap)
      .filter(([cat]) => cat !== 'uncategorized')
      .sort(([, a], [, b]) => b.weighted - a.weighted)
      .slice(0, 5)
      .map(([issue, d]) => ({ issue, count: d.count, weighted: d.weighted }))
  }

  return result
}

// ─── Feature Engine ───────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','it','its','i','my','we','you','your','was','are','be','been','being','have',
  'has','had','do','does','did','will','would','could','should','may','might','can',
  'not','no','so','if','as','this','that','these','those','when','where','how','what',
  'which','who','whom','there','here','up','out','about','into','after','before',
  'more','some','any','all','very','just','also','than','too','only','then','now',
  'really','make','like','use','get','want','need','time','way','work','thing','good',
])

function extractKeywords(texts: string[]): { word: string; freq: number }[] {
  const freq: Record<string, number> = {}
  for (const text of texts) {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    for (const w of words) {
      if (w.length > 3 && !STOP_WORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([word, f]) => ({ word, freq: f }))
}

export async function computeFeatureEngine() {
  const events = await prisma.feedbackEvent.findMany({
    where: { dismissed: false, OR: [{ category: { not: null } }, { freeText: { not: '' } }] },
    select: { category: true, freeText: true, userScore: true, triggerType: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const catMap: Record<string, { count: number; weighted: number; examples: string[] }> = {}

  for (const ev of events) {
    const cat = ev.category ?? 'other'
    if (!catMap[cat]) catMap[cat] = { count: 0, weighted: 0, examples: [] }
    const w = ev.userScore != null ? (ev.userScore >= 15 ? 3 : ev.userScore >= 5 ? 2 : 1) : 1
    catMap[cat].count += 1
    catMap[cat].weighted += w
    if (ev.freeText?.trim() && catMap[cat].examples.length < 3) {
      catMap[cat].examples.push(ev.freeText.trim().slice(0, 120))
    }
  }

  const topIssues = Object.entries(catMap)
    .filter(([cat]) => cat !== 'uncategorized' && cat !== 'other')
    .sort(([, a], [, b]) => b.weighted - a.weighted)
    .slice(0, 3)
    .map(([issue, d]) => ({
      issue,
      frequency: d.count,
      weightedFrequency: d.weighted,
      examples: d.examples,
    }))

  const topKeywords = extractKeywords(events.map((e) => e.freeText).filter(Boolean))

  return { topIssues, topKeywords, totalFeedbackEvents: events.length }
}

// ─── Segment Breakdown ────────────────────────────────────────────────────────

export async function computeSegmentBreakdown() {
  const [segRows, pmfRows, pmfTotal] = await Promise.all([
    prisma.userMetrics.groupBy({
      by: ['segment'],
      _count: { userId: true },
      _avg: { userScore: true },
    }),
    prisma.feedbackEvent.groupBy({
      by: ['rating'],
      where: { triggerType: 'pmf', dismissed: false },
      _count: { id: true },
    }),
    prisma.feedbackEvent.count({ where: { triggerType: 'pmf', dismissed: false } }),
  ])

  const pmfBreakdown = pmfRows.map((r) => ({
    rating: r.rating,
    count: r._count.id,
    pct: pmfTotal > 0 ? Math.round((r._count.id / pmfTotal) * 100) : 0,
  }))

  const veryDisappointed = pmfRows.find((r) => r.rating === 'Very disappointed')?._count.id ?? 0
  const pmfScore = pmfTotal > 0 ? Math.round((veryDisappointed / pmfTotal) * 100) : null

  return {
    segments: segRows.map((s) => ({
      segment: s.segment,
      count: s._count.userId,
      avgScore: s._avg.userScore != null ? Math.round(s._avg.userScore * 10) / 10 : 0,
    })),
    pmfScore,
    pmfBreakdown,
    pmfTotal,
  }
}

// ─── Reactivation Query ────────────────────────────────────────────────────────

export async function getUsersWhoReportedIssue(category: string) {
  const events = await prisma.feedbackEvent.findMany({
    where: { category, dismissed: false, userId: { not: null } },
    select: { userId: true, createdAt: true, freeText: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const seen = new Set<string>()
  return events.filter((e) => {
    if (!e.userId || seen.has(e.userId)) return false
    seen.add(e.userId)
    return true
  })
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
