import type { DashboardFeedback, DashboardFeedbackByTool, DashboardStarDist } from '../../lib/founderDashboard'

const TOOL_LABELS: Record<string, string> = {
  'video-to-transcript': 'Transcript',
  'video-to-subtitles': 'Subtitles',
  'translate-subtitles': 'Translate',
  'fix-subtitles': 'Fix SRT',
  'burn-subtitles': 'Burn',
  'compress-video': 'Compress',
  'batch-process': 'Batch',
  'unknown': 'Unknown',
}

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(max - Math.round(rating))}
    </span>
  )
}

function StarBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const color = stars >= 4 ? '#16a34a' : stars === 3 ? '#ca8a04' : '#dc2626'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-amber-400 w-4 shrink-0">{stars}★</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-zinc-400 tabular-nums w-5 text-right shrink-0">{count}</span>
      <span className="text-zinc-600 tabular-nums w-9 text-right shrink-0">{pct.toFixed(0)}%</span>
    </div>
  )
}

interface Props {
  feedback: DashboardFeedback[]
  feedbackByTool: DashboardFeedbackByTool[]
  starDistribution: DashboardStarDist[]
}

export default function FeedbackAnalytics({ feedback, feedbackByTool, starDistribution }: Props) {
  const totalRatings = starDistribution.reduce((s, d) => s + d.count, 0)
  const weightedSum = starDistribution.reduce((s, d) => s + d.stars * d.count, 0)
  const overallAvg = totalRatings > 0 ? weightedSum / totalRatings : null

  const allStars = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: starDistribution.find((d) => d.stars === s)?.count ?? 0,
  }))

  // NPS-style segments
  const promoters = (starDistribution.find(d => d.stars === 5)?.count ?? 0) + (starDistribution.find(d => d.stars === 4)?.count ?? 0)
  const passives = starDistribution.find(d => d.stars === 3)?.count ?? 0
  const detractors = (starDistribution.find(d => d.stars === 2)?.count ?? 0) + (starDistribution.find(d => d.stars === 1)?.count ?? 0)
  const promoterPct = totalRatings > 0 ? Math.round((promoters / totalRatings) * 100) : 0
  const detractorPct = totalRatings > 0 ? Math.round((detractors / totalRatings) * 100) : 0

  // Recent feature requests
  const featureRequests = feedback
    .filter((f) => f.featureRequest && f.featureRequest.trim())
    .slice(0, 6)

  return (
    <div className="space-y-4">
      {/* NPS summary row */}
      {totalRatings > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Satisfied (4–5★)</p>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{promoterPct}%</p>
            <p className="text-xs text-zinc-600 mt-0.5">{promoters} users</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Neutral (3★)</p>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">
              {totalRatings > 0 ? Math.round((passives / totalRatings) * 100) : 0}%
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{passives} users</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Dissatisfied (1–2★)</p>
            <p className="text-2xl font-bold text-red-400 tabular-nums">{detractorPct}%</p>
            <p className="text-xs text-zinc-600 mt-0.5">{detractors} users</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall rating */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-medium text-white mb-4">Overall rating</h3>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-bold text-white tabular-nums">
              {overallAvg != null ? overallAvg.toFixed(1) : '—'}
            </span>
            <div className="pb-1">
              {overallAvg != null && <Stars rating={overallAvg} />}
              <p className="text-xs text-zinc-500 mt-0.5">{totalRatings} ratings</p>
            </div>
          </div>
          <div className="space-y-2">
            {allStars.map((s) => (
              <StarBar key={s.stars} stars={s.stars} count={s.count} total={totalRatings} />
            ))}
          </div>
        </div>

        {/* Per-tool ratings */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-medium text-white mb-4">Rating by tool</h3>
          {feedbackByTool.length === 0 ? (
            <p className="text-zinc-600 text-sm">No data.</p>
          ) : (
            <div className="space-y-3">
              {feedbackByTool.map((t) => {
                const pct = Math.round((t.avgStars / 5) * 100)
                return (
                  <div key={t.toolId} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-300 flex-1 font-medium">
                        {TOOL_LABELS[t.toolId] ?? t.toolId}
                      </span>
                      <Stars rating={t.avgStars} />
                      <span className="text-xs text-zinc-500 tabular-nums">{t.avgStars.toFixed(1)}</span>
                      <span className="text-xs text-zinc-700 tabular-nums">({t.count})</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Latest comments */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 overflow-hidden">
          <h3 className="text-sm font-medium text-white mb-4">Latest comments</h3>
          {feedback.filter((f) => f.comment && f.comment.trim()).length === 0 ? (
            <p className="text-zinc-600 text-sm">No comments yet.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[260px] pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
              {feedback.filter((f) => f.comment && f.comment.trim()).slice(0, 8).map((f) => (
                <div key={f.id} className="border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    {f.stars != null && <Stars rating={f.stars} />}
                    <span className="text-xs text-zinc-600">{f.toolId ? (TOOL_LABELS[f.toolId] ?? f.toolId) : ''}</span>
                    <span className="text-xs text-zinc-700 ml-auto">
                      {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{f.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feature requests */}
      {featureRequests.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-medium text-white mb-4">
            Feature requests{' '}
            <span className="ml-1 text-xs font-normal text-zinc-500">({featureRequests.length} recent)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featureRequests.map((f) => (
              <div
                key={f.id}
                className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {f.stars != null && <Stars rating={f.stars} />}
                  <span className="text-[10px] text-zinc-500 ml-auto">
                    {f.planAtSubmit && (
                      <span className="bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-[9px] font-medium mr-1">
                        {f.planAtSubmit}
                      </span>
                    )}
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed line-clamp-3">{f.featureRequest}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
