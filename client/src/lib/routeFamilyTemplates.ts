/**
 * Route-family architecture for SEO document rendering.
 *
 * Maps every indexable route to one of seven semantic families. Each family
 * carries distinct section H2 titles, a contextual primary CTA, family-specific
 * fallback deep content, and family-specific FAQ patterns.
 *
 * This replaces the single universal SSR template that produced repeated H2
 * structures, identical CTA blocks, and duplicated paragraph text across
 * hundreds of pages.
 */
import type { SeoDeepContent, FaqItem } from './seoRegistry'

// ── Family taxonomy ────────────────────────────────────────────────────────────

export type RouteFamily =
  | 'subtitle'       // subtitle generation, SRT/VTT export, burned captions, timing repair
  | 'formatting'     // transcript formatting, style guides, QA workflows, verbatim rules
  | 'translation'    // subtitle/transcript translation, multilingual workflows
  | 'alternative'    // competitor alternatives, versus pages, comparison pages
  | 'benchmark'      // accuracy tests, speed benchmarks, performance validation
  | 'youtube'        // YouTube URL → transcript/subtitle/chapter workflows
  | 'transcription'  // core transcription: meetings, podcasts, interviews, long-video
  | 'generic'        // catch-all for pages that don't match a specific family

// ── Section H2 title sets ─────────────────────────────────────────────────────

export interface FamilySectionTitles {
  proofPoints: string
  workflowSteps: string
  outputExamples: string
  comparisonRows: string
  useCases: string
  edgeCases: string
  platformGuidance: string
  faq: string
  related: string
}

const SECTION_TITLES: Record<RouteFamily, FamilySectionTitles> = {
  subtitle: {
    proofPoints: 'Where subtitle workflows break in real production',
    workflowSteps: 'From raw video to export-ready subtitle file',
    outputExamples: 'SRT, VTT, and burned caption outputs',
    comparisonRows: 'How VideoText handles subtitle workflows',
    useCases: 'Creators and teams running subtitle workflows',
    edgeCases: 'Subtitle edge cases that cause QA failure',
    platformGuidance: 'Platform-specific subtitle requirements',
    faq: 'Subtitle workflow questions answered',
    related: 'Related caption and subtitle tools',
  },
  formatting: {
    proofPoints: 'Why transcript formatting affects QA acceptance',
    workflowSteps: 'From raw transcript to client-ready formatted file',
    outputExamples: 'Clean, verbatim, and platform-ready transcript outputs',
    comparisonRows: 'Formatting consistency: VideoText vs manual cleanup',
    useCases: 'Transcriptionists and editors running formatting workflows',
    edgeCases: 'Common QA rejection patterns and formatting errors',
    platformGuidance: 'Style guide differences across platforms',
    faq: 'Transcript formatting and style guide questions',
    related: 'Related formatting and QA workflows',
  },
  translation: {
    proofPoints: 'Why timing preservation matters in subtitle translation',
    workflowSteps: 'Translating subtitles without breaking synchronization',
    outputExamples: 'Multilingual subtitle and transcript outputs',
    comparisonRows: 'Translation workflow: VideoText vs standalone tools',
    useCases: 'Teams running multilingual caption workflows',
    edgeCases: 'Language-specific translation edge cases',
    platformGuidance: 'Multilingual subtitle QA and platform requirements',
    faq: 'Subtitle translation and localization questions',
    related: 'Related translation and multilingual workflows',
  },
  alternative: {
    proofPoints: 'Where VideoText differs from this tool operationally',
    workflowSteps: 'Switching your transcript workflow step by step',
    outputExamples: 'Export outputs teams actually compare',
    comparisonRows: 'Side-by-side workflow comparison',
    useCases: 'Teams that switched to VideoText',
    edgeCases: 'Where alternatives create hidden workflow friction',
    platformGuidance: 'Export format and integration differences',
    faq: 'Comparison and switching questions',
    related: 'Other VideoText comparisons and alternatives',
  },
  benchmark: {
    proofPoints: 'What this accuracy benchmark actually measures',
    workflowSteps: 'How the benchmark tests were conducted',
    outputExamples: 'Benchmark results you can verify yourself',
    comparisonRows: 'Performance numbers side by side',
    useCases: 'Teams that rely on transcription accuracy data',
    edgeCases: 'Edge cases that stress-test transcription accuracy',
    platformGuidance: 'Benchmark methodology and scoring approach',
    faq: 'Transcription accuracy and benchmark questions',
    related: 'Related performance and accuracy tests',
  },
  youtube: {
    proofPoints: 'Why auto-captions fail creator workflows',
    workflowSteps: 'Turning YouTube videos into structured, reusable content',
    outputExamples: 'YouTube transcript outputs for creator workflows',
    comparisonRows: 'YouTube transcript: VideoText vs native captions',
    useCases: 'Creator workflows powered by YouTube transcripts',
    edgeCases: 'YouTube-specific transcript friction points',
    platformGuidance: 'YouTube upload and format constraints',
    faq: 'YouTube transcript and workflow questions',
    related: 'Related YouTube and creator workflow tools',
  },
  transcription: {
    proofPoints: 'Where transcription cleanup wastes the most time',
    workflowSteps: 'From long recording to structured, usable transcript',
    outputExamples: 'Transcript outputs teams actually deliver',
    comparisonRows: 'Transcription workflow comparison',
    useCases: 'Teams running high-volume transcription workflows',
    edgeCases: 'Audio conditions that degrade transcript quality',
    platformGuidance: 'Export format tradeoffs for different delivery scenarios',
    faq: 'Transcription workflow questions answered',
    related: 'Related transcription and workflow tools',
  },
  generic: {
    proofPoints: 'Why teams use this workflow',
    workflowSteps: 'How it works',
    outputExamples: 'Outputs you can use immediately',
    comparisonRows: 'How VideoText compares',
    useCases: 'Use cases',
    edgeCases: 'Edge cases to be aware of',
    platformGuidance: 'Platform and export notes',
    faq: 'Frequently asked questions',
    related: 'Related VideoText workflows',
  },
}

export function getFamilySectionTitles(family: RouteFamily): FamilySectionTitles {
  return SECTION_TITLES[family] ?? SECTION_TITLES.generic
}

// ── Route → family detection ───────────────────────────────────────────────────

interface FamilyPattern {
  pattern: RegExp
  family: RouteFamily
  priority: number
}

const FAMILY_PATTERNS: FamilyPattern[] = [
  // Benchmark — highest specificity to avoid collision with transcription patterns
  {
    pattern: /\b(benchmark|accuracy[-_]test|speed[-_]test|transcription[-_]accuracy|fastest[-_]transcription|best[-_]transcription[-_]tool)\b/,
    family: 'benchmark',
    priority: 10,
  },
  // YouTube — specific URL token
  {
    pattern: /youtube/,
    family: 'youtube',
    priority: 9,
  },
  // Alternative / comparison
  {
    pattern: /\b(alternative|versus|vs[-_]|compare|comparison|best[-_]otter|best[-_]descript)\b/,
    family: 'alternative',
    priority: 8,
  },
  // Translation (before subtitle so translate-subtitles → translation, not subtitle)
  {
    pattern: /\b(translat|multilingual)\b/,
    family: 'translation',
    priority: 7,
  },
  // Subtitle / caption workflows (excluding translation)
  {
    pattern: /\b(subtitles?|captions?|srt|vtt|ass|ttml|burn[-_]subtitles?|fix[-_]subtitles?|auto[-_]subtitles?)\b/,
    family: 'subtitle',
    priority: 6,
  },
  // Formatting / style guide workflows
  {
    pattern: /\b(guideline|format|style[-_]guide|verbatim|rev[-_]|gotranscript|transcribeme|scribie)\b/,
    family: 'formatting',
    priority: 5,
  },
  // Transcription — broad catch for all recording-to-text workflows
  {
    pattern: /\b(transcripts?|transcri|audio[-_]to[-_]text|speech[-_]to[-_]text|meetings?|podcasts?|interviews?|zoom|google[-_]meet|teams[-_]meeting|webinars?|lectures?|video[-_]to[-_]text|voice[-_]to[-_]text)\b/,
    family: 'transcription',
    priority: 4,
  },
]

export function getRouteFamily(path: string): RouteFamily {
  const normalized = path.toLowerCase()
  let best: { family: RouteFamily; priority: number } = { family: 'generic', priority: -1 }
  for (const { pattern, family, priority } of FAMILY_PATTERNS) {
    if (priority > best.priority && pattern.test(normalized)) {
      best = { family, priority }
    }
  }
  return best.family
}

// ── Route-family CTA diversification engine ────────────────────────────────────

export type CtaWorkflowStage = 'hero' | 'proof' | 'workflow' | 'output' | 'comparison' | 'validation' | 'footer'
export type CtaIntent = 'converter' | 'generator' | 'cleanup' | 'switching' | 'validation' | 'repurposing' | 'accessibility'

export interface FamilyCta {
  text: string
  path: string
  family: RouteFamily
  stage: CtaWorkflowStage
  intent: CtaIntent
  score: number
}

interface CtaVariant {
  text: string
  path: string
  stages: CtaWorkflowStage[]
  intents: CtaIntent[]
  signals: string[]
}

const CTA_REGISTRY: Record<RouteFamily, CtaVariant[]> = {
  transcription: [
    { text: 'Transcribe a 2-hour recording in minutes', path: '/video-to-transcript', stages: ['hero', 'validation'], intents: ['converter', 'validation'], signals: ['speed', 'long-video'] },
    { text: 'Generate transcript, subtitles, summary, and chapters together', path: '/video-to-transcript', stages: ['hero', 'output'], intents: ['generator', 'repurposing'], signals: ['structured-output', 'workflow-replacement'] },
    { text: 'Upload a meeting recording for searchable notes', path: '/video-to-transcript?source=meeting-recording', stages: ['hero', 'workflow'], intents: ['converter'], signals: ['meeting', 'searchable'] },
    { text: 'Export speaker-labeled transcripts from one upload', path: '/video-to-transcript', stages: ['output', 'footer'], intents: ['generator'], signals: ['speaker-labels', 'export'] },
    { text: 'Turn long recordings into delivery-ready transcripts', path: '/video-to-transcript', stages: ['workflow', 'footer'], intents: ['cleanup'], signals: ['long-video', 'cleanup'] },
    { text: 'Skip manual transcript cleanup and formatting', path: '/video-to-transcript', stages: ['proof', 'workflow'], intents: ['cleanup'], signals: ['cleanup', 'formatting'] },
    { text: 'Convert interviews into structured transcripts', path: '/video-to-transcript?source=interview', stages: ['hero', 'workflow'], intents: ['converter'], signals: ['interview', 'structured-output'] },
    { text: 'Create searchable notes from every speaker turn', path: '/video-to-transcript', stages: ['proof', 'output'], intents: ['generator'], signals: ['speaker-labels', 'searchable'] },
  ],
  subtitle: [
    { text: 'Generate subtitles with readable line timing', path: '/video-to-subtitles', stages: ['hero', 'workflow'], intents: ['generator', 'accessibility'], signals: ['timing', 'accessibility'] },
    { text: 'Convert subtitles without breaking timestamps', path: '/video-to-subtitles', stages: ['workflow', 'output'], intents: ['converter'], signals: ['timestamps', 'export'] },
    { text: 'Burn captions directly into video', path: '/burn-subtitles', stages: ['hero', 'footer'], intents: ['generator'], signals: ['burned-captions', 'social'] },
    { text: 'Validate subtitle timing before export', path: '/fix-subtitles', stages: ['proof', 'validation'], intents: ['validation'], signals: ['timing', 'qa'] },
    { text: 'Fix subtitle reading-speed issues', path: '/fix-subtitles', stages: ['proof', 'workflow'], intents: ['cleanup', 'accessibility'], signals: ['reading-speed', 'qa'] },
    { text: 'Export captions for YouTube, TikTok, and Instagram', path: '/video-to-subtitles', stages: ['output', 'footer'], intents: ['repurposing'], signals: ['export', 'platforms'] },
    { text: 'Produce SRT and VTT from the same subtitle pass', path: '/video-to-subtitles', stages: ['output'], intents: ['generator'], signals: ['export', 'workflow-replacement'] },
  ],
  formatting: [
    { text: 'Format transcripts using Rev-style rules', path: '/guideline-format', stages: ['hero', 'workflow'], intents: ['cleanup'], signals: ['style-guide', 'qa'] },
    { text: 'Clean filler words before client delivery', path: '/guideline-format', stages: ['proof', 'workflow'], intents: ['cleanup'], signals: ['clean-verbatim', 'client-ready'] },
    { text: 'Apply speaker labels and timestamps consistently', path: '/guideline-format', stages: ['workflow', 'output'], intents: ['cleanup', 'generator'], signals: ['speaker-labels', 'timestamps'] },
    { text: 'Reduce transcript QA cleanup before handoff', path: '/guideline-format', stages: ['proof', 'validation'], intents: ['cleanup', 'validation'], signals: ['qa', 'handoff'] },
    { text: 'Generate client-ready transcript exports', path: '/guideline-format', stages: ['output', 'footer'], intents: ['generator'], signals: ['client-ready', 'export'] },
    { text: 'Fix inconsistent transcript formatting', path: '/guideline-format', stages: ['hero', 'footer'], intents: ['cleanup'], signals: ['formatting', 'qa'] },
  ],
  translation: [
    { text: 'Translate subtitles without breaking timing', path: '/translate-subtitles', stages: ['hero', 'workflow'], intents: ['converter'], signals: ['timing', 'translation'] },
    { text: 'Generate multilingual caption files', path: '/translate-subtitles', stages: ['hero', 'output'], intents: ['generator', 'accessibility'], signals: ['multilingual', 'export'] },
    { text: 'Preserve timestamps across translated subtitles', path: '/translate-subtitles', stages: ['proof', 'validation'], intents: ['validation'], signals: ['timestamps', 'structure'] },
    { text: 'Translate subtitle files while keeping formatting intact', path: '/translate-subtitles', stages: ['workflow'], intents: ['cleanup', 'converter'], signals: ['formatting', 'translation'] },
    { text: 'Convert transcripts into multilingual deliverables', path: '/translate-subtitles', stages: ['output', 'footer'], intents: ['converter'], signals: ['deliverables', 'multilingual'] },
  ],
  youtube: [
    { text: 'Paste a YouTube URL for an instant transcript', path: '/youtube-transcript-generator', stages: ['hero', 'workflow'], intents: ['converter'], signals: ['youtube', 'speed'] },
    { text: 'Turn YouTube videos into searchable text', path: '/youtube-transcript-generator', stages: ['hero', 'output'], intents: ['generator'], signals: ['searchable', 'repurposing'] },
    { text: 'Generate subtitles and chapters from YouTube videos', path: '/youtube-transcript-generator', stages: ['output', 'footer'], intents: ['repurposing'], signals: ['chapters', 'subtitles'] },
    { text: 'Repurpose long YouTube videos into content briefs', path: '/youtube-transcript-generator', stages: ['workflow', 'footer'], intents: ['repurposing'], signals: ['long-video', 'creator'] },
    { text: 'Extract transcript and summary from a YouTube link', path: '/youtube-transcript-generator', stages: ['proof', 'workflow'], intents: ['generator'], signals: ['summary', 'url'] },
  ],
  alternative: [
    { text: 'Compare transcript exports side by side', path: '/video-to-transcript', stages: ['hero', 'comparison'], intents: ['switching'], signals: ['comparison', 'export'] },
    { text: 'Test a faster transcription workflow', path: '/video-to-transcript', stages: ['hero', 'validation'], intents: ['switching', 'validation'], signals: ['speed', 'workflow-replacement'] },
    { text: 'See how VideoText handles long recordings', path: '/video-to-transcript', stages: ['proof', 'comparison'], intents: ['switching'], signals: ['long-video', 'comparison'] },
    { text: 'Compare subtitle workflows before switching', path: '/video-to-subtitles', stages: ['comparison', 'footer'], intents: ['switching'], signals: ['subtitles', 'comparison'] },
    { text: 'Try structured transcript outputs instead of raw text dumps', path: '/video-to-transcript', stages: ['output', 'footer'], intents: ['switching'], signals: ['structured-output', 'cleanup'] },
  ],
  benchmark: [
    { text: 'Run your own transcript speed test', path: '/video-to-transcript', stages: ['hero', 'validation'], intents: ['validation'], signals: ['speed', 'benchmark'] },
    { text: 'Upload a long recording to compare outputs', path: '/video-to-transcript', stages: ['hero', 'comparison'], intents: ['validation', 'switching'], signals: ['long-video', 'comparison'] },
    { text: 'Benchmark subtitle generation speed', path: '/video-to-subtitles', stages: ['validation'], intents: ['validation'], signals: ['subtitles', 'speed'] },
    { text: 'Compare cleanup time across workflows', path: '/video-to-transcript', stages: ['proof', 'comparison'], intents: ['validation'], signals: ['cleanup', 'comparison'] },
    { text: 'Test transcript formatting consistency', path: '/guideline-format', stages: ['output', 'footer'], intents: ['validation', 'cleanup'], signals: ['formatting', 'qa'] },
  ],
  generic: [
    { text: 'Choose the transcript, subtitle, or formatting workflow', path: '/site-index', stages: ['hero'], intents: ['converter'], signals: ['routing', 'workflow'] },
    { text: 'Route this job to the right VideoText tool', path: '/tools', stages: ['workflow', 'footer'], intents: ['converter'], signals: ['routing', 'workflow'] },
    { text: 'Move from raw media to export-ready text', path: '/video-to-transcript', stages: ['output'], intents: ['generator'], signals: ['export', 'workflow'] },
  ],
}

const CTA_TOKEN_WEIGHTS = ['transcript', 'subtitle', 'caption', 'timing', 'speaker', 'export', 'long', 'cleanup', 'format', 'translate', 'youtube', 'meeting', 'podcast', 'chapter', 'summary', 'benchmark']

function stableHash(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function tokenize(input: string): string[] {
  return input.toLowerCase().match(/[a-z0-9]+/g) || []
}

export function scoreCtaSemanticUniqueness(text: string, routePath = ''): number {
  const words = tokenize(text)
  if (!words.length) return 0
  const uniqueRatio = new Set(words).size / words.length
  const routeTokens = new Set(tokenize(routePath))
  const routeOverlap = words.filter((word) => routeTokens.has(word)).length / words.length
  const operationalSignals = CTA_TOKEN_WEIGHTS.filter((token) => text.toLowerCase().includes(token)).length
  const genericPenalty = /\b(start free|try now|get started|click here|sign up free|start your journey|ai-powered solution|transform your workflow)\b/i.test(text) ? 0.35 : 0
  return Math.max(0, Math.min(1, uniqueRatio * 0.45 + Math.min(operationalSignals / 4, 1) * 0.35 + Math.min(routeOverlap * 2, 0.2) - genericPenalty))
}


function routeLabel(routePath: string): string {
  const raw = routePath
    .replace(/^\//, '')
    .replace(/^(tools|blog)\//, '')
    .replace(/^how-to-/, '')
    .replace(/-(alternative|transcription|transcript|generator|tool|converter|online|guide|format)$/i, '')
    .replace(/-vs-videotext|videotext-vs-/i, '-')
    .replace(/\bfree\b/gi, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return (raw.replace(/\b\w/g, (char) => char.toUpperCase()) || 'this workflow')
    .replace(/\bYoutube\b/g, 'YouTube')
    .replace(/\bSrt\b/g, 'SRT')
    .replace(/\bVtt\b/g, 'VTT')
}

function specializeCtaText(family: RouteFamily, routePath: string, stage: CtaWorkflowStage, text: string): string {
  const label = routeLabel(routePath)
  const normalized = routePath.toLowerCase()
  if (family === 'alternative') {
    if (stage === 'comparison' || /vs|alternative|compare/.test(normalized)) return `Compare ${label} exports against structured VideoText output`
    if (stage === 'output' || stage === 'footer') return `Replace ${label} raw text dumps with structured exports`
    return `Test ${label} against a long-recording workflow`
  }
  if (family === 'subtitle' && /(srt|vtt|caption|subtitle|tools)/.test(normalized)) {
    if (stage === 'output' || stage === 'footer') return `Export ${label} captions without timestamp drift`
    return `Fix ${label} timing and reading-speed issues`
  }
  if (family === 'transcription' && /(meeting|podcast|interview|lecture|webinar|zoom|teams|google-meet|voice|audio)/.test(normalized)) {
    if (stage === 'workflow' || stage === 'footer') return `Turn ${label} recordings into structured transcripts`
    return `Process ${label} with speaker labels and timestamps`
  }
  if (family === 'formatting' && /(rev|gotranscript|style|format|guideline|verbatim)/.test(normalized)) {
    return `Apply ${label} formatting rules before delivery`
  }
  if (family === 'youtube' && /youtube/.test(normalized)) {
    return `Extract ${label} transcript, summary, and chapters`
  }
  return text
}

function inferCtaIntent(routePath: string, family: RouteFamily): CtaIntent {
  const normalized = routePath.toLowerCase()
  if (family === 'alternative' || /alternative|vs|versus|compare/.test(normalized)) return 'switching'
  if (family === 'benchmark' || /benchmark|accuracy|speed-test|fastest/.test(normalized)) return 'validation'
  if (/format|style|verbatim|cleanup|rev|gotranscript/.test(normalized)) return 'cleanup'
  if (/youtube|tiktok|instagram|creator|repurpose|chapter|summary/.test(normalized)) return 'repurposing'
  if (/caption|accessibility|subtitle/.test(normalized)) return 'accessibility'
  if (/generator|generate|summary|chapter/.test(normalized)) return 'generator'
  return 'converter'
}

export function getContextualCta(
  family: RouteFamily,
  routePath: string,
  stage: CtaWorkflowStage = 'hero',
  explicitIntent?: CtaIntent,
): FamilyCta {
  const variants = CTA_REGISTRY[family] || CTA_REGISTRY.generic
  const intent = explicitIntent || inferCtaIntent(routePath, family)
  const scored = variants.map((variant, index) => {
    const stageScore = variant.stages.includes(stage) ? 3 : variant.stages.includes('hero') ? 1 : 0
    const intentScore = variant.intents.includes(intent) ? 3 : 0
    const routeText = routePath.toLowerCase().replace(/[-_/]/g, ' ')
    const signalScore = variant.signals.reduce((sum, signal) => sum + (routeText.includes(signal.replace('-', ' ')) ? 1 : 0), 0)
    const uniqueness = scoreCtaSemanticUniqueness(variant.text, routePath)
    const rotation = (stableHash(`${routePath}:${stage}:${intent}`) + index) % variants.length
    return { variant, score: stageScore + intentScore + signalScore + uniqueness + rotation / 100 }
  })
  const selected = scored.sort((a, b) => b.score - a.score)[0].variant
  const text = specializeCtaText(family, routePath, stage, selected.text)
  return {
    text,
    path: selected.path,
    family,
    stage,
    intent,
    score: scoreCtaSemanticUniqueness(text, routePath),
  }
}

export function getFamilyPrimaryCta(family: RouteFamily, routePath = ''): FamilyCta {
  return getContextualCta(family, routePath || `/${family}`, 'hero')
}

export function getWorkflowStageCtas(family: RouteFamily, routePath: string): FamilyCta[] {
  const stages: CtaWorkflowStage[] = ['proof', 'workflow', 'output', 'footer']
  const seen = new Set<string>()
  return stages
    .map((stage) => getContextualCta(family, routePath, stage))
    .filter((cta) => {
      if (seen.has(cta.text)) return false
      seen.add(cta.text)
      return true
    })
}

export function shouldReplaceRegistryCta(text?: string): boolean {
  if (!text) return true
  return /\b(start free|try now|get started|sign up free|free|now|try videotext|generate free transcript|upload audio|start this workflow)\b/i.test(text)
}

// ── Family-specific fallback deep content ──────────────────────────────────────

export function buildFamilyDeepContent(
  family: RouteFamily,
  label: string,
  description: string,
): SeoDeepContent {
  const routeHint = `/${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  const footerCta = getContextualCta(family, routeHint, 'footer')
  switch (family) {
    case 'subtitle':
      return {
        proofPoints: [
          'Reading speed is the invisible subtitle constraint: 14–17 characters per second is the readable range for most viewers; anything above 21 CPS causes comprehension failure even when the transcript text is accurate. Most automated subtitle tools generate lines without CPS checks.',
          'Burned captions create a permanent workflow commitment — any timing correction or text fix after encoding requires re-encoding the full video. For long-form content this is hours of lost render time, which is why burn decisions need to happen after QA, not before.',
          'Platform subtitle requirements are not interchangeable: TikTok displays a 2-line maximum with specific font rendering; YouTube accepts up to 1,500 SRT blocks and requires UTF-8 encoding; Instagram Reels ignores soft subtitle tracks on autoplay entirely, making burned captions the only reliable option for Reels.',
        ],
        workflowSteps: [
          {
            title: '1. Generate subtitle file with word-level timestamps',
            detail: 'Upload the video or paste a public URL. Word-level timestamp alignment produces more accurate line breaks than sentence-level alignment — each subtitle break falls at a natural pause rather than a word boundary mid-phrase.',
          },
          {
            title: '2. Review CPS on every subtitle line',
            detail: 'Flag any line above 17 CPS and split it. An 8-word subtitle in a 1.2-second window hits approximately 24 CPS — unreadable for most viewers. Merge subtitle lines shorter than 0.8 seconds, which display too briefly to register.',
          },
          {
            title: '3. Check for timing overlap and minimum duration',
            detail: 'Subtitle overlap — where the next block starts before the previous one ends — causes display flicker in most players. Any gap shorter than 0.1 seconds between adjacent subtitles should be merged or widened to prevent rendering artifacts.',
          },
          {
            title: '4. Select platform-appropriate export format',
            detail: 'Export SRT for YouTube, Vimeo, and video editors. Export VTT for HTML5 web players and streaming platforms that support caption positioning. Choose burned-caption output for Instagram Reels, TikTok clips, and any social context where autoplay without sound is expected.',
          },
        ],
        outputExamples: [
          {
            title: 'SRT subtitle file',
            body: 'Standard timed subtitle format: sequence number, timestamp pair (00:00:00,000 → 00:00:00,000 with comma separator), and one or two lines of caption text per block. Supported by YouTube, Vimeo, LinkedIn, most video editors, and accessibility workflows.',
          },
          {
            title: 'VTT subtitle stream',
            body: 'WebVTT format with period timestamp separators (00:00:00.000 → 00:00:00.000). Used by HTML5 video players, streaming services, and accessibility platforms. Unlike SRT, VTT supports <cue> positioning metadata, text styling, and karaoke-mode highlighting.',
          },
          {
            title: 'Burned captions',
            body: 'Permanently embedded caption text rendered directly into the video frame — cannot be toggled off by the viewer. Required for platforms that strip external caption tracks. Font rendering, shadow depth, and vertical position all need QA review after encoding because video compression can degrade caption legibility.',
          },
        ],
        useCases: [
          {
            title: 'Video creators publishing to multiple platforms',
            body: 'Generate SRT for YouTube upload, export burned captions for Instagram Reels, and produce VTT for course platform embeds — all from the same subtitle pass without reformatting timing.',
          },
          {
            title: 'Accessibility compliance teams',
            body: 'Produce synchronized captions that meet WCAG 2.1 timing and reading-speed requirements. CPS validation catches lines that fail accessibility guidelines before the video goes live.',
          },
          {
            title: 'Post-production editors',
            body: 'Export SRT or VTT for import into Premiere, DaVinci Resolve, or Final Cut Pro. Accurate word-level timestamps eliminate the need to manually re-sync caption timing after import.',
          },
        ],
        visualProof: [
          {
            title: 'CPS violation — splitting required',
            body: 'Eight words spoken in 1.2 seconds: "we need to fix this before the deadline" at 24 CPS. The line must be split into two display segments within the same timing window to hit the readable 14–17 CPS range.',
          },
          {
            title: 'Subtitle timing overlap',
            body: 'Block ending at 00:01:23,500 overlapping a block starting at 00:01:23,200 causes display flicker and rendering failure in most SRT players. A subtitle validator catches this before upload.',
          },
          {
            title: 'Mobile frame crop',
            body: 'A two-line subtitle with 44+ characters per line at default font sizes clips at the bottom of mobile video frames. The safe area for mobile subtitles is a single line, 38 characters maximum, positioned at 85% vertical height.',
          },
          {
            title: 'Burned caption rendering after encode',
            body: 'Font stroke weight, drop shadow depth, and subtitle vertical position all shift slightly after H.264 encoding. Captions that look correct in preview may become harder to read in the encoded file — requires a post-encode QA pass before publishing.',
          },
        ],
        technicalExplanation: [
          {
            title: 'YouTube SRT requirements',
            body: 'UTF-8 encoding required. Maximum 1,500 subtitle blocks per file. Timestamp format: 00:00:00,000 (comma separator, not period). Files over 1,500 blocks need splitting before upload. YouTube auto-syncs uploaded SRT to audio — small timing offsets are corrected automatically.',
          },
          {
            title: 'TikTok caption behavior',
            body: 'TikTok generates its own auto-captions and displays them over uploaded SRT files in most cases. Burned captions are the reliable method for ensuring accurate captions appear on TikTok content. SRT upload works but TikTok may override it.',
          },
          {
            title: 'Instagram Reels caption handling',
            body: 'Instagram does not display soft subtitle tracks during autoplay in Feed or Reels. Burned captions are the only reliable method for ensuring captions appear for silent autoplay viewers. Instagram\'s built-in auto-caption feature can also be used after upload, but accuracy varies.',
          },
          {
            title: 'VTT vs SRT encoding difference',
            body: 'VTT uses period timestamp separators (00:00:00.000) while SRT uses commas (00:00:00,000). Swapping the separator character breaks parsing in most players. VTT files must begin with the WEBVTT header line — SRT files must not.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'formatting':
      return {
        proofPoints: [
          'The five most common transcript QA rejection triggers are: inconsistent speaker label format across the file, wrong verbatim level (clean applied where full was required), missing or incorrectly notated inaudible sections, timestamp placement errors, and paragraph length violations. A formatting pass that checks all five before delivery eliminates most revision cycles.',
          'Style guide conflicts between platforms create real operational confusion: Rev\'s rules for handling crosstalk differ from GoTranscript\'s, and a transcript formatted correctly for one platform fails QA on the other. Knowing which standard applies before formatting begins saves the rework.',
          'Speaker label drift — where the same speaker gets labeled "JOHN SMITH", "John", and "Speaker 1" in the same document — is the formatting error that takes the longest to correct manually and the most common reason agency QA reviewers send files back.',
        ],
        workflowSteps: [
          {
            title: '1. Select and configure the target style guide',
            detail: 'Choose Rev, GoTranscript, TranscribeMe, Scribie, or a custom client specification. Each guideline has distinct rules for verbatim level, speaker label format, timestamp intervals, inaudible notation, and maximum paragraph length.',
          },
          {
            title: '2. Set verbatim level explicitly',
            detail: 'Clean verbatim removes fillers, false starts, and repetitions for readability. Full verbatim preserves all spoken content. Applying the wrong level is the most common single reason transcripts fail marketplace QA — it cannot be fixed without re-reading the source audio.',
          },
          {
            title: '3. Normalize speaker labels throughout the file',
            detail: 'A single speaker must have exactly one label format from the first occurrence to the last. Mixed formats (JOHN SMITH / John / J. Smith) require a find-and-replace pass across the full document before any other formatting work.',
          },
          {
            title: '4. Apply timestamp rules and paragraph breaks',
            detail: 'Rev-style: timestamps every 2 minutes or at each speaker change. GoTranscript: no timestamp requirement by default. TranscribeMe: per-speaker-turn timestamps. Paragraph length limits range from 8 lines (Rev) to no limit (some custom clients).',
          },
          {
            title: '5. Run pre-delivery QA check',
            detail: 'Verify inaudible notation consistency (all [inaudible] or all [INAUDIBLE], never mixed), check bracket format for crosstalk sections, confirm verbatim level is consistent throughout, and validate that paragraph length does not exceed the client\'s maximum.',
          },
        ],
        outputExamples: [
          {
            title: 'Rev-style formatted transcript',
            body: 'Clean verbatim text. Speaker names in CAPITAL LETTERS followed by a colon. Timestamps in [HH:MM:SS] format at 2-minute intervals and at speaker changes. No paragraph longer than 8 lines. Inaudible sections marked [inaudible]. False starts and fillers removed.',
          },
          {
            title: 'GoTranscript QA-ready file',
            body: 'Optional full or clean verbatim per client request. Speaker labels in "Speaker Name:" format with consistent capitalization. [inaudible] notation for unclear audio. No timestamp requirement unless client specifies. Paragraph breaks at topic shifts rather than fixed intervals.',
          },
          {
            title: 'Client-ready DOCX handoff',
            body: 'Structured document with consistent heading-style speaker labels, paragraph breaks, correctly formatted timestamps, and clean or full verbatim as specified. Formatted for direct delivery — no manual cleanup required before attaching to the client email.',
          },
        ],
        useCases: [
          {
            title: 'Freelance transcriptionists',
            body: 'Reduce revision risk before submitting marketplace jobs. A pre-delivery formatting check catches the label inconsistency, timestamp format error, or verbatim level mismatch that triggers a QA rejection and unpaid revision.',
          },
          {
            title: 'Agency QA leads and editors',
            body: 'Create a consistent formatting baseline across a team of transcriptionists working on the same client account — so reviewers spend time on content accuracy, not fixing label formats.',
          },
          {
            title: 'Researchers and journalists',
            body: 'Turn raw AI-generated transcripts into readable interview documents: speaker structure, consistent punctuation, accurate paragraph breaks, and timestamps that let readers verify context in the source recording.',
          },
        ],
        visualProof: [
          {
            title: 'Speaker label drift example',
            body: 'Page 1: "JOHN SMITH: Thanks for joining us." Page 3: "John: So as I was saying..." Page 7: "Speaker 1: Right, exactly." — All three refer to the same speaker. Label drift of this kind fails QA at every major transcript marketplace.',
          },
          {
            title: 'Timestamp format inconsistency',
            body: '[00:05:12] on page 2, (00:05:12) on page 4, [5:12] on page 6, and 00:05:12 on page 8 — all in the same document. Most style guides require a single format, and inconsistency triggers automatic rejection on automated QA systems.',
          },
          {
            title: 'Inaudible notation mismatch',
            body: '"[inaudible]", "[INAUDIBLE]", "[unclear]", and "[crosstalk]" appearing in the same file for the same type of audio problem. Rev requires "[inaudible]" in lowercase brackets. GoTranscript uses a different notation. Neither accepts a mix of styles.',
          },
          {
            title: 'Verbatim level inconsistency',
            body: 'Pages 1–4 are clean verbatim (fillers removed). Pages 5–8 switch to full verbatim (fillers preserved). This happens when an ASR tool applies different post-processing across transcript segments — and it fails QA because the verbatim level is supposed to be consistent throughout.',
          },
        ],
        technicalExplanation: [
          {
            title: 'Rev style guide rules',
            body: 'Clean verbatim by default. Speaker names in ALL CAPS followed by a colon. Timestamp format [HH:MM:SS] every 2 minutes and at speaker changes. Maximum paragraph: 8 lines. Inaudible: [inaudible]. Crosstalk: [crosstalk]. False starts and filler words removed.',
          },
          {
            title: 'GoTranscript style guide rules',
            body: 'Clean or full verbatim per client request. Speaker format "Speaker Name:" with title case. [inaudible] for unclear audio. No timestamp requirement by default (client can request). No strict paragraph length limit. Crosstalk marked with [crosstalk].',
          },
          {
            title: 'TranscribeMe style guide rules',
            body: 'Strict verbatim — all fillers and false starts preserved. Timestamps required at each speaker turn. Speaker format "SPEAKER NAME:" in caps. Specific bracket format for technical notation. Paragraph breaks only at speaker changes.',
          },
          {
            title: 'Custom client formatting conflicts',
            body: 'Many agencies specify hybrid rules that don\'t map cleanly to any standard guide — for example, Rev-style speaker labels but GoTranscript-style verbatim and no timestamps. These combinations must be documented explicitly because the formatter cannot infer them.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'translation':
      return {
        proofPoints: [
          'Subtitle translation breaks timing when translators merge or split segments to fit translated text. A translated subtitle that begins 0.3 seconds earlier than the source or ends 0.5 seconds later — because the translator restructured segments — causes desynchronization that propagates through the entire file from that point forward.',
          'Language expansion rates are predictable and must be accounted for before translation begins: German runs 25–30% longer than English, French 20–25%, Spanish 15–20%, Arabic 20–25%. Subtitle lines already near the CPS limit before translation will overflow the timing window after — requiring line restructuring within the original timestamp boundaries, not new timestamps.',
          'Right-to-left languages introduce a rendering dependency on the target video player. Arabic and Hebrew subtitle text may display left-to-right in HTML5 players that lack explicit RTL support, even when the SRT file is correctly encoded — requiring post-translation testing in the actual target player before delivery.',
        ],
        workflowSteps: [
          {
            title: '1. Upload the source subtitle file',
            detail: 'Start from an existing SRT or VTT file. The source timestamps become locked translation boundaries — translated text must fit within each segment\'s timing window without extending start or end times.',
          },
          {
            title: '2. Assess expansion risk before translating',
            detail: 'For German, French, Spanish, Arabic, and other expansion languages, identify source lines already near 17 CPS. These will overflow after translation and need pre-translation line splitting to create capacity for the expanded text.',
          },
          {
            title: '3. Translate with timing boundary preservation',
            detail: 'Each subtitle segment is translated independently. The translated text must fit within the original segment\'s duration — merging two segments to fit translated text shifts all subsequent timestamps.',
          },
          {
            title: '4. Restructure expanded lines within timing windows',
            detail: 'Where translated text runs longer than the original, split the translated text across two display lines within the same timing window. Do not move timestamp boundaries. Maximum 2 lines per subtitle block on most platforms.',
          },
          {
            title: '5. Validate and export as separate language track',
            detail: 'Check CPS on translated lines, verify no timestamp boundaries have shifted relative to the source file, and export as a separate SRT or VTT. Upload as a distinct language track on YouTube or Vimeo — not as a replacement for the source track.',
          },
        ],
        outputExamples: [
          {
            title: 'Translated SRT with source timestamps intact',
            body: 'Each subtitle block retains the original start and end timestamps from the source file. Only the text content changes. Timestamps that have shifted relative to the source indicate segment merging — a translation error that requires correction.',
          },
          {
            title: 'Bilingual review file',
            body: 'Source and translated text presented side by side for dubbing review, localization QA, or language learning content. Reviewers can verify translation accuracy and check that meaning is preserved within each timing window.',
          },
          {
            title: 'Translated transcript document',
            body: 'Full transcript text in the target language with speaker labels and timestamp structure preserved. Speaker turn formatting and paragraph structure carry through the translation, making the translated document usable for review, delivery, or subtitle back-conversion.',
          },
        ],
        useCases: [
          {
            title: 'International content distribution teams',
            body: 'Localize subtitle files for regional video distribution. Translated SRT files upload as separate language tracks on YouTube, Vimeo, and course platforms — preserving the source track alongside the localized version.',
          },
          {
            title: 'Online course creators',
            body: 'Add translated captions to training content for international learners. Language expansion in German, French, and Spanish courses is handled at the segment level rather than requiring a full subtitle retime for each language.',
          },
          {
            title: 'Journalists and documentary researchers',
            body: 'Translate interview transcripts into a working language for editorial review while keeping speaker labels, paragraph structure, and source timestamps intact for fact-checking against the original recording.',
          },
        ],
        visualProof: [
          {
            title: 'German subtitle expansion overflow',
            body: '"Loading..." (9 chars, 0.8s) → "Wird geladen..." (15 chars, 0.8s): a 67% character expansion that exceeds the timing window. The translated line must be accepted as-is (fast CPS) or the source segment must be split before translation to create capacity.',
          },
          {
            title: 'Arabic RTL rendering failure',
            body: 'Arabic subtitle text encoded correctly in SRT displays left-to-right in HTML5 players without explicit dir="rtl" attribute. The text reads backwards visually even though the file is technically correct. Requires testing in the actual target player before delivery.',
          },
          {
            title: 'Segment merge timing shift',
            body: 'Translator combines three short English segments (1.2s + 0.9s + 1.1s) into one Spanish sentence. The merged segment now runs 3.2 seconds and shifts all subsequent timestamps by approximately 0.3 seconds. This timing drift grows progressively through the rest of the file.',
          },
          {
            title: 'Japanese character density reversal',
            body: 'Japanese conveys the same meaning in 30–40% fewer characters than English. A 2-line English subtitle with 68 characters translates to a single short Japanese line — creating timing windows with large gaps of visible subtitle text that read as incomplete.',
          },
        ],
        technicalExplanation: [
          {
            title: 'CPS review for expansion languages',
            body: 'Any source subtitle line above 14 CPS should be split before translating to German, French, Spanish, or Arabic. Post-translation CPS for expanded languages should be recalculated against the original timing window duration — not recalculated after segment boundary changes.',
          },
          {
            title: 'RTL subtitle handling',
            body: 'Arabic and Hebrew SRT files require UTF-8 encoding without BOM for most players. VTT files should include lang attributes. Always test RTL subtitles in the specific target player before delivery — rendering behavior varies significantly between players.',
          },
          {
            title: 'Multi-language YouTube upload',
            body: 'Translated SRT files upload as separate language tracks in YouTube Studio under Subtitles → Add language. Each language requires a separate upload. YouTube displays the viewer\'s browser-language track by default. Source and translated tracks coexist independently.',
          },
          {
            title: 'CJK character count limits',
            body: 'Japanese, Chinese, and Korean subtitles use full-width characters that render twice as wide as Latin characters in most subtitle renderers. Maximum characters-per-line for CJK scripts is approximately 16–20, versus 38–42 for Latin-script languages.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'alternative':
      return {
        proofPoints: [
          'The operational difference between VideoText and most alternatives is output breadth from a single upload: most tools produce transcript text only; VideoText produces transcript + SRT/VTT subtitle files + AI summary + chapter markers + JSON from the same job. Replacing a two- or three-tool workflow with one upload reduces the friction points where errors are introduced.',
          'File length limits create hidden workflow friction that only surfaces on real jobs. Otter.ai caps recordings at 4 hours per file with paid plans; Temi imposes file-size limits; some tools require manual file splitting for anything over 30 or 60 minutes. Each split introduces a boundary where context, speaker labels, and timestamps must be manually reconnected.',
          'Review handoff is where most transcript workflows lose time between tools. Exporting a document, emailing it, receiving edits, and re-importing is the standard cycle — and it happens outside the tool that generated the transcript, which means no version tracking. Shareable review links keep the review cycle inside the same system that generated the output.',
        ],
        workflowSteps: [
          {
            title: '1. Identify the specific failure point in your current workflow',
            detail: 'Map where the alternative creates friction: file-length cap requiring splitting, export format restricted to TXT or DOCX only, no subtitle file generation, no chapter output, slow processing, or no shareable review mechanism.',
          },
          {
            title: '2. Test with a recording you have already transcribed',
            detail: 'Upload the same file to VideoText that you last transcribed with your current tool. Use identical settings. Compare the raw output — formatting structure, speaker label accuracy, timestamp precision — before any editing.',
          },
          {
            title: '3. Count cleanup steps in each output',
            detail: 'How many speaker label corrections, timestamp format fixes, paragraph restructures, and filler-word passes does each transcript require before it is delivery-ready? The tool with the lower cleanup count has lower operational cost, regardless of the stated accuracy percentage.',
          },
          {
            title: '4. Compare the full output set, not just the transcript',
            detail: 'Does the alternative generate subtitle files? Chapter markers? A summary? JSON export? If generating those outputs requires additional tools, add the time and cost of those tools to the comparison before concluding which workflow is faster.',
          },
        ],
        outputExamples: [
          {
            title: 'Side-by-side transcript quality comparison',
            body: 'Same 60-minute interview processed by both tools. Compare speaker label accuracy, punctuation consistency, paragraph structure, and the number of correction passes required to reach delivery quality.',
          },
          {
            title: 'Subtitle output availability',
            body: 'Does the alternative generate SRT or VTT at all, or does reaching a subtitle file require a separate captioning tool? If the alternative produces transcript text only, add the time cost of the captioning step to the workflow comparison.',
          },
          {
            title: 'Long-recording handling test',
            body: 'Test with a 90-minute recording. Does the alternative require splitting into multiple files? If so, how much time does reconnecting the output take? Does the final stitched transcript have coherent speaker labels and timestamps across the boundary?',
          },
        ],
        useCases: [
          {
            title: 'Teams hitting file-length limits',
            body: 'Switch to VideoText when your current tool caps recordings at 30 or 60 minutes and requires manual file splitting for longer interviews, webinars, and podcast recordings.',
          },
          {
            title: 'Creators running separate transcription and captioning tools',
            body: 'Replace a two-tool workflow with a single upload that outputs transcript text, SRT/VTT, chapter markers, and a summary in the same pass — reducing the file management overhead between separate tools.',
          },
          {
            title: 'Agencies evaluating export flexibility for client delivery',
            body: 'Evaluate VideoText when clients require DOCX for transcript review, SRT for platform upload, PDF for archiving, and JSON for CMS integration — outputs that typically require separate tools in most alternative workflows.',
          },
        ],
        visualProof: [
          {
            title: 'File splitting friction on 90-minute recordings',
            body: 'A 90-minute interview processed by a 30-minute-cap tool requires 3 separate uploads, 3 separate transcript downloads, manual boundary stitching, and speaker label reconciliation across 3 independent outputs — before any editing begins.',
          },
          {
            title: 'Missing subtitle output requires a third tool',
            body: 'Alternative generates a clean transcript. Subtitle file requires a separate captioning tool import. That captioning tool re-transcribes from audio (losing the transcript corrections already made) or requires manual SRT authoring. Two tools, two workflows, two potential sources of timing error.',
          },
          {
            title: 'Privacy: recordings retained in project library',
            body: 'Some alternatives store uploaded recordings in a project library accessible to workspace members. If a recording contains client confidential content, a sensitive interview, or HIPAA-adjacent material, retention behavior becomes a compliance decision — not just a workflow preference.',
          },
          {
            title: 'No chapter generation means manual timestamp entry',
            body: 'To add chapters to a YouTube description, the creator must manually watch the video and note timestamps. A transcript-based chapter generation workflow replaces that process with auto-detected topic transitions — eliminating the most time-consuming part of long-video publishing.',
          },
        ],
        technicalExplanation: [
          {
            title: 'Export format comparison',
            body: 'Otter.ai: DOCX, PDF, TXT, SRT (paid). Temi: DOCX, TXT. Descript: project-format export; SRT via subtitle track. Notta: DOCX, TXT, SRT. VideoText: DOCX, PDF, TXT, SRT, VTT, JSON, structured summary, chapter markers — all from one upload.',
          },
          {
            title: 'File length and size caps',
            body: 'Otter.ai: 4-hour limit per recording on paid plans, 40-minute on free. Temi: file-size-based limits. Descript: project-based storage cap. Notta: plan-based minute limits. VideoText: plan-based minute limits with no per-file splitting requirement.',
          },
          {
            title: 'Collaboration mechanisms',
            body: 'Descript: full video editor with team collaboration and version history. Otter.ai: shared workspace with comment threads. Temi: download-and-email only. VideoText: shareable review links for non-account collaborators, no additional seat cost for reviewers.',
          },
          {
            title: 'Privacy and data handling',
            body: 'Otter.ai: recordings stored in project library, shareable within workspace. Descript: recordings retained in project archive. VideoText: uploaded files deleted after processing; no permanent recording storage on VideoText servers by default.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'benchmark':
      return {
        proofPoints: [
          'Word Error Rate measures how many words in the transcript differ from the ground truth — but it does not measure which errors matter. A transcript with 7% WER that misattributes 40% of speaker turns requires more editing than a 10% WER transcript where all speaker labels are correct. WER is a useful starting point, not an operational conclusion.',
          'Benchmark audio diversity is the most commonly gamed variable in transcription accuracy claims. Testing only studio-quality clear speech (SNR above 30dB) overstates real-world accuracy by 8–15% for typical meeting, interview, and podcast content recorded with consumer-grade microphones in office environments.',
          'Cleanup time — the number of minutes a human editor spends bringing a raw AI transcript to delivery-ready quality — is the operationally relevant metric that most transcription vendors do not publish. A tool with 94% WER that produces poorly structured output may require more editing time than an 89% WER tool that outputs clean paragraph structure with accurate speaker labels.',
        ],
        workflowSteps: [
          {
            title: '1. Define a representative test corpus',
            detail: 'Select recordings that represent real workflow conditions: clear speech, multi-speaker with 3+ participants, recordings with background noise (HVAC, crowd, traffic), technical vocabulary, non-native accents, and fast speech above 175 WPM.',
          },
          {
            title: '2. Create verified ground truth transcripts',
            detail: 'Have two independent transcriptionists produce ground-truth text for each test recording. Resolve disagreements through arbitration. Ground truth quality determines benchmark reliability — a flawed reference transcript produces meaningless WER numbers.',
          },
          {
            title: '3. Process identical files across all tools under test',
            detail: 'Upload the same recordings to each tool without pre-processing. Record wall-clock processing time from upload completion to transcript available. Use default settings unless the specific goal is to benchmark custom configurations.',
          },
          {
            title: '4. Score raw output and measure cleanup time',
            detail: 'Calculate WER and speaker attribution accuracy from raw output before any editing. Then time how long a single editor takes to bring each raw transcript to delivery-ready quality — same editor, same criteria, measured independently for each tool output.',
          },
        ],
        outputExamples: [
          {
            title: 'WER by audio condition',
            body: 'Accuracy measured separately for clear speech, moderate noise (SNR 15–25dB), and heavy noise (SNR below 15dB). Results broken out by content type: interview, meeting, podcast, lecture, technical presentation — each has meaningfully different baseline accuracy.',
          },
          {
            title: 'Processing speed by recording duration',
            body: 'Wall-clock time from upload completion to transcript ready, measured at 30, 60, and 120 minutes of source audio. Processing time is measured without upload duration — network speed is not a benchmark variable for the transcription engine itself.',
          },
          {
            title: 'Cleanup time per hour of audio',
            body: 'Minutes of human editing time required to bring raw transcript to delivery quality, measured per hour of source audio. This metric captures the total operational cost better than WER alone, since a 92% accurate but unstructured transcript may require more editing than an 88% accurate but well-labeled one.',
          },
        ],
        useCases: [
          {
            title: 'Procurement teams evaluating transcription services',
            body: 'Use benchmark data across multiple audio conditions — not just the vendor\'s best-case scenario — before committing to a paid plan or enterprise contract. Test with your actual content type.',
          },
          {
            title: 'Agencies comparing output quality before switching providers',
            body: 'Run the same recordings you process weekly through each tool under consideration. Measure cleanup time, not just WER — it is the cost that your editors pay on every job.',
          },
          {
            title: 'Researchers comparing ASR systems',
            body: 'Run controlled accuracy tests across multiple providers using a standardized test set with verified ground truth. Document audio conditions precisely — SNR level, speaker count, language, and content type — so results are reproducible.',
          },
        ],
        visualProof: [
          {
            title: 'Audio condition effect on accuracy',
            body: 'Clear studio speech (SNR >30dB): WER typically 3–6%. Office recording with HVAC noise (SNR 20–25dB): WER typically 8–14%. Meeting room with multiple speakers sharing a single microphone (SNR <15dB): WER typically 15–25%. Vendor-published accuracy numbers rarely specify which condition they measured.',
          },
          {
            title: 'Long-file accuracy degradation',
            body: 'Some transcription models degrade in quality after 30–60 minutes of continuous audio — topic drift, speaker fatigue in the audio signal, and model context limits all contribute. A benchmark that only tests 10-minute clips does not reveal this degradation.',
          },
          {
            title: 'Fast speech accuracy cliff',
            body: 'Most ASR models maintain accuracy up to approximately 160–170 WPM. Above 175 WPM — common in panel discussions, auction recordings, and some podcast styles — accuracy drops sharply. A benchmark that does not include fast-speech samples misses a common real-world failure mode.',
          },
          {
            title: 'Speaker attribution errors vs word errors',
            body: 'WER counts incorrect words but does not penalize for speaker misattribution separately. A transcript that is 93% accurate on individual words but assigns 30% of dialogue to the wrong speaker will fail completely for any workflow that depends on knowing who said what.',
          },
        ],
        technicalExplanation: [
          {
            title: 'WER calculation methodology',
            body: 'WER = (Substitutions + Deletions + Insertions) / Total Reference Words. Calculated case-insensitively. Punctuation errors typically excluded. A 5% WER means 5 errors per 100 reference words — which for a 10,000-word transcript produces approximately 500 errors requiring correction.',
          },
          {
            title: 'Audio condition definitions',
            body: 'Clear speech: single speaker, SNR above 30dB, minimal reverberation. Moderate noise: 2–4 speakers, SNR 15–25dB, background hum or traffic. Challenging: 4+ speakers on shared microphone, SNR below 15dB, overlapping speech and background noise.',
          },
          {
            title: 'Ground truth verification process',
            body: 'Transcriptionist A produces ground truth. Transcriptionist B independently reviews and marks disagreements. Arbitration resolves disagreements using the source audio as the authoritative reference. Ground truth files are locked before any tool testing begins.',
          },
          {
            title: 'Speaker attribution scoring',
            body: 'Measured separately from WER. Speaker attribution error rate = percentage of words assigned to the incorrect speaker label in the benchmark output. A separate metric from word accuracy because speaker label errors are categorically different from transcription word errors.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'youtube':
      return {
        proofPoints: [
          "YouTube auto-captions are generated for accessibility display — they contain no paragraph structure, no speaker differentiation, no chapter awareness, and no timestamps granular enough to support repurposing. A 60-minute podcast auto-caption dump requires 40–50 minutes of manual cleanup to become a usable transcript — almost as long as producing one from scratch.",
          'Long-form YouTube content — tutorials, interviews, conference talks, course lectures — contains navigable structure that auto-captions do not expose: topic transitions, speaker exchanges, chapter boundaries. A structured transcript with timestamps and auto-detected chapters makes that structure accessible without rewatching.',
          'Creator repurposing workflows fail on raw auto-captions because they require structured input. Turning a 90-minute podcast into a blog post, newsletter section, and social caption set requires a transcript with paragraph breaks, speaker attribution, and timestamp-linked chapter markers — none of which auto-captions provide.',
        ],
        workflowSteps: [
          {
            title: '1. Paste the YouTube URL — no download required',
            detail: 'Copy any public YouTube URL and paste it directly. VideoText streams the audio from YouTube without requiring a file download. Age-restricted videos require an optional cookie export from your logged-in browser session.',
          },
          {
            title: '2. Generate structured transcript with chapters and summary',
            detail: 'VideoText produces a full time-coded transcript with paragraph structure, speaker labels for interview-format content, auto-detected chapter markers, and a structured summary — not a flat auto-caption dump.',
          },
          {
            title: '3. Review speaker labels and adjust chapter boundaries',
            detail: 'For interview-format videos, verify speaker label assignments and rename them from "Speaker 1" / "Speaker 2" to actual names. Chapter markers can be adjusted if the auto-detected boundaries don\'t match natural topic transitions.',
          },
          {
            title: '4. Export for the target repurposing workflow',
            detail: 'Copy transcript as plain text for blog drafting. Export SRT to YouTube Studio to replace auto-captions. Paste chapter timestamps into the YouTube description. Share the summary with editors and writers as a content brief.',
          },
        ],
        outputExamples: [
          {
            title: 'Structured transcript with timestamps',
            body: 'Full text with paragraph breaks, speaker labels for interview format, and clickable timestamps. Each paragraph links to its position in the video — searchable by topic, quote, or speaker moment. Suitable for blog conversion, show notes, and editorial search.',
          },
          {
            title: 'Auto-generated chapter markers',
            body: 'Chapter timestamps detected from topic transitions in the transcript. Format is paste-ready for YouTube video descriptions: "00:00 Introduction / 04:30 Main topic / 18:45 Q&A" — YouTube auto-links these to video navigation when pasted into the description.',
          },
          {
            title: 'SRT file for YouTube Studio re-upload',
            body: 'Properly formatted SRT that replaces YouTube\'s auto-captions with the VideoText-processed version. Upload in YouTube Studio → Subtitles → Upload file. The improved captions go live without re-processing the video. For multi-language audiences, upload translated SRT files as separate language tracks.',
          },
        ],
        useCases: [
          {
            title: 'Podcast creators publishing to YouTube',
            body: 'Turn long-form episodes into show notes, blog drafts, newsletter summaries, and timestamped chapter lists. One transcript pass replaces manual note-taking, chapter timing, and caption correction for each episode.',
          },
          {
            title: 'Researchers and journalists',
            body: 'Search YouTube interviews, lectures, and conference talks for exact quotes and speaker timestamps without replaying full videos. Structured transcripts are searchable by keyword — auto-captions are not.',
          },
          {
            title: 'Course and tutorial creators',
            body: 'Extract transcripts from recorded lectures to create searchable study materials, accurate subtitle files for international learners, and structured course outlines organized by video chapter.',
          },
        ],
        visualProof: [
          {
            title: 'Auto-caption cleanup overhead',
            body: '60-minute interview auto-captions arrive as a continuous text block with no speaker attribution, no paragraph breaks, and accuracy problems at every speaker transition. Editing to a usable transcript requires reading along with the video — approximately 45–50 minutes for a skilled editor.',
          },
          {
            title: 'Missing speaker labels in interview format',
            body: 'YouTube auto-captions merge host and guest dialogue into a continuous stream with no speaker differentiation. For a 90-minute interview podcast, that means manually identifying and labeling approximately 200–400 speaker turns from the audio.',
          },
          {
            title: 'YouTube Shorts subtitle constraints',
            body: 'Vertical 9:16 Shorts format has a narrower subtitle safe zone than landscape video. Auto-captions in Shorts often exceed the visible width on mobile, clipping at the edge. A custom SRT file with shorter line lengths solves this — but requires re-upload through YouTube Studio.',
          },
          {
            title: 'Chapter description format requirements',
            body: 'YouTube chapter auto-linking requires: timestamps starting at 00:00, at least 3 chapters, and no special characters in chapter titles. Auto-generated chapter markers from VideoText are formatted to meet these requirements without manual adjustment.',
          },
        ],
        technicalExplanation: [
          {
            title: 'SRT re-upload requirements for YouTube',
            body: 'UTF-8 encoding (no BOM). Timestamp format: 00:00:00,000 → 00:00:00,000 (comma separator). Maximum 1,500 subtitle blocks per file — longer videos need split SRT files. YouTube auto-syncs uploaded captions to audio, correcting small timing offsets automatically.',
          },
          {
            title: 'YouTube chapter format in descriptions',
            body: 'Chapters activate automatically when a YouTube description contains timestamps in HH:MM:SS or MM:SS format. The first timestamp must be 00:00. Minimum 3 chapters required. Timestamps must be in ascending order. Chapter titles cannot contain special characters or emoji.',
          },
          {
            title: 'Age-restricted and unlisted video handling',
            body: 'Public videos work with direct URL paste. Age-restricted videos require browser cookie export from a logged-in YouTube session. Unlisted videos are accessible if you have the URL. Private videos cannot be processed — VideoText requires public audio access.',
          },
          {
            title: 'Multi-language track setup',
            body: 'Upload the English SRT to YouTube Studio first. Then upload translated SRT files as separate language tracks under Subtitles → Add language. YouTube displays the viewer\'s browser language preference by default. Each language is a separate upload — there is no single bilingual SRT track.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'transcription':
      return {
        proofPoints: [
          'Long-recording cleanup is where transcription workflows lose the most time. The raw transcript is not the final deliverable — it requires speaker label review, verbatim level normalization, paragraph restructuring, timestamp formatting, and at least one QA pass before it is client-ready. For a 2-hour recording, cleanup alone often takes 45–90 minutes regardless of how accurate the initial transcription was.',
          'Speaker diarization accuracy degrades in predictable conditions: three or more speakers on the same microphone, overlapping speech segments longer than 2 seconds, variable distances between speakers and the microphone, and similar-sounding voices. In these cases, speaker labels require manual review and correction — the raw diarization output is a starting point, not a reliable attribution.',
          `${label} generates transcript text, SRT/VTT subtitle files, an AI summary, and chapter markers from a single upload — eliminating the workflow where separate tools are required for transcription, captioning, summarization, and chapter creation. Each of those tools is a handoff point where formatting is lost and context must be re-established.`,
        ],
        workflowSteps: [
          {
            title: '1. Configure before processing',
            detail: 'Set spoken language explicitly — auto-detect is less accurate, particularly for accented English and mixed-language recordings. Set speaker count if known. Select verbatim level (clean or full) based on what the client or platform requires. Wrong verbatim level is the most common reason transcripts fail QA.',
          },
          {
            title: '2. Process the recording and monitor for segment artifacts',
            detail: 'For recordings over 30 minutes, check for chunking artifacts at segment boundaries — orphaned words at the end of one chunk and duplicated content at the start of the next. These occur when audio segmentation splits at an ambiguous speech boundary.',
          },
          {
            title: '3. Review and rename speaker labels',
            detail: 'Replace "Speaker 1" / "Speaker 2" labels with actual names before running any formatting pass. Speaker label changes must propagate consistently from first occurrence to last — any inconsistency requires another find-and-replace pass later.',
          },
          {
            title: '4. Apply style-guide formatting',
            detail: 'If delivering to a client with a specific style guide (Rev, GoTranscript, TranscribeMe, or custom), apply timestamp formatting, paragraph length rules, and inaudible notation conventions at this stage — before exporting, not after.',
          },
          {
            title: '5. Export in the required delivery format',
            detail: 'DOCX for client review and tracked-changes editing. PDF for locked delivery. TXT for plain-text integrations. SRT/VTT for caption workflows. JSON for search indexing or CMS integration. Each format has different timestamp and structure behaviors.',
          },
        ],
        outputExamples: [
          {
            title: 'Structured transcript with speaker labels',
            body: 'Full time-coded transcript with consistent speaker diarization labels, paragraph breaks at topic transitions, and timestamps formatted per the target style guide. Suitable for DOCX delivery, editorial review, or agency handoff.',
          },
          {
            title: 'SRT and VTT subtitle files from same pass',
            body: 'Subtitle files generated from the same transcription job, so timing alignment between transcript text and caption files is guaranteed. No separate captioning tool required, no risk of timing drift between transcript and subtitle outputs.',
          },
          {
            title: 'AI summary and chapter markers',
            body: 'Structured summary and auto-detected chapter timestamps for long-form content. Chapters are formatted for paste-ready YouTube description insertion. Summary is formatted as a structured brief suitable for show notes, team handoffs, or newsletter conversion.',
          },
        ],
        useCases: [
          {
            title: 'Teams transcribing meetings and calls',
            body: 'Turn Zoom, Google Meet, and Teams recordings into searchable, shareable meeting notes with speaker labels and timestamped action items — without replaying the recording to write notes manually.',
          },
          {
            title: 'Podcast producers and video creators',
            body: 'Convert long episodes into transcripts, show notes, chapter markers, and subtitle files for YouTube accessibility. One upload replaces separate transcription, captioning, summarization, and chapter-entry tools.',
          },
          {
            title: 'Qualitative researchers and interviewers',
            body: 'Extract speaker-labeled transcripts from long interviews and focus groups for thematic coding, quotation extraction, and client delivery — without manual transcription or re-reviewing hours of recordings.',
          },
        ],
        visualProof: [
          {
            title: 'Cross-talk attribution errors',
            body: 'When two speakers overlap for more than 2 seconds, diarization models frequently misattribute the trailing portion of the overlap to the wrong speaker. In interview transcripts, this produces a block of content assigned to the guest that should belong to the host — or vice versa. Manual review is required to correct this.',
          },
          {
            title: 'Audio quality degradation mid-recording',
            body: 'Zoom recordings with network instability produce audio dropout gaps — typically 0.5–3 seconds of silence or garbled audio. Transcription of these sections produces either a gap in the text or a run of plausible-sounding but incorrect words. Sections with network dropout require manual review against the audio.',
          },
          {
            title: 'Long-file segment boundary artifacts',
            body: 'Transcription engines that split audio into 30-minute chunks for processing introduce artifacts at chunk boundaries: the last sentence of chunk 1 and the first sentence of chunk 2 may both contain the same words, or a sentence may be split at an unnatural word boundary. Reviewing segment transitions is part of long-file QA.',
          },
          {
            title: 'Technical vocabulary misrecognition',
            body: 'Medical, legal, financial, and engineering terminology is consistently misrecognized by general-purpose ASR models. "Tachycardia" becomes "taxi cardia." "EBITDA" becomes "e bit duh." These require a domain-specific post-edit pass — a transcript correction process that benefits from knowing the technical vocabulary in advance.',
          },
        ],
        technicalExplanation: [
          {
            title: 'DOCX vs PDF export tradeoffs',
            body: 'DOCX preserves paragraph structure and allows tracked-changes editing for collaborative review. PDF locks the formatting for delivery but cannot be edited without re-conversion. For client review workflows, DOCX is the correct delivery format; PDF is for final archiving after all revisions are complete.',
          },
          {
            title: 'SRT timestamp format vs VTT',
            body: 'SRT uses comma separators in timestamps: 00:01:23,456 → 00:01:25,123. VTT uses period separators: 00:01:23.456 → 00:01:25.123. Swapping the separator character causes parsing failures. SRT does not support styling metadata; VTT supports positioning, color, and timing cues.',
          },
          {
            title: 'Timestamp interval tradeoffs',
            body: 'Per-speaker-turn timestamps are useful for review and quotation but create dense formatting that reduces readability. Fixed-interval timestamps (every 2 minutes) are readable but make it harder to find a specific speaker moment. Most academic and journalistic workflows prefer per-speaker-turn; legal and court transcription typically requires fixed-interval.',
          },
          {
            title: 'JSON export for search and CMS integration',
            body: 'JSON output includes segment start/end times, speaker labels, confidence scores, and text — structured for import into search platforms, CMS systems, and custom workflows. Per-segment confidence scores identify sections likely to require manual review.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    default:
      return {
        proofPoints: [
          `${label} is part of the VideoText transcription, subtitle, and workflow toolkit.`,
          'Each page focuses on a specific transcript, subtitle, formatting, or export task so teams can match the workflow to the outcome they need.',
          'Use the related workflows below to move from raw media to searchable text, captions, summaries, translations, or client-ready transcript formatting.',
        ],
        workflowSteps: [
          { title: '1. Understand the workflow', detail: description },
          {
            title: '2. Use the matching VideoText tool',
            detail: 'Follow the related links to transcript, subtitle, translation, formatting, or free utility flows that match the page intent.',
          },
          {
            title: '3. Export a usable asset',
            detail: 'Turn media, subtitles, or transcript text into an output that is ready for publishing, editing, accessibility, or team handoff.',
          },
        ],
        outputExamples: [
          { title: 'Workflow summary', body: description },
          {
            title: 'Related workflow handoffs',
            body: 'The page links to transcript, subtitle, translation, formatting, and export workflows that naturally fit the task.',
          },
          {
            title: 'Practical next steps',
            body: 'Start with the matching VideoText tool, review the output, then export the asset your creator, editor, client, or team needs.',
          },
        ],
      }
  }
}

// ── Family-specific fallback FAQs ──────────────────────────────────────────────

export function buildFamilyFaq(
  family: RouteFamily,
  label: string,
  description: string,
): FaqItem[] {
  switch (family) {
    case 'subtitle':
      return [
        {
          q: 'What is CPS and why does it matter for subtitle readability?',
          a: 'CPS stands for characters per second — how fast the viewer must read a subtitle line before it disappears. The readable range is 14–17 CPS for most general audiences. Above 21 CPS, a significant percentage of viewers cannot finish reading the line before it vanishes, even if the text is accurate. Most automated subtitle tools generate lines without a CPS check, which is why reviewing reading speed is part of subtitle QA before any platform upload.',
        },
        {
          q: 'Why does Instagram not show my uploaded subtitle file?',
          a: 'Instagram Reels does not display soft subtitle tracks during autoplay in Feed. External SRT or VTT files uploaded to Instagram are not surfaced for most viewers. For Reels content, burned (hardcoded) captions are the only reliable method for ensuring captions appear — either by using a burn workflow before upload or using Instagram\'s built-in auto-caption feature after upload, which has variable accuracy.',
        },
        {
          q: 'My burned subtitles look different after video encoding — what happened?',
          a: 'Video encoding (particularly H.264 and H.265) applies compression that slightly degrades text edges. Font stroke weight, drop shadow contrast, and subtitle position all shift after encoding. Captions that look clean in an editing preview may develop legibility issues in the exported file. A post-encode QA pass — watching 2–3 minutes of the encoded video at actual playback size — should be part of any burned caption workflow before the file is published.',
        },
        {
          q: 'What is the difference between SRT and VTT timestamp formats?',
          a: 'SRT uses comma separators in timestamps: 00:01:23,456 → 00:01:25,123. VTT uses period separators: 00:01:23.456 → 00:01:25.123. Swapping the separator character causes parsing failures in most players — the file appears empty or throws an error. SRT files must not begin with a header; VTT files must begin with the line "WEBVTT". The two formats are otherwise structurally similar but not interchangeable.',
        },
        {
          q: 'How do I fix subtitle timing that drifts progressively later in the video?',
          a: 'Progressive timing drift — where captions start slightly late early in the video and progressively fall further behind — usually indicates an audio-video sync issue in the source file, not a transcription error. The subtitle timestamps were generated against audio that does not match the video track timing. Fix: use the subtitle timing fixer to shift all timestamps by the measured offset at a known sync point early in the video. If the drift accelerates over time, the source file has a variable frame rate issue that requires frame-rate normalization before re-captioning.',
        },
        {
          q: 'What subtitle formats does VideoText export?',
          a: 'VideoText exports SRT and VTT subtitle files. SRT works with YouTube, Vimeo, LinkedIn, and most video editors. VTT is the standard for HTML5 web players and streaming platforms — it also supports styling and positioning metadata that SRT does not carry. Burned caption output is available for social clips that require permanently embedded text. All exports are UTF-8 encoded.',
        },
      ]

    case 'formatting':
      return [
        {
          q: 'Why did my transcript get rejected for inconsistent speaker labels?',
          a: 'Speaker label inconsistency — where the same speaker appears as "JOHN SMITH" on page 1, "John" on page 3, and "Speaker 1" on page 7 — is one of the top automated rejection triggers at Rev, GoTranscript, and most transcript marketplaces. The QA system expects one label format, used identically, from the first occurrence to the last. Even a single deviation can trigger a rejection. Fix: use find-and-replace to standardize every speaker label before delivery.',
        },
        {
          q: 'What is the correct way to handle inaudible sections for Rev?',
          a: 'Rev requires "[inaudible]" in lowercase with square brackets, at the exact point in the text where the inaudible audio occurs. Do not use "[INAUDIBLE]", "[unclear]", or "[???]" — these are not accepted notation styles on Rev and trigger revision requests. For overlapping speech that is audible but unintelligible, use "[crosstalk]" at the point of overlap. Inaudible and crosstalk notations should not be used interchangeably.',
        },
        {
          q: 'How do I know whether a client wants clean verbatim or full verbatim?',
          a: 'If the client has not specified, ask before starting — it is not something to infer from the content type. Clean verbatim removes fillers, false starts, and repetitions for readability; full verbatim preserves everything spoken. Medical and legal transcription often requires full verbatim. Corporate meeting and interview transcription usually requires clean verbatim. Applying the wrong standard means re-reading the source audio to add or remove content — it cannot be corrected through text editing alone.',
        },
        {
          q: 'My paragraphs look fine in my editor but are flagged as too long — why?',
          a: 'Rev\'s style guide sets a maximum paragraph length of approximately 8 lines in the submitted document. If you are writing in a large-font editor view and counting lines visually, the line count in the exported DOCX or PDF at standard font size will differ. The paragraph length check is based on lines in the final exported file at the target font size and page margins — not the line count in your editing view. Export to DOCX and review line count before submitting.',
        },
        {
          q: 'Can I apply GoTranscript formatting rules to a recording transcribed with VideoText?',
          a: 'Yes. After transcribing with VideoText, use the style guide formatter to apply GoTranscript-style rules: normalize speaker labels, set verbatim level, add or remove timestamps per the client instruction, and normalize [inaudible] notation. The formatter applies rules to the existing transcript text — it does not re-transcribe the audio. Any sections with audio quality problems still require manual review.',
        },
      ]

    case 'translation':
      return [
        {
          q: 'Why does my translated subtitle text overflow the video frame?',
          a: 'Language expansion causes translated text to run longer than the source. German text averages 25–30% longer than equivalent English; Spanish 15–20%; French 20–25%; Arabic 20–25%. If a source subtitle line was already near the CPS limit or the line-length maximum, the expanded translated text overflows the timing window or the display area. The correct fix is to restructure the translated text into two shorter lines within the original timing window — not to extend the timestamp boundaries.',
        },
        {
          q: 'How do I translate subtitles without shifting the timing?',
          a: 'Translate each subtitle segment independently, treating the start and end timestamps as fixed constraints. Never merge two segments to fit translated text — that shifts timing for everything that follows. If a single segment\'s translated text is too long for its timing window, split the translated text across two lines within the same timing boundaries. The only acceptable change to a timestamp during translation is correcting an error that existed in the source file.',
        },
        {
          q: 'My Arabic subtitles are displaying left-to-right — how do I fix this?',
          a: 'Arabic subtitle text displaying left-to-right is a player rendering issue, not a file encoding error. HTML5 video players without explicit RTL support render subtitle text in the document\'s default direction. The fix depends on the platform: for web players, add dir="rtl" to the subtitle container CSS. For VTT files, the ::cue(b) positioning can sometimes help. For YouTube, the RTL rendering is handled automatically. Always test Arabic subtitles in the exact target player before delivery — behavior varies significantly between players.',
        },
        {
          q: 'Which languages cause the most line-overflow problems after translation?',
          a: 'German causes the most frequent overflow issues due to compound word construction — a single German compound word can be as long as an English phrase. Finnish and Estonian also expand significantly. For Spanish and French, the expansion is more predictable and easier to handle with line splitting. Japanese and Chinese actually contract relative to English, which creates the opposite problem: very short subtitle lines with large timing windows that look visually unbalanced.',
        },
        {
          q: 'Can I have both English and Spanish subtitles on the same YouTube video?',
          a: 'Yes. Upload the English SRT as the primary caption track in YouTube Studio under Subtitles → Upload file. Then add the Spanish track under Subtitles → Add language → Spanish → Upload file. YouTube displays each viewer\'s language track based on their browser language preference by default. Viewers can also manually select the subtitle language from the video settings menu. Each language requires a separate SRT file upload — there is no single bilingual subtitle track format.',
        },
      ]

    case 'alternative':
      return [
        {
          q: 'Does VideoText support longer recordings than Otter.ai?',
          a: 'VideoText processes recordings up to the per-upload limit of the plan tier — without requiring manual file splitting. Otter.ai limits recordings to 4 hours on paid plans and 40 minutes on the free tier. The operational difference is more significant than the numbers suggest: Otter requires splitting a 5-hour conference recording into multiple jobs, then manually reconciling speaker labels and timestamps across the segments. VideoText processes the full recording as a single job.',
        },
        {
          q: 'What export formats does VideoText support that alternatives often lack?',
          a: 'VideoText generates transcript text (TXT, DOCX, PDF), SRT subtitle files, VTT subtitle files, an AI summary, chapter markers, and structured JSON — all from a single upload. Temi exports TXT and DOCX only. Otter.ai exports DOCX, PDF, TXT, and SRT on paid plans. Descript exports to its own project format with extra steps required for plain SRT/VTT. The operational difference is the number of tools required to produce a complete set of deliverables from one recording.',
        },
        {
          q: 'How does VideoText handle collaboration compared to Descript?',
          a: 'Descript provides a full video editing environment with team workspaces, version history, and collaborative comment threads. VideoText provides shareable review links that allow reviewers to read and comment on transcripts without a VideoText account — useful for client review cycles. If your workflow requires collaborative video editing with AI transcription, Descript is purpose-built for that. If you need fast transcript-to-delivery output with reviewer access, VideoText\'s link-sharing model has lower overhead.',
        },
        {
          q: 'Does VideoText delete my recordings after processing?',
          a: 'Yes. VideoText deletes uploaded files after processing completes. The transcript and subtitle outputs are retained in your account, but the source media is not stored on VideoText servers. This is relevant for workflows involving sensitive recordings — client interviews, confidential meetings, HIPAA-adjacent content — where media retention by a third-party service creates compliance risk.',
        },
        {
          q: 'How do I test VideoText against the tool I am currently using?',
          a: 'Upload the same recording you most recently processed with your current tool. Use the same language settings. Compare the raw output before any editing: speaker label accuracy, paragraph structure, punctuation, and timestamp formatting. Then count how many corrections each transcript requires to reach delivery quality. Processing time for a 60-minute file in VideoText is typically under 4 minutes.',
        },
      ]

    case 'benchmark':
      return [
        {
          q: 'What does Word Error Rate actually measure?',
          a: 'WER (Word Error Rate) = (Substitutions + Deletions + Insertions) / Total Reference Words. A 5% WER means approximately 5 errors per 100 words. WER is calculated against a verified ground-truth transcript, case-insensitively, typically excluding punctuation errors. It measures word-level accuracy but does not score speaker attribution errors, formatting quality, or the readability of the output — which is why WER alone is an incomplete operational benchmark.',
        },
        {
          q: 'How do you benchmark cleanup time fairly across tools?',
          a: 'The same human editor processes the raw output from each tool under identical conditions: same recording, same quality criteria for "delivery-ready," timed start-to-finish. The editor is not told which tool produced which output to prevent bias. Cleanup time is measured in minutes per hour of source audio. This metric captures speaker label corrections, paragraph restructuring, inaudible-section review, and verbatim level normalization — all the editing steps WER does not measure.',
        },
        {
          q: 'Why do transcription accuracy numbers vary so much between vendors?',
          a: 'Most vendor-published accuracy numbers are measured on best-case audio conditions: studio-quality single-speaker speech at low noise levels. Real-world recordings — meetings, podcasts, interviews with consumer microphones — produce meaningfully lower accuracy across all tools. A vendor reporting 99% accuracy has likely measured on clean studio audio. The relevant question is accuracy at the SNR level and speaker count of your actual recordings.',
        },
        {
          q: 'Does transcription accuracy degrade for long recordings?',
          a: 'It depends on the architecture. Some ASR models process audio in fixed chunks (typically 30 minutes) and reassemble independently. These models maintain consistent accuracy across length but may introduce artifacts at chunk boundaries. Other models use longer context windows that can handle topic drift better but may slow down for very long files. Testing with your actual recording duration, not just short samples, is the only reliable way to evaluate long-file behavior.',
        },
        {
          q: 'How should I test transcription tools for my specific use case?',
          a: 'Use recordings from your actual workflow — same audio conditions, same speaker count, same content type. Do not use vendor-provided sample audio for evaluation. Measure three things: raw WER against a verified transcript, processing time per hour of audio, and cleanup time for one editor to bring the raw output to your delivery standard. The tool with the best combination of those three metrics for your content type is the right choice, regardless of marketing accuracy claims.',
        },
      ]

    case 'youtube':
      return [
        {
          q: 'Why are YouTube auto-captions inaccurate for my content?',
          a: "YouTube auto-captions use Google's speech recognition optimized for broad coverage — not accuracy on specialized content. Technical vocabulary, strong accents, fast speech, and multiple overlapping speakers all degrade auto-caption quality. VideoText uses Whisper large-v3, which achieves lower Word Error Rates particularly for accented English, technical terminology, and non-native speaker content. For content where accuracy matters for SEO, accessibility compliance, or repurposing, Whisper-based transcription consistently outperforms YouTube's auto-caption output.",
        },
        {
          q: 'How do I add chapters to a YouTube video that is already published?',
          a: 'Edit the video description in YouTube Studio and add timestamps in HH:MM:SS or MM:SS format with chapter titles. The first timestamp must be 00:00. You need at least 3 chapters. Timestamps must be in ascending order. YouTube auto-links them to video navigation within a few minutes of saving. VideoText generates chapter markers formatted for direct paste into YouTube descriptions — copy them from the Chapters output tab.',
        },
        {
          q: 'Can I replace YouTube auto-captions with my own SRT file?',
          a: 'Yes. In YouTube Studio, open the video, go to Subtitles, and click Add → Upload file. Select your SRT file (UTF-8 encoded, comma timestamp separators). YouTube syncs the uploaded captions to the audio automatically, correcting small timing offsets. The uploaded SRT replaces the auto-generated captions for that language. Age-restricted videos have the same process — the restriction does not affect caption uploads.',
        },
        {
          q: 'Why is my SRT re-upload not showing in YouTube Studio?',
          a: 'The most common causes: the SRT file is not UTF-8 encoded (some text editors save as Latin-1 by default), the timestamps use period separators instead of commas (VTT format instead of SRT), or the file exceeds 1,500 subtitle blocks. Open the file in a plain text editor and verify the first timestamp uses commas (00:00:00,000) and the file begins with "1" on the first line. If the file has more than 1,500 blocks, split it before uploading.',
        },
        {
          q: 'How do I transcribe a YouTube Shorts video?',
          a: 'Shorts URLs (youtube.com/shorts/VIDEO_ID) work exactly like regular YouTube URLs in VideoText — paste the URL and process normally. Transcription quality is the same as regular videos. Note that Shorts are 60 seconds maximum, so the transcript is short. For subtitle re-upload to a Shorts video, use shorter line lengths (30 characters or fewer) to fit the vertical 9:16 aspect ratio without clipping at the frame edges.',
        },
        {
          q: 'Can I get a transcript from a YouTube video without downloading it?',
          a: 'Yes. Paste any public YouTube URL (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, or youtube.com/embed/ format) into VideoText. We stream the audio directly without requiring a file download. The transcript is ready within minutes for videos up to 4 hours. Age-restricted videos work when you provide optional browser cookies from a logged-in YouTube session.',
        },
      ]

    case 'transcription':
      return [
        {
          q: 'What happens when two speakers talk over each other?',
          a: 'Overlapping speech longer than approximately 2 seconds typically causes speaker diarization errors — the model misattributes the overlapping content to the wrong speaker, or collapses both voices into a single speaker segment. Short overlaps under 1 second are often handled correctly. For recordings with frequent crosstalk (panel discussions, heated interviews, group meetings), plan for a manual speaker label review pass after transcription. The transcript text itself is usually accurate; the speaker attribution is where cross-talk creates errors.',
        },
        {
          q: 'Why does my long transcript have strange sentence breaks every 30 minutes?',
          a: 'Transcription engines that process audio in 30-minute chunks for computational efficiency sometimes introduce artifacts at segment boundaries: the last sentence of one chunk and the first sentence of the next may share words, or a sentence may split at an unnatural point. Review the transitions at 30, 60, 90, and 120-minute marks in your transcript. These sections typically need a manual cleanup pass — reading the surrounding 2–3 minutes in both chunks to verify continuity.',
        },
        {
          q: 'How do I handle a recording where audio quality degrades partway through?',
          a: 'Network dropouts in Zoom recordings and variable microphone distances in in-person recordings both create audio quality degradation that produces transcription errors. Sections with significant audio degradation produce either silent gaps in the transcript or runs of plausible-sounding incorrect words. Identify degraded sections by looking for unusually short speaker turns, repeated words, or text that does not match the topic context. These sections require playback-verified manual review — no AI transcription tool handles severe audio degradation reliably.',
        },
        {
          q: 'What is the difference between clean verbatim and full verbatim for client delivery?',
          a: 'Clean verbatim removes filler words (um, uh, you know, like), false starts, and word repetitions for readability while preserving the accurate meaning. Full verbatim preserves all spoken content exactly as delivered, including fillers, stutters, and restarts. Clean verbatim is the standard for corporate, academic, and journalistic transcription. Full verbatim is required for legal depositions, court transcription, and some research applications where the exact spoken form matters. Applying the wrong level means re-processing the source audio — it cannot be corrected through text editing.',
        },
        {
          q: 'Can I rename speaker labels after transcription?',
          a: 'Yes. Speaker labels generated by diarization (Speaker 1, Speaker 2, etc.) can be renamed inline in the VideoText transcript editor. Renaming a label propagates consistently to all instances of that speaker throughout the transcript. Speaker names are preserved across all export formats — DOCX, PDF, SRT, VTT, and JSON all carry the updated names rather than the generic numbered labels.',
        },
        {
          q: 'Can I transcribe YouTube videos, Zoom recordings, and podcast audio?',
          a: 'Yes. VideoText accepts video file uploads (MP4, MOV, WebM, MKV) and audio files (MP3, M4A, WAV, AAC, FLAC). URL-based ingestion works for public YouTube videos and direct media URLs. Zoom cloud recordings can be downloaded and uploaded as MP4 files. Google Meet recordings export to Google Drive as MP4 and can be downloaded for upload. Audio-only podcast files process with the same accuracy as video files — VideoText uses only the audio track regardless of whether a video track is present.',
        },
      ]

    default:
      return [
        { q: `What is ${label}?`, a: description },
        {
          q: 'How should I use this workflow?',
          a: 'Use the page to understand the workflow, then start with the recommended transcript, subtitle, translation, formatting, or utility tool for the job.',
        },
        {
          q: 'Where should I start?',
          a: 'Start with Video to Transcript for media-to-text workflows, Video to Subtitles for captions, or the related links below for specialized tools.',
        },
      ]
  }
}
