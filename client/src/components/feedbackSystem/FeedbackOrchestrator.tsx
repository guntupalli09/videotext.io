/**
 * FeedbackOrchestrator — The central controller for all feedback triggers.
 *
 * Mount once in App.tsx. Listens to CustomEvents fired by tool pages
 * and applies all frequency/sampling rules before showing a trigger.
 *
 * Event listeners (window CustomEvents):
 *   vt:evt:transcription_completed  { detail.metadata.toolId? }
 *   vt:evt:result_viewed            { detail.metadata.toolId? }
 *   vt:evt:export_clicked
 *   vt:evt:session_returned
 *
 * Also handles:
 *   - Trigger A: 5s delay after result_viewed, first time only
 *   - Trigger B: on export_clicked, first time only
 *   - Trigger C: 45s idle on result page, 30% of users only
 *   - Trigger D: on session_returned with 2+ sessions, once ever
 *   - Trigger E: on export_clicked if activated, once ever (not same session as D)
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
  hasExportedThisSession, markExportedThisSession,
} from '../../hooks/useFeedbackFrequency'
import { getLifetimeSessionCount } from '../../lib/sessionTracking'

type ActiveTrigger = 'A' | 'B' | 'C' | 'D' | 'E' | null

export default function FeedbackOrchestrator() {
  const [active, setActive] = useState<ActiveTrigger>(null)
  const [toolName, setToolName] = useState<string | undefined>()
  const [dropoffReason, setDropoffReason] = useState<'idle' | 'leaving'>('idle')

  // Track whether we're on a "results page" for idle detection (Trigger C)
  const [onResultsPage, setOnResultsPage] = useState(false)
  const hasExportedRef = useRef(false)

  const show = useCallback((trigger: ActiveTrigger) => {
    // Only one trigger at a time
    if (active !== null) return
    setActive(trigger)
  }, [active])

  const close = useCallback(() => setActive(null), [])

  // ── Listen to app events ──────────────────────────────────────────────────

  useEffect(() => {
    const onTranscriptionCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as { metadata?: { toolId?: string } }
      const tName = detail?.metadata?.toolId ?? undefined
      setToolName(tName)
      setOnResultsPage(true)
    }

    const onResultViewed = (e: Event) => {
      const detail = (e as CustomEvent).detail as { metadata?: { toolId?: string } }
      const tName = detail?.metadata?.toolId ?? undefined
      setToolName(tName)
      setOnResultsPage(true)

      // Trigger A — delay 5s
      if (canShowTriggerA()) {
        const timer = setTimeout(() => {
          if (canShowTriggerA() && !hasExportedRef.current) {
            markTriggerAShown()
            setActive('A')
          }
        }, 5_000)
        return () => clearTimeout(timer)
      }
    }

    const onExportClicked = () => {
      setOnResultsPage(false)
      markExportedThisSession()
      hasExportedRef.current = true

      // Trigger B — fires immediately on first export
      if (canShowTriggerB()) {
        markTriggerBShown()
        show('B')
        return
      }

      // Trigger E — competitor survey for activated users, not in same session as PMF
      if (canShowTriggerE() && hasExportedThisSession()) {
        markTriggerEShown()
        show('E')
      }
    }

    const onSessionReturned = () => {
      const sessionCount = getLifetimeSessionCount()
      // Trigger D — PMF after 2+ sessions
      if (sessionCount >= 2 && canShowTriggerD()) {
        // Delay slightly so page settles
        setTimeout(() => {
          if (canShowTriggerD()) {
            markTriggerDShown()
            setActive('D')
          }
        }, 3_000)
      }
    }

    window.addEventListener('vt:evt:transcription_completed', onTranscriptionCompleted)
    window.addEventListener('vt:evt:result_viewed', onResultViewed)
    window.addEventListener('vt:evt:export_clicked', onExportClicked)
    window.addEventListener('vt:evt:session_returned', onSessionReturned)

    return () => {
      window.removeEventListener('vt:evt:transcription_completed', onTranscriptionCompleted)
      window.removeEventListener('vt:evt:result_viewed', onResultViewed)
      window.removeEventListener('vt:evt:export_clicked', onExportClicked)
      window.removeEventListener('vt:evt:session_returned', onSessionReturned)
    }
  }, [show])

  // ── Trigger C — idle detection on results page ────────────────────────────

  const handleIdle = useCallback(() => {
    if (!onResultsPage) return
    if (!hasExportedRef.current && canShowTriggerC()) {
      markTriggerCShown()
      setDropoffReason('idle')
      setActive('C')
    }
  }, [onResultsPage])

  useIdleDetection(45_000, handleIdle, onResultsPage && active === null)

  // ── Render triggers ───────────────────────────────────────────────────────

  return (
    <>
      <TriggerA_Result
        isOpen={active === 'A'}
        toolName={toolName}
        onClose={close}
      />
      <TriggerB_Export
        isOpen={active === 'B'}
        onClose={close}
      />
      <TriggerC_Dropoff
        isOpen={active === 'C'}
        reason={dropoffReason}
        onClose={close}
      />
      <TriggerD_PMF
        isOpen={active === 'D'}
        onClose={close}
      />
      <TriggerE_Competitor
        isOpen={active === 'E'}
        onClose={close}
      />
    </>
  )
}
