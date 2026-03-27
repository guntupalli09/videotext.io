/**
 * JobAuthGateModal
 *
 * Gates "download / see full result" behind a quick signup or login.
 * After auth, calls onAuthSuccess() so the parent can resume the download.
 *
 * Flow A (signup): email + password → OTP verify → account created → onAuthSuccess
 * Flow B (login):  email + password → logged in → onAuthSuccess
 *
 * Framing: "Don't lose your transcript" (loss aversion, TurboScribe-style)
 * rather than a wall — feels like saving progress, not a paywall.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, CheckCircle2, ChevronRight, Lock, Zap } from 'lucide-react'
import { sendOtp, verifyOtp, loginWithGoogle } from '../lib/api'
import { completeSignup, login, storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'

// ── Google Identity Services ──────────────────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            options: {
              type?: string
              theme?: string
              size?: string
              text?: string
              width?: number
              logo_alignment?: string
            }
          ) => void
          cancel: () => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID ?? ''

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('gsi-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = 'gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

type Mode = 'choice' | 'signup-combo' | 'signup-otp' | 'login'

interface JobAuthGateModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess: () => void
  jobDescription?: string
  dismissable?: boolean
  initialMode?: 'signup-combo' | 'login'
}

export default function JobAuthGateModal({
  isOpen,
  onClose,
  onAuthSuccess,
  jobDescription = 'Your transcript is ready',
  dismissable = false,
  initialMode = 'signup-combo',
}: JobAuthGateModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode)

  useEffect(() => {
    if (isOpen) setMode(initialMode)
  }, [isOpen, initialMode])

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // Load and render the Google Sign-In button whenever the modal opens and Google is configured
  useEffect(() => {
    if (!isOpen || !GOOGLE_CLIENT_ID) return
    let cancelled = false
    loadGsiScript().then(() => {
      if (cancelled || !googleBtnRef.current || !window.google?.accounts) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) return
          setGoogleLoading(true)
          setError(null)
          try {
            const result = await loginWithGoogle(response.credential)
            storeLoginResult(result)
            try { localStorage.setItem('videotext:guestJobUsed', '1') } catch { /* ignore */ }
            try { identifyUser(result.userId, { plan: result.plan, email: result.email }) } catch { /* ignore */ }
            window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
            reset()
            onAuthSuccess()
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Google login failed')
          } finally {
            setGoogleLoading(false)
          }
        },
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: googleBtnRef.current.offsetWidth || 400,
        logo_alignment: 'center',
      })
    }).catch(() => { /* GSI failed to load — hide button silently */ })
    return () => { cancelled = true }
  }, [isOpen])

  // Re-render the Google button when mode changes (each mode mounts a new div)
  useEffect(() => {
    if (!isOpen || !GOOGLE_CLIENT_ID || !window.google?.accounts || !googleBtnRef.current) return
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: googleBtnRef.current.offsetWidth || 400,
      logo_alignment: 'center',
    })
  }, [mode, isOpen])

  function reset() {
    setMode(initialMode)
    setEmail('')
    setOtp('')
    setPassword('')
    setError(null)
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSignupCombo(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await sendOtp(email.trim().toLowerCase())
      setMode('signup-otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignupOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token } = await verifyOtp(email.trim().toLowerCase(), otp)
      const result = await completeSignup(token, password)
      storeLoginResult(result)
      try { localStorage.setItem('videotext:guestJobUsed', '1') } catch { /* ignore */ }
      try { identifyUser(result.userId, { plan: result.plan, email: result.email }) } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
      reset()
      onAuthSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(email.trim().toLowerCase(), password)
      storeLoginResult(result)
      try { identifyUser(result.userId, { plan: result.plan, email: result.email }) } catch { /* ignore */ }
      reset()
      onAuthSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop — lighter than before so user knows their transcript is there */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          onClick={dismissable ? handleClose : undefined}
        />

        {/* Card — slides up from bottom on mobile, scales in on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6 sm:p-8 transition-colors duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-gate-title"
        >
          {dismissable && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* ── CHOICE (first view) ── */}
          {mode === 'choice' && (
            <div>
              {/* Status pill */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{jobDescription}</span>
              </div>

              {/* Loss aversion headline */}
              <h2 id="auth-gate-title" className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 font-display leading-tight">
                Don't lose your transcript!
              </h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Finish signing up to save your progress and download your transcript.
              </p>

              {/* What you get */}
              <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 p-4 mb-5">
                <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-3">
                  Free account includes
                </p>
                <ul className="space-y-2">
                  {[
                    { icon: Download, text: 'Download full transcript (TXT, PDF, SRT)' },
                    { icon: Zap, text: '2 more free imports this month' },
                    { icon: Lock, text: 'Files deleted after processing — always' },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-2.5 text-sm text-violet-800 dark:text-violet-300">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 text-violet-500 dark:text-violet-400" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Google Sign-In (shown when configured) */}
              {GOOGLE_CLIENT_ID && (
                <>
                  <div
                    ref={googleBtnRef}
                    className="w-full overflow-hidden rounded-xl"
                    style={{ minHeight: 44 }}
                  />
                  {googleLoading && (
                    <p className="text-center text-sm text-gray-500">Signing in with Google…</p>
                  )}
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                  )}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                </>
              )}

              {/* Primary CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setMode('signup-combo'); setError(null) }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 transition-all mb-3"
              >
                Save my transcript — it's free
                <ChevronRight className="w-4 h-4" />
              </motion.button>

              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
              >
                Already have an account? Log in
              </button>

              <div className="flex items-center justify-center gap-4 mt-4">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">No credit card · Files deleted after processing</p>
              </div>

              {!dismissable && (
                <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  Want to start over?{' '}
                  <button
                    type="button"
                    onClick={() => { reset(); window.location.reload() }}
                    className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Process a different file
                  </button>
                </p>
              )}
            </div>
          )}

          {/* ── SIGNUP step 1: email + password ── */}
          {mode === 'signup-combo' && (
            <form onSubmit={handleSignupCombo} className="space-y-4">
              {/* Loss aversion header */}
              <div>
                <h2 id="auth-gate-title" className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  Save your transcript
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Free account — takes 30 seconds.
                </p>
              </div>

              {/* Google Sign-In */}
              {GOOGLE_CLIENT_ID && (
                <>
                  <div
                    ref={googleBtnRef}
                    className="w-full overflow-hidden rounded-xl"
                    style={{ minHeight: 44 }}
                  />
                  {googleLoading && (
                    <p className="text-center text-sm text-gray-500">Signing in with Google…</p>
                  )}
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400">or continue with email</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">2 more free imports included</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">1 used for this trial · 2 more after signup</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Password <span className="font-normal text-gray-400">(min 8 chars)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading
                    ? 'Sending code…'
                    : <><span>Continue</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null) }}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Log in
                </button>
              </div>
              <p className="text-center text-[11px] text-gray-400">
                We'll email a verification code to confirm your address.
              </p>
            </form>
          )}

          {/* ── SIGNUP step 2: OTP verify ── */}
          {mode === 'signup-otp' && (
            <form onSubmit={handleSignupOtp} className="space-y-4">
              <div>
                <h2 id="auth-gate-title" className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  Check your email
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  We sent a 6-digit code to{' '}
                  <strong className="text-gray-700 dark:text-gray-300">{email}</strong>
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 outline-none transition-colors"
              />

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading
                    ? 'Creating account…'
                    : <><span>Create account & download</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setMode('signup-combo'); setOtp(''); setError(null) }}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 id="auth-gate-title" className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  Welcome back
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Log in to download your transcript.
                </p>
              </div>

              {/* Google Sign-In */}
              {GOOGLE_CLIENT_ID && (
                <>
                  <div
                    ref={googleBtnRef}
                    className="w-full overflow-hidden rounded-xl"
                    style={{ minHeight: 44 }}
                  />
                  {googleLoading && (
                    <p className="text-center text-sm text-gray-500">Signing in with Google…</p>
                  )}
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400">or continue with email</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading
                    ? 'Logging in…'
                    : <><span>Log in & download</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setMode('signup-combo'); setError(null) }}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign up
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                No account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup-combo'); setError(null) }}
                  className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                >
                  Sign up free
                </button>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
