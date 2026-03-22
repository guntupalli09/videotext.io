import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Square,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Zap,
  ShieldCheck,
  AlertCircle,
  Download,
  Wifi,
  Sparkles,
} from 'lucide-react'
import { ToolLayout } from '../components/figma/ToolLayout'
import {
  uploadFileWithProgress,
  subscribeJobStatus,
  BACKEND_TOOL_TYPES,
} from '../lib/api'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { trackEvent } from '../lib/analytics'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'requesting' | 'recording' | 'uploading' | 'processing' | 'result' | 'error'

// ── Constants ─────────────────────────────────────────────────────────────────
const NUM_BARS = 48
const MAX_RECORD_SECS = 300 // 5 min cap

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function getBestMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return (
    candidates.find((t) => {
      try {
        return MediaRecorder.isTypeSupported(t)
      } catch {
        return false
      }
    }) ?? ''
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceRecorder() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [recSecs, setRecSecs] = useState(0)
  const [uploadPct, setUploadPct] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [partial, setPartial] = useState('')
  const [copied, setCopied] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  // Refs — stable, no stale closures
  const phaseRef = useRef<Phase>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const stopPollRef = useRef<(() => void) | null>(null)
  const barsRef = useRef<number[]>(new Array(NUM_BARS).fill(0.05))

  // Keep phase ref in sync for RAF closure access
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Global cleanup on unmount
  useEffect(
    () => () => {
      releaseAudio()
      abortRef.current?.abort()
      stopPollRef.current?.()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  // ── Audio resource cleanup ─────────────────────────────────────────────────
  function releaseAudio() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
  }

  // ── Waveform canvas ────────────────────────────────────────────────────────
  function runWaveform() {
    function frame() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const analyser = analyserRef.current
      const isRec = phaseRef.current === 'recording'
      let freq: Uint8Array | null = null

      if (analyser && isRec) {
        freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
        analyser.getByteFrequencyData(freq)
      }

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const gap = 3
      const bw = (W - (NUM_BARS - 1) * gap) / NUM_BARS
      const step = freq ? Math.max(1, Math.floor(freq.length / NUM_BARS)) : 1
      const now = Date.now() / 1000

      for (let i = 0; i < NUM_BARS; i++) {
        let target: number
        if (freq && isRec) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += freq[i * step + j] ?? 0
          target = sum / step / 255
        } else {
          // Gentle breathing idle animation
          target = 0.04 + Math.abs(Math.sin(now * 0.7 + i * 0.22)) * 0.12
        }

        // Smooth lerp — slower for idle, snappy for live audio
        barsRef.current[i] += (target - barsRef.current[i]) * (isRec ? 0.35 : 0.06)

        const bh = Math.max(3, barsRef.current[i] * H * 0.88)
        const x = i * (bw + gap)
        const y = (H - bh) / 2
        const a = 0.5 + barsRef.current[i] * 0.5

        ctx.fillStyle = isRec ? `rgba(239,68,68,${a})` : `rgba(124,58,237,${a})`

        // Rounded bars via arcTo
        const r = Math.min(bw / 2, 3)
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + bw, y, x + bw, y + bh, r)
        ctx.arcTo(x + bw, y + bh, x, y + bh, r)
        ctx.arcTo(x, y + bh, x, y, r)
        ctx.arcTo(x, y, x + bw, y, r)
        ctx.closePath()
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(frame)
  }

  // Canvas ref callback — init dimensions once, then start animation
  const initCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el
    if (!el) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }
    const dpr = window.devicePixelRatio || 1
    const rect = el.getBoundingClientRect()
    el.width = (rect.width || 600) * dpr
    el.height = (rect.height || 64) * dpr
    const ctx = el.getContext('2d')
    ctx?.scale(dpr, dpr)
    runWaveform()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Recording ──────────────────────────────────────────────────────────────
  async function startRecording() {
    setErrMsg('')
    setPhase('requesting')

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrMsg('Your browser does not support microphone access. Try Chrome, Firefox, or Safari.')
      setPhase('error')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setErrMsg('Your browser does not support audio recording. Try Chrome or Firefox.')
      setPhase('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: 16000 },
        },
      })
      streamRef.current = stream

      // Web Audio API for real-time waveform
      const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const actx = new AudioCtx()
      audioCtxRef.current = actx
      const src = actx.createMediaStreamSource(stream)
      const an = actx.createAnalyser()
      an.fftSize = 512
      an.smoothingTimeConstant = 0.75
      src.connect(an)
      analyserRef.current = an

      // MediaRecorder — pick best available codec
      const mt = getBestMimeType()
      const rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined)
      recRef.current = rec
      chunksRef.current = []

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mt || 'audio/webm' })
        releaseAudio()
        handleUpload(blob, mt || 'audio/webm')
      }

      rec.start(250) // chunk every 250 ms for accurate data-available events

      setRecSecs(0)
      timerRef.current = setInterval(() => {
        setRecSecs((s) => {
          if (s + 1 >= MAX_RECORD_SECS) {
            stopRecording()
            return s
          }
          return s + 1
        })
      }, 1000)

      setPhase('recording')
      runWaveform() // restart waveform in recording mode
      trackEvent('processing_started', { tool: 'voice-recorder' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/permission|denied/i.test(msg)) {
        setErrMsg(
          'Microphone access denied. Click the lock icon in your browser address bar and allow microphone access, then try again.'
        )
      } else if (/NotFound|no devices/i.test(msg)) {
        setErrMsg('No microphone found. Connect a microphone and try again.')
      } else {
        setErrMsg('Could not start microphone. Check browser permissions and try again.')
      }
      setPhase('error')
    }
  }

  function stopRecording() {
    if (recRef.current && recRef.current.state !== 'inactive') {
      recRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // ── Upload + Poll ──────────────────────────────────────────────────────────
  async function handleUpload(blob: Blob, mimeType: string) {
    setPhase('uploading')
    setUploadPct(0)

    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([blob], `voice-recording.${ext}`, { type: mimeType })
    abortRef.current = new AbortController()

    try {
      const res = await uploadFileWithProgress(
        file,
        {
          toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
          uploadMode: 'audio-only',
          originalFileName: file.name,
          exportFormats: ['txt'],
        },
        { onProgress: (p) => setUploadPct(p), signal: abortRef.current.signal }
      )

      setPhase('processing')
      setPartial('')

      stopPollRef.current = subscribeJobStatus(
        res.jobId,
        { jobToken: res.jobToken },
        async (s) => {
          if (s.partialTranscript) setPartial(s.partialTranscript)

          if (s.status === 'completed' && s.result) {
            stopPollRef.current?.()
            let text = ''
            if (s.result.segments?.length) {
              text = s.result.segments.map((seg) => seg.text).join('\n\n')
            } else if (s.result.downloadUrl) {
              try {
                text = await fetch(getAbsoluteDownloadUrl(s.result.downloadUrl)).then((r) =>
                  r.text()
                )
              } catch {
                // fallback — empty transcript is better than crashing
              }
            }
            setTranscript(text)
            setPhase('result')
            trackEvent('processing_completed', {
              tool: 'voice-recorder',
              words: text.trim().split(/\s+/).filter(Boolean).length,
            })
            toast.success('Transcript ready!')
          } else if (s.status === 'failed') {
            stopPollRef.current?.()
            setErrMsg('Transcription failed. Please try again.')
            setPhase('error')
          }
        }
      )
    } catch (err: unknown) {
      if (abortRef.current?.signal.aborted) return
      const msg = err instanceof Error ? err.message : String(err)
      setErrMsg(msg || 'Upload failed. Please try again.')
      setPhase('error')
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function copyTranscript() {
    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  function downloadTranscript() {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcript.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    abortRef.current?.abort()
    stopPollRef.current?.()
    releaseAudio()
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setPhase('idle')
    setTranscript('')
    setPartial('')
    setRecSecs(0)
    setUploadPct(0)
    setErrMsg('')
    barsRef.current = new Array(NUM_BARS).fill(0.05)
    // Restart idle waveform after React paint
    setTimeout(() => canvasRef.current && runWaveform(), 50)
  }

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
  const showCanvas = phase === 'idle' || phase === 'requesting' || phase === 'recording'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ToolLayout
      breadcrumbs={[{ label: 'Voice Recorder', href: '/voice-recorder' }]}
      title="Voice to Text"
      subtitle="Speak naturally. Get an accurate transcript in seconds."
      icon={<Mic className="w-5 h-5 text-violet-600" />}
      tags={['Free', 'Noise Suppressed', '99 Languages']}
    >
      <div className="max-w-2xl mx-auto space-y-5 pb-16">

        {/* ── Main recorder card ──────────────────────────────────────────── */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-card-elevated overflow-hidden"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <AnimatePresence mode="wait" initial={false}>

            {/* ── IDLE & REQUESTING ─────────────────────────────────────── */}
            {(phase === 'idle' || phase === 'requesting') && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 sm:p-10 flex flex-col items-center gap-7"
              >
                {/* Waveform canvas */}
                <div className="w-full" style={{ height: 56 }}>
                  <canvas
                    ref={initCanvas}
                    aria-hidden="true"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </div>

                {/* Mic button with breathing ring */}
                <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-violet-100 dark:bg-violet-900/30"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0.25, 0.7] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute inset-3 rounded-full bg-violet-50 dark:bg-violet-900/20"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.15, 0.5] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  />
                  <button
                    onClick={phase === 'idle' ? startRecording : undefined}
                    disabled={phase === 'requesting'}
                    className="relative z-10 w-[84px] h-[84px] rounded-full bg-gradient-to-br from-violet-500 to-violet-700 hover:from-violet-600 hover:to-violet-800 shadow-xl shadow-violet-200/70 dark:shadow-violet-900/50 transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                    aria-label="Start voice recording"
                  >
                    {phase === 'requesting' ? (
                      <motion.div
                        className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <Mic className="w-9 h-9 text-white" strokeWidth={1.5} />
                    )}
                  </button>
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {phase === 'requesting' ? 'Requesting microphone…' : 'Tap to start recording'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Up to 5 minutes · All languages detected automatically
                  </p>
                </div>

                {/* Trust badges */}
                <div className="flex items-center gap-5 flex-wrap justify-center pt-1">
                  {[
                    { Icon: ShieldCheck, label: 'Noise suppressed' },
                    { Icon: Globe, label: '99 languages' },
                    { Icon: Zap, label: 'Results in ~8s' },
                  ].map(({ Icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                    >
                      <Icon className="w-3.5 h-3.5 text-violet-500" />
                      {label}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── RECORDING ─────────────────────────────────────────────── */}
            {phase === 'recording' && (
              <motion.div
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 sm:p-10 flex flex-col items-center gap-7"
              >
                {/* REC badge + timer */}
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                    <motion.span
                      className="w-2 h-2 rounded-full bg-red-500 inline-block"
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    REC
                  </span>
                  <span className="text-3xl font-mono font-semibold text-gray-800 dark:text-gray-100 tabular-nums tracking-widest">
                    {formatTime(recSecs)}
                  </span>
                </div>

                {/* Live waveform */}
                <div className="w-full" style={{ height: 56 }}>
                  <canvas
                    ref={initCanvas}
                    aria-hidden="true"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </div>

                {/* Stop button with pulsing ring */}
                <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/30"
                    animate={{ scale: [1, 1.22, 1], opacity: [0.8, 0.2, 0.8] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <button
                    onClick={stopRecording}
                    className="relative z-10 w-[84px] h-[84px] rounded-full bg-red-500 hover:bg-red-600 shadow-xl shadow-red-200/70 dark:shadow-red-900/50 transition-all duration-200 flex items-center justify-center active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                    aria-label="Stop recording"
                  >
                    <Square className="w-8 h-8 text-white fill-white" />
                  </button>
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    Tap to stop recording
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Background noise is being filtered
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── UPLOADING / PROCESSING ────────────────────────────────── */}
            {(phase === 'uploading' || phase === 'processing') && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 sm:p-10 flex flex-col items-center gap-6"
              >
                {/* Animated icon */}
                <div className="w-[76px] h-[76px] rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-9 h-9 text-violet-600 dark:text-violet-400" />
                  </motion.div>
                </div>

                <div className="text-center space-y-1.5 w-full">
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {phase === 'uploading' ? 'Uploading recording…' : 'Transcribing with AI…'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {phase === 'uploading'
                      ? 'Preparing your audio for the AI'
                      : 'Usually takes 5–8 seconds'}
                  </p>
                </div>

                {/* Upload progress bar */}
                {phase === 'uploading' && (
                  <div className="w-full max-w-xs bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${uploadPct}%` }}
                      transition={{ duration: 0.25 }}
                    />
                  </div>
                )}

                {/* Processing pulse dots */}
                {phase === 'processing' && !partial && (
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2.5 h-2.5 rounded-full bg-violet-400"
                        animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                      />
                    ))}
                  </div>
                )}

                {/* Partial transcript preview */}
                {phase === 'processing' && partial && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/40 rounded-xl p-4 max-h-32 overflow-y-auto"
                  >
                    <p className="text-sm text-violet-800 dark:text-violet-200 italic leading-relaxed">
                      "{partial}"
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── RESULT ────────────────────────────────────────────────── */}
            {phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="p-6 sm:p-8 space-y-5"
              >
                {/* Result header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Check className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Transcript ready
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'} · {formatTime(recSecs)} recorded
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyTranscript}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadTranscript}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      .txt
                    </button>
                  </div>
                </div>

                {/* Transcript body */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 max-h-80 overflow-y-auto">
                  {transcript.trim() ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {transcript}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                      No speech detected. Try recording again in a quieter environment.
                    </p>
                  )}
                </div>

                {/* Record again */}
                <button
                  onClick={reset}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Record another
                </button>
              </motion.div>
            )}

            {/* ── ERROR ─────────────────────────────────────────────────── */}
            {phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 sm:p-10 flex flex-col items-center gap-6 text-center"
              >
                <div className="w-[76px] h-[76px] rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-9 h-9 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    Something went wrong
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                    {errMsg || 'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
                <button onClick={reset} className="btn-primary px-8">
                  Try again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* ── Tip row (only in idle) ──────────────────────────────────────── */}
        <AnimatePresence>
          {showCanvas && phase === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="flex items-center justify-center gap-6 flex-wrap"
            >
              {[
                'Works best in quiet environments',
                'Speak clearly at normal pace',
                'All accents supported',
              ].map((tip) => (
                <span key={tip} className="text-xs text-gray-400 dark:text-gray-500">
                  · {tip}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Coming Soon: Live Streaming Transcription ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-100 dark:border-violet-900/30 rounded-2xl p-5 sm:p-6 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <Wifi className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Live Streaming Transcription
              </p>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 px-2.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Words appear on screen as you speak — real-time transcription with near-zero latency.
              Every word, instantly. Be the first to know when it launches.
            </p>
          </div>
        </motion.div>

      </div>
    </ToolLayout>
  )
}
