import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from './lib/theme'
import { identifyUser } from './lib/analytics'
import { initSentry } from './lib/sentry'
import { initWebMCP } from './lib/webmcp'
import { PostHogProvider } from '@posthog/react'
import App from './App.tsx'
import './index.css'

initSentry()
initWebMCP()

// Expose release for debugging (correlation with API/worker logs)
const release = import.meta.env.VITE_RELEASE ?? 'dev'
if (typeof window !== 'undefined') {
  (window as unknown as { __RELEASE__?: string }).__RELEASE__ = release
}

const userId = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null
const plan = typeof localStorage !== 'undefined' ? localStorage.getItem('plan') : null
if (userId && userId !== 'demo-user') {
  identifyUser(userId, { plan: plan ?? undefined })
}

// Safety net: uncaught promise rejections (e.g. missing catch) get a user-visible message instead of silent failure.
window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[unhandledrejection]', event.reason)
  }
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason)
  if (message && !message.includes('ResizeObserver')) {
    import('react-hot-toast').then(({ default: toast }) => {
      toast.error('Something went wrong. Please try again.')
    })
  }
})

const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  person_profiles: 'identified_only' as const,
  capture_pageview: false, // App.tsx sends $pageview on SPA route changes
  session_recording: {
    maskAllInputs: true,     // mask email, OTP, file name inputs — PII protection
    maskTextSelector: '[data-ph-mask]', // opt-in masking via data-ph-mask attribute
  },
} as const

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_POSTHOG_KEY || ''} options={posthogOptions}>
      <ThemeProvider>
        <HelmetProvider>
          <App />
          <Analytics />
        </HelmetProvider>
      </ThemeProvider>
    </PostHogProvider>
  </React.StrictMode>,
)
