/** Visible disclaimer for Netflix referential SEO pages — not affiliation or certification. */
export function NetflixTrademarkDisclaimer({ variant = 'full' }: { variant?: 'full' | 'short' }) {
  if (variant === 'short') {
    return (
      <p className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:text-amber-100/90">
        Check subtitle cues against Netflix-published character-per-line and reading-speed guidelines before delivery.{' '}
        <strong className="font-semibold">VideoText is not affiliated with or endorsed by Netflix.</strong>
      </p>
    )
  }

  return (
    <p className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:text-amber-100/90">
      <strong className="font-semibold">Netflix</strong> is a trademark of Netflix, Inc. VideoText is an independent tool and is{' '}
      <strong className="font-semibold">not affiliated with, endorsed by, or certified by Netflix</strong>. This checklist is a
      workflow aid only and does not guarantee acceptance by Netflix or its vendors.
    </p>
  )
}
