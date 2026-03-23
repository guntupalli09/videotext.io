/**
 * FeedbackSystemPanel — Decision-first founder dashboard for the v2 feedback system.
 *
 * Above the fold (always visible):
 *  1. Decision Engine — biggest bottleneck + top correlated issue + segment + action
 *  2. Conversion Funnel (30d)
 *  3. Top Issue Clusters (replacing keyword cloud) — with 7d trend
 *  4. PMF score + Segment snapshot
 *
 * Below the fold (collapsible):
 *  5. Segment-specific issue views (tabs)
 *  6. Trigger breakdown + Recent events (collapsed by default)
 */

import { useEffect, useState } from 'react'
import {
  TrendingDown, TrendingUp, Users, Zap, BarChart3, MessageSquare,
  RefreshCw, ChevronDown, ChevronUp, Minus, AlertTriangle, ArrowRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DecisionEngine {
  bottleneck: string
  bottleneckRate: number
  topCorrelatedIssue: string | null
  topIssueWeightedCount: number
  mostAffectedSegment: string | null
  recommendedAction: string
}

interface FunnelData {
  uploadCount: number
  resultCount: number
  exportCount: number
  returnCount: number
  uploadToResultRate: number
  resultToExportRate: number
  exportToReturnRate: number
  biggestDropOff: string
  insight: string
}

interface IssueCluster {
  issue: string
  weightedMentions: number
  frequency: number
  trend: 'rising' | 'stable' | 'falling'
  trendDelta: number
  topSegment: string | null
  funnelStage: string
  example: string | null
}

interface SegmentRow {
  segment: string
  count: number
  avgScore: number
}

interface AnalyticsData {
  decisionEngine: DecisionEngine
  funnel: FunnelData
  features: {
    topIssues: { issue: string; frequency: number; weightedFrequency: number; examples: string[] }[]
    topKeywords: { word: string; freq: number }[]
    totalFeedbackEvents: number
  }
  segments: {
    segments: SegmentRow[]
    pmfScore: number | null
    pmfBreakdown: { rating: string | null; count: number; pct: number }[]
    pmfTotal: number
  }
  issueClusters: IssueCluster[]
  segmentIssues: Record<string, { issue: string; count: number; weighted: number }[]>
  triggerBreakdown: { triggerType: string; count: number }[]
  recentEvents: {
    id: string
    triggerType: string
    rating: string | null
    category: string | null
    freeText: string
    userScore: number | null
    createdAt: string
  }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  result: 'Result (A)',
  export: 'Export (B)',
  dropoff: 'Drop-off (C)',
  pmf: 'PMF (D)',
  competitor: 'Competitor (E)',
}

const SEGMENT_COLORS: Record<string, string> = {
  explorer: 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40',
  activated: 'bg-blue-900/40 text-blue-300 border-blue-800/40',
  power_user: 'bg-violet-900/40 text-violet-300 border-violet-800/40',
  paying: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40',
}

const SEGMENT_LABELS: Record<string, string> = {
  explorer: 'Explorer',
  activated: 'Activated',
  power_user: 'Power User',
  paying: 'Paying',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RateBar({ rate, label, count, worst }: { rate: number; label: string; count: number; worst: boolean }) {
  const pct = Math.round(rate * 100)
  const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#ca8a04' : '#dc2626'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="text-zinc-200 tabular-nums font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-600">{count.toLocaleString()} events</span>
        {worst && <span className="text-red-400 font-medium">← biggest drop</span>}
      </div>
    </div>
  )
}

function TrendBadge({ trend, delta }: { trend: 'rising' | 'stable' | 'falling'; delta: number }) {
  if (trend === 'rising') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-400">
        <TrendingUp className="w-3 h-3" />+{delta}
      </span>
    )
  }
  if (trend === 'falling') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
        <TrendingDown className="w-3 h-3" />{delta}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-600">
      <Minus className="w-3 h-3" />stable
    </span>
  )
}

function SegmentChip({ segment }: { segment: string }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SEGMENT_COLORS[segment] ?? 'bg-zinc-700/60 text-zinc-400 border-zinc-600/40'}`}>
      {SEGMENT_LABELS[segment] ?? segment}
    </span>
  )
}

function CollapsibleSection({
  title, defaultOpen = false, children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <span className="text-sm font-semibold text-zinc-300">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function FeedbackSystemPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeSegmentTab, setActiveSegmentTab] = useState<string>('explorer')

  async function load(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const token = localStorage.getItem('vt_token') ?? ''
      const res = await fetch('/api/admin/feedback/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(`Failed to load: ${e}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`rounded-xl bg-zinc-800/50 animate-pulse ${i === 0 ? 'h-28' : 'h-40'}`} />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm text-zinc-500">{error ?? 'No data yet'}</p>
        <button onClick={() => load()} className="mt-2 text-xs text-violet-400 hover:underline">Retry</button>
      </div>
    )
  }

  const { decisionEngine, funnel, features, segments, issueClusters, segmentIssues, triggerBreakdown, recentEvents } = data
  const isInsightBad = funnel.insight.toLowerCase().startsWith('critical') || funnel.insight.toLowerCase().startsWith('notable')

  const SEGMENT_TABS = ['explorer', 'activated', 'power_user', 'paying']

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Feedback Analytics</h2>
          <span className="text-xs bg-violet-900/40 text-violet-300 px-2 py-0.5 rounded-full">v2</span>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ① Decision Engine */}
      <div className="rounded-xl border border-violet-800/50 bg-gradient-to-br from-violet-950/60 to-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Decision Engine</h3>
          <span className="text-xs text-zinc-600">— what to fix next</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Bottleneck */}
          <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Biggest Bottleneck</p>
            <p className="text-sm font-bold text-white">{decisionEngine.bottleneck}</p>
            <p className="text-xs text-red-400 mt-0.5 tabular-nums">{decisionEngine.bottleneckRate}% conversion rate</p>
          </div>

          {/* Top Issue */}
          <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Top Correlated Complaint</p>
            {decisionEngine.topCorrelatedIssue ? (
              <>
                <p className="text-sm font-bold text-white">{decisionEngine.topCorrelatedIssue}</p>
                <p className="text-xs text-violet-400 mt-0.5">{decisionEngine.topIssueWeightedCount} weighted mentions</p>
              </>
            ) : (
              <p className="text-sm text-zinc-600">No data yet</p>
            )}
          </div>

          {/* Affected Segment */}
          <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Most Affected Segment</p>
            {decisionEngine.mostAffectedSegment ? (
              <SegmentChip segment={decisionEngine.mostAffectedSegment} />
            ) : (
              <p className="text-sm text-zinc-600">—</p>
            )}
          </div>

          {/* Recommended Action */}
          <div className="rounded-lg bg-violet-900/20 border border-violet-800/40 p-3">
            <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-1">Recommended Action</p>
            <p className="text-xs text-violet-200 leading-relaxed">{decisionEngine.recommendedAction}</p>
          </div>
        </div>
      </div>

      {/* ② Conversion Funnel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">
            Conversion Funnel <span className="text-zinc-600 font-normal">(30d)</span>
          </h3>
        </div>

        <div className="space-y-4 mb-4">
          <RateBar
            label="Upload → Result"
            rate={funnel.uploadToResultRate}
            count={funnel.uploadCount}
            worst={funnel.biggestDropOff === 'upload → result'}
          />
          <RateBar
            label="Result → Export"
            rate={funnel.resultToExportRate}
            count={funnel.resultCount}
            worst={funnel.biggestDropOff === 'result → export'}
          />
          <RateBar
            label="Export → Return"
            rate={funnel.exportToReturnRate}
            count={funnel.exportCount}
            worst={funnel.biggestDropOff === 'export → return'}
          />
        </div>

        <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${isInsightBad ? 'bg-red-900/20 border border-red-900/40 text-red-300' : 'bg-emerald-900/20 border border-emerald-900/40 text-emerald-300'}`}>
          {isInsightBad ? '⚠️ ' : '✅ '}{funnel.insight}
        </div>
      </div>

      {/* ③ Top Issue Clusters */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">
            Top Issue Clusters{' '}
            <span className="text-zinc-600 font-normal">({features.totalFeedbackEvents} events, 30d)</span>
          </h3>
        </div>

        {issueClusters.length === 0 ? (
          <p className="text-zinc-600 text-sm">No structured feedback yet.</p>
        ) : (
          <div className="space-y-3">
            {issueClusters.map((cluster, i) => (
              <div key={cluster.issue} className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3.5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-zinc-600 shrink-0">#{i + 1}</span>
                    <span className="text-sm font-semibold text-white truncate">{cluster.issue}</span>
                  </div>
                  <TrendBadge trend={cluster.trend} delta={cluster.trendDelta} />
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2">
                  <span className="text-xs text-zinc-400">
                    <span className="text-violet-400 font-semibold">{cluster.weightedMentions}</span> weighted
                    · <span className="text-zinc-500">{cluster.frequency} raw</span>
                  </span>
                  {cluster.topSegment && <SegmentChip segment={cluster.topSegment} />}
                  {cluster.funnelStage !== 'unknown' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600 border border-zinc-700/60 rounded-full px-2 py-0.5">
                      <ArrowRight className="w-2.5 h-2.5" />
                      {cluster.funnelStage}
                    </span>
                  )}
                </div>

                {cluster.example && (
                  <p className="text-xs text-zinc-500 italic leading-relaxed line-clamp-2">
                    "{cluster.example}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ④ PMF Score + Segment Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* PMF Score */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-white">PMF Score</h3>
            <span className="text-xs text-zinc-600">(target: &gt;40%)</span>
          </div>

          {segments.pmfTotal === 0 ? (
            <p className="text-zinc-600 text-sm">No PMF responses yet.</p>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-4">
                <span className={`text-4xl font-bold tabular-nums ${(segments.pmfScore ?? 0) >= 40 ? 'text-emerald-400' : (segments.pmfScore ?? 0) >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                  {segments.pmfScore ?? 0}%
                </span>
                <p className="text-xs text-zinc-500 pb-1">
                  "Very disappointed"<br />from {segments.pmfTotal} responses
                </p>
              </div>
              <div className="space-y-1.5">
                {segments.pmfBreakdown
                  .sort((a, b) => b.count - a.count)
                  .map((row) => (
                    <div key={row.rating ?? 'null'} className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-400 flex-1 truncate">{row.rating ?? 'dismissed'}</span>
                      <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500/70" style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className="text-zinc-500 tabular-nums w-7 text-right">{row.pct}%</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Segment Snapshot */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-white">Segment Snapshot</h3>
          </div>
          {segments.segments.length === 0 ? (
            <p className="text-zinc-600 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {segments.segments
                .sort((a, b) => b.count - a.count)
                .map((seg) => (
                  <div key={seg.segment} className="flex items-center gap-3">
                    <SegmentChip segment={seg.segment} />
                    <span className="text-sm text-zinc-200 tabular-nums font-medium flex-1">{seg.count.toLocaleString()}</span>
                    <span className="text-xs text-zinc-600 tabular-nums">avg {seg.avgScore}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ⑤ Segment-Specific Issues (collapsible, open by default) */}
      <CollapsibleSection title="Issues by Segment" defaultOpen>
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {SEGMENT_TABS.map((seg) => (
            <button
              key={seg}
              onClick={() => setActiveSegmentTab(seg)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                activeSegmentTab === seg
                  ? 'bg-violet-900/50 border-violet-700/60 text-violet-200'
                  : 'bg-zinc-800/50 border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/60'
              }`}
            >
              {SEGMENT_LABELS[seg] ?? seg}
            </button>
          ))}
        </div>

        {(() => {
          const issues = segmentIssues?.[activeSegmentTab] ?? []
          if (issues.length === 0) {
            return <p className="text-zinc-600 text-sm">No feedback from {SEGMENT_LABELS[activeSegmentTab] ?? activeSegmentTab} users yet.</p>
          }
          return (
            <div className="space-y-2">
              {issues.map((item, i) => (
                <div key={item.issue} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-zinc-600 w-4 text-right">{i + 1}</span>
                  <span className="text-zinc-300 flex-1">{item.issue}</span>
                  <span className="text-violet-400 tabular-nums text-xs font-semibold">{item.weighted} wt</span>
                  <span className="text-zinc-600 tabular-nums text-xs">{item.count} raw</span>
                </div>
              ))}
            </div>
          )
        })()}
      </CollapsibleSection>

      {/* ⑥ Trigger Breakdown + Recent Events (collapsed) */}
      <CollapsibleSection title="Trigger Counts &amp; Raw Feed">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
          {/* Trigger breakdown */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Trigger Counts <span className="font-normal normal-case">(30d)</span>
            </p>
            {triggerBreakdown.length === 0 ? (
              <p className="text-zinc-600 text-sm">No data.</p>
            ) : (
              <div className="space-y-2">
                {triggerBreakdown
                  .sort((a, b) => b.count - a.count)
                  .map((t) => (
                    <div key={t.triggerType} className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-400 flex-1">{TRIGGER_LABELS[t.triggerType] ?? t.triggerType}</span>
                      <span className="text-zinc-200 tabular-nums font-semibold">{t.count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Recent events */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Recent Responses</p>
            {recentEvents.length === 0 ? (
              <p className="text-zinc-600 text-sm">No responses yet.</p>
            ) : (
              <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
                {recentEvents.slice(0, 15).map((ev) => (
                  <div key={ev.id} className="rounded-lg bg-zinc-800/50 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-violet-400 font-medium">{TRIGGER_LABELS[ev.triggerType] ?? ev.triggerType}</span>
                      {ev.rating && <span className="text-zinc-300">{ev.rating}</span>}
                      {ev.category && <span className="text-zinc-500">· {ev.category}</span>}
                      {ev.userScore != null && <span className="ml-auto text-zinc-600">score: {ev.userScore}</span>}
                      <span className="text-zinc-700">
                        {new Date(ev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {ev.freeText && (
                      <p className="text-zinc-400 leading-relaxed line-clamp-1">{ev.freeText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

    </div>
  )
}
