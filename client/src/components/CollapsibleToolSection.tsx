import { useEffect, useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { trackEvent } from '../lib/analytics'

type Props = {
  id?: string
  title: string
  ariaLabel?: string
  defaultOpen?: boolean
  className?: string
  children: ReactNode
  /** Analytics: route path for SEO section opens */
  route?: string
  analyticsSection?: 'how_it_works' | 'faq_section' | string
}

/** Shared collapsed SEO block — content stays in DOM when visually collapsed (SEO + a11y). */
export default function CollapsibleToolSection({
  id,
  title,
  ariaLabel,
  defaultOpen = false,
  className = '',
  children,
  route,
  analyticsSection,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  useEffect(() => {
    if (!id || typeof window === 'undefined') return
    const syncFromHash = () => {
      if (window.location.hash === `#${id}`) setOpen(true)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [id])

  const toggle = () => {
    setOpen((value) => {
      const next = !value
      if (next && route && analyticsSection) {
        try {
          const event =
            analyticsSection === 'faq_section'
              ? 'faq_section_open'
              : analyticsSection === 'how_it_works'
                ? 'how_it_works_open'
                : 'how_it_works_open'
          trackEvent(event, { route, section: analyticsSection })
        } catch {
          /* non-blocking */
        }
      }
      return next
    })
  }

  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-7xl scroll-mt-20 border-t border-gray-200/70 px-4 pt-10 pb-14 sm:px-6 lg:px-8 dark:border-gray-800/70 ${className}`}
      aria-label={ariaLabel ?? title}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-transparent px-1 py-2 text-left transition-colors hover:border-gray-200/80 dark:hover:border-gray-800"
      >
        <span
          className={`font-medium ${open ? 'text-base text-gray-900 dark:text-white' : 'text-sm text-gray-600 dark:text-gray-400'}`}
        >
          {title}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500">
          {open ? 'Show less' : 'Show more'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div
        id={panelId}
        aria-hidden={!open}
        className={`mt-6 ${open ? '' : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'}`}
      >
        {children}
      </div>
    </section>
  )
}
