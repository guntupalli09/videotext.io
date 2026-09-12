import { Link } from 'react-router-dom'
import { useProPricing } from '../contexts/PricingContext'

const QUICK_LANGS = ['Spanish', 'French', 'German', 'Hindi', 'Arabic', 'Portuguese', 'Japanese', 'Chinese (Simplified)'] as const

type Props = {
  targetLanguage: string
  onSelectLanguage: (lang: string) => void
}

/** Above-fold SERP hero for /translate-subtitles — upload-first, timestamps preserved. */
export default function TranslateSerpHero({ targetLanguage, onSelectLanguage }: Props) {
  const { pricing } = useProPricing()

  return (
    <div className="mb-5 rounded-xl border border-blue-200/80 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/90 to-white dark:from-blue-950/40 dark:to-gray-950 px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
        SRT & VTT translation
      </p>
      <p className="mt-1 text-base sm:text-lg font-medium text-gray-900 dark:text-white leading-snug">
        Upload → pick language → download. Every cue time stays intact.
      </p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-3 text-xs text-gray-600 dark:text-gray-400">
        <li className="rounded-lg bg-white/80 dark:bg-gray-900/60 border border-blue-100 dark:border-blue-900 px-3 py-2">
          <span className="font-semibold text-blue-700 dark:text-blue-300">1.</span> Upload .srt or .vtt
        </li>
        <li className="rounded-lg bg-white/80 dark:bg-gray-900/60 border border-blue-100 dark:border-blue-900 px-3 py-2">
          <span className="font-semibold text-blue-700 dark:text-blue-300">2.</span> Choose from 70+ languages
        </li>
        <li className="rounded-lg bg-white/80 dark:bg-gray-900/60 border border-blue-100 dark:border-blue-900 px-3 py-2">
          <span className="font-semibold text-blue-700 dark:text-blue-300">3.</span> Download timed file
        </li>
      </ol>
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Popular targets</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_LANGS.map((lang) => {
            const active = targetLanguage === lang
            return (
              <button
                key={lang}
                type="button"
                onClick={() => onSelectLanguage(lang)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 hover:border-blue-400'
                }`}
              >
                {lang}
              </button>
            )
          })}
        </div>
        {!QUICK_LANGS.includes(targetLanguage as (typeof QUICK_LANGS)[number]) && targetLanguage && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Selected: <span className="font-medium text-gray-800 dark:text-gray-200">{targetLanguage}</span>
          </p>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Free: 3 imports/mo · No card · Files deleted after processing · Pro {pricing.priceLabel} ·{' '}
        <Link to="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
          See all plans
        </Link>
      </p>
    </div>
  )
}
