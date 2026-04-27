import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Youtube, Mic, Building2 } from 'lucide-react'
import { createCheckoutSession, createBillingPortalSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import type { BillingPlan } from '../lib/billing'
import { getCurrentUsage } from '../lib/api'
import { logout } from '../lib/auth'


function Check() {
  return (
    <svg className="w-4 h-4 shrink-0 text-violet-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

export default function Pricing() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [usageResetDate, setUsageResetDate] = useState<string | null>(null)
  const [subscriptionCancelingAt, setSubscriptionCancelingAt] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [directCheckoutLoading, setDirectCheckoutLoading] = useState(false)
  const [annual, setAnnual] = useState(true) // default to annual (best value)

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

  async function handleSubscribe(plan: BillingPlan, isAnnual = false) {
    try { trackEvent('plan_clicked', { plan, annual: isAnnual }) } catch { /* non-blocking */ }

    // Both logged-in and anonymous users go straight to Stripe Checkout.
    // For logged-in users the server reads their verified email from the JWT.
    // For anonymous users the server omits customer_email so Stripe collects it.
    setDirectCheckoutLoading(true)
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
        mode: 'subscription', plan, annual: isAnnual,
        returnToPath: '/pricing', frontendOrigin: window.location.origin,
      })
      trackEvent('payment_completed', {
        type: 'subscription_checkout_started',
        plan,
        source: 'pricing_page',
        annual: isAnnual,
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
      setDirectCheckoutLoading(false)
    }
  }

  const row = 'flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400 mb-3 tracking-wide uppercase">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
            Start processing in seconds
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Transcript · Subtitles · AI Chapters · Keywords · Speaker Labels — one upload.
          </p>

          {/* Annual / Monthly toggle */}
          <div className="mt-8 inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            <button
              type="button"
              onClick={() => { setAnnual(false); try { trackEvent('billing_period_toggled', { annual: false }) } catch { /* non-blocking */ } }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => { setAnnual(true); try { trackEvent('billing_period_toggled', { annual: true }) } catch { /* non-blocking */ } }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Annual
              <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full">–50%</span>
            </button>
          </div>

          {isPaidPlan && (
            <div className="mt-6 flex flex-col items-center gap-2">
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

        {/* 2-column grid: Free + Pro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">

          {/* FREE */}
          <div className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl border p-7 transition-shadow hover:shadow-md ${isCurrentPlan('free') ? 'border-violet-300 dark:border-violet-600 ring-2 ring-violet-500/20' : 'border-gray-200 dark:border-gray-700'}`}>
            {isCurrentPlan('free') && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow">
                Current Plan
              </span>
            )}
            <div className="mb-5">
              <h3 className="text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Free</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Try it today — no credit card</p>
            </div>

            <ul className="space-y-3 flex-1 mb-7">
              <li className={row}><Check /><span>3 imports per day</span></li>
              <li className={row}><Check /><span>Transcript &amp; subtitles (SRT)</span></li>
              <li className={row}><Check /><span>Videos up to 30 minutes</span></li>
              <li className={row}>
                <svg className="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-400 dark:text-gray-500">Watermark on exports</span>
              </li>
            </ul>

            <button
              disabled
              className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-medium text-sm cursor-not-allowed"
            >
              {isCurrentPlan('free') ? 'Current plan' : 'Free — no signup'}
            </button>
          </div>

          {/* PRO */}
          <div className={`relative flex flex-col bg-gray-900 dark:bg-white rounded-2xl p-7 shadow-xl shadow-violet-500/10 ring-2 ${isCurrentPlan('pro') ? 'ring-violet-400' : 'ring-violet-500'}`}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow">
              {isCurrentPlan('pro') ? 'Current Plan' : 'Most Popular'}
            </span>

            <div className="mb-5">
              <h3 className="text-base font-semibold text-violet-400 dark:text-violet-600 uppercase tracking-wide">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white dark:text-gray-900">{annual ? '$10' : '$20'}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500">/ mo{annual ? ', billed annually' : ''}</span>
              </div>
              {annual && (
                <p className="mt-1 text-xs text-emerald-400 dark:text-emerald-600 font-medium">Save $120/year vs monthly</p>
              )}
              <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">Built for real workloads</p>
            </div>

            <ul className="space-y-3 flex-1 mb-7">
              {[
                'No watermark',
                'Up to 2 hours per video',
                'AI summary, chapters & speaker labels',
                'Translation in 70+ languages',
                'Share read-only transcript links (original & translated)',
                'Batch process multiple videos at once',
                'Faster processing & queue priority',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-100 dark:text-gray-800">
                  <svg className="w-4 h-4 shrink-0 text-violet-400 dark:text-violet-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => isCurrentPlan('pro') ? handleManageSubscription() : handleSubscribe('pro', annual)}
              disabled={(isCurrentPlan('pro') && portalLoading) || directCheckoutLoading}
              className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-colors disabled:opacity-60"
            >
              {isCurrentPlan('pro')
                ? (portalLoading ? 'Opening…' : 'Manage subscription')
                : directCheckoutLoading ? 'Redirecting…'
                : annual ? 'Start Pro — $10/mo' : 'Start Pro — $20/mo'}
            </button>
          </div>

          {/*
          BUSINESS — commented out until we have traction

          <div className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-7 ${isCurrentPlan('business') ? 'border-violet-400 ring-2 ring-violet-500/30' : 'border-gray-200 dark:border-gray-700'}`}>
            {isCurrentPlan('business') && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow">Current Plan</span>
            )}
            <div className="mb-5">
              <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide">Business</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$49</span>
                <span className="text-sm text-gray-500">/ mo</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Teams &amp; agencies. Zero throttling.</p>
            </div>
            <ul className="space-y-3 flex-1 mb-7 text-sm text-gray-700 dark:text-gray-300">
              <li>Everything in Pro</li>
              <li>Up to 4 hours per video</li>
              <li>100-video batches · 10 languages</li>
              <li>8 concurrent jobs · Dedicated queue</li>
            </ul>
            <button
              onClick={() => isCurrentPlan('business') ? handleManageSubscription() : handleSubscribe('business', false)}
              disabled={(isCurrentPlan('business') && portalLoading) || directCheckoutLoading}
              className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm transition-colors disabled:opacity-60"
            >
              {isCurrentPlan('business') ? (portalLoading ? 'Opening…' : 'Manage subscription') : 'Start Business — $49/mo'}
            </button>
          </div>
          */}

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
                Platform: Mic, platformColor: 'text-violet-500',
                result: 'Replaced a contractor', resultBg: 'bg-violet-500/10 text-violet-500 border border-violet-500/20',
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

        {(isCurrentPlan('basic') || isCurrentPlan('agency') || isCurrentPlan('founding_workflow')) && (
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
