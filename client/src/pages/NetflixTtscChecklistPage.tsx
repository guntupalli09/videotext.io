import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import SerpTrustStrip from '../components/SerpTrustStrip'

const CHECKLIST = [
  {
    spec: '42 CPL per line (max 2 lines / 84 per cue)',
    tool: { label: 'Character limit checker', path: '/tools/subtitle-character-checker' },
    fix: { label: 'Auto-wrap on grammar fixer', path: '/subtitle-grammar-fixer' },
  },
  {
    spec: '20 CPS adult · 17 CPS children\'s',
    tool: { label: 'Reading speed checker', path: '/tools/subtitle-reading-speed' },
    fix: { label: 'Fix timing & CPS', path: '/subtitle-grammar-fixer' },
  },
  {
    spec: 'No overlapping cues · valid timecodes',
    tool: { label: 'Subtitle validator', path: '/tools/subtitle-validator' },
    fix: { label: 'Repair overlaps', path: '/subtitle-grammar-fixer' },
  },
  {
    spec: 'TTML → SRT for delivery handoff',
    tool: { label: 'TTML to SRT converter', path: '/tools/ttml-to-srt' },
    fix: { label: 'Post-convert QC pass', path: '/subtitle-grammar-fixer' },
  },
]

export default function NetflixTtscChecklistPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Seo
        title="Netflix TTSC Pre-Delivery Checklist — CPL, CPS & QC | VideoText"
        description="Netflix TTSC specs: 42 CPL, 20 CPS adult (17 children). Three-step checklist with free browser tools and one-click auto-fix before platform QC."
        canonicalPath="/netflix-ttsc-checklist"
      />
      <SerpTrustStrip />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Timed Text Style Guide</p>
          <h1 className="text-3xl md:text-4xl font-display font-medium text-gray-900 dark:text-white">
            Netflix TTSC pre-delivery checklist
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Localization vendors and subtitle QC teams use Netflix TTSC (Timed Text Style Guide) as the delivery spec.
            These numbers are the adult-programming defaults — always confirm genre, language, and client tier in the current brief.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['TTSC rule', 'Free check', 'Auto-fix'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {CHECKLIST.map((row) => (
                <tr key={row.spec}>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{row.spec}</td>
                  <td className="px-4 py-3">
                    <Link to={row.tool.path} className="text-blue-600 dark:text-blue-400 hover:underline">{row.tool.label}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={row.fix.path} className="text-blue-600 dark:text-blue-400 hover:underline">{row.fix.label}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">Recommended workflow</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>Run the free checker that matches your failure (CPL, CPS, or overlaps).</li>
            <li>Upload the same file to Subtitle Grammar Fixer — enable Fix timing and Line breaks (CPL) as needed.</li>
            <li>Re-run the checker against the Netflix (20 CPS) or BBC (17 CPS) preset before delivery.</li>
          </ol>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/subtitle-grammar-fixer"
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Run full QC fix →
            </Link>
            <Link
              to="/subtitle-tools"
              className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              All free subtitle tools
            </Link>
          </div>
        </section>

        <section className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-6">
          <p>
            VideoText&apos;s fixer scan uses 21 CPS as an EBU-style warning threshold — not Netflix&apos;s delivery ceiling.
            Netflix TTSC fails at 20 CPS (adult) or 17 CPS (children). Always verify against the current TTSC before submission.
          </p>
        </section>
      </div>
    </div>
  )
}
