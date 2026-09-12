import { Link } from 'react-router-dom'

/** Post-translation QC nudge — shown after a successful job, not above the upload fold. */
export default function TranslatePostQcBanner() {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 sm:px-5">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
        Before client or platform upload
      </p>
      <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
        Machine translation often expands line length and reading speed. Run a CPS/CPL pass on the translated file.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          to="/subtitle-grammar-fixer"
          className="inline-flex rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3 py-1.5"
        >
          Fix timing & CPL →
        </Link>
        <Link
          to="/tools/subtitle-character-checker"
          className="inline-flex rounded-lg border border-amber-300 dark:border-amber-700 text-xs font-semibold px-3 py-1.5 text-amber-900 dark:text-amber-100 hover:bg-amber-100/80 dark:hover:bg-amber-900/40"
        >
          Character checker
        </Link>
      </div>
    </div>
  )
}
