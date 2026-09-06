/** Above-the-fold free / privacy chips for core money tools and SEO siblings. */
const CHIPS = ['Free tier · 3 imports/mo', 'No credit card', 'Files deleted after processing'] as const

export default function HeroTrustChips({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Free plan and privacy">
        {CHIPS.map((chip) => (
          <li
            key={chip}
            className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"
          >
            {chip}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Start free. Paid plans (Basic $19 / Pro $49 / Agency $129) only if you outgrow 3 imports/mo.
      </p>
    </div>
  )
}
