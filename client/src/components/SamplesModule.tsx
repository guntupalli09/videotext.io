import { Link } from 'react-router-dom'
import { ArrowUpRight, FlaskConical } from 'lucide-react'
import { trackEvent } from '../lib/analytics'
import { saveSamplesModuleAttribution } from '../lib/samplesAttribution'

type SamplesModuleProps = {
  sourcePath: string
  samplesHref?: string
}

export default function SamplesModule({ sourcePath, samplesHref = '/samples' }: SamplesModuleProps) {
  const handleClick = () => {
    saveSamplesModuleAttribution({ sourcePath, samplesHref })
    try {
      trackEvent('samples_module_clicked', { source_path: sourcePath, target_path: samplesHref })
    } catch {
      // non-blocking
    }
  }

  return (
    <div className="rounded-2xl border border-blue-200/70 dark:border-blue-800/50 bg-blue-50/70 dark:bg-blue-950/20 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <FlaskConical className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-300" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">See real output samples</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">Preview actual transcripts, subtitles, and exports before you start.</p>
          </div>
        </div>
        <Link
          to={samplesHref}
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 transition-colors"
        >
          View samples <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
