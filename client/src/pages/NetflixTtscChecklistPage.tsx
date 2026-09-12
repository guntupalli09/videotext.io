import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import SerpTrustStrip from '../components/SerpTrustStrip'

/** B2B delivery checklist — links to existing free tools and grammar fixer, not a new product. */
const CHECKLIST = [
  {
    spec: '42 CPL per line (max 2 lines / 84 per cue)',
    check: { label: 'Character limit checker', path: '/tools/subtitle-character-checker' },
    fix: { label: 'Line-break auto-wrap', path: '/subtitle-grammar-fixer' },
  },
  {
    spec: '20 CPS adult · 17 CPS children\'s',
    check: { label: 'Reading speed checker', path: '/tools/subtitle-reading-speed' },
    fix: { label: 'Timing & CPS repair', path: '/subtitle-grammar-fixer' },
  },
  {
    spec: 'No overlapping cues · valid timecodes',
    check: { label: 'Subtitle validator', path: '/tools/subtitle-validator' },
    fix: { label: 'Overlap repair', path: '/subtitle-grammar-fixer' },
  },
  {
    spec: 'TTML → SRT for delivery handoff',
    check: { label: 'TTML to SRT converter', path: '/tools/ttml-to-srt' },
    fix: { label: 'Post-convert QC pass', path: '/subtitle-grammar-fixer' },
  },
]

const WORKFLOW = [
  { step: 'Receive TTSC brief', detail: 'Confirm genre, language tier, and adult vs children CPS ceiling before QC.' },
  { step: 'Run matching free checker', detail: 'Use the browser tool that matches your expected failure mode (CPL, CPS, overlaps).' },
  { step: 'One-pass auto-fix', detail: 'Upload the same file to Subtitle Grammar Fixer — enable Fix timing and Line breaks (CPL) as needed.' },
  { step: 'Re-scan before handoff', detail: 'Re-run the checker on Netflix (20 CPS) or BBC (17 CPS) preset; attach pass log to delivery package.' },
]

export default function NetflixTtscChecklistPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Seo
        title="Netflix TTSC Conformance Checklist — Vendor QC Workflow | VideoText"
        description="B2B pre-delivery checklist for Netflix TTSC: 42 CPL, 20 CPS adult (17 children). Free browser checks + grammar fixer — not a separate tool."
        canonicalPath="/netflix-ttsc-checklist"
      />
      <SerpTrustStrip />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Localization vendor workflow
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-medium text-gray-900 dark:text-white">
            Netflix TTSC conformance checklist
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            This page is a <strong className="font-medium text-gray-800 dark:text-gray-200">delivery checklist</strong> for
            localization vendors and QC leads — not a new VideoText product. It maps TTSC rules to free browser checkers
            and the existing Subtitle Grammar Fixer you already use elsewhere on the site.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Always confirm the current TTSC brief for genre, language, and client tier before submission.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rule → check → fix</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 dark:bg-gray-800/80">
              <tr>
                {['TTSC rule', 'Free check (existing tool)', 'Auto-fix (existing tool)'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {CHECKLIST.map((row) => (
                <tr key={row.spec}>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{row.spec}</td>
                  <td className="px-4 py-3">
                    <Link to={row.check.path} className="text-blue-600 dark:text-blue-400 hover:underline">{row.check.label}</Link>
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
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">Vendor handoff workflow</h2>
          <ol className="space-y-3">
            {WORKFLOW.map((item, i) => (
              <li key={item.step} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-300">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.step}</p>
                  <p className="text-gray-600 dark:text-gray-400">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/subtitle-grammar-fixer"
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open Subtitle Grammar Fixer →
            </Link>
            <Link
              to="/subtitle-tools"
              className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              All free subtitle tools
            </Link>
            <Link
              to="/translate-subtitles"
              className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Translate before QC
            </Link>
          </div>
        </section>

        <section className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-6 space-y-2">
          <p>
            VideoText&apos;s grammar fixer scan uses <strong className="font-medium">21 CPS</strong> as an EBU-style warning threshold — not Netflix&apos;s delivery ceiling.
            Netflix TTSC fails at <strong className="font-medium">20 CPS</strong> (adult) or <strong className="font-medium">17 CPS</strong> (children).
          </p>
          <p>
            No new account type or vendor SKU — this checklist routes to the same free tools and paid grammar fixer available on the rest of the site.
          </p>
        </section>
      </div>
    </div>
  )
}
