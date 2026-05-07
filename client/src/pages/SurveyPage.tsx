import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitFeedback } from '../lib/api'

const TOOLS = [
  { value: 'video-to-transcript', label: 'Video to Transcript' },
  { value: 'video-to-subtitles', label: 'Video to Subtitles' },
  { value: 'translate-subtitles', label: 'Translate Subtitles' },
  { value: 'fix-subtitles', label: 'Fix Subtitles (SRT fix)' },
  { value: 'burn-subtitles', label: 'Burn Subtitles into Video' },
  { value: 'compress-video', label: 'Compress Video' },
  { value: 'batch-process', label: 'Batch Process' },
  { value: 'other', label: 'Other / not sure yet' },
]

const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'agency', label: 'Agency' },
  { value: 'not-a-user', label: "I haven't signed up yet" },
]

function StarPicker({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? value

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(n)}
          className="text-3xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
        >
          {active != null && n <= active ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  )
}

const STAR_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Love it!',
}

export default function SurveyPage() {
  const [stars, setStars] = useState<number | null>(null)
  const [improve, setImprove] = useState('')
  const [topTool, setTopTool] = useState('')
  const [topToolReason, setTopToolReason] = useState('')
  const [featureRequest, setFeatureRequest] = useState('')
  const [otherFeedback, setOtherFeedback] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setError(null)
    try {
      await submitFeedback({
        stars: stars ?? undefined,
        comment: improve.trim() || undefined,
        topTool: topTool || undefined,
        topToolReason: topToolReason.trim() || undefined,
        featureRequest: featureRequest.trim() || undefined,
        otherFeedback: otherFeedback.trim() || undefined,
        email: email.trim() || undefined,
        planAtSubmit: plan && plan !== 'not-a-user' ? plan : undefined,
        source: 'survey',
      })
      setSent(true)
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Thank you so much!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            Your feedback means the world to us. We read every single response and use it to
            make VideoText better for you.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
          >
            Try VideoText
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-xl font-bold text-violet-600">VideoText</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Help us build the tool you love
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            2 minutes. No account needed. Your honest input shapes everything we build next.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Q1: Rating */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-1">
              Overall, how would you rate VideoText?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Be honest — we can take it!
            </p>
            <StarPicker value={stars} onChange={setStars} />
            {stars && (
              <p className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400">
                {STAR_LABELS[stars]}
              </p>
            )}
          </div>

          {/* Q2: How can we improve */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <label
              htmlFor="survey-improve"
              className="block text-base font-semibold text-gray-900 dark:text-white mb-1"
            >
              How can we improve?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              What's broken, slow, confusing, or missing?
            </p>
            <textarea
              id="survey-improve"
              value={improve}
              onChange={(e) => setImprove(e.target.value.slice(0, 2000))}
              placeholder="e.g. The export took too long, I wish there was a…"
              rows={4}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-600 resize-none transition"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{improve.length}/2000</p>
          </div>

          {/* Q3: Top tool */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <label
              htmlFor="survey-top-tool"
              className="block text-base font-semibold text-gray-900 dark:text-white mb-1"
            >
              What tool impressed you the most?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Pick the one that saved you the most time or wowed you.
            </p>
            <select
              id="survey-top-tool"
              value={topTool}
              onChange={(e) => setTopTool(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-600 transition"
            >
              <option value="">— Select a tool —</option>
              {TOOLS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {topTool && (
              <div className="mt-4">
                <label
                  htmlFor="survey-top-tool-reason"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Why? What made it stand out?
                </label>
                <textarea
                  id="survey-top-tool-reason"
                  value={topToolReason}
                  onChange={(e) => setTopToolReason(e.target.value.slice(0, 2000))}
                  placeholder="e.g. It handled my 40-minute video perfectly, the accuracy was great…"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-600 resize-none transition"
                />
              </div>
            )}
          </div>

          {/* Q4: Feature request */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <label
              htmlFor="survey-feature"
              className="block text-base font-semibold text-gray-900 dark:text-white mb-1"
            >
              Any feature in your mind that would ease your workflow?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Dream big — what would make you 10× more productive?
            </p>
            <textarea
              id="survey-feature"
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value.slice(0, 2000))}
              placeholder="e.g. Auto-detect speaker names, direct YouTube upload, Notion integration…"
              rows={4}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-600 resize-none transition"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{featureRequest.length}/2000</p>
          </div>

          {/* Q5: Anything else */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <label
              htmlFor="survey-other"
              className="block text-base font-semibold text-gray-900 dark:text-white mb-1"
            >
              Anything else on your mind?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Praise, complaints, random thoughts — all welcome.
            </p>
            <textarea
              id="survey-other"
              value={otherFeedback}
              onChange={(e) => setOtherFeedback(e.target.value.slice(0, 2000))}
              placeholder="Anything goes here…"
              rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-600 resize-none transition"
            />
          </div>

          {/* Contact info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div>
              <label
                htmlFor="survey-email"
                className="block text-base font-semibold text-gray-900 dark:text-white mb-1"
              >
                Your email <span className="text-gray-400 font-normal text-sm">(optional)</span>
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                So we can follow up if we have questions, or invite you to test new features.
              </p>
              <input
                id="survey-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 300))}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-600 transition"
              />
            </div>

            <div>
              <label
                htmlFor="survey-plan"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Which plan are you on?
              </label>
              <select
                id="survey-plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white dark:focus:bg-gray-600 transition"
              >
                <option value="">— Select your plan —</option>
                {PLANS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-semibold text-base shadow-lg shadow-violet-200 dark:shadow-violet-900/30 disabled:opacity-60 transition-all"
          >
            {sending ? 'Sending…' : 'Submit feedback'}
          </button>

          <p className="text-xs text-gray-400 text-center pb-4">
            Your response is private and goes directly to the founders.
            No spam, ever.
          </p>
        </form>
      </div>
    </div>
  )
}
