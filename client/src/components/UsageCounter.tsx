import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUsage } from '../lib/api'
import { isDemo } from '../lib/auth'
import { Zap } from 'lucide-react'

function useUsage(refreshTrigger?: string | number) {
  const [usage, setUsage] = useState<{
    quotaType: 'imports' | 'minutes'
    remaining: number
    totalPlanMinutes: number
    usedPercent: number
    limit: number
    used: number
  } | null>(null)

  const fetchUsage = useCallback((skipCache = false) => {
    getCurrentUsage({ skipCache: skipCache || refreshTrigger === 'completed' })
      .then((data) => {
        const quotaType = data.quotaType === 'imports' ? 'imports' : 'minutes'
        if (quotaType === 'imports') {
          const used = data.used ?? data.usage?.importCount ?? 0
          const limit = data.limit ?? 3
          const remaining = Math.max(0, (data.remaining ?? limit - used))
          const usedPercent = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
          setUsage({ quotaType, remaining, totalPlanMinutes: limit, usedPercent, limit, used })
        } else {
          const totalPlanMinutes = data.limits.minutesPerMonth + data.overages.minutes
          const remaining = data.usage.remaining
          const usedPercent =
            totalPlanMinutes === 0
              ? 0
              : Math.min(100, Math.round((data.usage.totalMinutes / totalPlanMinutes) * 100))
          setUsage({
            quotaType: 'minutes',
            remaining,
            totalPlanMinutes,
            usedPercent,
            limit: totalPlanMinutes,
            used: data.usage.totalMinutes,
          })
        }
      })
      .catch(() => {})
  }, [refreshTrigger])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  const refetchFresh = useCallback(() => fetchUsage(true), [fetchUsage])
  return { usage, refetchFresh }
}

/**
 * TurboScribe-style usage bar.
 * Shows "X of 3 transcriptions used" with a progress bar + "Go Unlimited" CTA.
 * Designed to be placed at the top of any tool page.
 */
export default function UsageCounter({ refreshTrigger }: { refreshTrigger?: string | number }) {
  const { usage, refetchFresh } = useUsage(refreshTrigger)

  useEffect(() => {
    window.addEventListener('videotext:plan-updated', refetchFresh)
    return () => window.removeEventListener('videotext:plan-updated', refetchFresh)
  }, [refetchFresh])

  if (!usage || isDemo()) return null

  const { quotaType, remaining, used, limit, usedPercent } = usage

  // For minutes quota — compact display, not the main featured bar
  if (quotaType === 'minutes') {
    const isLow = usedPercent >= 80
    return (
      <div className={`rounded-xl px-4 py-2.5 flex items-center gap-3 border transition-colors ${
        isLow
          ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
          : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <span className={`text-sm font-medium ${isLow ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
          {remaining} min remaining
        </span>
        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 flex-shrink-0">
          <div
            className={`rounded-full h-1.5 transition-all duration-500 ${isLow ? 'bg-amber-500' : 'bg-violet-600'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        {isLow && (
          <Link
            to="/pricing"
            className="ml-auto text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline whitespace-nowrap"
          >
            Upgrade →
          </Link>
        )}
      </div>
    )
  }

  // ── Free tier imports quota — TurboScribe-style prominent bar ──
  const isExhausted = remaining === 0
  const filledDots = Math.min(used, limit)

  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${
      isExhausted
        ? 'bg-red-50 dark:bg-red-500/[0.08] border-red-200 dark:border-red-500/20'
        : 'bg-gray-900 dark:bg-gray-900 border-gray-700 dark:border-gray-700'
    }`}>
      {/* Top: usage label + dots */}
      <div className={`px-4 pt-3.5 pb-2 ${isExhausted ? '' : ''}`}>
        <div className="flex items-center justify-between mb-2.5">
          <p className={`text-sm font-semibold ${
            isExhausted ? 'text-red-700 dark:text-red-400' : 'text-gray-300'
          }`}>
            {isExhausted
              ? "You've used all 3 free transcriptions"
              : `${used} of ${limit} free transcriptions used`}
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < filledDots
                    ? isExhausted ? 'bg-red-400' : 'bg-violet-500'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isExhausted ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
            }`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      {/* Bottom: Go Unlimited CTA */}
      <Link
        to="/pricing"
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 transition-colors group"
      >
        <Zap className="w-3.5 h-3.5 text-white" />
        <span className="text-sm font-bold text-white tracking-wide uppercase">
          Go Unlimited
        </span>
      </Link>
    </div>
  )
}
