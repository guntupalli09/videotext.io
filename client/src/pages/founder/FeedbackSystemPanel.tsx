/**
 * FeedbackSystemPanel — Founder dashboard section for the v2 feedback system.
 *
 * Displays:
 *  • Funnel metrics (upload → result → export → return) with drop-off insight
 *  • User segmentation (explorer / activated / power_user / paying)
 *  • PMF score (% "Very disappointed")
 *  • Feature engine: top 3 issues + weighted frequency
 *  • Top keywords from free text
 *  • Recent feedback events table
 *  • Trigger breakdown (which trigger type fired most)
 */

import { useEffect, useState } from 'react'
import { TrendingDown, Users, Zap, BarChart3, MessageSquare, RefreshCw } from 'lucide-react'

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

interface TopIssue {
  issue: string
  frequency: number
  weightedFrequency: number
  examples: string[]
}

interface SegmentRow {
  segment: string
  count: number
  avgScore: number
}

interface AnalyticsData {
  funnel: FunnelData
  features: {
    topIssues: TopIssue[]
    topKeywords: { word: string; freq: number }[]
    totalFeedbackEvents: number
  }
  segments: {
    segments: SegmentRow[]
    pmfScore: number | null
    pmfBreakdown: { rating: string | null; count: number; pct: number }[]
    pmfTotal: number
  }
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

const TRIGGER_LABELS: Record<string, string> = {
  result: 'Result (A)',
  export: 'Export (B)',
  dropoff: 'Drop-off (C)',
  pmf: 'PMF (D)',
  competitor: 'Competitor (E)',
}

const SEGMENT_COLORS: Record<string, string> = {
  explorer: 'bg-zinc-700 text-zinc-300',
  activated: 'bg-blue-900/50 text-blue-300',
  power_user: 'bg-violet-900/50 text-violet-300',
  paying: 'bg-emerald-900/50 text-emerald-300',
}

function RateBar({ rate, label, count, best }: { rate: number; label: string; count: number; best: boolean }) {
  const pct = Math.round(rate * 100)
  const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#ca8a04' : '#dc2626'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="text-zinc-300 tabular-nums font-semibold">{pct}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-600">{count.toLocaleString()} events</span>
        {best && <span className="text-red-400 font-medium">← biggest drop</span>}
      </div>
    </div>
  )
}

export default function FeedbackSystemPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm text-zinc-500">{error ?? 'No data yet'}</p>
        <button
          onClick={() => load()}
          className="mt-2 text-xs text-violet-400 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const { funnel, features, segments, triggerBreakdown, recentEvents } = data
  const isInsightBad = funnel.insight.toLowerCase().startsWith('critical') || funnel.insight.toLowerCase().startsWith('major')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Feedback System Analytics</h2>
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

      {/* Funnel metrics */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">Conversion Funnel <span className="text-zinc-600 font-normal">(30d)</span></h3>
        </div>

        <div className="space-y-4 mb-4">
          <RateBar
            label="Upload → Result"
            rate={funnel.uploadToResultRate}
            count={funnel.uploadCount}
            best={funnel.biggestDropOff === 'upload → result'}
          />
          <RateBar
            label="Result → Export"
            rate={funnel.resultToExportRate}
            count={funnel.resultCount}
            best={funnel.biggestDropOff === 'result → export'}
          />
          <RateBar
            label="Export → Return"
            rate={funnel.exportToReturnRate}
            count={funnel.exportCount}
            best={funnel.biggestDropOff === 'export → return'}
          />
        </div>

        <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${isInsightBad ? 'bg-red-900/20 border border-red-900/40 text-red-300' : 'bg-emerald-900/20 border border-emerald-900/40 text-emerald-300'}`}>
          {isInsightBad ? '⚠️ ' : '✅ '}{funnel.insight}
        </div>
      </div>

      {/* Segmentation + PMF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User segments */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-white">User Segments</h3>
          </div>
          {segments.segments.length === 0 ? (
            <p className="text-zinc-600 text-sm">No data yet — fire some events first.</p>
          ) : (
            <div className="space-y-2.5">
              {segments.segments
                .sort((a, b) => b.count - a.count)
                .map((seg) => (
                  <div key={seg.segment} className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEGMENT_COLORS[seg.segment] ?? 'bg-zinc-700 text-zinc-400'}`}>
                      {seg.segment}
                    </span>
                    <span className="text-sm text-zinc-300 tabular-nums font-medium flex-1">{seg.count}</span>
                    <span className="text-xs text-zinc-600 tabular-nums">avg score: {seg.avgScore}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

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
                <span className="text-4xl font-bold tabular-nums text-white">
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
                      <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500/70" style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className="text-zinc-500 tabular-nums w-8 text-right">{row.pct}%</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feature Engine */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">
            Top Issues{' '}
            <span className="text-zinc-600 font-normal">(weighted by user score, {features.totalFeedbackEvents} events)</span>
          </h3>
        </div>

        {features.topIssues.length === 0 ? (
          <p className="text-zinc-600 text-sm">No structured feedback yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {features.topIssues.map((issue, i) => (
              <div key={issue.issue} className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-zinc-500">#{i + 1}</span>
                  <span className="text-sm font-semibold text-white">{issue.issue}</span>
                </div>
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span className="text-zinc-400">{issue.frequency} reports</span>
                  <span className="text-violet-400">{issue.weightedFrequency} weighted</span>
                </div>
                {issue.examples.length > 0 && (
                  <p className="text-xs text-zinc-500 italic leading-relaxed line-clamp-2">
                    "{issue.examples[0]}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Keywords */}
        {features.topKeywords.length > 0 && (
          <div>
            <p className="text-xs text-zinc-600 mb-2">Top keywords from free text:</p>
            <div className="flex flex-wrap gap-1.5">
              {features.topKeywords.slice(0, 10).map(({ word, freq }) => (
                <span
                  key={word}
                  className="text-[11px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full"
                >
                  {word} <span className="text-zinc-600">×{freq}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trigger breakdown + Recent events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trigger breakdown */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Trigger Counts <span className="text-zinc-600 font-normal">(30d)</span></h3>
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

        {/* Recent feedback events */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5 overflow-hidden">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Responses</h3>
          {recentEvents.length === 0 ? (
            <p className="text-zinc-600 text-sm">No responses yet.</p>
          ) : (
            <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
              {recentEvents.slice(0, 20).map((ev) => (
                <div key={ev.id} className="rounded-lg bg-zinc-800/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-violet-400 font-medium">{TRIGGER_LABELS[ev.triggerType] ?? ev.triggerType}</span>
                    {ev.rating && <span className="text-zinc-300">{ev.rating}</span>}
                    {ev.category && <span className="text-zinc-500">· {ev.category}</span>}
                    {ev.userScore != null && (
                      <span className="ml-auto text-zinc-600">score: {ev.userScore}</span>
                    )}
                    <span className="text-zinc-700">
                      {new Date(ev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {ev.freeText && (
                    <p className="text-zinc-400 leading-relaxed line-clamp-2">{ev.freeText}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
