/**
 * FeedbackOrchestrator — Central controller for all 5 feedback triggers.
 * Mount once in App.tsx.
 *
 * Priority (high → low):  B/E  >  A  >  C  >  D
 *
 * HARD RULES:
 *  1. Only ONE A/B/C per session
 *  2. Export overrides everything: cancels A timer; force-closes open A/C
 *  3. C is fallback only — triggerAFiredRef prevents C if A already fired
 *  4. D never same session as B or E
 *  5. E requires export in a PREVIOUS session
 *  6. D requires at least one prior export
 *
 * RACE CONDITION (item 1):
 *  A timer checks hasExportedThisSession() AT EXECUTION TIME (not just at
 *  schedule time), so a <5s export always wins even if the timer was queued.
 *
 * DOUBLE-FIRE (item 2):
 *  canShowTriggerE() now includes isShownThisSession() guard.
 *  onExportClicked bails early if hasExportedRef was already marked this handler.
 *
 * TIMER MANAGEMENT (items 4/7):
 *  Centralised via scheduleTimer / cancelTimer / cancelAllTimers.
 *  Dedicated cleanup effect clears all timers on unmount.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import TriggerA_Result    from './TriggerA_Result'
import TriggerB_Export    from './TriggerB_Export'
import TriggerC_Dropoff   from './TriggerC_Dropoff'
import TriggerD_PMF       from './TriggerD_PMF'
import TriggerE_Competitor from './TriggerE_Competitor'
import { useIdleDetection } from '../../hooks/useIdleDetection'
import {
  canShowTriggerA, canShowTriggerB, canShowTriggerC, canShowTriggerD, canShowTriggerE,
  markTriggerAShown, markTriggerBShown, markTriggerCShown, markTriggerDShown, markTriggerEShown,
  hasEverExported, markEverExported,
  hasExportedThisSession, markExportedThisSession,
} from '../../hooks/useFeedbackFrequency'
import { getLifetimeSessionCount } from '../../lib/sessionTracking'

type ActiveTrigger = 'A' | 'B' | 'C' | 'D' | 'E' | null

export default function FeedbackOrchestrator() {
  const [active, setActive]   = useState<ActiveTrigger>(null)
  const [toolName, setToolName] = useState<string | undefined>()
  const [dropoffReason]       = useState<'idle' | 'leaving'>('idle')
  const [onResultsPage, setOnResultsPage] = useState(false)

  const hasExportedRef   = useRef(false)   // exported this tab session
  const triggerAFiredRef = useRef(false)   // A fired — C must not fire

  // ── Centralised timer management (item 7) ───────────────────────────────────
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const scheduleTimer = useCallback((name: string, fn: () => void, ms: number) => {
    const existing = timers.current.get(name)
    if (existing) clearTimeout(existing)
    timers.current.set(name, setTimeout(() => {
      timers.current.delete(name)
      fn()
    }, ms))
  }, [])

  const cancelTimer = useCallback((name: string) => {
    const t = timers.current.get(name)
    if (t) { clearTimeout(t); timers.current.delete(name) }
  }, [])

  const cancelAllTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
  }, [])

  // ── Dedicated cleanup on unmount (item 4) ──────────────────────────────────
  useEffect(() => () => cancelAllTimers(), [cancelAllTimers])

  const close = useCallback(() => setActive(null), [])

  // ── App event listeners ────────────────────────────────────────────────────

  useEffect(() => {
    // ── result ready (transcription_completed or result_viewed) ─────────────
    const onResultReady = (e: Event) => {
      const detail = (e as CustomEvent).detail as { metadata?: { toolId?: string } }
      setToolName(detail?.metadata?.toolId ?? undefined)
      setOnResultsPage(true)

      if (!canShowTriggerA()) return

      scheduleTimer('trigger-a', () => {
        // Item 1: Re-check AT EXECUTION TIME — export may have happened in <5s
        if (!canShowTriggerA()) return
        if (hasExportedThisSession()) return   // belt & suspenders over the ref
        if (hasExportedRef.current) return
        markTriggerAShown()
        triggerAFiredRef.current = true
        setActive('A')
      }, 5_000)
    }

    // ── export clicked — highest priority ────────────────────────────────────
    const onExportClicked = () => {
      // Item 2: Guard against duplicate events (e.g. double-click on export btn)
      if (hasExportedRef.current) return

      // Item 1 + 4: Cancel A timer (export wins); also cancel D timer
      cancelTimer('trigger-a')
      cancelTimer('trigger-d')

      setOnResultsPage(false)

      // Capture "exported before THIS click" BEFORE marking
      const exportedBefore = hasEverExported()
      markExportedThisSession()
      markEverExported()
      hasExportedRef.current = true

      // B: first export ever
      if (!exportedBefore && canShowTriggerB()) {
        markTriggerBShown()
        setActive('B')   // force-set — overrides any open A or C (item 2)
        return
      }

      // E: returning exporter (exported in a prior session)
      if (exportedBefore && canShowTriggerE()) {
        markTriggerEShown()
        setActive('E')
      }
    }

    // ── session returned ─────────────────────────────────────────────────────
    const onSessionReturned = () => {
      const sessionCount = getLifetimeSessionCount()
      // D: 2+ sessions, exported before, not same session as B/E
      if (sessionCount >= 2 && hasEverExported() && canShowTriggerD()) {
        scheduleTimer('trigger-d', () => {
          // Re-check: user might have exported (B/E) during the delay
          if (canShowTriggerD()) {
            markTriggerDShown()
            setActive('D')
          }
        }, 3_000)
      }
    }

    window.addEventListener('vt:evt:transcription_completed', onResultReady)
    window.addEventListener('vt:evt:result_viewed',           onResultReady)
    window.addEventListener('vt:evt:export_clicked',          onExportClicked)
    window.addEventListener('vt:evt:session_returned',        onSessionReturned)

    return () => {
      window.removeEventListener('vt:evt:transcription_completed', onResultReady)
      window.removeEventListener('vt:evt:result_viewed',           onResultReady)
      window.removeEventListener('vt:evt:export_clicked',          onExportClicked)
      window.removeEventListener('vt:evt:session_returned',        onSessionReturned)
    }
  }, [scheduleTimer, cancelTimer])

  // ── Trigger C — idle fallback (item 3) ────────────────────────────────────

  const handleIdle = useCallback(() => {
    if (!onResultsPage) return
    if (triggerAFiredRef.current) return    // C is fallback — A already handled this
    if (hasExportedRef.current) return
    if (canShowTriggerC()) {
      markTriggerCShown()
      setActive('C')
    }
  }, [onResultsPage])

  useIdleDetection(45_000, handleIdle, onResultsPage && active === null)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <TriggerA_Result    isOpen={active === 'A'} toolName={toolName}  onClose={close} />
      <TriggerB_Export    isOpen={active === 'B'}                      onClose={close} />
      <TriggerC_Dropoff   isOpen={active === 'C'} reason={dropoffReason} onClose={close} />
      <TriggerD_PMF       isOpen={active === 'D'}                      onClose={close} />
      <TriggerE_Competitor isOpen={active === 'E'}                     onClose={close} />
    </>
  )
}
