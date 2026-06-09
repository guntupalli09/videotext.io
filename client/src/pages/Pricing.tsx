import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Youtube, Mic, Building2, Clock, DollarSign, Zap } from 'lucide-react'
import { createCheckoutSession, createBillingPortalSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import type { BillingPlan } from '../lib/billing'
import { getCurrentUsage } from '../lib/api'
import { logout } from '../lib/auth'
import { Link } from 'react-router-dom'
import { SITE_METRICS, TESTIMONIALS, REVIEW_AGGREGATE } from '../lib/siteMetrics'
import type { Testimonial } from '../lib/siteMetrics'

function Check({ gold = false }: { gold?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 mt-0.5 ${gold ? 'text-amber-500' : 'text-blue-600'}`}
      fill="currentColor" viewBox="0 0 20 20" aria-hidden
    >
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function X() {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  )
}

/** CSS-generated initials avatar — no external image dependencies */
function InitialsAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: `hsl(${hue}, 50%, 42%)`, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

const PLATFORM_ICONS: Record<string, { Icon: typeof Youtube; color: string }> = {
  'marcus-chen': { Icon: Youtube, color: 'text-red-500' },
  'sarah-okonkwo': { Icon: Mic, color: 'text-blue-600' },
  'james-rivera': { Icon: Building2, color: 'text-blue-500' },
}

const RESULT_STYLES: Record<string, string> = {
  'marcus-chen': 'bg-red-500/10 text-red-500 border border-red-500/20',
  'sarah-okonkwo': 'bg-blue-600/10 text-blue-600 border border-blue-500/20',
  'james-rivera': 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
}

/** ROI calculator section — reframes $40/mo as an investment, not a cost */
function RoiSection() {
  const [transcriptsPerMonth, setTranscriptsPerMonth] = useState(10)
  const minutesPerTranscript = SITE_METRICS.formattingTimeSavedFrom
  const savedPerTranscript = minutesPerTranscript - SITE_METRICS.formattingTimeSavedTo
  const totalHoursSaved = Math.round((transcriptsPerMonth * savedPerTranscript) / 60)
  const costPerHourSaved = totalHoursSaved > 0
    ? (SITE_METRICS.proPrice / totalHoursSaved).toFixed(2)
    : '—'

  return (
    <div className="mt-16 rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-gray-900 border border-blue-100 dark:border-blue-900/50 p-8">
      <div className="text-center mb-8">
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
          ROI Calculator
        </p>
        <h3 className="text-2xl font-medium text-gray-900 dark:text-white">
          How much time does Pro save you?
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md mx-auto">
          Professional transcriptionists spend ~{minutesPerTranscript} min per transcript on formatting and QA.
          VideoText cuts that to ~{SITE_METRICS.formattingTimeSavedTo} min.
        </p>
      </div>

      <div className="max-w-sm mx-auto mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Transcripts you handle per month: <span className="text-blue-600 dark:text-blue-400 font-bold">{transcriptsPerMonth}</span>
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={transcriptsPerMonth}
          onChange={(e) => setTranscriptsPerMonth(Number(e.target.value))}
          className="w-full h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1/mo</span>
          <span>100/mo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 text-center shadow-sm">
          <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalHoursSaved}h</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">saved per month</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {transcriptsPerMonth} transcripts × {savedPerTranscript} min saved
          </p>
        </div>
        <div className="rounded-xl bg-blue-600 p-5 text-center shadow-sm shadow-blue-900/20">
          <DollarSign className="w-5 h-5 text-blue-100 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">${SITE_METRICS.proPrice}</p>
          <p className="text-sm text-blue-200 mt-1">per month for Pro</p>
          <p className="text-xs text-blue-300 mt-1">7-day money-back guarantee</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 text-center shadow-sm">
          <Zap className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {totalHoursSaved > 0 ? `$${costPerHourSaved}` : '—'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">cost per hour saved</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {totalHoursSaved > 0 ? `$${SITE_METRICS.proPrice} ÷ ${totalHoursSaved}h` : 'Set volume above'}
          </p>
        </div>
      </div>

      {totalHoursSaved >= 2 && (
        <p className="text-center text-sm text-blue-600 dark:text-blue-400 font-medium mt-6">
          At {transcriptsPerMonth} transcripts/month, Pro pays for itself in under {Math.ceil(SITE_METRICS.proPrice / ((totalHoursSaved / 4.3) * 15))} days of billing hours saved.
        </p>
      )}
    </div>
  )
}

/** Testimonial card for pricing page — same data source as homepage */
function PricingTestimonialCard({ t, i }: { t: Testimonial; i: number }) {
  const platform = PLATFORM_ICONS[t.id]
  const PlatformIcon = platform?.Icon
  return (
    <motion.div
      key={t.id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: i * 0.1, duration: 0.5 }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-0.5">
          {[0,1,2,3,4].map((s) => (
            <svg key={s} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        {PlatformIcon && <PlatformIcon className={`w-4 h-4 ${platform.color}`} />}
      </div>
      <blockquote className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1 mb-4">
        "{t.quote}"
      </blockquote>
      <span className={`inline-flex self-start text-[11px] font-bold px-2.5 py-1 rounded-full mb-4 ${RESULT_STYLES[t.id] ?? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
        {t.result}
      </span>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <InitialsAvatar name={t.name} size={36} />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t.role} · {t.company}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function Pricing() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [usageResetDate, setUsageResetDate] = useState<string | null>(null)
  const [subscriptionCancelingAt, setSubscriptionCancelingAt] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<BillingPlan | null>(null)

  const refreshCurrentPlan = useCallback(() => {
    getCurrentUsage({ skipCache: true })
      .then((data) => {
        setCurrentPlan((data.plan || 'free').toLowerCase())
        setUsageResetDate(data.resetDate ?? data.billingPeriodEnd ?? null)
        setSubscriptionCancelingAt((data as { subscriptionCancelingAt?: string | null }).subscriptionCancelingAt ?? null)
      })
      .catch(() => {
        setCurrentPlan((localStorage.getItem('plan') || 'free').toLowerCase())
        setUsageResetDate(null)
      })
  }, [])

  useEffect(() => { refreshCurrentPlan() }, [refreshCurrentPlan])

  useEffect(() => {
    const onPlanUpdated = () => refreshCurrentPlan()
    window.addEventListener('videotext:plan-updated', onPlanUpdated)
    return () => window.removeEventListener('videotext:plan-updated', onPlanUpdated)
  }, [refreshCurrentPlan])

  const isPaidPlan = currentPlan === 'basic' || currentPlan === 'pro' || currentPlan === 'agency' || currentPlan === 'founding_workflow' || currentPlan === 'business'
  const isCurrentPlan = (plan: string) => (currentPlan || 'free').toLowerCase() === plan.toLowerCase()
  const signupStartedAt = (() => {
    try { return localStorage.getItem('videotext:signup_started_at') } catch { return null }
  })()
  const hoursSinceSignup = signupStartedAt ? Math.max(0, Math.round((Date.now() - new Date(signupStartedAt).getTime()) / 36e5)) : null
  const jobCount = (() => {
    try { return Number(localStorage.getItem('videotext:job_completed_count') || '0') || 0 } catch { return 0 }
  })()

  async function handleManageSubscription() {
    if (!isPaidPlan) return
    setPortalLoading(true)
    try {
      const { url } = await createBillingPortalSession(window.location.origin + '/pricing')
      window.location.href = url
    } catch (err: any) {
      alert(err.message || 'Failed to open billing')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleSubscribe(plan: BillingPlan) {
    try { trackEvent('plan_clicked', { plan }) } catch { /* non-blocking */ }

    setCheckoutLoading(plan)
    try {
      trackEvent('upgrade_clicked', {
        plan,
        source: 'pricing_page',
        job_count: jobCount,
        ...(hoursSinceSignup != null ? { hours_since_signup: hoursSinceSignup, cohort_date: signupStartedAt?.slice(0, 10) } : {}),
      })
      trackEvent('checkout_started', {
        plan,
        source: 'pricing_page',
        job_count: jobCount,
        ...(hoursSinceSignup != null ? { hours_since_signup: hoursSinceSignup, cohort_date: signupStartedAt?.slice(0, 10) } : {}),
      })
      const { url } = await createCheckoutSession({
        mode: 'subscription', plan,
        returnToPath: '/pricing', frontendOrigin: window.location.origin,
      })
      trackEvent('payment_completed', {
        type: 'subscription_checkout_started',
        plan,
        source: 'pricing_page',
        job_count: jobCount,
        ...(hoursSinceSignup != null ? { hours_since_signup: hoursSinceSignup, cohort_date: signupStartedAt?.slice(0, 10) } : {}),
      })
      window.location.href = url
    } catch (e: any) {
      const msg: string = e.message || ''
      if (msg.includes('session has expired') || msg.includes('log out and log back in')) {
        logout(); window.location.reload(); return
      }
      alert(msg || 'Failed to start checkout. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 py-20 sm:py-28">
      {/* Schema.org AggregateRating for pricing page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AggregateRating',
            itemReviewed: { '@type': 'SoftwareApplication', name: 'VideoText' },
            ratingValue: REVIEW_AGGREGATE.ratingValue,
            reviewCount: REVIEW_AGGREGATE.ratingCount,
            bestRating: REVIEW_AGGREGATE.bestRating,
          })
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3 tracking-wide uppercase">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white tracking-tight">
            The complete transcription workflow
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Transcript · Formatting · QA · Subtitles · AI Chapters · Speaker Labels — one tool, start to delivery.
          </p>

          {isPaidPlan && (
            <div className="mt-8 flex flex-col items-center gap-2">
              {subscriptionCancelingAt && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 max-w-sm text-center">
                  Canceling on{' '}
                  <strong>{new Date(subscriptionCancelingAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>.
                  Reactivate below to keep your plan.
                </div>
              )}
              {!subscriptionCancelingAt && usageResetDate && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Renews {new Date(usageResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {portalLoading ? 'Opening…' : 'Manage subscription'}
              </button>
            </div>
          )}
        </div>

        {/* Pricing cards — 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">

          {/* FREE */}
          <div className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-xl border p-7 transition-shadow hover:shadow-md ${isCurrentPlan('free') ? 'border-blue-300 dark:border-blue-600 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'}`}>
            {isCurrentPlan('free') && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow">
                Current Plan
              </span>
            )}

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Free</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-snug">
                Try the full workflow — no card needed.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                { label: `${SITE_METRICS.freeUploadsPerDay} uploads per day`, ok: true },
                { label: `Files up to ${SITE_METRICS.freeMaxMinutes} minutes`, ok: true },
                { label: 'Transcript & subtitle exports', ok: true },
                { label: 'AI summaries & chapters', ok: true },
                { label: 'Speaker labels', ok: true },
                { label: 'Watermark-free exports', ok: false },
                { label: 'Formatting & QA workflows', ok: false },
                { label: 'Client-ready delivery', ok: false },
              ].map(({ label, ok }) => (
                <li key={label} className="flex items-start gap-2.5 text-sm">
                  {ok ? <Check /> : <X />}
                  <span className={ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-medium text-sm cursor-not-allowed"
            >
              {isCurrentPlan('free') ? 'Current plan' : 'Free — no sign-up'}
            </button>
          </div>

          {/* PRO */}
          <div className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-xl border p-7 transition-shadow hover:shadow-md ${isCurrentPlan('pro') ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'}`}>
            {isCurrentPlan('pro') && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow">
                Current Plan
              </span>
            )}

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">${SITE_METRICS.proPrice}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ mo</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-snug">
                For professionals handling full transcription and delivery workflows.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                `Files up to ${SITE_METRICS.proMaxMinutes} min (free: ${SITE_METRICS.freeMaxMinutes} min)`,
                `${SITE_METRICS.proMonthlyMinutes} min/month included`,
                'Priority queue — 2× faster job starts',
                'Style guide formatter (Rev, GoTranscript, custom)',
                'Watermark-free exports in all formats',
                `Translation in ${SITE_METRICS.translationLanguages}+ languages`,
                `Batch up to ${SITE_METRICS.proMaxBatchFiles} files simultaneously`,
                'Share read-only transcript links with clients',
                'AI summary, chapters & speaker labels',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => isCurrentPlan('pro') ? handleManageSubscription() : handleSubscribe('pro')}
              disabled={(isCurrentPlan('pro') && portalLoading) || checkoutLoading !== null}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-900/20 transition-colors disabled:opacity-60"
            >
              {isCurrentPlan('pro')
                ? (portalLoading ? 'Opening…' : 'Manage subscription')
                : checkoutLoading === 'pro' ? 'Redirecting…'
                : `Start Pro — $${SITE_METRICS.proPrice}/mo`}
            </button>
          </div>

          {/* FOUNDING PRO */}
          <div className="relative flex flex-col bg-gray-950 dark:bg-gray-900 rounded-xl p-7 shadow-2xl shadow-amber-500/10 ring-2 ring-amber-400/60">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-500 text-gray-950 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
              {isCurrentPlan('founding_workflow') ? 'Current Plan' : '⚡ Limited availability'}
            </span>

            <div className="mb-6">
              <h3 className="text-xs font-medium text-amber-400 uppercase tracking-widest">Founding Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${SITE_METRICS.foundingPrice}</span>
                <span className="text-sm text-gray-400">/ mo</span>
              </div>
              <p className="mt-1 text-xs text-amber-400/80 font-medium">
                vs ${SITE_METRICS.proPrice}/mo after founding closes — locked forever
              </p>
              <p className="mt-2 text-sm text-gray-300 leading-snug">
                Everything in Pro. Your feedback shapes what gets built next.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                'Everything in Pro',
                'Lifetime founding price — never increases',
                'Early access to new workflow features',
                'Direct roadmap influence',
                'Priority founder support',
                'Personalized workflow onboarding',
                'Private founding-member community',
              ].map((f, i) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-100">
                  <Check gold={i > 0} />
                  <span className={i === 0 ? 'font-semibold' : ''}>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => isCurrentPlan('founding_workflow') ? handleManageSubscription() : handleSubscribe('founding_workflow')}
              disabled={(isCurrentPlan('founding_workflow') && portalLoading) || checkoutLoading !== null}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm shadow-lg shadow-amber-900/40 transition-colors disabled:opacity-60"
            >
              {isCurrentPlan('founding_workflow')
                ? (portalLoading ? 'Opening…' : 'Manage subscription')
                : checkoutLoading === 'founding_workflow' ? 'Redirecting…'
                : `Claim Founding Pro — $${SITE_METRICS.foundingPrice}/mo`}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500">
              Founding price · cancel any time
            </p>
          </div>

        </div>

        {/* Value callout below cards */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Founding Pro is{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {Math.round(((SITE_METRICS.proPrice - SITE_METRICS.foundingPrice) / SITE_METRICS.proPrice) * 100)}% less than Pro
            </span>
            {' '}— and that price locks in for life.{' '}
            <span className="text-gray-400 dark:text-gray-500">No price hikes. Ever.</span>
          </p>
        </div>

        {/* ROI Calculator */}
        <RoiSection />

        {/* Testimonials */}
        <div className="mt-20">
          <p className="text-center text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-10">
            What people are saying
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <PricingTestimonialCard key={t.id} t={t} i={i} />
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
          Transcriptionists matching Rev-, GoTranscript-, or similar PDFs can{' '}
          <Link to="/guideline-format" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            format your transcript to a client style guide →
          </Link>
        </p>

        {/* Trust signals */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-400 dark:text-gray-500">
          {['7-day money-back guarantee', 'Cancel any time', "We don't store your files"].map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {s}
            </span>
          ))}
        </div>

        {/* Team / enterprise inquiry */}
        <div className="mt-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Need a team or agency plan?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Shared workspaces, team billing, per-client guideline profiles, and priority support.
            We build custom plans for agencies and enterprise teams.
          </p>
          <a
            href="/feedback"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-sm font-medium transition-colors"
          >
            Contact us about team pricing →
          </a>
        </div>

        {/* Security link */}
        <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          Questions about data security?{' '}
          <Link to="/security" className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Read our security overview →
          </Link>
        </p>

        {(isCurrentPlan('basic') || isCurrentPlan('agency')) && (
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            On a legacy plan?{' '}
            <button type="button" onClick={handleManageSubscription} className="underline hover:text-gray-600 dark:hover:text-gray-300">
              Manage your plan →
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
