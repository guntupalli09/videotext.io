import { useEffect, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { SITE_METRICS } from '../lib/siteMetrics'

interface PublicStats {
  totalJobsCompleted: number
  totalMinutesProcessed: number
  cachedAt: string
}

// Manual formatting + QA is ~4x audio duration (industry rule of thumb)
const FORMATTING_MULTIPLIER = 4

function formatMinutes(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'K'
  return n.toLocaleString()
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  const start = useRef<number>(0)

  useEffect(() => {
    if (target === 0) return
    start.current = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}

const REFRESH_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Displays live processing stats when the API responds, or falls back to
 * a static metric from siteMetrics when the API is slow or unavailable.
 * Never renders nothing — a blank trust badge is worse than a static one.
 */
export default function TrustBadge({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [ready, setReady] = useState(false)

  const fetchStats = () => {
    fetch('/api/stats/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicStats | null) => {
        if (data) setStats(data)
        setReady(true)
      })
      .catch(() => { setReady(true) })
  }

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const minutesDisplay = useCountUp(stats?.totalMinutesProcessed ?? 0)
  const savedDisplay = useCountUp(
    stats ? stats.totalMinutesProcessed * FORMATTING_MULTIPLIER : 0
  )

  // Static fallback while API is loading or unavailable
  if (!ready || !stats) {
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/25 backdrop-blur-sm">
          <TrendingUp className="w-3 h-3 text-blue-400 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-blue-300 tracking-wide">
            {SITE_METRICS.videosTranscribed} videos transcribed
          </span>
          <span className="w-px h-3 bg-blue-600/30" />
          <span className="text-[11px] font-semibold text-blue-300 tracking-wide">
            {SITE_METRICS.wordAccuracy} accuracy · {SITE_METRICS.transcriptionLanguages} languages
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/25 backdrop-blur-sm">
        <TrendingUp className="w-3 h-3 text-blue-400 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-blue-300 tracking-wide tabular-nums">
          {formatMinutes(minutesDisplay)} min processed
        </span>
        <span className="w-px h-3 bg-blue-600/30" />
        <span className="text-[11px] font-semibold text-blue-300 tracking-wide tabular-nums">
          ~{formatMinutes(savedDisplay)} min saved on formatting &amp; QA
        </span>
      </div>
    </div>
  )
}
