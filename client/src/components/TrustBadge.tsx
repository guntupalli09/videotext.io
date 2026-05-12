import { useEffect, useRef, useState } from 'react'

interface PublicStats {
  totalJobsCompleted: number
  totalMinutesProcessed: number
  cachedAt: string
}

// Manual formatting is ~4x audio duration (industry rule of thumb)
const FORMATTING_MULTIPLIER = 4

function formatMinutes(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M+'
  if (n >= 1_000) return Math.round(n / 1_000) + 'K+'
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

export default function TrustBadge() {
  const [stats, setStats] = useState<PublicStats | null>(null)

  const fetchStats = () => {
    fetch('/api/stats/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicStats | null) => {
        if (data) setStats(data)
      })
      .catch(() => {/* degrade silently */})
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

  if (!stats) return null

  return (
    <div className="w-full max-w-xl mx-auto mt-5">
      <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm px-5 py-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-0 overflow-hidden">
        {/* Subtle glow accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-16 bg-violet-500/10 rounded-full blur-2xl" />
        </div>

        {/* Stats */}
        <div className="relative flex items-center gap-6 flex-1 justify-center sm:justify-start">
          <Stat
            value={formatMinutes(minutesDisplay) + ' min'}
            label="processed"
          />
          <div className="w-px h-8 bg-white/[0.07] hidden sm:block" />
          <Stat
            value={'~' + formatMinutes(savedDisplay) + ' min'}
            label="saved on formatting"
            note="est."
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-base font-extrabold text-white tabular-nums leading-none">
        {value}
        {note && <span className="text-[10px] font-medium text-white/30 ml-1">{note}</span>}
      </div>
      <div className="text-[11px] text-white/35 mt-0.5 leading-tight">{label}</div>
    </div>
  )
}
