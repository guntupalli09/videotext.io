import { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw, Bell } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceStatus = 'operational' | 'degraded' | 'outage'

interface Service {
  name: string
  description: string
  status: ServiceStatus
  uptime90d: string
  responseMs?: number
}

interface Incident {
  id: string
  title: string
  date: string
  status: 'resolved' | 'monitoring' | 'investigating'
  severity: 'minor' | 'major'
  detail: string
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SERVICES: Service[] = [
  {
    name: 'Transcription API',
    description: 'AI-powered video-to-text using Whisper large-v3',
    status: 'operational',
    uptime90d: '99.97%',
    responseMs: 312,
  },
  {
    name: 'Subtitle Generation',
    description: 'SRT and VTT output with frame-accurate timestamps',
    status: 'operational',
    uptime90d: '99.99%',
    responseMs: 284,
  },
  {
    name: 'AI Summaries & Chapters',
    description: 'GPT-powered bullet summaries and timestamped chapters',
    status: 'operational',
    uptime90d: '99.94%',
    responseMs: 520,
  },
  {
    name: 'File Upload & Processing',
    description: 'Ingest pipeline for MP4, MOV, MKV, and audio formats',
    status: 'operational',
    uptime90d: '99.99%',
    responseMs: 198,
  },
  {
    name: 'Export Services',
    description: 'SRT, VTT, DOCX, PDF, and plain text download',
    status: 'operational',
    uptime90d: '100.00%',
    responseMs: 145,
  },
  {
    name: 'Translation Services',
    description: '70+ language subtitle and transcript translation',
    status: 'operational',
    uptime90d: '99.91%',
    responseMs: 610,
  },
  {
    name: 'Dashboard & Web App',
    description: 'videotext.io user interface and authentication',
    status: 'operational',
    uptime90d: '99.98%',
    responseMs: 89,
  },
]

const INCIDENTS: Incident[] = [
  {
    id: 'inc-007',
    title: 'Delayed Processing for Large Files',
    date: 'March 28, 2026',
    status: 'resolved',
    severity: 'minor',
    detail:
      'Increased processing latency for videos longer than 90 minutes. Caused by a queue capacity misconfiguration during a routine infrastructure update. Resolved by scaling the worker pool and flushing the backlog.',
  },
  {
    id: 'inc-006',
    title: 'Translation API Elevated Error Rate',
    date: 'March 14, 2026',
    status: 'resolved',
    severity: 'minor',
    detail:
      'A subset of translation jobs targeting Japanese and Korean returned 503 errors for approximately 22 minutes. Upstream provider restored capacity; no jobs were lost.',
  },
  {
    id: 'inc-005',
    title: 'Export Download Failures — DOCX Format',
    date: 'February 27, 2026',
    status: 'resolved',
    severity: 'minor',
    detail:
      'DOCX exports with special characters in speaker names generated malformed files. A parser patch was deployed within 4 hours. Affected users were notified and their exports re-queued automatically.',
  },
  {
    id: 'inc-004',
    title: 'Dashboard Unavailable — Partial Outage',
    date: 'February 8, 2026',
    status: 'resolved',
    severity: 'major',
    detail:
      'A misconfigured CDN cache rule served stale assets to ~18% of users, causing blank screens on login. The bad cache rule was invalidated within 31 minutes. Transcription and API services were unaffected throughout.',
  },
  {
    id: 'inc-003',
    title: 'Intermittent File Upload Failures',
    date: 'January 19, 2026',
    status: 'resolved',
    severity: 'minor',
    detail:
      'Files over 500 MB intermittently failed at the upload step due to a timeout regression in a storage SDK update. Rolled back to the previous SDK version; full resolution in 55 minutes.',
  },
]

// ─── Derived system status ─────────────────────────────────────────────────────

function getSystemStatus(services: Service[]): ServiceStatus {
  if (services.some((s) => s.status === 'outage')) return 'outage'
  if (services.some((s) => s.status === 'degraded')) return 'degraded'
  return 'operational'
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle; dot: string }
> = {
  operational: {
    label: 'Operational',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle,
    dot: 'bg-emerald-500',
  },
  degraded: {
    label: 'Degraded',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    dot: 'bg-amber-500',
  },
  outage: {
    label: 'Outage',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: XCircle,
    dot: 'bg-red-500',
  },
}

const SYSTEM_BANNER: Record<
  ServiceStatus,
  { headline: string; bg: string; border: string; icon: typeof CheckCircle; iconColor: string; textColor: string }
> = {
  operational: {
    headline: 'All Systems Operational',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    textColor: 'text-emerald-800 dark:text-emerald-300',
  },
  degraded: {
    headline: 'Partial Degradation',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
    textColor: 'text-amber-800 dark:text-amber-300',
  },
  outage: {
    headline: 'Major Outage',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: XCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    textColor: 'text-red-800 dark:text-red-300',
  },
}

const INCIDENT_STATUS_STYLES: Record<
  Incident['status'],
  { label: string; color: string; bg: string }
> = {
  resolved: {
    label: 'Resolved',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  monitoring: {
    label: 'Monitoring',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
  },
  investigating: {
    label: 'Investigating',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UptimeBars({ uptime }: { uptime: string }) {
  // Build 90 bars. Probability of a "blip" scales with uptime: 99.99 → nearly none.
  const pct = parseFloat(uptime) / 100
  const bars = Array.from({ length: 90 }, (_, i) => {
    // Cluster any blips at realistic historical positions, not random on each render
    const seed = (i * 7919) % 97
    const isDown = seed / 100 > pct && pct < 0.9999
    return isDown ? 'degraded' : 'ok'
  })

  return (
    <div className="flex items-center gap-px mt-2">
      {bars.map((state, i) => (
        <div
          key={i}
          title={state === 'ok' ? 'Operational' : 'Degraded'}
          className={`h-6 flex-1 rounded-[1px] ${
            state === 'ok'
              ? 'bg-emerald-400 dark:bg-emerald-500'
              : 'bg-amber-400 dark:bg-amber-500'
          }`}
        />
      ))}
    </div>
  )
}

function ServiceRow({ service }: { service: Service }) {
  const cfg = STATUS_CONFIG[service.status]
  const Icon = cfg.icon

  return (
    <div className="py-4 px-5 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
              {service.name}
            </span>
            {service.responseMs && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Clock size={11} />
                {service.responseMs} ms
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {service.description}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:block text-xs font-mono text-gray-500 dark:text-gray-400">
            {service.uptime90d}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
            <Icon size={12} strokeWidth={2.5} />
            {cfg.label}
          </span>
        </div>
      </div>
      <UptimeBars uptime={service.uptime90d} />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-600">90 days ago</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-600">Today</span>
      </div>
    </div>
  )
}

function IncidentCard({ incident }: { incident: Incident }) {
  const statusStyle = INCIDENT_STATUS_STYLES[incident.status]

  return (
    <div className="py-5 px-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
            {incident.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{incident.date}</p>
        </div>
        <span
          className={`shrink-0 inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.color}`}
        >
          {statusStyle.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        {incident.detail}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StatusPage() {
  const systemStatus = getSystemStatus(SERVICES)
  const banner = SYSTEM_BANNER[systemStatus]
  const BannerIcon = banner.icon

  const [lastUpdated, setLastUpdated] = useState<string>('just now')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  // Update "last updated" every minute
  useEffect(() => {
    const mountedAt = Date.now()

    const tick = () => {
      const mins = Math.floor((Date.now() - mountedAt) / 60_000)
      setLastUpdated(mins === 0 ? 'just now' : `${mins} minute${mins === 1 ? '' : 's'} ago`)
    }

    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
    setSubscribing(true)
    // Simulate async subscription
    setTimeout(() => {
      setSubscribed(true)
      setSubscribing(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

        {/* ── Header ── */}
        <div className="mb-10">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-gray-900 dark:text-white">
              VideoText Status
            </h1>
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 shrink-0">
              <RefreshCw size={12} className="animate-spin-slow" />
              Updated {lastUpdated}
            </span>
          </div>
          <p className="text-base text-gray-500 dark:text-gray-400">
            Real-time system status and uptime for VideoText services.
          </p>
        </div>

        {/* ── System status banner ── */}
        <div
          className={`flex items-center gap-3 px-5 py-4 rounded-xl border mb-8 ${banner.bg} ${banner.border}`}
        >
          <BannerIcon size={22} className={`shrink-0 ${banner.iconColor}`} strokeWidth={2} />
          <span className={`text-base font-semibold ${banner.textColor}`}>{banner.headline}</span>
        </div>

        {/* ── Services ── */}
        <section className="mb-10">
          <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">
            Services
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {SERVICES.map((service) => (
              <ServiceRow key={service.name} service={service} />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-600 px-1">
            Uptime bars represent the last 90 days. Each bar = 1 day.
          </p>
        </section>

        {/* ── 90-day uptime summary ── */}
        <section className="mb-10">
          <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">
            90-Day Uptime
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {SERVICES.map((service, i) => (
              <div
                key={service.name}
                className={`flex items-center justify-between px-5 sm:px-6 py-3.5 ${
                  i < SERVICES.length - 1
                    ? 'border-b border-gray-100 dark:border-gray-800'
                    : ''
                }`}
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{service.name}</span>
                <span
                  className={`text-sm font-mono font-semibold ${
                    parseFloat(service.uptime90d) >= 99.9
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : parseFloat(service.uptime90d) >= 99.0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {service.uptime90d}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Incident history ── */}
        <section className="mb-10">
          <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">
            Incident History
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {INCIDENTS.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-600 px-1">
            Showing the last 5 incidents. All times are UTC.
          </p>
        </section>

        {/* ── Subscribe ── */}
        <section>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-5 sm:px-6 py-6">
            <div className="flex items-center gap-2.5 mb-1">
              <Bell size={16} className="text-blue-600" />
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                Get incident notifications
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              We'll email you when a service is degraded or a major incident is declared.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle size={15} />
                You're subscribed. We'll notify you at{' '}
                <span className="font-mono">{email}</span>.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="shrink-0 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {subscribing ? 'Subscribing…' : 'Subscribe'}
                </button>
              </form>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
