import type { DashboardYoutubeResolution } from '../../lib/founderDashboard'

export default function YoutubeResolutionPanel({ data }: { data?: DashboardYoutubeResolution }) {
  if (!data || data.total <= 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-medium text-white mb-2">YouTube resolution metrics (30d)</h3>
        <p className="text-xs text-zinc-500">No YouTube resolution events yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">YouTube resolution metrics (30d)</h3>
        <span className="text-xs text-zinc-500">{data.total} jobs</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Caption resolved" value={`${data.captionsResolvedPct.toFixed(1)}%`} />
        <Metric label="Patched" value={`${data.patchResolvedPct.toFixed(1)}%`} />
        <Metric label="Fallback ASR" value={`${data.fallbackPct.toFixed(1)}%`} danger={data.fallbackPct > 10} />
        <Metric label="Avg confidence" value={data.avgConfidence != null ? `${(data.avgConfidence * 100).toFixed(1)}%` : '—'} />
        <Metric label="Degraded exec" value={`${data.degradedExecutionPct.toFixed(1)}%`} danger={data.degradedExecutionPct > 1} />
        <Metric label="High cost jobs" value={`${data.highCostPct.toFixed(1)}%`} danger={data.highCostPct > 20} />
        <Metric label="Queue timeout rate" value={`${(data.queueTimeoutRate * 100).toFixed(1)}%`} danger={data.queueTimeoutRate > 0.1} />
        <Metric label="Retry success" value={data.retrySuccessRate != null ? `${(data.retrySuccessRate * 100).toFixed(1)}%` : '—'} danger={data.retrySuccessRate != null && data.retrySuccessRate < 0.3} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Retry rate" value={`${(data.retryRate * 100).toFixed(1)}%`} />
        <Metric label="Avg retry delay" value={data.avgRetryDelayMs != null ? `${Math.round(data.avgRetryDelayMs)} ms` : '—'} />
        <Metric label="Circuit trips" value={String(data.circuitBreakerTriggers)} danger={data.circuitBreakerTriggers > 0} />
      </div>

      <div>
        <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider">Provider failures</p>
        <ul className="space-y-1">
          {data.byError.filter((e) => e.error !== 'none').slice(0, 4).map((e) => (
            <li key={e.error} className="text-xs text-zinc-300 flex justify-between">
              <span>{e.error}</span>
              <span className="text-zinc-500">{e.count}</span>
            </li>
          ))}
          {data.byError.filter((e) => e.error !== 'none').length === 0 && (
            <li className="text-xs text-emerald-400">No classified failures recorded.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${danger ? 'border-red-900/40 bg-red-950/20' : 'border-zinc-800 bg-zinc-950/40'}`}>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`text-sm font-semibold ${danger ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}
