import { useCallback, useEffect, useState } from 'react'
import { getCurrentUsage } from '../lib/api'
import { isDemo } from '../lib/auth'

const PLAN_LABELS: Record<string, string> = {
  free: 'Free plan',
  basic: 'Basic plan',
  pro: 'Pro plan',
  agency: 'Agency plan',
  founding_workflow: 'Creator Pro',
}

const PLAN_STYLES: Record<string, string> = {
  free: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  basic: 'bg-primary/10 text-primary border-primary/20',
  pro: 'bg-primary/20 text-primary border-primary/30',
  agency: 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700',
  founding_workflow: 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
}

export default function PlanBadge() {
  const [plan, setPlan] = useState<string | null>(null)

  const fetchPlan = useCallback(() => {
    getCurrentUsage({ skipCache: true })
      .then((data) => setPlan((data.plan || 'free').toLowerCase()))
      .catch(() => setPlan((localStorage.getItem('plan') || 'free').toLowerCase()))
  }, [])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  useEffect(() => {
    window.addEventListener('videotext:plan-updated', fetchPlan)
    return () => window.removeEventListener('videotext:plan-updated', fetchPlan)
  }, [fetchPlan])

  if (!plan || isDemo()) return null

  const label = PLAN_LABELS[plan] || PLAN_LABELS.free
  const style = PLAN_STYLES[plan] || PLAN_STYLES.free

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${style}`}
      aria-label={`Current plan: ${label}`}
    >
      {label}
    </span>
  )
}
