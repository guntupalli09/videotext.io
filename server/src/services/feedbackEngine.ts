/**
 * feedbackEngine.ts — Analytics computations for the feedback system.
 * Funnel metrics, user segmentation, PMF score, and feature ranking engine.
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
    insight,
  }
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

  // Weighted category counts
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

/** Returns users who reported a specific issue category, for follow-up messaging. */
export async function getUsersWhoReportedIssue(category: string) {
  const events = await prisma.feedbackEvent.findMany({
    where: { category, dismissed: false, userId: { not: null } },
    select: { userId: true, createdAt: true, freeText: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  // Deduplicate by userId
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
