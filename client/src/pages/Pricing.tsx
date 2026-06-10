import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { createCheckoutSession, createBillingPortalSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import type { BillingPlan } from '../lib/billing'
import { getCurrentUsage } from '../lib/api'
import { logout } from '../lib/auth'
import { Link } from 'react-router-dom'

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

const VALUE_ITEMS = [
  { label: 'AI Transcription', detail: 'Broadcast-quality accuracy across accents and speakers', value: '$40+' },
  { label: 'Transcript Formatting Workflows', detail: 'Style-guide–ready output — verbatim, clean, or custom', value: '$50+' },
  { label: 'QA & Confidence Reviews', detail: 'Auto-flag low-accuracy segments before delivery', value: '$40+' },
  { label: 'Subtitle Creation', detail: 'SRT, VTT, ASS — properly timed and formatted', value: '$30+' },
  { label: 'Subtitle Repair & Sync Cleanup', detail: 'Fix broken timing and formatting in one pass', value: '$20+' },
  { label: 'Translation Workflows', detail: '70+ languages, subtitle-ready output', value: '$20+' },
  { label: 'Batch Processing', detail: 'Queue up to 20 files — come back to finished work', value: '$30+' },
  { label: 'Workflow Automation', detail: 'Chapters, speaker labels, summaries — auto-generated', value: '$40+' },
  { label: 'Priority Processing Queue', detail: 'Your jobs go first — no waiting behind free-tier traffic', value: '$25+' },
]

const TESTIMONIALS = [
  {
    quote: 'I process 30+ transcripts a month for legal clients. The QA workflow catches every low-confidence segment before delivery. That alone saves me two hours per file.',
    name: 'Diane Moreau',
    role: 'Freelance Legal Transcriptionist',
    result: 'Saves 2 hrs/file',
    resultColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    initial: 'D',
  },
  {
    quote: 'Subtitle cleanup used to take as long as the transcription itself. Now I clean, sync, and export in one pass. My turnaround time is half what it was six months ago.',
    name: 'Priya Nair',
    role: 'Subtitle Editor',
    result: '2× faster turnaround',
    resultColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    initial: 'P',
  },
  {
    quote: 'We caption video ads for 14 clients every week. Batch processing means we drop the files, come back in an hour, and everything is ready to send. Clean, fast, professional.',
    name: 'James Rivera',
    role: 'Founder, Apex Media Agency',
    result: '14 clients served weekly',
    resultColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    initial: 'J',
  },
]

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
    const handler = () => refreshCurrentPlan()
    window.addEventListener('videotext:plan-updated', handler)
    return () => window.removeEventListener('videotext:plan-updated', handler)
  }, [refreshCurrentPlan])

  const isPaidPlan = ['basic', 'pro', 'agency', 'founding_workflow', 'business'].includes(currentPlan ?? '')
  const isProPlan = currentPlan === 'pro' || currentPlan === 'founding_workflow'
  const isCurrentFree = !isPaidPlan

  const signupStartedAt = (() => { try { return localStorage.getItem('videotext:signup_started_at') } catch { return null } })()
  const hoursSinceSignup = signupStartedAt ? Math.max(0, Math.round((Date.now() - new Date(signupStartedAt).getTime()) / 36e5)) : null
  const jobCount = (() => { try { return Number(localStorage.getItem('videotext:job_completed_count') || '0') || 0 } catch { return 0 } })()

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
      const meta = { plan, source: 'pricing_page', job_count: jobCount, ...(hoursSinceSignup != null ? { hours_since_signup: hoursSinceSignup, cohort_date: signupStartedAt?.slice(0, 10) } : {}) }
      trackEvent('upgrade_clicked', meta)
      trackEvent('checkout_started', meta)
      const { url } = await createCheckoutSession({ mode: 'subscription', plan, returnToPath: '/pricing', frontendOrigin: window.location.origin })
      trackEvent('payment_completed', { type: 'subscription_checkout_started', ...meta })
      window.location.href = url
    } catch (e: any) {
      const msg: string = e.message || ''
      if (msg.includes('session has expired') || msg.includes('log out and log back in')) { logout(); window.location.reload(); return }
      alert(msg || 'Failed to start checkout. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const proLoading = checkoutLoading === 'founding_workflow'
  const proDisabled = (isProPlan && portalLoading) || checkoutLoading !== null

  function ProCTA({ label = 'Start Pro — $24.99/month', className = '' }: { label?: string; className?: string }) {
    return (
      <button
        onClick={() => isProPlan ? handleManageSubscription() : handleSubscribe('founding_workflow')}
        disabled={proDisabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-900/40 transition-all duration-200 disabled:opacity-60 ${className}`}
      >
        {isProPlan
          ? (portalLoading ? 'Opening…' : 'Manage subscription')
          : proLoading ? 'Redirecting…'
          : label}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* ── HEADLINE ──────────────────────────────────── */}
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-medium text-white tracking-tight leading-tight">
            Deliver client-ready transcripts<br className="hidden sm:block" /> in less time.
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Transcript · Formatting · QA · Subtitles · Translation · Batch — one workflow, raw audio to final delivery.
          </p>
        </div>

        {/* ── ACTIVE PLAN BANNER ────────────────────────── */}
        {isPaidPlan && (
          <div className="mb-10 flex flex-col items-center gap-3">
            {subscriptionCancelingAt && (
              <div className="rounded-xl bg-amber-900/30 border border-amber-700/50 px-4 py-3 text-sm text-amber-300 max-w-sm text-center">
                Canceling on{' '}
                <strong>
                  {new Date(subscriptionCancelingAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </strong>
                . Reactivate below to keep your plan.
              </div>
            )}
            {!subscriptionCancelingAt && usageResetDate && (
              <p className="text-sm text-gray-500">
                Renews {new Date(usageResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {portalLoading ? 'Opening…' : 'Manage subscription'}
            </button>
          </div>
        )}

        {/* ── PRICING GRID (asymmetric) ──────────────────── */}
        {/*  Left col (2fr) = compact Free card                */}
        {/*  Right col (3fr) = dominant Pro card + value stack */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-5 items-start mb-12">

          {/* FREE CARD */}
          <div className={`relative flex flex-col rounded-xl border p-6 transition-shadow ${
            isCurrentFree
              ? 'border-blue-500/30 ring-1 ring-blue-500/20 bg-white/[0.04]'
              : 'border-white/[0.07] bg-white/[0.02]'
          }`}>
            {isCurrentFree && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                Current Plan
              </span>
            )}

            <div className="mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Free</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">$0</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 leading-snug">
                Try the workflow before upgrading.
              </p>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6">
              {[
                { label: '3 uploads per day', ok: true },
                { label: 'Files up to 30 minutes', ok: true },
                { label: 'Transcript & subtitle exports', ok: true },
                { label: 'AI summaries & chapters', ok: true },
                { label: 'No credit card required', ok: true },
                { label: 'Formatting & QA workflows', ok: false },
                { label: 'Client-ready delivery', ok: false },
                { label: 'Batch processing', ok: false },
              ].map(({ label, ok }) => (
                <li key={label} className="flex items-start gap-2 text-[13px]">
                  {ok ? <CheckIcon className="mt-0.5 text-gray-400" /> : <XIcon />}
                  <span className={ok ? 'text-gray-400' : 'text-gray-600'}>{label}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-gray-600 font-medium text-sm cursor-not-allowed"
            >
              {isCurrentFree ? 'Current plan' : 'Free — no sign-up'}
            </button>
          </div>

          {/* RIGHT COLUMN: Pro card + value stack */}
          <div className="flex flex-col gap-5">

            {/* PRO CARD */}
            <div className={`relative flex flex-col rounded-xl p-7 shadow-2xl shadow-blue-900/20 bg-gray-900 ${
              isProPlan
                ? 'ring-2 ring-blue-500/50'
                : 'ring-2 ring-blue-600/50'
            }`}>
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-blue-900/40 whitespace-nowrap">
                {isProPlan ? 'Current Plan' : '⚡ Most Popular'}
              </span>

              <div className="mb-6">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Pro</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold text-white">$24.99</span>
                  <span className="text-sm text-gray-400">/ month</span>
                </div>
                <p className="mt-2 text-sm text-gray-300 leading-snug">
                  For professionals who deliver transcripts, subtitles, and captions for clients.
                </p>
              </div>

              <ul className="space-y-3 flex-1 mb-7">
                {[
                  'Unlimited uploads — no daily cap',
                  'Files up to 2 hours long',
                  'Transcript formatting & QA workflows',
                  'Client-ready exports, watermark-free',
                  'Subtitle creation & repair',
                  'Translation in 70+ languages',
                  'Batch processing (up to 20 files)',
                  'Priority processing queue',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-100">
                    <CheckIcon className="mt-0.5 text-blue-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <ProCTA className="w-full py-4" />
              <p className="mt-3 text-center text-xs text-gray-600">
                7-day money-back guarantee · cancel any time
              </p>
            </div>

            {/* VALUE STACK */}
            <div className="rounded-xl bg-gray-900/70 border border-white/[0.07] p-6">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">What's Included</p>
              <p className="text-base font-semibold text-white mb-6">
                Everything you need, start to delivery.
              </p>

              <div className="space-y-3 mb-6">
                {VALUE_ITEMS.map(({ label, detail, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-200 leading-tight">{label}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-tight">{detail}</p>
                    </div>
                    <span className="text-[12px] font-bold text-emerald-400 whitespace-nowrap shrink-0 mt-0.5">{value}/mo</span>
                  </div>
                ))}
              </div>

              {/* Total vs price */}
              <div className="rounded-xl bg-gray-800/80 border border-white/[0.08] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Workflow Value</p>
                  <p className="text-3xl font-bold text-white">
                    $295+
                    <span className="text-sm text-gray-500 font-normal ml-1">/ month</span>
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-3">
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Your Price</p>
                    <p className="text-3xl font-bold text-blue-400">
                      $24.99
                      <span className="text-sm text-gray-500 font-normal ml-1">/ month</span>
                    </p>
                  </div>
                  <ProCTA label="Get Pro Access" className="py-3 px-6 whitespace-nowrap" />
                </div>
              </div>
            </div>

          </div>{/* end right column */}
        </div>

        {/* ── WHY PROFESSIONALS UPGRADE ─────────────────── */}
        <div className="mb-16">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 text-center">Why Professionals Upgrade</p>
          <h2 className="text-3xl font-semibold text-white text-center mb-10">
            Stop losing hours to manual work.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: '⏱',
                title: '5–15+ hours saved monthly',
                body: 'Formatting, QA review, subtitle cleanup, and export prep add up fast on every project. Pro handles all of it — automatically.',
              },
              {
                icon: '✓',
                title: 'Deliver with confidence',
                body: 'QA checks flag low-confidence segments before your client ever sees the file. Send polished transcripts, not rough drafts.',
              },
              {
                icon: '⚡',
                title: 'Move faster on every project',
                body: 'Priority queue and batch processing mean no waiting. Drop everything you have, come back to finished work.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6">
                <div className="text-2xl mb-3">{icon}</div>
                <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── TESTIMONIALS ─────────────────────────────── */}
        <div className="mb-16">
          <p className="text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-10">
            What professionals are saying
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-6 flex flex-col"
              >
                <div className="flex gap-0.5 mb-4">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <svg key={s} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-sm text-gray-300 leading-relaxed flex-1 mb-4">
                  "{t.quote}"
                </blockquote>
                <span className={`inline-flex self-start text-[11px] font-bold px-2.5 py-1 rounded-full mb-4 ${t.resultColor}`}>
                  {t.result}
                </span>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-400">{t.initial}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── GUIDELINE LINK ───────────────────────────── */}
        <p className="mb-10 text-center text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
          Matching client style guides?{' '}
          <Link to="/guideline-format" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            Format your transcript to Rev, GoTranscript, or custom guidelines →
          </Link>
        </p>

        {/* ── TRUST SIGNALS ────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-12">
          {['7-day money-back guarantee', 'Cancel any time', "We don't store your files"].map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <CheckIcon className="text-emerald-500" />
              {s}
            </span>
          ))}
        </div>

        {/* ── FINAL CTA (free users only) ───────────────── */}
        {!isPaidPlan && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center rounded-2xl bg-blue-600/10 border border-blue-500/20 py-12 px-6"
          >
            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
              Ready to work faster?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
              Join professionals who deliver transcripts, subtitles, and captions without the manual overhead.
            </p>
            <ProCTA label="Start Pro — $24.99/month" className="py-4 px-10 text-base" />
            <p className="mt-4 text-xs text-gray-600">
              7-day money-back guarantee · cancel any time · no setup fees
            </p>
          </motion.div>
        )}

        {(currentPlan === 'basic' || currentPlan === 'agency') && (
          <p className="mt-6 text-center text-xs text-gray-500">
            On a legacy plan?{' '}
            <button type="button" onClick={handleManageSubscription} className="underline hover:text-gray-300 transition-colors">
              Manage your plan →
            </button>
          </p>
        )}

      </div>
    </div>
  )
}
