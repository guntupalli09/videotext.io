import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { trackEvent, identifyUser, capturePageview, startAdBlockProbe } from './lib/analytics'
import { Toaster, toast } from 'react-hot-toast'
import Navigation from './components/Navigation'
import { getSessionDetails, getSessionStatus, setupPassword } from './lib/billing'
import { invalidateUsageCache } from './lib/api'
import Footer from './components/Footer'
import Seo from './components/Seo'
import { ROUTE_SEO, ROUTE_BREADCRUMB, getOrganizationJsonLd, getWebApplicationJsonLd, getFaqJsonLd, getFaqJsonLdFromItems, getBreadcrumbJsonLd, getBlogPostingJsonLd, getSoftwareApplicationJsonLd, getHowToJsonLd, getAeoJsonLd, BLOG_POST_DATES } from './lib/seoMeta'
import { getCanonicalPathForRoute } from './lib/primaryUrls'
import { getSeoEntry, getAllSeoPaths } from './lib/seoRegistry'
import SessionErrorBoundary from './components/SessionErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
// import { WorkflowProvider } from './contexts/WorkflowContext'
// import { WorkflowTracker } from './components/workflow/WorkflowTracker'
// import { TexAgent } from './components/TexAgent'
// import TexErrorBoundary from './components/TexAgent/TexErrorBoundary'
import FeedbackOrchestrator from './components/feedbackSystem/FeedbackOrchestrator'
import { trackAppEvent } from './lib/feedbackEvents'
import { getLifetimeSessionCount, getSessionId, isNewSession, clearNewSessionFlag } from './lib/sessionTracking'
import { incrementSessionsSinceFeedback } from './hooks/useFeedbackFrequency'

// Lazy-load pages for fast initial load on any device; each route loads only when visited.
const Home = lazy(() => import('./pages/Home'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Login = lazy(() => import('./pages/Login'))
const Demo = lazy(() => import('./pages/Demo'))
const TranscriptResultWorkspaceMock = lazy(() => import('./pages/TranscriptResultWorkspaceMock'))
const Signup = lazy(() => import('./pages/Signup'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const MagicLogin = lazy(() => import('./pages/MagicLogin'))
const Refer = lazy(() => import('./pages/Refer'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Faq = lazy(() => import('./pages/Faq'))
const Guide = lazy(() => import('./pages/Guide'))
const Terms = lazy(() => import('./pages/Terms'))
const VoiceRecorder = lazy(() => import('./pages/VoiceRecorder'))
const VideoToTranscript = lazy(() => import('./pages/VideoToTranscript'))
const VideoToSubtitles = lazy(() => import('./pages/VideoToSubtitles'))
const TranslateSubtitles = lazy(() => import('./pages/TranslateSubtitles'))
const FixSubtitles = lazy(() => import('./pages/FixSubtitles'))
const BurnSubtitles = lazy(() => import('./pages/BurnSubtitles'))
const CompressVideo = lazy(() => import('./pages/CompressVideo'))
const SeoToolPage = lazy(() => import('./pages/SeoToolPage'))
const FeedbackView = lazy(() => import('./pages/FeedbackView'))
const SurveyPage = lazy(() => import('./pages/SurveyPage'))
const FounderDashboard = lazy(() => import('./pages/founder/FounderDashboard'))
const Changelog = lazy(() => import('./pages/Changelog'))
const Blog = lazy(() => import('./pages/Blog'))
const Compare = lazy(() => import('./pages/Compare'))
const DescriptAlternative = lazy(() => import('./pages/seo/DescriptAlternativePage'))
const OtterAiAlternative = lazy(() => import('./pages/seo/OtterAiAlternativePage'))
const TrintAlternative = lazy(() => import('./pages/seo/TrintAlternativePage'))
const RevAlternative = lazy(() => import('./pages/seo/RevAlternativePage'))
const HappyScribeAlternative = lazy(() => import('./pages/seo/HappyScribeAlternativePage'))
const SonixAlternative = lazy(() => import('./pages/seo/SonixAlternativePage'))
const EasyScribeAlternative = lazy(() => import('./pages/seo/EasyScribeAlternativePage'))
const ZoomAlternative = lazy(() => import('./pages/seo/ZoomAlternativePage'))
const MicrosoftTeamsAlternative = lazy(() => import('./pages/seo/MicrosoftTeamsAlternativePage'))
const CapCutAlternative = lazy(() => import('./pages/seo/CapCutAlternativePage'))
const NottaAlternative = lazy(() => import('./pages/seo/NottaAlternativePage'))
const PanoptoAlternative = lazy(() => import('./pages/seo/PanoptoAlternativePage'))
const MacWhisperAlternative = lazy(() => import('./pages/seo/MacWhisperAlternativePage'))
const DeepgramAlternative = lazy(() => import('./pages/seo/DeepgramAlternativePage'))
const TactiqAlternative = lazy(() => import('./pages/seo/TactiqAlternativePage'))
const FirefliesAlternative = lazy(() => import('./pages/seo/FirefliesAlternativePage'))
const About = lazy(() => import('./pages/AboutPage'))
const Open = lazy(() => import('./pages/Open'))
const TranscriptionBenchmark = lazy(() => import('./pages/TranscriptionBenchmark'))
const AccuracyTest = lazy(() => import('./pages/AccuracyTest'))
const BestTranscriptionTool = lazy(() => import('./pages/BestTranscriptionTool'))
const FastestTranscriptionSoftware = lazy(() => import('./pages/FastestTranscriptionSoftware'))
const FastestTranscriptionTool = lazy(() => import('./pages/FastestTranscriptionTool'))
const OtterVsVideoText = lazy(() => import('./pages/OtterVsVideoText'))
const DescriptVsVideoText = lazy(() => import('./pages/DescriptVsVideoText'))
const AiTranscriptionTools = lazy(() => import('./pages/AiTranscriptionTools'))
const VideoTextVsTurboScribe = lazy(() => import('./pages/VideoTextVsTurboScribe'))
const VideoTextVsRev = lazy(() => import('./pages/VideoTextVsRev'))
const BestOtterAlternatives = lazy(() => import('./pages/BestOtterAlternatives'))
const BestDescriptAlternatives = lazy(() => import('./pages/BestDescriptAlternatives'))
const AiTranscriptionWorkflow = lazy(() => import('./pages/AiTranscriptionWorkflow'))
const PodcastTranscriptionTool = lazy(() => import('./pages/PodcastTranscriptionTool'))
const InterviewTranscriptionTool = lazy(() => import('./pages/InterviewTranscriptionTool'))
const YoutubeVideoToTranscript = lazy(() => import('./pages/YoutubeVideoToTranscript'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Status = lazy(() => import('./pages/Status'))
const ShareTranscript = lazy(() => import('./pages/ShareTranscript'))
// Free tools — client-side only, zero server dependency
const FreeToolsIndex = lazy(() => import('./pages/tools/FreeToolsIndex'))
const SrtToVtt = lazy(() => import('./pages/tools/SrtToVtt'))
const VttToSrt = lazy(() => import('./pages/tools/VttToSrt'))
const ShiftSubtitleTiming = lazy(() => import('./pages/tools/ShiftSubtitleTiming'))
const MergeSrtFiles = lazy(() => import('./pages/tools/MergeSrtFiles'))
const SrtToText = lazy(() => import('./pages/tools/SrtToText'))
const SubtitleValidator = lazy(() => import('./pages/tools/SubtitleValidator'))
const SubtitleReadingSpeed = lazy(() => import('./pages/tools/SubtitleReadingSpeed'))
const SubtitleCharacterChecker = lazy(() => import('./pages/tools/SubtitleCharacterChecker'))
const SubtitleWordCounter = lazy(() => import('./pages/tools/SubtitleWordCounter'))
const VideoScriptTimer = lazy(() => import('./pages/tools/VideoScriptTimer'))
const WordsPerMinute = lazy(() => import('./pages/tools/WordsPerMinute'))
const VideoBitrateCalculator = lazy(() => import('./pages/tools/VideoBitrateCalculator'))
const AspectRatioCalculator = lazy(() => import('./pages/tools/AspectRatioCalculator'))
const TimestampConverter = lazy(() => import('./pages/tools/TimestampConverter'))
const VideoMetadataViewer = lazy(() => import('./pages/tools/VideoMetadataViewer'))
const SubtitleToolsHub = lazy(() => import('./pages/tools/SubtitleToolsHub'))
const SubtitleResources = lazy(() => import('./pages/SubtitleResources'))
// Format converter tools — client-side only, zero server dependency
const SbvToSrt = lazy(() => import('./pages/tools/SbvToSrt'))
const SrtToSbv = lazy(() => import('./pages/tools/SrtToSbv'))
const AssToSrt = lazy(() => import('./pages/tools/AssToSrt'))
const TtmlToSrt = lazy(() => import('./pages/tools/TtmlToSrt'))

/** Minimal loading fallback for route chunks — fast, accessible, no layout shift. */
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite" aria-label="Loading">
      <p className="text-violet-600 font-medium">Loading…</p>
    </div>
  )
}

/** Wraps route content with 200ms fade+translate on route change (CSS only). */
function RouteTransitionLayout() {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="route-transition-enter w-full min-w-0">
      <Outlet />
    </div>
  )
}

function AppSeo() {
  const { pathname } = useLocation()
  const hasRoute = pathname in ROUTE_SEO
  const meta = ROUTE_SEO[pathname] || {
    title: 'Page not found',
    description: "The page you're looking for doesn't exist or has been moved.",
  }
  const isHome = pathname === '/'
  const is404 = !hasRoute
  const isBlogPost = pathname.startsWith('/blog/') && pathname !== '/blog'
  const breadcrumb = ROUTE_BREADCRUMB[pathname]
  const seoEntry = getSeoEntry(pathname)

  // Blog post schemas + og:article meta
  const blogPostDates = isBlogPost ? BLOG_POST_DATES[pathname] : undefined
  const articleMeta = blogPostDates
    ? { publishedTime: `${blogPostDates.datePublished}T00:00:00Z`, modifiedTime: `${blogPostDates.dateModified}T00:00:00Z` }
    : undefined
  const blogPostingSchema = isBlogPost ? getBlogPostingJsonLd(pathname, meta.title, meta.description) : null

  // SoftwareApplication schema for paid tool pages
  const softwareAppSchema = getSoftwareApplicationJsonLd(pathname)

  // HowTo schema for how-to pages
  const howToSchema = getHowToJsonLd(pathname)

  const dedupeAndMergeFaqSchemas = (schemas: object[]): object[] => {
    const mergedFaqEntities: Array<Record<string, unknown>> = []
    const nonFaqSchemas: object[] = []
    const seenFaqKeys = new Set<string>()

    for (const schema of schemas) {
      const typedSchema = schema as { [key: string]: unknown }
      if (typedSchema['@type'] === 'FAQPage') {
        const entities = Array.isArray(typedSchema.mainEntity) ? typedSchema.mainEntity : []
        for (const entity of entities) {
          if (!entity || typeof entity !== 'object') continue
          const q = (entity as { name?: unknown }).name
          const text = (entity as { acceptedAnswer?: { text?: unknown } }).acceptedAnswer?.text
          const dedupeKey = `${String(q ?? '')}::${String(text ?? '')}`
          if (seenFaqKeys.has(dedupeKey)) continue
          seenFaqKeys.add(dedupeKey)
          mergedFaqEntities.push(entity as Record<string, unknown>)
        }
        continue
      }
      nonFaqSchemas.push(schema)
    }

    if (!mergedFaqEntities.length) return nonFaqSchemas
    return [
      ...nonFaqSchemas,
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: mergedFaqEntities,
      },
    ]
  }

  const buildJsonLd = (): object[] | undefined => {
    if (is404) return undefined
    const schemas: object[] = []
    if (isHome) return [getOrganizationJsonLd(), getWebApplicationJsonLd()]
    if (pathname === '/faq') return [getFaqJsonLd()]
    if (breadcrumb) schemas.push(getBreadcrumbJsonLd(pathname, breadcrumb))
    if (isBlogPost && blogPostingSchema) schemas.push(blogPostingSchema)
    if (softwareAppSchema) schemas.push(softwareAppSchema)
    if (howToSchema) schemas.push(howToSchema)
    if (!isBlogPost && seoEntry?.faq?.length) schemas.push(getFaqJsonLdFromItems(seoEntry.faq))
    const aeoSchemas = getAeoJsonLd(pathname)
    if (aeoSchemas?.length) schemas.push(...aeoSchemas)
    const normalizedSchemas = dedupeAndMergeFaqSchemas(schemas)
    return normalizedSchemas.length ? normalizedSchemas : undefined
  }

  const jsonLd = buildJsonLd()

  useEffect(() => {
    try {
      capturePageview(pathname) // feeds Web analytics dashboard (visitors, page views, sessions)
      trackEvent('page_viewed', { pathname })
    } catch {
      // non-blocking
    }
  }, [pathname])
  const canonicalPath = getCanonicalPathForRoute(pathname)

  return (
    <Seo
      title={meta.title}
      description={meta.description}
      canonicalPath={canonicalPath}
      jsonLd={jsonLd}
      noindex={is404}
      articleMeta={articleMeta}
    />
  )
}

/** After Stripe checkout success: set identity (userId, plan), then prompt to set password so user can log in later. */
function PostCheckoutHandler() {
  const { search, pathname } = useLocation()
  const navigate = useNavigate()
  const handled = useRef(false)
  const cancelled = useRef(false)
  const [activating, setActivating] = useState(false)
  const [setPasswordPending, setSetPasswordPending] = useState<{ token: string; plan: string } | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(search)
    const paymentSuccess = params.get('payment') === 'success'
    const sessionId = params.get('session_id')
    if (!paymentSuccess || !sessionId || handled.current) return

    cancelled.current = false
    setActivating(true)

    // Poll session-status up to 4 times (10s total) to confirm subscription activated.
    // This protects against webhook delays: user pays → Stripe returns → we verify active.
    const pollStatus = async (attempt = 0): Promise<boolean> => {
      try {
        const status = await getSessionStatus(sessionId)
        if (status.subscriptionActive) return true
        if (attempt < 4) {
          await new Promise(r => setTimeout(r, 2500))
          return pollStatus(attempt + 1)
        }
        return false
      } catch {
        return attempt < 4 ? (await new Promise<boolean>(r => setTimeout(() => r(pollStatus(attempt + 1)), 2500))) : false
      }
    }

    const run = async (retries = 3) => {
      try {
        const data = await getSessionDetails(sessionId)
        if (cancelled.current) return
        localStorage.setItem('userId', data.userId)
        localStorage.setItem('plan', data.plan.toLowerCase())
        if (data.email) localStorage.setItem('userEmail', data.email)
        if (data.token) localStorage.setItem('authToken', data.token)
        try { invalidateUsageCache() } catch { /* non-blocking */ }
        handled.current = true
        window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
        try {
          identifyUser(data.userId, { plan: data.plan.toLowerCase(), email: data.email })
          trackEvent('plan_upgraded', { plan: data.plan.toLowerCase() })
        } catch { /* non-blocking */ }

        // Secondary subscription-active verification — gives up gracefully after polling
        await pollStatus()

        if (cancelled.current) return
        setActivating(false)
        if (data.passwordSetupToken) {
          setSetPasswordPending({ token: data.passwordSetupToken, plan: data.plan })
        } else {
          navigate(pathname, { replace: true })
          toast.success(`Welcome! You're now on the ${data.plan} plan.`)
        }
      } catch {
        if (cancelled.current) return
        if (retries > 0) {
          setTimeout(() => run(retries - 1), 2000)
        } else {
          setActivating(false)
          toast.error('Your plan is activating — if this persists, refresh the page or check Pricing.')
        }
      }
    }
    run()
    return () => { cancelled.current = true; setActivating(false) }
  }, [search, pathname, navigate])

  const finishCheckout = (showWelcomeToast = false) => {
    const plan = setPasswordPending?.plan
    setSetPasswordPending(null)
    setPassword('')
    setConfirmPassword('')
    setPasswordError('')
    navigate(pathname, { replace: true })
    if (showWelcomeToast && plan) {
      toast.success(`Welcome! You're now on the ${plan} plan.`)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (!setPasswordPending) return
    setSubmitting(true)
    try {
      await setupPassword(setPasswordPending.token, password)
      toast.success('Password set. You can log in anytime from the menu.')
      finishCheckout(false)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to set password.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    finishCheckout(true)
  }

  if (activating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="status" aria-live="polite">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card-elevated max-w-sm w-full p-8 text-center">
          <div className="mx-auto w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin mb-4" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">Payment received — activating your plan…</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This takes just a moment.</p>
        </div>
      </div>
    )
  }

  if (setPasswordPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="set-password-title">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card-elevated max-w-sm w-full p-6">
          <h2 id="set-password-title" className="text-lg font-semibold text-gray-900 dark:text-white">Set your password</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            So you can log in later and access your plan from any device.
          </p>
          <form onSubmit={handleSetPassword} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password (min 8 characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              autoComplete="new-password"
              minLength={8}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              autoComplete="new-password"
            />
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {submitting ? 'Setting…' : 'Set password'}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return null
}

/** Handles ?impersonate=TOKEN from the founder support panel. Sets authToken and redirects to home. */
function ImpersonationHandler() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const handled = useRef(false)
  useEffect(() => {
    if (handled.current) return
    const params = new URLSearchParams(search)
    const token = params.get('impersonate')
    if (!token) return
    handled.current = true
    localStorage.setItem('authToken', token)
    // Remove the param and go to home
    navigate('/', { replace: true })
    toast.success('Impersonating user — logged in as them.')
  }, [search, navigate])
  return null
}

function SessionTracker() {
  useEffect(() => {
    // Initialise session (may resume via grace period or create fresh)
    getSessionId()

    // Starvation counter: only incremented on a genuinely new session
    if (isNewSession()) {
      incrementSessionsSinceFeedback()
      clearNewSessionFlag()
    }

    // Fire session_returned for returning users
    if (getLifetimeSessionCount() >= 2) {
      trackAppEvent('session_returned')
    }

    startAdBlockProbe()
  }, []) // once per mount
  return null
}

function App() {
  return (
    <BrowserRouter>
      {/* <WorkflowProvider> */}
      <AppSeo />
      <SessionTracker />
      <PostCheckoutHandler />
      <ImpersonationHandler />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        <Navigation />
        <OfflineBanner />
        <main id="main" className="flex-grow w-full min-w-0" role="main">
          <SessionErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
            <Route element={<RouteTransitionLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/preview/transcript-results" element={<TranscriptResultWorkspaceMock />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/magic-login" element={<MagicLogin />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/feedback" element={<FeedbackView />} />
            <Route path="/survey" element={<SurveyPage />} />
            <Route path="/founder" element={<FounderDashboard />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/descript-alternative" element={<DescriptAlternative />} />
            <Route path="/otter-alternative" element={<OtterAiAlternative />} />
            <Route path="/otter-ai-alternative" element={<Navigate to="/otter-alternative" replace />} />
            <Route path="/trint-alternative" element={<TrintAlternative />} />
            <Route path="/rev-alternative" element={<RevAlternative />} />
            <Route path="/happyscribe-alternative" element={<HappyScribeAlternative />} />
            <Route path="/sonix-alternative" element={<SonixAlternative />} />
            <Route path="/easyscribe-alternative" element={<EasyScribeAlternative />} />
            <Route path="/zoom-alternative" element={<ZoomAlternative />} />
            <Route path="/microsoft-teams-alternative" element={<MicrosoftTeamsAlternative />} />
            <Route path="/capcut-alternative" element={<CapCutAlternative />} />
            <Route path="/notta-alternative" element={<NottaAlternative />} />
            <Route path="/panopto-alternative" element={<PanoptoAlternative />} />
            <Route path="/macwhisper-alternative" element={<MacWhisperAlternative />} />
            <Route path="/deepgram-alternative" element={<DeepgramAlternative />} />
            <Route path="/tactiq-alternative" element={<TactiqAlternative />} />
            <Route path="/fireflies-alternative" element={<FirefliesAlternative />} />
            <Route path="/about" element={<About />} />
            <Route path="/open" element={<Open />} />
            <Route path="/transcription-benchmark" element={<TranscriptionBenchmark />} />
            <Route path="/accuracy-test" element={<AccuracyTest />} />
            <Route path="/best-transcription-tool" element={<BestTranscriptionTool />} />
            <Route path="/fastest-transcription-software" element={<FastestTranscriptionSoftware />} />
            <Route path="/fastest-transcription-tool" element={<FastestTranscriptionTool />} />
            <Route path="/otter-vs-videotext" element={<OtterVsVideoText />} />
            <Route path="/descript-vs-videotext" element={<DescriptVsVideoText />} />
            <Route path="/ai-transcription-tools" element={<AiTranscriptionTools />} />
            <Route path="/videotext-vs-turboscribe" element={<VideoTextVsTurboScribe />} />
            <Route path="/videotext-vs-rev" element={<VideoTextVsRev />} />
            <Route path="/best-otter-alternatives" element={<BestOtterAlternatives />} />
            <Route path="/best-descript-alternatives" element={<BestDescriptAlternatives />} />
            <Route path="/ai-transcription-workflow" element={<AiTranscriptionWorkflow />} />
            <Route path="/podcast-transcription-tool" element={<PodcastTranscriptionTool />} />
            <Route path="/interview-transcription-tool" element={<InterviewTranscriptionTool />} />
            <Route path="/youtube-video-to-transcript" element={<YoutubeVideoToTranscript />} />
            <Route path="/otter-vs-videotext" element={<OtterVsVideoText />} />
            <Route path="/descript-vs-videotext" element={<DescriptVsVideoText />} />
            <Route path="/ai-transcription-tools" element={<AiTranscriptionTools />} />
            <Route path="/status" element={<Status />} />
            <Route path="/voice-recorder" element={<VoiceRecorder />} />
            <Route path="/s/:slug" element={<ShareTranscript />} />
            <Route path="/video-to-transcript" element={<VideoToTranscript
              seoH1="Convert Any Video to Transcript in Minutes (Not Hours)"
              seoIntro="1-hour video -> clean transcript, subtitles, and summary in 3-5 minutes. No cleanup needed. Used by 50,000+ creators, researchers, and agencies."
              faq={[
                {
                  q: 'How long does transcription actually take?',
                  a: 'Real-time speed or faster. A 1-hour video transcribes in 3-5 minutes. A 2-hour video: under 5 minutes. A 30-minute video: under 2 minutes. We process in parallel, not real-time. Typical scaling: about 24 seconds of source audio per output minute.',
                },
                {
                  q: 'How accurate is the transcription?',
                  a: 'VideoText achieves 98.5% word accuracy on clean English audio using OpenAI Whisper - the same engine professional transcription services use. Accuracy varies with audio quality, background noise, speaker count, and language. Use our Glossary feature to improve accuracy on technical terms.',
                },
                {
                  q: 'Is my video data private?',
                  a: 'Completely private. Your file is processed and deleted immediately after transcription. We do not retain, store, archive, or share uploads, transcripts, or output files. GDPR and CCPA compliant. Full privacy policy available on our site.',
                },
                {
                  q: 'What do I get from one upload?',
                  a: 'One comprehensive output set: Full timestamped transcript (TXT, PDF, DOCX, JSON), AI-generated summary with bullet points, auto-detected chapter markers, and ready-to-upload subtitles (SRT and VTT). Everything from one pass - nothing hidden, no upsell on individual formats.',
                },
                {
                  q: 'Which video and audio formats work?',
                  a: 'Video: MP4, MOV, MKV, WebM, AVI, FLV, and most modern formats. Audio: WAV, MP3, M4A, FLAC, OGG. You can also paste a public YouTube URL and we will transcribe directly without downloading. Maximum file size: 2GB on Free, unlimited on paid plans.',
                },
                {
                  q: 'How does VideoText compare to Otter.ai, Descript, or Rev?',
                  a: 'VideoText is optimized for files, not meetings. Faster processing (3-5 min vs 15-45 min), more output per job (transcript + summary + chapters + subtitles vs transcript-only), zero data storage (vs indefinite retention), and supports 90+ languages equally (not English-first). Best for creators, podcasters, and batch workflows. Otter and Descript are better for real-time meeting transcription.',
                },
                {
                  q: 'Can I edit the transcript after it is done?',
                  a: 'Yes. Use our built-in editor to correct words, adjust timing, and add speaker labels. All edits save locally in your browser. Export your corrected version in any format. On Pro plans, you can also re-process with a custom Glossary to improve accuracy before export.',
                },
                {
                  q: 'Do you offer bulk processing or API access?',
                  a: 'Yes. Pro plan includes batch upload (drag in 5-10 videos, get one ZIP with all results). Agency plan adds API access for programmatic transcription workflows. You can process 100s of videos without repeating the upload step for each one.',
                },
              ]}
              seoDeepContent={{
                proofPoints: [
                  '98.5% accuracy on English audio (clean conditions)',
                  '3-5 minutes to transcribe a 1-hour video',
                  '90+ languages supported, equal accuracy across all',
                  'Zero data stored - deleted immediately after processing',
                  'Transcript + summary + chapters + subtitles in one pass',
                  '50,000+ creators, researchers, and podcasters trust VideoText',
                  'Used by university researchers, Fortune 500 content teams, and indie creators',
                ],
                workflowSteps: [
                  {
                    title: 'Upload once (drag, drop, or paste)',
                    detail: 'Drag an MP4, MOV, or any video file into our upload zone. Or paste a YouTube URL if you do not want to download first. If your video is longer than 5 hours, use batch upload on Pro plan.',
                  },
                  {
                    title: 'AI transcribes + structures in parallel',
                    detail: 'Our system converts audio to text, auto-labels speakers, finds natural chapter breaks, and generates a summary - all simultaneously. A 1-hour video finishes in under 5 minutes. You will see real-time progress on screen.',
                  },
                  {
                    title: 'Download everything at once',
                    detail: 'Get a ZIP containing: full transcript (pick TXT, PDF, DOCX, or JSON), SRT and VTT subtitle files, chapter list, and AI summary. Edit any piece in-browser before download. Your file is deleted from our servers once you leave.',
                  },
                ],
                outputExamples: [
                  {
                    title: 'Full timestamped transcript',
                    body: 'Every word with exact timing: [00:05:42] This is the main point of the interview. Copy straight into blog posts, articles, or Notion. Export as PDF for citation-ready documents.',
                  },
                  {
                    title: 'AI summary + chapters',
                    body: 'Condensed summary (3-5 paragraphs) plus labeled chapters: 1. Introduction (0:00-2:15), 2. Main Topic (2:15-18:30), 3. Conclusion (18:30-21:00). Ready for YouTube descriptions or email newsletters.',
                  },
                  {
                    title: 'SRT + VTT subtitles',
                    body: 'Broadcast-ready subtitle files with correct timing and line breaks. Upload directly to YouTube, Vimeo, Wistia, or any platform. No manual cleanup needed.',
                  },
                ],
                visualProof: [
                  {
                    title: 'Transcript with speaker labels',
                    body: 'SPEAKER 1 (0:00): In early years, you were looked at and perceived as little, like, macho gunda.\nSPEAKER 2 (0:10): Why do you realize that I change in gunda?\nSPEAKER 1 (0:13): If a gunda becomes a father, everything changes.',
                  },
                  {
                    title: 'SRT subtitle file',
                    body: '1\n00:00:05,000 --> 00:00:10,000\nIn early years, you were looked at\nand perceived as little, like, macho gunda.\n\n2\n00:00:10,000 --> 00:00:13,000\nWhy do you realize that I change in gunda?',
                  },
                  {
                    title: 'AI summary extract',
                    body: 'The speaker discusses their early perception as a child and a transformative moment. They reflect on how becoming a parent changes everything and express their willingness to take on any challenge for their family.',
                  },
                ],
                technicalExplanation: [
                  {
                    title: 'Most tools process in real-time (or slower)',
                    body: 'Otter.ai, Descript, and others use synchronous processing: they wait for your video to play through before generating output. A 1-hour video takes 1+ hour to process. Some tools even queue jobs - you wait 2-4 hours total.',
                  },
                  {
                    title: 'VideoText processes asynchronously',
                    body: 'We extract audio once, then process it in parallel across multiple systems. Speech recognition, speaker detection, chapter finding, and summary generation all run simultaneously. A 1-hour video finishes in 3-5 minutes because we do 10+ tasks at once, not sequentially.',
                  },
                  {
                    title: 'Why timestamps matter more than you think',
                    body: 'Timestamps let you link directly to moments in the transcript. Researchers can cite [00:15:30] exactly. YouTubers can reference specific points in descriptions. Podcasters can build chapters automatically. Most tools get timestamps wrong or generate them slowly.',
                  },
                  {
                    title: 'Speaker detection requires real accuracy',
                    body: 'We use advanced voice fingerprinting to distinguish between speakers (not just voice pitch). 2-speaker interviews, panel discussions, podcasts with hosts and guests - all auto-labeled correctly. Otter does this, but charges $20/month. We include it free.',
                  },
                ],
                comparisonRows: [
                  { feature: 'Processing speed (1 hr video)', videotext: '3-5 minutes (async processing)', alternatives: 'Otter: 60+ minutes (real-time) | Descript: 15-20 minutes | Rev: 2-4 hours (human queues)' },
                  { feature: 'Why we are faster', videotext: 'Parallel processing: 10+ tasks run simultaneously', alternatives: 'Sequential processing: one task at a time, must wait for playback to finish' },
                  { feature: 'Speaker detection', videotext: 'Auto-labeled, included free', alternatives: 'Otter includes it ($20/mo). Descript charges extra. Rev does it manually.' },
                  { feature: 'Output per job', videotext: 'Transcript + summary + chapters + subtitles (1 pass)', alternatives: 'Transcript only standard. Extras sold separately or require manual work.' },
                  { feature: 'Data privacy', videotext: 'Deleted immediately. Zero retention.', alternatives: 'Otter: stored indefinitely | Descript: stored 7-30 days | Rev: deleted after 30 days' },
                  { feature: 'Language support', videotext: '90+ languages, equal accuracy & speed', alternatives: 'Otter: English-first, slow for others | Descript: same. Rev: human-only, expensive' },
                  { feature: 'Edit & refine', videotext: 'Full in-browser editor, re-export anytime', alternatives: 'Otter: limited editing | Descript: designed for video editing (overkill) | Rev: not applicable' },
                  { feature: 'Cost for 100 hrs/month', videotext: 'Free tier: 2 hrs/month. Pro ($9.99/mo): 200 hrs/month unlimited', alternatives: 'Otter: $20/month | Descript: $24/month | Rev: $1.25/minute (extremely expensive)' },
                ],
                useCases: [
                  {
                    title: 'Content creators (YouTube, TikTok)',
                    body: 'Convert long-form videos into SEO-ready transcripts for description, searchable blog posts with timestamps, and subtitle files for accessibility and engagement. One upload replaces 30 minutes of manual work.',
                  },
                  {
                    title: 'Podcast producers',
                    body: 'Transcribe every episode in minutes. Use for show notes, searchable archives, blog repurposing, quote clips for social media, and improved podcast SEO. Batch upload 10 episodes, download one ZIP with all transcripts.',
                  },
                  {
                    title: 'Researchers & academics',
                    body: 'Transcribe interviews, lectures, and conference recordings with speaker labels for citation. Export as DOCX or PDF for academic papers. Full timestamps let you quote and cite specific moments.',
                  },
                  {
                    title: 'Legal & compliance teams',
                    body: 'Convert depositions, client calls, and recorded meetings to searchable transcripts. Zero data retention means no compliance violations. Export to secure formats (PDF, encrypted DOCX) for archival.',
                  },
                  {
                    title: 'Course creators & educators',
                    body: 'Auto-transcribe all lectures and create searchable text for students. Generate chapters for easy course navigation. Create accessible captions for students with hearing needs. Batch process all lectures for a semester.',
                  },
                  {
                    title: 'Agencies & content teams',
                    body: 'Process client videos in bulk. Export DOCX or JSON for downstream editorial workflows. Batch upload saves time; one ZIP output for distribution across team members.',
                  },
                  {
                    title: 'Marketing & SEO teams',
                    body: 'Transcribe webinars and video content for repurposing into blogs, whitepapers, case studies, and landing page copy. Faster content pipeline, more SEO assets, lower cost per piece.',
                  },
                  {
                    title: 'Accessibility specialists',
                    body: 'Generate accurate captions for video content, improving accessibility for deaf and hard-of-hearing audiences. 98.5% accuracy means fewer manual corrections than manual captioning.',
                  },
                ],
                ctaText: 'Upload a video, get transcript in minutes',
                ctaPath: '/video-to-transcript',
              }}
            />} />
            <Route path="/video-to-subtitles" element={<VideoToSubtitles />} />
            <Route path="/batch-process" element={<Navigate to="/video-to-transcript" replace />} />
            <Route path="/zoom-recording-transcript" element={<Navigate to="/zoom-meeting-transcript" replace />} />
            <Route path="/transcribe-meeting-recording" element={<Navigate to="/meeting-recording-to-transcript" replace />} />
            <Route path="/translate-subtitles" element={<TranslateSubtitles />} />
            <Route path="/translation" element={<TranslateSubtitles />} />
            <Route path="/fix-subtitles" element={<FixSubtitles />} />
            <Route path="/burn-subtitles" element={<BurnSubtitles />} />
            <Route path="/compress-video" element={<CompressVideo />} />
            {/* SEO utility routes: registry-driven; same tools, alternate URLs. No backend or behavior change. */}
            {getAllSeoPaths().map((path) => (
              <Route key={path} path={path} element={<SeoToolPage />} />
            ))}
            {/* Free tools — client-side only, no server calls */}
            <Route path="/tools" element={<FreeToolsIndex />} />
            <Route path="/tools/srt-to-vtt" element={<SrtToVtt />} />
            <Route path="/tools/vtt-to-srt" element={<VttToSrt />} />
            <Route path="/tools/shift-subtitle-timing" element={<ShiftSubtitleTiming />} />
            <Route path="/tools/merge-srt-files" element={<MergeSrtFiles />} />
            <Route path="/tools/srt-to-text" element={<SrtToText />} />
            <Route path="/tools/subtitle-validator" element={<SubtitleValidator />} />
            <Route path="/tools/subtitle-reading-speed" element={<SubtitleReadingSpeed />} />
            <Route path="/tools/subtitle-character-checker" element={<SubtitleCharacterChecker />} />
            <Route path="/tools/subtitle-word-counter" element={<SubtitleWordCounter />} />
            <Route path="/tools/video-script-timer" element={<VideoScriptTimer />} />
            <Route path="/tools/words-per-minute-calculator" element={<WordsPerMinute />} />
            <Route path="/tools/video-bitrate-calculator" element={<VideoBitrateCalculator />} />
            <Route path="/tools/aspect-ratio-calculator" element={<AspectRatioCalculator />} />
            <Route path="/tools/timestamp-converter" element={<TimestampConverter />} />
            <Route path="/tools/video-metadata-viewer" element={<VideoMetadataViewer />} />
            <Route path="/subtitle-tools" element={<SubtitleToolsHub />} />
            <Route path="/subtitle-resources" element={<SubtitleResources />} />
            <Route path="/tools/sbv-to-srt" element={<SbvToSrt />} />
            <Route path="/tools/srt-to-sbv" element={<SrtToSbv />} />
            <Route path="/tools/ass-to-srt" element={<AssToSrt />} />
            <Route path="/tools/ttml-to-srt" element={<TtmlToSrt />} />
            <Route path="*" element={<NotFound />} />
            </Route>
              </Routes>
            </Suspense>
          </SessionErrorBoundary>
        </main>
        <Footer />
        {/* <WorkflowTracker /> */}
        {/* <TexErrorBoundary>
          <TexAgent />
        </TexErrorBoundary> */}
        <FeedbackOrchestrator />
        <Toaster position="top-right" />
      </div>
      {/* </WorkflowProvider> */}
    </BrowserRouter>
  )
}

export default App
