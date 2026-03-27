import { Link } from 'react-router-dom'
import Seo from '../../components/Seo'
import OpenStatsStrip from '../../components/OpenStatsStrip'

const TOOLS = [
  {
    category: 'Subtitle Converters',
    items: [
      { path: '/tools/srt-to-vtt', label: 'SRT to VTT Converter', desc: 'Convert SubRip (.srt) to WebVTT (.vtt) format instantly', keywords: 'srt to vtt, convert srt to vtt' },
      { path: '/tools/vtt-to-srt', label: 'VTT to SRT Converter', desc: 'Convert WebVTT back to SubRip format for video editors', keywords: 'vtt to srt, convert vtt' },
      { path: '/tools/sbv-to-srt', label: 'SBV to SRT Converter', desc: 'Convert YouTube SBV caption files to standard SRT format', keywords: 'sbv to srt, youtube captions to srt, convert sbv' },
      { path: '/tools/srt-to-sbv', label: 'SRT to SBV Converter', desc: 'Convert SRT subtitle files to YouTube\'s native SBV format', keywords: 'srt to sbv, convert to sbv, youtube sbv' },
      { path: '/tools/ass-to-srt', label: 'ASS / SSA to SRT Converter', desc: 'Strip ASS/SSA styling tags and convert to plain SRT', keywords: 'ass to srt, ssa to srt, convert ass subtitles' },
      { path: '/tools/ttml-to-srt', label: 'TTML to SRT Converter', desc: 'Convert TTML, DFXP, or EBU-TT subtitle files to SRT', keywords: 'ttml to srt, dfxp to srt, ebu-tt to srt' },
    ],
  },
  {
    category: 'Subtitle Timing Tools',
    items: [
      { path: '/tools/shift-subtitle-timing', label: 'Subtitle Time Shifter', desc: 'Delay or advance all subtitle timestamps to fix sync issues', keywords: 'shift subtitles, delay subtitles, fix subtitle timing' },
      { path: '/tools/merge-srt-files', label: 'SRT File Merger', desc: 'Combine two subtitle files sorted by timestamp', keywords: 'merge srt files, combine subtitles' },
    ],
  },
  {
    category: 'Subtitle Analysis & Validation',
    items: [
      { path: '/tools/subtitle-validator', label: 'Subtitle Validator', desc: 'Check SRT/VTT files for overlaps, empty cues, and errors', keywords: 'validate srt, check subtitle file, srt validator' },
      { path: '/tools/subtitle-reading-speed', label: 'Reading Speed Checker', desc: 'Analyze CPS against Netflix, BBC, and EBU broadcast standards', keywords: 'subtitle cps checker, reading speed subtitles, netflix cps' },
      { path: '/tools/subtitle-character-checker', label: 'Character Limit Checker', desc: 'Verify line lengths meet Netflix (42), YouTube (80), or BBC (37) standards', keywords: 'netflix subtitle character limit, subtitle line length' },
      { path: '/tools/subtitle-word-counter', label: 'Subtitle Word Counter', desc: 'Count words, characters, and speaking stats in subtitle files', keywords: 'subtitle word count, count words in srt' },
    ],
  },
  {
    category: 'Subtitle Text Tools',
    items: [
      { path: '/tools/srt-to-text', label: 'SRT to Plain Text', desc: 'Extract clean text from subtitles, stripping timing and indices', keywords: 'srt to text, extract text from srt, subtitle to transcript' },
    ],
  },
  {
    category: 'Video Calculators',
    items: [
      { path: '/tools/video-bitrate-calculator', label: 'Video Bitrate Calculator', desc: 'Calculate ideal bitrate for target file size, or estimate size from bitrate', keywords: 'video bitrate calculator, file size calculator' },
      { path: '/tools/aspect-ratio-calculator', label: 'Aspect Ratio Calculator', desc: 'Detect ratio from dimensions or calculate missing width/height', keywords: 'video aspect ratio calculator, 16:9 calculator' },
      { path: '/tools/timestamp-converter', label: 'Timestamp Converter', desc: 'Convert between seconds, HH:MM:SS, SRT, VTT, and SMPTE timecode', keywords: 'timestamp converter, seconds to timecode, hh mm ss converter' },
    ],
  },
  {
    category: 'Script & Speaking Tools',
    items: [
      { path: '/tools/video-script-timer', label: 'Video Script Timer', desc: 'Estimate video length from script word count and speaking rate', keywords: 'video script timer, how long will my video be, script length calculator' },
      { path: '/tools/words-per-minute-calculator', label: 'Words Per Minute Calculator', desc: 'Measure your speaking rate in WPM from text and recording duration', keywords: 'words per minute calculator, speaking rate calculator, wpm calculator' },
    ],
  },
  {
    category: 'Video Info Tools',
    items: [
      { path: '/tools/video-metadata-viewer', label: 'Video Metadata Viewer', desc: 'Check video duration, resolution, aspect ratio, and file size locally', keywords: 'video metadata viewer, check video info, video file details' },
    ],
  },
]

export default function FreeToolsIndex() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Seo
        title="Free Video & Subtitle Tools — No Account Required | VideoText"
        description="20+ free browser-based tools for video creators and subtitle editors. Convert SRT, VTT, SBV, ASS, TTML. Validate, merge, shift timing. No upload, no account."
        canonicalPath="/tools"
      />
      {/* Hero */}
      <div className="bg-gradient-to-b from-violet-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
            Free — No account, no upload limit
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white leading-tight">
            Free Video & Subtitle Tools
          </h1>
          <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {TOOLS.reduce((sum, g) => sum + g.items.length, 0)} browser-based tools for video creators, subtitle editors, and content teams. No account required. Nothing is uploaded to our servers.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        <OpenStatsStrip />
        {TOOLS.map((group) => (
          <section key={group.category}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-4">{group.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.items.map((tool) => (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="block rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors group"
                >
                  <p className="font-semibold text-sm text-violet-700 dark:text-violet-400 group-hover:underline">{tool.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tool.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* CTA section */}
        <section className="rounded-2xl bg-violet-600 px-6 py-10 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-2">Ready for AI-powered subtitles?</p>
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-2">
            Generate subtitles from any video — automatically
          </h2>
          <p className="text-sm text-violet-200 mb-6 max-w-lg mx-auto">
            Upload a video or paste a YouTube URL. VideoText generates accurate SRT and VTT files in seconds using AI. Free tier included.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-subtitles" className="inline-block rounded-lg bg-white text-violet-700 font-semibold px-6 py-3 text-sm hover:bg-violet-50 transition-colors">
              Generate subtitles free
            </Link>
            <Link to="/video-to-transcript" className="inline-block rounded-lg border border-white/50 text-white font-semibold px-6 py-3 text-sm hover:bg-violet-700 transition-colors">
              Transcribe video instantly
            </Link>
          </div>
        </section>

        {/* Why these tools */}
        <section className="prose prose-sm dark:prose-invert max-w-none">
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">Why free tools?</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            These tools are completely free and run in your browser. They require no account, no subscription, and no data is sent to our servers. They're designed for video creators, subtitle editors, accessibility specialists, and content teams who need quick utilities without signing up for another tool.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-3">
            When you need more — like AI-generated subtitles from video, translation to 70+ languages, or batch processing hundreds of videos — <Link to="/video-to-subtitles" className="text-violet-600 hover:underline">VideoText's paid tools</Link> are right here.
          </p>
        </section>
      </div>
    </div>
  )
}
