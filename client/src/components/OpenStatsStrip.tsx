import { Link } from 'react-router-dom'
import { OPEN_STATS_LAST_UPDATED, OPEN_STATS_STRIP } from '../lib/openStats'

/** Compact proof strip — link to /open for methodology. */
export default function OpenStatsStrip({ className = '' }: { className?: string }) {
  return (
    <aside
      className={`rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/30 px-4 py-4 sm:px-5 ${className}`}
      aria-labelledby="open-stats-strip-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h2 id="open-stats-strip-heading" className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-400">
          Measured on our stack
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">Updated {OPEN_STATS_LAST_UPDATED}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {OPEN_STATS_STRIP.map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{s.value}</div>
            <div className="text-xs font-medium text-blue-800 dark:text-blue-300">{s.label}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{s.note}</div>
          </div>
        ))}
      </div>
      <Link
        to="/open"
        className="mt-4 inline-flex text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
      >
        Full benchmarks & methodology →
      </Link>
    </aside>
  )
}
