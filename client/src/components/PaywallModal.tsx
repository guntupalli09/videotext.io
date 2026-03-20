import { useEffect, useState } from 'react'
import { X, Zap, Star, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getCurrentUsage } from '../lib/api'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  usedMinutes?: number
  availableMinutes?: number
  onBuyOverage?: () => void
  onUpgrade?: () => void
}

const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    price: '$9',
    period: '/mo',
    minutes: '450 min',
    features: ['450 transcription minutes', 'All output formats', 'Email support'],
    icon: Zap,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$25',
    period: '/mo',
    minutes: '1,200 min',
    features: ['1,200 transcription minutes', 'Batch processing', 'Priority queue'],
    icon: Star,
    iconColor: 'text-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-400 dark:border-violet-500',
    highlight: true,
  },
  {
    key: 'agency',
    name: 'Agency',
    price: '$99',
    period: '/mo',
    minutes: '3,000 min',
    features: ['3,000 transcription minutes', 'Team access', 'Priority support'],
    icon: Building2,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-700',
    highlight: false,
  },
]

export default function PaywallModal({
  isOpen,
  onClose,
  usedMinutes: propUsed,
  availableMinutes: propAvailable,
  onBuyOverage,
  onUpgrade,
}: PaywallModalProps) {
  const [usage, setUsage] = useState<{ used: number; available: number } | null>(null)
  const [quotaType, setQuotaType] = useState<'imports' | 'minutes'>('minutes')
  const navigate = useNavigate()

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    getCurrentUsage()
      .then((data) => {
        if (cancelled) return
        const isImports = data.quotaType === 'imports'
        setQuotaType(isImports ? 'imports' : 'minutes')
        if (isImports) {
          const used = data.used ?? data.usage?.importCount ?? 0
          const limit = data.limit ?? 3
          setUsage({ used, available: limit })
        } else {
          const available = data.limits.minutesPerMonth + data.overages.minutes
          setUsage({
            used: data.usage.totalMinutes,
            available,
          })
        }
      })
      .catch(() => {
        if (cancelled) return
        setUsage({
          used: propUsed ?? 0,
          available: propAvailable ?? 0,
        })
      })
    return () => { cancelled = true }
  }, [isOpen, propUsed, propAvailable])

  const usedMinutes = usage?.used ?? propUsed ?? 0
  const availableMinutes = usage?.available ?? propAvailable ?? 0

  if (!isOpen) return null

  const isImportsQuota = quotaType === 'imports'

  function handlePlanClick(planKey: string) {
    onClose()
    navigate(`/pricing?plan=${planKey}`)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {isImportsQuota ? (
            /* ── Import limit reached ── */
            <>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-1">Free plan limit reached</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  All 3 free imports used
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                  Your free imports reset on the 1st — or upgrade now and keep going immediately.
                </p>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {PLANS.map((plan) => {
                  const Icon = plan.icon
                  return (
                    <button
                      key={plan.key}
                      onClick={() => handlePlanClick(plan.key)}
                      className={`relative flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${plan.borderColor} ${plan.bgColor} ${plan.highlight ? 'shadow-md' : ''}`}
                    >
                      {plan.highlight && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                      <Icon className={`w-5 h-5 mb-1.5 ${plan.iconColor}`} />
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{plan.name}</p>
                      <p className="text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                        {plan.price}<span className="text-xs font-normal text-gray-400">{plan.period}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.minutes}</p>
                    </button>
                  )
                })}
              </div>

              {/* Feature highlights */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 space-y-1.5">
                {[
                  '✓ Unlimited imports — no monthly cap',
                  '✓ Accurate captions in 99+ languages',
                  '✓ Speaker detection, chapters & summaries',
                  '✓ Export to SRT, VTT, TXT, PDF & more',
                ].map((f) => (
                  <p key={f} className="text-xs text-gray-600 dark:text-gray-300">{f}</p>
                ))}
              </div>

              <button
                onClick={() => { onClose(); navigate('/pricing') }}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
              >
                See all plans & pricing →
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Cancel anytime · No hidden fees
              </p>
            </>
          ) : (
            /* ── Minutes limit reached ── */
            <>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Upgrade to continue</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You've used {usedMinutes} of {availableMinutes} minutes this billing cycle.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={onBuyOverage}
                  disabled={!onBuyOverage}
                  className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4 text-left hover:border-violet-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-semibold text-gray-800 dark:text-white mb-1">Buy 100 more minutes</div>
                  <div className="text-sm text-gray-500">$3 one-time, applies this cycle</div>
                </button>

                <button
                  onClick={onUpgrade || (() => { onClose(); navigate('/pricing') })}
                  className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4 text-left hover:border-violet-400 transition-colors"
                >
                  <div className="font-semibold text-gray-800 dark:text-white mb-1">Upgrade your plan</div>
                  <div className="text-sm text-gray-500">More minutes and higher limits</div>
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Or wait until the next billing cycle when your minutes reset.
              </p>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
