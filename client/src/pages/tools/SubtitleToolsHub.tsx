import { Link } from 'react-router-dom'
import { MessageSquare, Wand2, Languages, Wrench, Zap, ArrowRight } from 'lucide-react'
import Seo from '../../components/Seo'
import OpenStatsStrip from '../../components/OpenStatsStrip'
import SeoJourneyBanner from '../../components/SeoJourneyBanner'
import SerpTrustStrip from '../../components/SerpTrustStrip'
import PageGscSeoSections from '../../components/PageGscSeoSections'
import { getSeoJourneyBanner } from '../../lib/seoJourneyConfig'

const SUBTITLE_TOOLS = [
  {
    title: 'Subtitle Generators & Creators',
    icon: MessageSquare,
    description: 'Create subtitles from video or audio',
    links: [
      { path: '/video-to-subtitles', label: 'Video to Subtitles (full product hub)' },
      { path: '/video-to-srt', label: 'Video to SRT' },
      { path: '/netflix-ttsc-checklist', label: 'Netflix TTSC Checklist' },
      { path: '/subtitle-generator', label: 'Subtitle Generator' },
      { path: '/auto-subtitle-generator', label: 'Auto Subtitle Generator' },
      { path: '/youtube-subtitle-generator', label: 'YouTube Subtitle Generator' },
      { path: '/caption-video-online', label: 'Caption Video Online' },
      { path: '/batch-process', label: 'Batch Video to Subtitles' },
    ],
  },
  {
    title: 'Subtitle Editing & Fixing',
    icon: Wrench,
    description: 'Edit, fix, and improve existing subtitles',
    links: [
      { path: '/fix-subtitles', label: 'Fix Subtitles' },
      { path: '/burn-subtitles', label: 'Burn Subtitles into Video' },
      { path: '/subtitle-timing-fixer', label: 'Subtitle Timing Fixer' },
      { path: '/subtitle-line-break-fixer', label: 'Subtitle Line Break Fixer' },
      { path: '/subtitle-grammar-fixer', label: 'Subtitle Grammar Fixer' },
      { path: '/subtitle-language-checker', label: 'Subtitle Language Checker' },
    ],
  },
  {
    title: 'Subtitle Translation & Conversion',
    icon: Languages,
    description: 'Translate subtitles and convert formats',
    links: [
      { path: '/translate-subtitles', label: 'Translate Subtitles' },
      { path: '/srt-translator', label: 'SRT Translator' },
      { path: '/subtitle-translator', label: 'Subtitle Translator' },
      { path: '/multilingual-subtitles', label: 'Multilingual Subtitles' },
      { path: '/srt-to-vtt', label: 'SRT to VTT Converter' },
      { path: '/subtitle-converter', label: 'Subtitle Converter' },
      { path: '/tools/srt-to-vtt', label: 'Free SRT to VTT Tool' },
    ],
  },
  {
    title: 'Subtitle Validation & Tools',
    icon: Zap,
    description: 'Check, validate, and analyze subtitles',
    links: [
      { path: '/netflix-ttsc-checklist', label: 'Netflix TTSC Checklist' },
      { path: '/tools/subtitle-validator', label: 'Subtitle Validator' },
      { path: '/tools/subtitle-word-counter', label: 'Subtitle Word Counter' },
      { path: '/tools/subtitle-character-checker', label: 'Subtitle Character Checker' },
      { path: '/tools/subtitle-reading-speed', label: 'Subtitle Reading Speed' },
      { path: '/tools/merge-srt-files', label: 'Merge SRT Files' },
      { path: '/tools/srt-to-text', label: 'SRT to Text' },
      { path: '/tools/srt-to-sbv', label: 'SRT to SBV' },
      { path: '/tools/ass-to-srt', label: 'ASS to SRT' },
      { path: '/tools/ttml-to-srt', label: 'TTML to SRT' },
      { path: '/tools/shift-subtitle-timing', label: 'Shift Subtitle Timing' },
    ],
  },
  {
    title: 'Subtitle Standards & Reference',
    icon: Wand2,
    description: 'Learn subtitle formats and best practices',
    links: [
      { path: '/netflix-ttsc-checklist', label: 'Netflix TTSC pre-delivery checklist' },
      { path: '/tools/subtitle-character-checker', label: 'Netflix-style CPL Checker (42 chars)' },
      { path: '/open-captions-vs-closed-captions', label: 'Open vs Closed Captions' },
      { path: '/free-captions-and-subtitles', label: 'Free Captions & Subtitles' },
      { path: '/ada-video-captions', label: 'ADA Video Captions' },
      { path: '/sdh-subtitles', label: 'SDH Subtitles' },
      { path: '/hardcoded-captions', label: 'Hardcoded Captions' },
    ],
  },
]

const STANDARDS = [
  { platform: 'Netflix', cps: '20 (adult)', chars: '42', lines: '2', notes: '17 CPS for children\'s content (TTSC)' },
  { platform: 'BBC iPlayer', cps: '17', chars: '37', lines: '2', notes: 'EBU R37 compliant' },
  { platform: 'Amazon Prime', cps: '20', chars: '42', lines: '2', notes: 'Similar to Netflix TTSC' },
  { platform: 'YouTube', cps: 'No limit', chars: 'No limit', lines: '3', notes: 'Auto-captions may wrap' },
  { platform: 'Apple TV+', cps: '17', chars: '40', lines: '2', notes: 'Follows EBU STL spec' },
  { platform: 'Disney+', cps: '17', chars: '42', lines: '2', notes: 'IMSC-1 compatible required' },
]

export default function SubtitleToolsHub() {
  const journey = getSeoJourneyBanner('/subtitle-tools')
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <SerpTrustStrip />
      {journey && <SeoJourneyBanner data={journey} />}
      <Seo
        title="Subtitletools Alternative — Free SRT Convert & Validate | VideoText"
        description="Free browser subtitle tools like Subtitletools: convert SRT↔VTT, validate CPL/CPS, shift timing — plus AI SRT generation when you need a new file. Nothing uploaded."
        canonicalPath="/subtitle-tools"
      />
      {/* Hero */}
      <div className="bg-gray-950 text-white py-16 px-4 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-medium mb-4">
            Free Subtitle Tools — Subtitletools Alternative
          </h1>
          <p className="text-lg text-white/55 max-w-2xl">
            Browser-local converters and validators (like Subtitletools) — plus a path to AI SRT generation, translate, and QC repair when free checks are not enough.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/video-to-srt" className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
              Generate SRT from video →
            </Link>
            <Link to="/netflix-ttsc-checklist" className="inline-flex items-center rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Netflix TTSC checklist
            </Link>
            <Link to="/subtitle-grammar-fixer" className="inline-flex items-center rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Fix CPL & CPS in one pass
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <OpenStatsStrip />

        {/* Tool Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 my-12">
          {SUBTITLE_TOOLS.map((category, idx) => {
            const Icon = category.icon
            return (
              <div key={idx} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Icon className="w-6 h-6 text-pink-600" />
                    {category.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
                </div>
                <ul className="space-y-2">
                  {category.links.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <span className="text-gray-900 dark:text-gray-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                          {link.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-pink-600 transition-colors" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Subtitletools comparison */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white">VideoText vs Subtitletools.com</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Feature', 'VideoText', 'Subtitletools'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ['Browser-local SRT/VTT tools', 'Yes', 'Yes'],
                  ['AI SRT from video upload', 'Yes (Whisper)', 'No'],
                  ['Translate SRT (70+ languages)', 'Yes', 'Limited'],
                  ['CPL/CPS auto-fix (grammar fixer)', 'Yes', 'Check only'],
                  ['Burn captions into video', 'Yes', 'No'],
                ].map(([feature, vt, st]) => (
                  <tr key={feature}>
                    <td className="px-4 py-2.5 text-gray-900 dark:text-white">{feature}</td>
                    <td className="px-4 py-2.5 text-green-700 dark:text-green-400 font-medium">{vt}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{st}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What are subtitle tools */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white">What are subtitle tools used for?</h2>
          <div className="prose prose-gray dark:prose-invert max-w-none text-sm leading-relaxed space-y-3">
            <p>Subtitle tools handle the technical work of creating, editing, converting, and validating subtitle files. Most video creators need them at some point — whether that's converting an SRT file from a transcription service into VTT format for a web player, checking that subtitle timing is in sync with the video, or validating that files meet broadcast platform requirements before delivery.</p>
            <p>The two most common subtitle formats are SRT (SubRip Text) and VTT (WebVTT). SRT was created in the late 1990s and remains the most widely supported format across media players, editing software, and platforms. VTT is the web standard specified by the W3C and is required for HTML5 video players, YouTube's native captions API, and modern streaming web interfaces. Most subtitle workflows involve converting between these two formats at least once.</p>
            <p>Timing issues are the most common subtitle problem. If the original transcript was created from a different video cut, or if the audio was shifted during editing, subtitles can appear seconds early or late. A timing shift tool lets you add or subtract a fixed offset from every cue to bring them back into sync. For more complex sync issues where different parts of the video need different corrections, you may need to re-time manually in a dedicated subtitle editor.</p>
          </div>
        </section>

        {/* Standards Table */}
        <section>
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white mb-4">Subtitle standards by streaming platform</h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Platform', 'Max CPS', 'Max chars/line', 'Max lines', 'Notes'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {STANDARDS.map((row) => (
                  <tr key={row.platform}>
                    <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{row.platform}</td>
                    <td className="px-4 py-2.5 font-mono text-blue-700 dark:text-blue-400">{row.cps}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">{row.chars}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.lines}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">CPS = characters per second. Limits may vary by language. Always verify against current platform delivery specs before submitting.</p>
        </section>

        {/* SRT vs VTT */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white">SRT vs VTT — which format should you use?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">Use SRT when…</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                <li>• Uploading to YouTube, Netflix, Amazon, or Vimeo</li>
                <li>• Importing into Premiere Pro, DaVinci Resolve, or Final Cut</li>
                <li>• Distributing to media players (VLC, MPC, Plex)</li>
                <li>• Sharing with clients or translation teams</li>
                <li>• Maximum compatibility is required</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">Use VTT when…</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                <li>• Embedding captions in an HTML5 &lt;video&gt; element</li>
                <li>• Using a JavaScript video player (Video.js, Plyr, JW)</li>
                <li>• Deploying to a web app or SPA</li>
                <li>• Using chapter markers or region styling</li>
                <li>• The VTT spec's cue settings or styling are needed</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center text-white">
          <h2 className="text-2xl font-display font-medium mb-2">Need subtitles generated automatically?</h2>
          <p className="text-blue-100 mb-6 text-sm max-w-md mx-auto">Upload your video and get accurate, timestamped subtitles in SRT or VTT format — powered by AI, ready in minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/video-to-subtitles" className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm">Generate subtitles with AI →</Link>
            <Link to="/video-to-transcript" className="inline-block border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm">Transcribe video instantly</Link>
          </div>
        </section>

        <PageGscSeoSections path="/subtitle-tools" className="!max-w-3xl !px-0" />

        {/* Back to all tools */}
        <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link to="/tools" className="text-sm text-blue-600 hover:text-blue-700 font-medium">← All free video tools</Link>
        </div>

      </div>
    </div>
  )
}
