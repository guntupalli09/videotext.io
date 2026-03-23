/**
 * FeedbackSheet — Base bottom-sheet / modal used by all 5 feedback triggers.
 *
 * On mobile (< sm): slides up from the bottom as a sheet.
 * On desktop (≥ sm): centers as a compact modal.
 *
 * Props:
 *   isOpen       — controls visibility
 *   onClose      — called on backdrop click / dismiss
 *   children     — sheet content
 *   maxWidth     — optional Tailwind max-width class (default "max-w-md")
 */

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface FeedbackSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string
  /** If true, renders a compact "just a sec" progress bar at top */
  delaying?: boolean
}

export default function FeedbackSheet({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-md',
}: FeedbackSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          {/* Sheet / Modal */}
          <motion.div
            key="sheet"
            // Mobile: slide up; Desktop: scale in
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`
              relative w-full ${maxWidth} mx-auto
              bg-white dark:bg-gray-900
              rounded-t-2xl sm:rounded-2xl
              shadow-2xl overflow-hidden
              sm:mb-0 sm:mx-4
            `}
            role="dialog"
            aria-modal="true"
          >
            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600" />

            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-2 pb-0 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-5 pb-6 pt-3 sm:pt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Reusable sub-components ─────────────────────────────────────────────────

export function SheetTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 dark:text-white font-display leading-snug pr-8">
      {children}
    </h2>
  )
}

export function SheetSubtitle({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{children}</p>
  )
}

interface OptionButtonProps {
  label: string
  selected: boolean
  onClick: () => void
  variant?: 'default' | 'positive' | 'negative' | 'warning'
}

const VARIANT_CLASSES: Record<string, string> = {
  default: 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30',
  positive: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:bg-emerald-50',
  negative: 'border-red-200 dark:border-red-800 hover:border-red-400 hover:bg-red-50',
  warning: 'border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:bg-amber-50',
}

const SELECTED_CLASSES: Record<string, string> = {
  default: 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
  positive: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  negative: 'border-red-500 bg-red-50 text-red-700',
  warning: 'border-amber-500 bg-amber-50 text-amber-700',
}

export function OptionButton({ label, selected, onClick, variant = 'default' }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all
        ${selected ? SELECTED_CLASSES[variant] : `${VARIANT_CLASSES[variant]} text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800`}
      `}
    >
      {label}
    </button>
  )
}

export function SubmitButton({
  onClick,
  disabled,
  loading,
  label = 'Send',
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-violet-200 dark:shadow-violet-900/30"
    >
      {loading ? 'Sending…' : label}
    </button>
  )
}

export function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
    >
      Skip — maybe later
    </button>
  )
}

export function ThankYouState({ message = "Thanks! Your feedback shapes what we build next." }: { message?: string }) {
  return (
    <div className="py-6 text-center">
      <div className="text-4xl mb-3">🙌</div>
      <p className="text-base font-semibold text-gray-900 dark:text-white font-display">Thank you!</p>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
        {message}
      </p>
    </div>
  )
}
