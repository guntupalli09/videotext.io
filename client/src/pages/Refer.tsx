import { Link } from 'react-router-dom'
import { Gift } from 'lucide-react'

export default function Refer() {
  return (
    <div className="min-h-screen py-16 sm:py-24 bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-lg mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6">
          <Gift className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white">
          Refer and earn
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Share your link with friends. When they sign up, you both get <strong>bonus uploads</strong> added to your account.
        </p>
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Referral program is coming soon. Check back or contact support for early access.
        </p>
        <Link
          to="/pricing"
          className="mt-8 inline-block rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium transition-colors"
        >
          Back to Pricing
        </Link>
      </div>
    </div>
  )
}
