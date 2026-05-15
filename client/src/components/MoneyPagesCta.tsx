import React from 'react'
import { Link } from 'react-router-dom'
void React

type MoneyPagesCtaProps = {
  title?: string
  description?: string
  className?: string
}

const MONEY_PAGE_LINKS = [
  { to: '/video-to-transcript', label: 'Video to transcript' },
  { to: '/guideline-format', label: 'Format transcript to client transcription style guide' },
  { to: '/youtube-transcript-generator', label: 'YouTube transcript generator' },
  { to: '/video-to-subtitles', label: 'Video to subtitles' },
  { to: '/translate-subtitles', label: 'Translate subtitles' },
  { to: '/burn-subtitles', label: 'Burn subtitles into video' },
  { to: '/compress-video', label: 'Compress video' },
]

export default function MoneyPagesCta({
  title = 'Start with a conversion workflow',
  description = 'Use these direct workflow pages to move from comparison research to production output.',
  className = 'rounded-xl border border-violet-200 bg-violet-50/60 p-5 text-sm',
}: MoneyPagesCtaProps) {
  return (
    <section className={className}>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-2 text-gray-700">{description}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MONEY_PAGE_LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-violet-700 hover:bg-violet-100">
            {item.label} →
          </Link>
        ))}
      </div>
    </section>
  )
}
