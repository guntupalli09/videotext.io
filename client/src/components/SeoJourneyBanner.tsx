import { Link } from 'react-router-dom'
import type { SeoJourneyBannerData } from '../lib/seoJourneyConfig'

export default function SeoJourneyBanner({ data }: { data: SeoJourneyBannerData }) {
  return (
    <aside
      className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6"
      aria-label={data.title}
    >
      <div className="rounded-2xl border-2 border-blue-400 dark:border-blue-600 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-gray-950 px-5 py-5 sm:px-6 sm:py-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-1">
          {data.kicker}
        </p>
        <h2 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white leading-snug">
          {data.title}
        </h2>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">{data.body}</p>
        {data.steps && data.steps.length > 0 && (
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {data.steps.map((step, i) => (
              <li key={step.title} className="rounded-xl bg-white/80 dark:bg-gray-900/60 border border-blue-100 dark:border-blue-900 p-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{step.detail}</p>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 flex-wrap">
          <Link
            to={data.primary.href}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5"
          >
            {data.primary.label} →
          </Link>
          {data.secondary?.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="inline-flex items-center justify-center rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-blue-800 dark:text-blue-200 text-sm font-semibold px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
