import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  fetchConversionIntent,
  type ConversionIntentData,
  type ConversionIntentPerson,
  type IntentLevel,
  type IntentRange,
} from '../../lib/conversionIntent'

const RANGE_OPTIONS: { value: IntentRange; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All time' },
]

type FilterKey = 'all' | 'pricing' | 'upgrade' | 'checkout' | 'converted' | 'hot'

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All Intent' },
  { value: 'pricing', label: 'Pricing Visitors' },
  { value: 'upgrade', label: 'Upgrade Clickers' },
  { value: 'checkout', label: 'Checkout Started' },
  { value: 'converted', label: 'Converted' },
  { value: 'hot', label: 'Hot Leads' },
]

const INTENT_BADGE: Record<IntentLevel, string> = {
  CONVERTED: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/30',
  HIGH: 'text-amber-400 border-amber-800/60 bg-amber-950/30',
  MEDIUM: 'text-blue-400 border-blue-800/60 bg-blue-950/30',
  LOW: 'text-zinc-400 border-zinc-700 bg-zinc-800/40',
}

function fmtTimestamp(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function matchesFilter(p: ConversionIntentPerson, filter: FilterKey): boolean {
  switch (filter) {
    case 'all': return true
    case 'pricing': return p.events.some((e) => e.eventName === 'pricing_page_view')
    case 'upgrade': return p.events.some((e) => e.eventName === 'upgrade_clicked')
    case 'checkout': return p.events.some((e) => ['checkout_started', 'checkout_session_created', 'stripe_redirect'].includes(e.eventName))
    case 'converted': return p.converted
    case 'hot': return !p.converted && (p.intentLevel === 'MEDIUM' || p.intentLevel === 'HIGH')
    default: return true
  }
}

function FunnelStep({ label, value, rate }: { label: string; value: number; rate?: string | null }) {
  return (
    <div className="flex-1 min-w-[110px] rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-center">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      {rate != null && <p className="text-[11px] text-zinc-600 mt-0.5">{rate}</p>}
    </div>
  )
}

export default function ConversionIntent() {
  const [range, setRange] = useState<IntentRange>('30d')
  const [data, setData] = useState<ConversionIntentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [toolFilter, setToolFilter] = useState<string>('all')
  const [selectedPerson, setSelectedPerson] = useState<ConversionIntentPerson | null>(null)

  const load = useCallback((r: IntentRange) => {
    setLoading(true)
    setError(null)
    fetchConversionIntent(r).then((result) => {
      if (result.ok) setData(result.data)
      else if (result.status === 'error') setError('Failed to load conversion intent data')
      else setError(result.status === 401 ? 'Unauthorized' : 'Forbidden')
    }).catch(() => setError('Failed to load conversion intent data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(range) }, [range, load])

  const tools = useMemo(() => {
    const set = new Set<string>()
    for (const p of data?.people ?? []) if (p.tool) set.add(p.tool)
    return [...set].sort()
  }, [data])

  const filteredPeople = useMemo(() => {
    const people = data?.people ?? []
    return people
      .filter((p) => matchesFilter(p, filter))
      .filter((p) => toolFilter === 'all' || p.tool === toolFilter)
  }, [data, filter, toolFilter])

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${
                range === opt.value
                  ? 'border-blue-600 bg-blue-950/40 text-blue-300'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => load(range)}
          disabled={loading}
          className="text-xs border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors disabled:opacity-40"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && !data && (
        <p className="text-zinc-600 text-sm py-8 text-center">Loading conversion intent…</p>
      )}

      {data && (
        <>
          {/* Funnel */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="text-sm font-medium text-white mb-4">Funnel ({RANGE_OPTIONS.find((r) => r.value === range)?.label})</h3>
            <div className="flex flex-wrap gap-3">
              <FunnelStep label="Pricing Visitors" value={data.funnel.counts.pricingVisitors} />
              <FunnelStep
                label="Upgrade Clicks"
                value={data.funnel.counts.upgradeClickers}
                rate={data.funnel.rates.pricingToUpgradePct != null ? `${data.funnel.rates.pricingToUpgradePct}% of visitors` : null}
              />
              <FunnelStep
                label="Checkout Started"
                value={data.funnel.counts.checkoutStarters}
                rate={data.funnel.rates.upgradeToCheckoutPct != null ? `${data.funnel.rates.upgradeToCheckoutPct}% of clickers` : null}
              />
              <FunnelStep
                label="Converted to Pro"
                value={data.funnel.counts.converted}
                rate={data.funnel.rates.checkoutToPaidPct != null ? `${data.funnel.rates.checkoutToPaidPct}% of checkouts` : null}
              />
            </div>
            {data.funnel.rates.overallPricingToPaidPct != null && (
              <p className="text-xs text-zinc-500 mt-3">
                Overall pricing → paid: <span className="text-white font-medium">{data.funnel.rates.overallPricingToPaidPct}%</span>
              </p>
            )}
            <p className="text-[11px] text-zinc-600 mt-3 border-t border-zinc-800 pt-3">{data.funnel.anonymousVisitorNote}</p>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${
                  filter === opt.value
                    ? 'border-blue-600 bg-blue-950/40 text-blue-300'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                }`}
              >
                {opt.label}
                {opt.value === 'hot' && (data.hotLeads.length > 0) && (
                  <span className="ml-1.5 text-amber-400">{data.hotLeads.length}</span>
                )}
              </button>
            ))}
            {tools.length > 0 && (
              <select
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
                className="text-xs rounded-lg px-2 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-300"
              >
                <option value="all">All tools</option>
                {tools.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>

          {/* People table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-zinc-950/50">
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">User</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">Email</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">Plan</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">Intent</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">Source</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">Tool</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Remaining</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">Billing</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">Last Activity</th>
                    <th className="py-2.5 px-4 text-zinc-500 font-medium">Converted</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.length === 0 && (
                    <tr><td colSpan={10} className="py-8 text-center text-zinc-600">No users match this filter.</td></tr>
                  )}
                  {filteredPeople.map((p) => (
                    <tr
                      key={p.userId}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedPerson(p)}
                    >
                      <td className="py-2 px-4 text-zinc-300 font-mono truncate max-w-[140px]">{p.name || p.userId.slice(0, 10)}</td>
                      <td className="py-2 px-4 text-zinc-400 truncate max-w-[180px]">{p.email}</td>
                      <td className="py-2 px-4 text-zinc-400">{p.plan}</td>
                      <td className="py-2 px-4">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${INTENT_BADGE[p.intentLevel]}`}>
                          {p.intentLevel}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-zinc-500">{p.source ?? '—'}</td>
                      <td className="py-2 px-4 text-zinc-500">{p.tool ?? '—'}</td>
                      <td className="py-2 px-4 text-right text-zinc-400 tabular-nums">{p.remainingImports ?? '—'}</td>
                      <td className="py-2 px-4 text-zinc-500">{p.billingChoice ?? '—'}</td>
                      <td className="py-2 px-4 text-zinc-400 whitespace-nowrap tabular-nums">{fmtTimestamp(p.lastActivityAt)}</td>
                      <td className="py-2 px-4">
                        {p.converted
                          ? <span className="text-emerald-400">Yes</span>
                          : <span className="text-zinc-600">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-zinc-800 text-zinc-600 text-[11px]">
              Showing {filteredPeople.length} of {data.people.length} users with tracked purchase intent · Click a row for their journey
            </div>
          </div>
        </>
      )}

      {selectedPerson && (
        <JourneyModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}
    </div>
  )
}

function JourneyModal({ person, onClose }: { person: ConversionIntentPerson; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">{person.email}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Current plan: <span className="text-zinc-300">{person.plan}</span>
              <span className="mx-2 text-zinc-700">·</span>
              Intent: <span className={`font-medium ${INTENT_BADGE[person.intentLevel].split(' ')[0]}`}>{person.intentLevel}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-lg leading-none ml-4" aria-label="Close">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {person.events.length === 0 ? (
            <p className="text-zinc-600 text-sm">No conversion-related events recorded.</p>
          ) : (
            <ol className="space-y-3">
              {person.events.map((e, i) => (
                <li key={`${e.eventName}-${e.createdAt}-${i}`} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm text-zinc-200">{e.eventName}</p>
                    <p className="text-xs text-zinc-500">{fmtTimestamp(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="px-5 py-3 border-t border-zinc-800 text-zinc-600 text-[11px] shrink-0">
          Conversion-related events only, oldest to newest.
        </div>
      </div>
    </div>
  )
}
