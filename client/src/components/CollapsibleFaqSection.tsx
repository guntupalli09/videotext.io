import CollapsibleToolSection from './CollapsibleToolSection'
import { trackEvent } from '../lib/analytics'

type FaqItem = { q: string; a: string; id?: string }

type Props = {
  items: FaqItem[]
  title?: string
  id?: string
  className?: string
  route?: string
}

export default function CollapsibleFaqSection({
  items,
  title = 'Frequently asked questions',
  id = 'tool-faq',
  className = '',
  route,
}: Props) {
  if (!items.length) return null

  const handleToggle = (questionId: string, open: boolean) => {
    if (!open || !route) return
    try {
      trackEvent('faq_question_open', { route, question_id: questionId })
    } catch {
      /* non-blocking */
    }
  }

  return (
    <CollapsibleToolSection
      id={id}
      title={title}
      className={className}
      route={route}
      analyticsSection="faq_section"
    >
      <dl className="max-w-4xl space-y-3">
        {items.map((item, i) => {
          const questionId = item.id ?? `q-${i}`
          return (
            <details
              key={questionId}
              className="group rounded-lg border border-gray-200/80 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40"
              onToggle={(e) => handleToggle(questionId, (e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer list-none font-medium text-gray-900 dark:text-white [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-3">
                  <span>{item.q}</span>
                  <span className="shrink-0 text-xs font-normal text-gray-400 transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </span>
              </summary>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.a}</dd>
            </details>
          )
        })}
      </dl>
    </CollapsibleToolSection>
  )
}
