import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Youtube, Mic, Building2 } from 'lucide-react'
import { createCheckoutSession, createBillingPortalSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import type { BillingPlan } from '../lib/billing'
import { getCurrentUsage } from '../lib/api'
import { logout } from '../lib/auth'
import { Link } from 'react-router-dom'

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3 tracking-wide uppercase">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
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
          <div className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl border p-7 transition-shadow hover:shadow-md ${isCurrentPlan('free') ? 'border-blue-300 dark:border-blue-600 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'}`}>
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
                { label: '3 uploads per day', ok: true },
                { label: 'Files up to 30 minutes', ok: true },
                { label: 'Transcript & subtitle exports', ok: true },
                { label: 'AI summaries & chapters', ok: true },
                { label: 'Speaker labels', ok: true },
                { label: 'Watermarked exports', ok: false },
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
          <div className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl border p-7 transition-shadow hover:shadow-md ${isCurrentPlan('pro') ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'}`}>
            {isCurrentPlan('pro') && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow">
                Current Plan
              </span>
            )}

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$40</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ mo</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-snug">
                For professionals handling full transcription and delivery workflows.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                'Longer file uploads',
                'Faster processing & priority queue',
                'Advanced formatting workflows',
                'Client-ready export delivery',
                'Translation in 70+ languages',
                'Batch processing',
                'Watermark-free exports',
                'Full workflow automation tools',
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
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-900/20 transition-colors disabled:opacity-60"
            >
              {isCurrentPlan('pro')
                ? (portalLoading ? 'Opening…' : 'Manage subscription')
                : checkoutLoading === 'pro' ? 'Redirecting…'
                : 'Start Pro — $40/mo'}
            </button>
          </div>

          {/* FOUNDING PRO */}
          <div className="relative flex flex-col bg-gray-950 dark:bg-gray-900 rounded-2xl p-7 shadow-2xl shadow-amber-500/10 ring-2 ring-amber-400/60">
            {/* Badges */}
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-500 text-gray-950 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
              {isCurrentPlan('founding_workflow') ? 'Current Plan' : '⚡ 20 Spots Only'}
            </span>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Founding Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">$24.99</span>
                <span className="text-sm text-gray-400">/ mo</span>
              </div>
              <p className="mt-1 text-xs text-amber-400/80 font-medium">
                vs $40/mo after founding closes — locked forever
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
                : 'Claim Founding Pro — $24.99/mo'}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500">
              Limited to 20 founding members · cancel any time
            </p>
          </div>

        </div>

        {/* Value callout below cards */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Founding Pro is{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400">38% less than Pro</span>
            {' '}— and that price locks in for life.{' '}
            <span className="text-gray-400 dark:text-gray-500">No price hikes. Ever.</span>
          </p>
        </div>

        {/* Testimonials */}
        <div className="mt-20">
          <p className="text-center text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-10">
            What people are saying
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: 'I used to spend 3 hours per video on captions. Now I drop the file, grab a coffee, and the transcript is waiting. Accuracy with accented speech is genuinely better than anything else I\'ve tried.',
                name: 'Marcus Chen', role: 'YouTube Creator', meta: '480K subscribers',
                avatar: 'https://i.pravatar.cc/80?img=11',
                Platform: Youtube, platformColor: 'text-red-500',
                result: 'Saves 3 hrs/video', resultBg: 'bg-red-500/10 text-red-500 border border-red-500/20',
              },
              {
                quote: 'We produce 24 episodes a month across three shows. Batch processing handles the entire queue at once — transcripts, show notes, chapters, everything automated. It replaced a part-time contractor.',
                name: 'Sarah Okonkwo', role: 'Podcast Producer', meta: 'The Growth Lab Network',
                avatar: 'https://i.pravatar.cc/80?img=47',
                Platform: Mic, platformColor: 'text-blue-600',
                result: 'Replaced a contractor', resultBg: 'bg-blue-600/10 text-blue-600 border border-blue-500/20',
              },
              {
                quote: 'We caption video ads for 12 clients every week. Drop the file, captions done, sent to client. No downloads, no drama, no back-and-forth.',
                name: 'James Rivera', role: 'Founder', meta: 'Apex Media Agency',
                avatar: 'https://i.pravatar.cc/80?img=33',
                Platform: Building2, platformColor: 'text-blue-500',
                result: '12 clients served', resultBg: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {[0,1,2,3,4].map((s) => (
                      <svg key={s} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <t.Platform className={`w-4 h-4 ${t.platformColor}`} />
                </div>
                <blockquote className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1 mb-4">
                  "{t.quote}"
                </blockquote>
                <span className={`inline-flex self-start text-[11px] font-bold px-2.5 py-1 rounded-full mb-4 ${t.resultBg}`}>
                  {t.result}
                </span>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t.role} · {t.meta}</p>
                  </div>
                </div>
              </motion.div>
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
          {['7-day money-back guarantee', 'Cancel any time', 'We don\'t store your files'].map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {s}
            </span>
          ))}
        </div>

        {(isCurrentPlan('basic') || isCurrentPlan('agency')) && (
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
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
