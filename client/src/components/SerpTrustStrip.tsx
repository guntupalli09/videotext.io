import { Link } from 'react-router-dom'

/** Compact trust line for high-traffic SERP landing pages (US + global). */
export default function SerpTrustStrip() {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/50">
      <p className="mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-3.5 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        <span className="font-medium text-gray-800 dark:text-gray-200">Free tier:</span> 3 imports/mo · No credit card ·{' '}
        <span className="font-medium text-gray-800 dark:text-gray-200">Privacy:</span> files deleted after processing ·{' '}
        <span className="font-medium text-gray-800 dark:text-gray-200">USD pricing:</span> Pro $49/mo ·{' '}
        <Link to="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
          See all plans
        </Link>
      </p>
    </div>
  )
}
