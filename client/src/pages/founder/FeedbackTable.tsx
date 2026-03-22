import { useState } from 'react'
import type { DashboardFeedback } from '../../lib/founderDashboard'

function ExpandedRow({ f }: { f: DashboardFeedback }) {
  const surveyFields = [
    { label: 'How to improve', value: f.comment },
    { label: 'Top tool', value: f.topTool },
    { label: 'Why that tool', value: f.topToolReason },
    { label: 'Feature request', value: f.featureRequest },
    { label: 'Other thoughts', value: f.otherFeedback },
  ].filter((item) => item.value && item.value.trim())

  if (surveyFields.length === 0) return null

  return (
    <tr className="bg-zinc-800/40">
      <td colSpan={7} className="px-4 py-3">
        <div className="grid grid-cols-1 gap-2">
          {surveyFields.map((item) => (
            <div key={item.label} className="flex gap-2 text-xs">
              <span className="text-zinc-500 shrink-0 w-28">{item.label}:</span>
              <span className="text-zinc-200 whitespace-pre-wrap">{item.value}</span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  )
}

export default function FeedbackTable({ feedback }: { feedback: DashboardFeedback[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const surveyCount = feedback.filter((f) => f.source === 'survey').length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white">All recent feedback</h3>
        <div className="flex items-center gap-3">
          {surveyCount > 0 && (
            <span className="text-xs bg-violet-900/40 text-violet-300 px-2 py-0.5 rounded-full">
              {surveyCount} from survey
            </span>
          )}
          <span className="text-xs text-zinc-500">{feedback.length} entries</span>
        </div>
      </div>
      {feedback.length === 0 ? (
        <p className="text-zinc-600 text-sm p-5">No feedback yet.</p>
      ) : (
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr className="border-b border-zinc-800 text-left">
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Stars</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Source</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Tool</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Plan</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">User / Email</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Comment</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((f) => {
                const isSurvey = f.source === 'survey'
                const hasMore = isSurvey && [f.topTool, f.topToolReason, f.featureRequest, f.otherFeedback].some(Boolean)
                const isExpanded = expanded.has(f.id)
                const displayEmail = f.email || f.userNameOrEmail || f.userId || '—'

                return (
                  <>
                    <tr
                      key={f.id}
                      onClick={hasMore ? () => toggle(f.id) : undefined}
                      className={`border-b border-zinc-800/50 transition-colors ${hasMore ? 'cursor-pointer hover:bg-zinc-800/50' : 'hover:bg-zinc-800/30'}`}
                    >
                      <td className="py-2.5 px-4 text-amber-400">
                        {f.stars != null ? '★'.repeat(f.stars) + '☆'.repeat(5 - f.stars) : '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        {isSurvey ? (
                          <span className="bg-violet-900/40 text-violet-300 px-1.5 py-0.5 rounded text-[10px] font-medium">survey</span>
                        ) : (
                          <span className="text-zinc-600">in-app</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400">{f.topTool ?? f.toolId ?? '—'}</td>
                      <td className="py-2.5 px-4 text-zinc-500">{f.planAtSubmit ?? '—'}</td>
                      <td className="py-2.5 px-4 text-zinc-400 max-w-[180px] truncate" title={displayEmail !== '—' ? displayEmail : undefined}>
                        {displayEmail}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-300 max-w-[260px] truncate" title={f.comment || undefined}>
                        {f.comment || '—'}
                        {hasMore && (
                          <span className="ml-1 text-violet-400">{isExpanded ? '▲' : '▼'}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-600 whitespace-nowrap">
                        {f.createdAt
                          ? new Date(f.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                    {hasMore && isExpanded && <ExpandedRow key={`${f.id}-exp`} f={f} />}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
