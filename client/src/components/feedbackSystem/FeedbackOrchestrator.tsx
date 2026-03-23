/**
 * FeedbackOrchestrator — Central controller for all 5 feedback triggers.
 *
 * Mount once in App.tsx. Listens to CustomEvents fired by tool pages
 * and applies all frequency/sampling rules before showing a trigger.
 *
 * HARD RULES enforced here:
 *  1. Only ONE A/B/C per session — enforced by canShow* guards
 *  2. Export overrides everything — cancels pending A timer; closes active A/C
 *  3. C is fallback only — never fires if A already fired this mount
 *  4. D never same session as B/E — enforced by markBehavioralShownThisSession
 *  5. E requires export in a PREVIOUS session — checked via hasEverExported()
 *     captured BEFORE marking the current export
 *  6. D requires at least one prior export — checked via hasEverExported()
 *
 * Event flow:
 *   result_viewed       → [5s] Trigger A (if eligible)
 *   45s idle on result  → Trigger C (fallback, 30% sample, only if A not fired)
 *   export_clicked      → Trigger B (first export ever) or E (returning exporter)
 *                         Cancels A timer; closes any open A/C
 *   session_returned    → [3–5s] Trigger D (PMF, 2+ sessions, exported before)
 *                         Cancelled if export fires before delay elapses
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import TriggerA_Result from './TriggerA_Result'
import TriggerB_Export from './TriggerB_Export'
import TriggerC_Dropoff from './TriggerC_Dropoff'
import TriggerD_PMF from './TriggerD_PMF'
import TriggerE_Competitor from './TriggerE_Competitor'
import { useIdleDetection } from '../../hooks/useIdleDetection'
import {
  canShowTriggerA, canShowTriggerB, canShowTriggerC, canShowTriggerD, canShowTriggerE,
  markTriggerAShown, markTriggerBShown, markTriggerCShown, markTriggerDShown, markTriggerEShown,
  hasEverExported, markEverExported, markExportedThisSession,
} from '../../hooks/useFeedbackFrequency'
import { getLifetimeSessionCount } from '../../lib/sessionTracking'

type ActiveTrigger = 'A' | 'B' | 'C' | 'D' | 'E' | null

export default function FeedbackOrchestrator() {
  const [active, setActive] = useState<ActiveTrigger>(null)
  const [toolName, setToolName] = useState<string | undefined>()
  const [dropoffReason] = useState<'idle' | 'leaving'>('idle')

  const [onResultsPage, setOnResultsPage] = useState(false)

  // Refs that survive re-renders without causing them
  const hasExportedRef = useRef(false)      // exported this session
  const triggerAFiredRef = useRef(false)    // A fired this mount — C must not fire
  const aTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = useCallback(() => setActive(null), [])

  // ── Listen to app events ────────────────────────────────────────────────────

  useEffect(() => {
    // ── transcription_completed / result_viewed ──
    const onResultReady = (e: Event) => {
      const detail = (e as CustomEvent).detail as { metadata?: { toolId?: string } }
      setToolName(detail?.metadata?.toolId ?? undefined)
      setOnResultsPage(true)

      // Trigger A — 5s delay, cancelled if user exports first
      if (canShowTriggerA()) {
        aTimerRef.current = setTimeout(() => {
          aTimerRef.current = null
          // Re-check: user might have exported within the 5s window
          if (canShowTriggerA() && !hasExportedRef.current) {
            markTriggerAShown()
            triggerAFiredRef.current = true
            setActive('A')
          }
        }, 5_000)
      }
    }

    // ── export_clicked ── highest priority; overrides A/C ──
    const onExportClicked = () => {
      // 1. Cancel pending A timer — export wins
      if (aTimerRef.current) {
        clearTimeout(aTimerRef.current)
        aTimerRef.current = null
      }
      // 2. Cancel pending D timer — B/E wins over PMF in same session
      if (dTimerRef.current) {
        clearTimeout(dTimerRef.current)
        dTimerRef.current = null
      }

      setOnResultsPage(false)

      // Capture "exported before this click" BEFORE marking
      const exportedBefore = hasEverExported()
      markExportedThisSession()
      markEverExported()
      hasExportedRef.current = true

      // Determine export trigger (B = first ever, E = returning exporter)
      // Use setActive directly to force-close any open A or C
      if (!exportedBefore && canShowTriggerB()) {
        markTriggerBShown()
        setActive('B')
        return
      }
      if (exportedBefore && canShowTriggerE()) {
        markTriggerEShown()
        setActive('E')
      }
    }

    // ── session_returned ──
    const onSessionReturned = () => {
      const sessionCount = getLifetimeSessionCount()
      // D: 2+ sessions, exported before, not shown in same session as B/E
      if (sessionCount >= 2 && hasEverExported() && canShowTriggerD()) {
        dTimerRef.current = setTimeout(() => {
          dTimerRef.current = null
          // Re-check: user might have exported (triggering B/E) during delay
          if (canShowTriggerD()) {
            markTriggerDShown()
            setActive('D')
          }
        }, 3_000)
      }
    }

    window.addEventListener('vt:evt:transcription_completed', onResultReady)
    window.addEventListener('vt:evt:result_viewed', onResultReady)
    window.addEventListener('vt:evt:export_clicked', onExportClicked)
    window.addEventListener('vt:evt:session_returned', onSessionReturned)

    return () => {
      window.removeEventListener('vt:evt:transcription_completed', onResultReady)
      window.removeEventListener('vt:evt:result_viewed', onResultReady)
      window.removeEventListener('vt:evt:export_clicked', onExportClicked)
      window.removeEventListener('vt:evt:session_returned', onSessionReturned)
      // Clean up any pending timers on unmount
      if (aTimerRef.current) clearTimeout(aTimerRef.current)
      if (dTimerRef.current) clearTimeout(dTimerRef.current)
    }
  }, [])

  // ── Trigger C — idle fallback on results page ────────────────────────────

  const handleIdle = useCallback(() => {
    if (!onResultsPage) return
    if (triggerAFiredRef.current) return     // C is fallback — skip if A fired
    if (hasExportedRef.current) return       // exported — no drop-off to measure
    if (canShowTriggerC()) {
      markTriggerCShown()
      setActive('C')
    }
  }, [onResultsPage])

  // Idle detection only armed when on results page and nothing is showing
  useIdleDetection(45_000, handleIdle, onResultsPage && active === null)

  // ── Render triggers ─────────────────────────────────────────────────────────

  return (
    <>
      <TriggerA_Result isOpen={active === 'A'} toolName={toolName} onClose={close} />
      <TriggerB_Export isOpen={active === 'B'} onClose={close} />
      <TriggerC_Dropoff isOpen={active === 'C'} reason={dropoffReason} onClose={close} />
      <TriggerD_PMF isOpen={active === 'D'} onClose={close} />
      <TriggerE_Competitor isOpen={active === 'E'} onClose={close} />
    </>
  )
}
