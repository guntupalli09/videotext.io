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
    return schemas.length ? schemas : undefined
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
            <Route path="/otter-ai-alternative" element={<OtterAiAlternative />} />
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
            <Route path="/video-to-transcript" element={<VideoToTranscript />} />
            <Route path="/video-to-subtitles" element={<VideoToSubtitles />} />
            <Route path="/batch-process" element={<Navigate to="/video-to-transcript" replace />} />
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
