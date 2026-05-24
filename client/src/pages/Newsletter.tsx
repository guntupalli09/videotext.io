import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Mail, Layers, BarChart2, Wrench, Cpu, BookOpen } from 'lucide-react'

const CONTENT_PILLARS = [
  {
    icon: Layers,
    title: 'Operational Workflow Breakdowns',
    description: 'Why subtitle QA consumes 60% of turnaround time. What actually breaks delivery-ready transcripts. Why agencies still manually validate timestamps.',
  },
  {
    icon: BarChart2,
    title: 'Industry Observations',
    description: 'ASR accuracy is no longer the bottleneck. Most AI transcription tools optimize for demos, not production workflows. Opinionated takes, backed by real data.',
  },
  {
    icon: Wrench,
    title: 'Real Workflow Friction',
    description: "SRT segmentation pain. Guideline enforcement. Multilingual subtitle cleanup. Caption readability standards. The stuff nobody talks about — that's the opportunity.",
  },
  {
    icon: Cpu,
    title: 'Behind-the-Scenes Product Thinking',
    description: 'Why deterministic validation matters. Why pure AI formatting fails. How hybrid rules + AI reduces QA overhead. Architect-level insights from building in this space.',
  },
]

const PAST_ISSUES = [
  {
    issue: 1,
    title: 'ASR Is Not the Bottleneck Anymore',
    summary: 'Whisper hits 98.5% accuracy. Review times haven\'t dropped. Here\'s why — and where the time is actually going.',
  },
  {
    issue: 2,
    title: 'Why Delivery-Ready Transcripts Still Require Human QA',
    summary: 'There\'s a class of error AI cannot catch — not because the model is bad, but because catching it requires contextual knowledge that lives outside the audio.',
  },
  {
    issue: 3,
    title: 'The Hidden Cost of Subtitle Cleanup',
    summary: 'Nobody budgets for it. A 60-minute video has 800–1,200 segments. Fix 30% manually at 20 seconds each: that\'s 80–120 minutes that wasn\'t scoped.',
  },
  {
    issue: 4,
    title: 'Most AI Transcription Tools Ignore the Review Layer',
    summary: 'Every tool optimizes for procurement — accuracy benchmarks, demo impressions. The review layer is where operational pain lives. It\'s largely unbuilt.',
  },
  {
    issue: 5,
    title: 'Why Formatting Consistency Matters More Than Raw Accuracy',
    summary: 'A 98% accurate transcript with inconsistent formatting is a quality problem. Formatting variance is how clients learn not to trust your QA process.',
  },
]

const WHO_ITS_FOR = [
  'Transcriptionists and QA leads tired of cleaning up the same issues manually',
  'Subtitle vendors and localization managers managing delivery workflows',
  'Agencies building scalable transcription and captioning operations',
  'Founders and PMs in the media workflow space',
]

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    // Opens Beehiiv subscribe page with email pre-filled.
    // Replace the URL with the actual newsletter platform subscribe URL.
    const subscribeUrl = `https://beyondasr.beehiiv.com/subscribe?email=${encodeURIComponent(email)}`
    window.open(subscribeUrl, '_blank', 'noopener,noreferrer')
    setSubmitted(true)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">
            Newsletter · Weekly
          </p>
          <h1 className="text-5xl md:text-6xl font-medium mb-5 font-display leading-tight">
            Beyond ASR
          </h1>
          <p className="text-xl text-white/60 mb-3 max-w-2xl mx-auto leading-relaxed">
            Operational intelligence for transcription, captioning, and localization workflows.
          </p>
          <p className="text-base text-white/40 mb-10 max-w-xl mx-auto">
            Not AI news. Not product updates. Deep workflow analysis for people who live inside the production pipeline.
          </p>

          {submitted ? (
            <div className="inline-flex items-center gap-3 bg-emerald-900/30 border border-emerald-700/40 rounded-xl px-6 py-4 text-emerald-300">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Check the tab that opened to complete your subscription.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {error && <p className="text-red-400 text-sm mt-1.5 text-left">{error}</p>}
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Subscribe free
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
          <p className="text-white/30 text-sm mt-4">One issue per week. No fluff. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* Positioning line */}
      <section className="border-y border-gray-800 py-10 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-white/70 leading-relaxed">
            Transcription accuracy is solved enough.{' '}
            <span className="text-white font-medium">Delivery workflows are not.</span>{' '}
            Beyond ASR covers the operational layer that most vendors ignore — and most practitioners navigate alone.
          </p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-14 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-medium mb-8 text-center">Who reads this</h2>
          <div className="grid gap-3">
            {WHO_ITS_FOR.map((line, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-900/50 border border-gray-800 rounded-lg px-5 py-4">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span className="text-white/70 text-[15px]">{line}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content pillars */}
      <section className="py-14 px-6 bg-gray-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-medium mb-3 text-center">What you'll get</h2>
          <p className="text-white/50 text-center mb-10 text-sm">Four content pillars. One per issue.</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {CONTENT_PILLARS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="font-medium text-[15px]">{title}</h3>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Past issues */}
      <section className="py-14 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-2xl font-medium">Issues</h2>
          </div>
          <div className="space-y-4">
            {PAST_ISSUES.map(({ issue, title, summary }) => (
              <div key={issue} className="border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-start gap-4">
                  <span className="text-xs text-white/30 font-mono mt-1 flex-shrink-0">#{String(issue).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-medium text-[15px] mb-1.5">{title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-6 bg-gray-900/50 border-t border-gray-800">
        <div className="max-w-xl mx-auto text-center">
          <Mail className="w-8 h-8 text-blue-400 mx-auto mb-5" />
          <h2 className="text-3xl font-medium mb-3">Join 100+ workflow practitioners</h2>
          <p className="text-white/50 mb-8 text-[15px]">One issue per week. Deep operational analysis. No product dumps.</p>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          ) : (
            <div className="inline-flex items-center gap-3 bg-emerald-900/30 border border-emerald-700/40 rounded-xl px-6 py-4 text-emerald-300">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Check the tab that opened to complete your subscription.</span>
            </div>
          )}
          <p className="text-white/30 text-sm mt-5">
            Built by{' '}
            <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              VideoText.io
            </Link>
          </p>
        </div>
      </section>

    </div>
  )
}
