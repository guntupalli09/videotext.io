/**
 * FreeToolResultGate
 *
 * Wraps any free-tool result section.
 *
 * - Authenticated users: renders children normally (full output + actions).
 * - Guest users: shows a ~10% preview (top slice, clipped) with a gradient
 *   fade, then an inline auth gate prompting signup or login.
 *   Opens JobAuthGateModal on button click; closes and reveals results on success.
 *
 * Usage:
 *   {output && (
 *     <FreeToolResultGate>
 *       {/* full output UI here *\/}
 *     </FreeToolResultGate>
 *   )}
 */

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useFreeToolGate } from '../hooks/useFreeToolGate'
import JobAuthGateModal from './JobAuthGateModal'

interface FreeToolResultGateProps {
  children: React.ReactNode
  /** Override the gate headline. Defaults to "Your results are ready". */
  title?: string
}

export default function FreeToolResultGate({ children, title }: FreeToolResultGateProps) {
  const { authed } = useFreeToolGate()
  const [modalMode, setModalMode] = useState<false | 'signup-combo' | 'login'>(false)

  // Authenticated: show everything normally
  if (authed) return <>{children}</>

  // Guest: clipped preview + auth gate
  return (
    <>
      {/* ── Preview: top ~10% of result, clipped + faded ── */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="max-h-[96px] overflow-hidden pointer-events-none select-none"
          aria-hidden="true"
        >
          {children}
        </div>
        {/* Gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
      </div>

      {/* ── Auth gate ── */}
      <div className="mt-3 rounded-xl border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-800/50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {title ?? 'Your results are ready'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sign up or log in to view the full results and export
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModalMode('signup-combo')}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
          >
            Sign up free
          </button>
          <button
            onClick={() => setModalMode('login')}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Log in
          </button>
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2">
          Free account · No credit card · Unlimited free tool access
        </p>
      </div>

      {/* ── Auth modal ── */}
      <JobAuthGateModal
        isOpen={modalMode !== false}
        initialMode={modalMode === 'login' ? 'login' : 'signup-combo'}
        onClose={() => setModalMode(false)}
        onAuthSuccess={() => setModalMode(false)}
        jobDescription={title ?? 'Your results are ready'}
        dismissable={true}
      />
    </>
  )
}
