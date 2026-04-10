import { useState, useEffect, useCallback } from 'react'
import { Gift, Copy, Check, ExternalLink, Sparkles, Users, Download } from 'lucide-react'
import { api } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { trackEvent } from '../lib/analytics'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface ReferralData {
  code: string
  link: string
  bonusImportsPerReferral: number
  successfulReferrals: number
  bonusImportsEarned: number
}

export default function Refer() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const loggedIn = isLoggedIn()

  const fetchCode = useCallback(async () => {
    if (!loggedIn) return
    setLoading(true)
    try {
      const resp = await api('/api/referral/code')
      if (resp.ok) {
        const d: ReferralData = await resp.json()
        setData(d)
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false)
    }
  }, [loggedIn])

  useEffect(() => { fetchCode() }, [fetchCode])

  // Auto-claim if ?ref= is in the URL when user first visits (store for post-checkout claim)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      sessionStorage.setItem('pendingReferralCode', ref.toUpperCase())
    }
  }, [])

  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2500)
      trackEvent('referral_link_copied', { type })
      toast.success('Copied to clipboard!')
    })
  }

  const shareOnX = () => {
    if (!data) return
    const text = `I use VideoText to transcribe videos in seconds — way faster than anything else I've tried. Get 3 bonus imports free with my link:`
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(data.link)}`
    window.open(url, '_blank', 'noopener')
    trackEvent('referral_shared', { platform: 'twitter' })
  }

  return (
    <div className="min-h-screen py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white mb-6 shadow-lg shadow-violet-500/30">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Give 3 imports, get 3 imports
          </h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-base max-w-sm mx-auto">
            Share VideoText with a friend. When they upgrade to any paid plan, you both get <strong className="text-gray-800 dark:text-gray-200">3 bonus imports</strong> added to your daily allowance.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: ExternalLink, label: 'Share your link', desc: 'Copy and send it' },
            { icon: Users, label: 'Friend upgrades', desc: 'Any paid plan' },
            { icon: Download, label: 'Both get 3 imports', desc: 'Added instantly' },
          ].map(({ icon: Icon, label, desc }, i) => (
            <div key={i} className="text-center p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 mb-2">
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">{label}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Referral link card */}
        {loggedIn ? (
          loading ? (
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center gap-3 text-gray-400">
              <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              Loading your referral link…
            </div>
          ) : data ? (
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 space-y-4">

              {/* Stats row */}
              {data.successfulReferrals > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-4 py-3">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">
                    <strong>{data.successfulReferrals} successful referral{data.successfulReferrals !== 1 ? 's' : ''}</strong> — you've earned{' '}
                    <strong>{data.bonusImportsEarned} bonus import{data.bonusImportsEarned !== 1 ? 's' : ''}</strong> so far!
                  </p>
                </div>
              )}

              {/* Referral link */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Your referral link</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                    {data.link}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(data.link, 'link')}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                  >
                    {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied === 'link' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Code */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Referral code</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white font-mono tracking-widest">{data.code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(data.code, 'code')}
                  className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 font-medium"
                >
                  {copied === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'code' ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Share on X */}
              <button
                type="button"
                onClick={shareOnX}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-900 dark:border-gray-200 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X / Twitter
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-5 text-center text-sm text-amber-800 dark:text-amber-300">
              Failed to load referral link. <button type="button" onClick={fetchCode} className="underline">Try again</button>
            </div>
          )
        ) : (
          /* Not logged in — prompt to sign in or upgrade */
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Sign in to get your unique referral link and start earning bonus imports.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-500/25"
              >
                <Sparkles className="w-4 h-4" />
                See pricing
              </Link>
            </div>
          </div>
        )}

        {/* Terms */}
        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Bonus imports extend your daily free import cap and reset with your monthly usage.
          Referral bonus applies once per account. Self-referral is not permitted.
        </p>
      </div>
    </div>
  )
}
