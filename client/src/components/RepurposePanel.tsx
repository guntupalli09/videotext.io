/**
 * RepurposePanel — Beat strategy.
 * Turns a completed transcript into Twitter/X thread, LinkedIn post, and newsletter excerpt.
 * Pro and Business plans only.
 */
import { useState, useCallback } from 'react'
import { Sparkles, Copy, Check, Twitter, Linkedin, Mail, Lock, Loader2, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { trackEvent } from '../lib/analytics'
import { Link } from 'react-router-dom'

interface RepurposeResult {
  twitterThread: string[]
  linkedinPost: string
  newsletterExcerpt: string
}

type RepurposeTab = 'twitter' | 'linkedin' | 'newsletter'

interface Props {
  jobId: string | null
  isPaidPlan: boolean
}

export default function RepurposePanel({ jobId, isPaidPlan }: Props) {
  const [activeTab, setActiveTab] = useState<RepurposeTab>('twitter')
  const [result, setResult] = useState<RepurposeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    setError(null)
    try {
      trackEvent('repurpose_generate_clicked', { jobId })
      const resp = await api(`/api/job/${jobId}/repurpose`, { method: 'POST' })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: 'Failed to generate content' }))
        if (err.upgrade) {
          setError('upgrade')
        } else {
          setError(err.message || 'Failed to generate content. Please try again.')
        }
        return
      }
      const data: RepurposeResult = await resp.json()
      setResult(data)
      trackEvent('repurpose_generated', { jobId, twitterTweets: data.twitterThread.length })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  const copyTweet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
      trackEvent('repurpose_copied', { type: 'twitter', idx })
    })
  }

  const copyField = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
      trackEvent('repurpose_copied', { type: key })
    })
  }

  const copyAllTweets = () => {
    if (!result?.twitterThread?.length) return
    const all = result.twitterThread.map((t, i) => `${i + 1}/${result.twitterThread.length} ${t}`).join('\n\n')
    copyField(all, 'twitter_all')
  }

  if (!isPaidPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Lock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">Pro feature</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Turn your transcript into a Twitter/X thread, LinkedIn post, and newsletter excerpt — one click.
          </p>
        </div>
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-500/25"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Pro
        </Link>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">Repurpose your transcript</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Generate a Twitter/X thread, LinkedIn post, and newsletter excerpt — all from your transcript in one click.
          </p>
        </div>
        {error && error !== 'upgrade' && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={loading || !jobId}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors disabled:opacity-60 shadow-lg shadow-violet-500/25"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate social content
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500">Powered by GPT-4o mini · Approx. 10 seconds</p>
      </div>
    )
  }

  const tabs: { key: RepurposeTab; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { key: 'twitter', label: 'X Thread', Icon: Twitter as React.FC<React.SVGProps<SVGSVGElement>> },
    { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin as React.FC<React.SVGProps<SVGSVGElement>> },
    { key: 'newsletter', label: 'Newsletter', Icon: Mail as React.FC<React.SVGProps<SVGSVGElement>> },
  ]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-gray-100 dark:border-gray-800">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'border-violet-600 text-violet-700 dark:text-violet-400 bg-white dark:bg-gray-900'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => { setResult(null); generate() }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Regenerate"
          >
            <RefreshCw className="w-3 h-3" />
            Regen
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'twitter' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {result.twitterThread.length} tweets
              </p>
              <button
                type="button"
                onClick={copyAllTweets}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {copiedKey === 'twitter_all' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy all
              </button>
            </div>
            {result.twitterThread.map((tweet, i) => (
              <div key={i} className="relative group rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold text-gray-400 shrink-0 mt-0.5">{i + 1}/{result.twitterThread.length}</span>
                  <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 leading-relaxed whitespace-pre-wrap">{tweet}</p>
                  <button
                    type="button"
                    onClick={() => copyTweet(tweet, i)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="Copy tweet"
                  >
                    {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <span className={`text-[10px] font-medium ${tweet.length > 260 ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`}>
                    {tweet.length}/280
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'linkedin' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">LinkedIn post</p>
              <button
                type="button"
                onClick={() => copyField(result.linkedinPost, 'linkedin')}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {copiedKey === 'linkedin' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{result.linkedinPost}</p>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">{result.linkedinPost.length} characters</p>
          </>
        )}

        {activeTab === 'newsletter' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Newsletter excerpt</p>
              <button
                type="button"
                onClick={() => copyField(result.newsletterExcerpt, 'newsletter')}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {copiedKey === 'newsletter' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{result.newsletterExcerpt}</p>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">{result.newsletterExcerpt.length} characters</p>
          </>
        )}
      </div>
    </div>
  )
}
