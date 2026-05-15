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
  faq: string
  related: string
}

const SECTION_TITLES: Record<RouteFamily, FamilySectionTitles> = {
  subtitle: {
    proofPoints: 'Subtitle timing errors that break viewer experience',
    workflowSteps: 'From raw video to export-ready subtitle file',
    outputExamples: 'SRT, VTT, and burned caption outputs',
    comparisonRows: 'How VideoText handles subtitle workflows',
    useCases: 'Creators and teams running subtitle workflows',
    faq: 'Subtitle workflow questions answered',
    related: 'Related caption and subtitle tools',
  },
  formatting: {
    proofPoints: 'Why transcript formatting affects QA acceptance',
    workflowSteps: 'From raw transcript to client-ready formatted file',
    outputExamples: 'Clean, verbatim, and platform-ready transcript outputs',
    comparisonRows: 'Formatting consistency: VideoText vs manual cleanup',
    useCases: 'Transcriptionists and editors running formatting workflows',
    faq: 'Transcript formatting and style guide questions',
    related: 'Related formatting and QA workflows',
  },
  translation: {
    proofPoints: 'Why timing preservation matters in subtitle translation',
    workflowSteps: 'Translating subtitles without breaking synchronization',
    outputExamples: 'Multilingual subtitle and transcript outputs',
    comparisonRows: 'Translation workflow: VideoText vs standalone tools',
    useCases: 'Teams running multilingual caption workflows',
    faq: 'Subtitle translation and localization questions',
    related: 'Related translation and multilingual workflows',
  },
  alternative: {
    proofPoints: 'Where VideoText differs from this tool operationally',
    workflowSteps: 'Switching your transcript workflow step by step',
    outputExamples: 'Export outputs teams actually compare',
    comparisonRows: 'Side-by-side workflow comparison',
    useCases: 'Teams that switched to VideoText',
    faq: 'Comparison and switching questions',
    related: 'Other VideoText comparisons and alternatives',
  },
  benchmark: {
    proofPoints: 'What this accuracy benchmark actually measures',
    workflowSteps: 'How the benchmark tests were conducted',
    outputExamples: 'Benchmark results you can verify yourself',
    comparisonRows: 'Performance numbers side by side',
    useCases: 'Teams that rely on transcription accuracy data',
    faq: 'Transcription accuracy and benchmark questions',
    related: 'Related performance and accuracy tests',
  },
  youtube: {
    proofPoints: 'Why YouTube transcript extraction matters for creators',
    workflowSteps: 'Turning YouTube videos into searchable transcripts',
    outputExamples: 'YouTube transcript outputs for creator workflows',
    comparisonRows: 'YouTube transcript: VideoText vs native captions',
    useCases: 'Creator workflows powered by YouTube transcripts',
    faq: 'YouTube transcript and workflow questions',
    related: 'Related YouTube and creator workflow tools',
  },
  transcription: {
    proofPoints: 'How this workflow reduces manual transcription overhead',
    workflowSteps: 'From long recording to structured, usable transcript',
    outputExamples: 'Transcript outputs teams actually deliver',
    comparisonRows: 'Transcription workflow comparison',
    useCases: 'Teams running high-volume transcription workflows',
    faq: 'Transcription workflow questions answered',
    related: 'Related transcription and workflow tools',
  },
  generic: {
    proofPoints: 'Why teams use this workflow',
    workflowSteps: 'How it works',
    outputExamples: 'Outputs you can use immediately',
    comparisonRows: 'How VideoText compares',
    useCases: 'Use cases',
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
          'Subtitle timing errors — lines that appear too early, run too long, or overlap dialogue — are the most common reason captions feel unwatchable even when the transcript text is accurate.',
          'Reading speed matters: most platform standards target 14–17 characters per second, and exceeding 21 CPS on a single line creates a comprehension gap across viewer groups.',
          `${label} handles the specific formatting and export requirements that differ between burned captions, SRT files, VTT streams, and platform-specific caption uploads.`,
        ],
        workflowSteps: [
          {
            title: '1. Generate a subtitle file from your video',
            detail: 'Upload the video or paste a public URL. VideoText generates a time-coded subtitle file with accurate word-level timestamps and automatic line-break logic based on reading speed.',
          },
          {
            title: '2. Review timing and line length',
            detail: 'Check that each subtitle line falls within reading-speed limits. Adjust breaks, merge short lines, and split long segments before exporting to your target platform.',
          },
          {
            title: '3. Export in the format your platform requires',
            detail: 'Export SRT for YouTube and Vimeo, VTT for HTML5 web players, or burned captions for social clips. Each format carries different timing constraints and encoding requirements.',
          },
        ],
        outputExamples: [
          {
            title: 'SRT subtitle file',
            body: 'Standard timed subtitle format supported by YouTube, Vimeo, social platforms, and most video editors. Each block contains a sequence number, timestamp pair, and one or two lines of caption text.',
          },
          {
            title: 'VTT subtitle stream',
            body: 'WebVTT format used by HTML5 video players, streaming services, and accessibility workflows. Supports styling metadata and position cues that SRT does not carry.',
          },
          {
            title: 'Burned captions',
            body: 'Permanently embedded text rendered into the video frame itself. Required for platforms that strip external caption tracks and for social clips intended to play without sound.',
          },
        ],
        useCases: [
          {
            title: 'Video creators',
            body: 'Generate subtitle files for YouTube, TikTok, and course platforms in one pass — without running separate transcription and captioning tools.',
          },
          {
            title: 'Accessibility teams',
            body: 'Produce synchronized captions that meet WCAG timing and reading-speed requirements for public video content.',
          },
          {
            title: 'Post-production editors',
            body: 'Export SRT or VTT from raw transcripts, then import into Premiere, DaVinci, or Final Cut without manually reformatting caption timing.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'formatting':
      return {
        proofPoints: [
          'Clean verbatim removes distracting fillers for readability; full verbatim preserves every utterance. Applying the wrong standard is the most common reason transcripts fail platform QA review.',
          'Speaker label inconsistency — mixing "Speaker 1", "SPEAKER 1", and "S1" in the same file — triggers rejection at all major transcript marketplaces including Rev and GoTranscript.',
          `${label} applies a structured formatting pass that catches label drift, timestamp placement errors, bracket notation inconsistencies, and paragraph-length violations before delivery.`,
        ],
        workflowSteps: [
          {
            title: '1. Select the target style guide',
            detail: 'Choose Rev-style, GoTranscript-style, or a custom client specification. Each guideline has different rules for clean vs verbatim, timestamp intervals, speaker notation, and inaudible handling.',
          },
          {
            title: '2. Normalize the transcript structure',
            detail: 'Standardize speaker labels, apply consistent paragraph breaks, enforce the correct verbatim level, and place timestamps at the requested intervals from beginning to end.',
          },
          {
            title: '3. Run a pre-delivery QA pass',
            detail: 'Check for missing labels, bracket inconsistencies, overlong paragraphs, crosstalk notation, and timestamp drift before exporting or sending to a reviewer.',
          },
        ],
        outputExamples: [
          {
            title: 'Rev-style formatted transcript',
            body: 'Readable clean verbatim text with consistent speaker names, clear paragraph structure, and timestamp treatment that matches client delivery requirements.',
          },
          {
            title: 'GoTranscript QA-ready file',
            body: 'Structured transcript that passes common rejection checks: correct timestamp format, consistent labels, proper inaudible notation, and matching verbatim level throughout.',
          },
          {
            title: 'Client-ready delivery draft',
            body: 'Polished output ready for DOCX, PDF, or TXT export — with formatting that reduces back-and-forth revision cycles with clients or QA reviewers.',
          },
        ],
        useCases: [
          {
            title: 'Freelance transcriptionists',
            body: 'Reduce revision risk before submitting marketplace jobs that require strict style-guide compliance.',
          },
          {
            title: 'QA leads and agency editors',
            body: 'Give reviewers a repeatable formatting workflow for client-specific transcript requirements across a team.',
          },
          {
            title: 'Researchers and journalists',
            body: 'Turn raw AI transcripts into readable interview documents with speaker structure, clean punctuation, and consistent timestamp placement.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'translation':
      return {
        proofPoints: [
          'Subtitle translation must preserve timestamp boundaries: translated text that runs longer than the original frame duration creates timing desynchronization that breaks the viewing experience.',
          'Language expansion is a structural challenge — German and Spanish text commonly runs 20–30% longer than equivalent English, requiring line-break restructuring without shifting subtitle timing.',
          `${label} preserves the original timestamp structure while adapting subtitle text for the target language, reducing the manual timestamp repair work that standard translation tools require.`,
        ],
        workflowSteps: [
          {
            title: '1. Upload or generate the source subtitle file',
            detail: 'Start from an existing SRT or VTT file, or generate one from the original video. The source timestamps are locked as the translation baseline.',
          },
          {
            title: '2. Select target language and run translation',
            detail: 'The workflow translates each subtitle segment while preserving the original timing boundaries. Long expansions trigger automatic line-break restructuring within the existing timing window.',
          },
          {
            title: '3. Review and export the translated subtitle file',
            detail: 'Check translated segments for readability, trim segments that expanded beyond timing limits, and export the translated SRT or VTT in the same format as the source.',
          },
        ],
        outputExamples: [
          {
            title: 'Translated SRT with preserved timing',
            body: 'Each subtitle block retains the original start and end timestamps from the source file, with only the text content replaced by the translated equivalent.',
          },
          {
            title: 'Bilingual subtitle file',
            body: 'Side-by-side original and translated captions for dubbing review, multilingual accessibility workflows, or language learning content.',
          },
          {
            title: 'Translated transcript document',
            body: 'Full transcript text translated into the target language with speaker structure and timestamp formatting preserved for review and delivery.',
          },
        ],
        useCases: [
          {
            title: 'International content teams',
            body: 'Localize subtitle files for regional video distribution without rebuilding timing from scratch in each target language.',
          },
          {
            title: 'Course creators and educators',
            body: 'Add translated captions to training content for international learners — without separate translation and captioning workflows.',
          },
          {
            title: 'Journalists and researchers',
            body: 'Translate interview transcripts into a working language while keeping speaker labels and timestamp structure intact for source review.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'alternative':
      return {
        proofPoints: [
          'VideoText processes long recordings — multi-hour interviews, webinars, and lectures — in a single upload without file splitting or multiple jobs, which many alternatives require.',
          'Export flexibility matters: VideoText generates transcript text, SRT/VTT subtitle files, summaries, chapters, and structured JSON from one upload, replacing workflows that need three or four separate tools.',
          `${label} covers operational workflow differences rather than feature-list comparisons — the real friction is in how tools handle long files, mixed outputs, and team review handoffs.`,
        ],
        workflowSteps: [
          {
            title: '1. Identify where the current tool creates friction',
            detail: 'Map the specific points where the alternative fails your workflow: file-length limits, export format restrictions, missing subtitle generation, slow processing, or absent team collaboration.',
          },
          {
            title: '2. Test the VideoText workflow with a real file',
            detail: 'Upload a long recording or paste a YouTube URL. Run the same workflow you currently run and compare processing speed, output quality, and export options side by side.',
          },
          {
            title: '3. Compare outputs directly before switching',
            detail: 'Download transcript, subtitle, summary, and chapter outputs from both tools and compare formatting quality, timestamp accuracy, and how much manual cleanup each file requires.',
          },
        ],
        outputExamples: [
          {
            title: 'Side-by-side transcript export',
            body: 'Compare raw output quality — speaker labeling accuracy, timestamp precision, punctuation, and paragraph structure — between VideoText and the tool you are evaluating.',
          },
          {
            title: 'Subtitle file availability',
            body: 'Check whether the alternative generates subtitle files at all, and whether those files require manual timing correction before they are usable in your publishing workflow.',
          },
          {
            title: 'Long-video processing results',
            body: 'Test with a recording over 60 minutes. Compare processing time, whether the file needs splitting, and how structured the output is when the job completes.',
          },
        ],
        useCases: [
          {
            title: 'Teams hitting file-length limits',
            body: 'Switch to VideoText when your current tool caps recordings at 30 or 60 minutes and requires manual file splitting for longer interviews and recordings.',
          },
          {
            title: 'Creators needing subtitle and transcript together',
            body: 'Replace a two-tool workflow — separate transcription and captioning apps — with a single upload that outputs both in the same pass.',
          },
          {
            title: 'Agencies comparing export flexibility',
            body: 'Evaluate VideoText when clients require DOCX, JSON, SRT, VTT, and structured summary outputs that the current tool cannot deliver in one workflow.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'benchmark':
      return {
        proofPoints: [
          'Transcription accuracy benchmarks are only meaningful when tested on real-world audio: multi-speaker interviews, noisy recordings, non-native accents, and long-form content with topic drift.',
          'Word error rate (WER) measures raw accuracy, but post-processing cleanup time — how much manual editing a transcript requires before it is delivery-ready — often matters more in production workflows.',
          `${label} uses real recordings across content types to measure not just raw accuracy but structured output quality, processing speed, and how much cleanup each transcript requires before delivery.`,
        ],
        workflowSteps: [
          {
            title: '1. Define the benchmark scope',
            detail: 'Select test files that represent real workflow conditions: varying audio quality, multiple speakers, long recordings, technical vocabulary, and non-English content.',
          },
          {
            title: '2. Process identical files across tools',
            detail: 'Upload the same recordings to each tool under identical conditions. Record processing time, output format, and raw transcript quality before any editing.',
          },
          {
            title: '3. Measure cleanup overhead',
            detail: 'Time how long manual cleanup takes for each output. The transcript that requires the least editing to reach delivery quality wins on operational cost — not just WER.',
          },
        ],
        outputExamples: [
          {
            title: 'Raw accuracy comparison',
            body: 'Word error rate measured across diverse audio samples — clear speech, overlapping speakers, background noise, and non-native English — using industry-standard WER calculation.',
          },
          {
            title: 'Processing speed results',
            body: 'Wall-clock processing time for recordings of 30, 60, and 120 minutes, measured from upload completion to transcript ready for review.',
          },
          {
            title: 'Cleanup time measurement',
            body: 'Manual editing time required to bring each raw transcript to delivery quality — the most operationally relevant benchmark for teams doing high-volume transcription.',
          },
        ],
        useCases: [
          {
            title: 'Procurement teams evaluating tools',
            body: 'Use benchmark data to compare transcription services before committing to a paid plan or enterprise contract.',
          },
          {
            title: 'Agencies assessing output quality',
            body: 'Test transcription tools against the specific content types in your workflow before switching providers.',
          },
          {
            title: 'Researchers comparing ASR systems',
            body: 'Run controlled accuracy tests across multiple AI transcription providers using standardized test sets and scoring methodology.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'youtube':
      return {
        proofPoints: [
          "YouTube auto-captions are optimized for display accessibility — they lack formatting, speaker labels, paragraph breaks, and the structured text that makes transcripts searchable and reusable.",
          'Long YouTube videos — tutorials, interviews, lectures, conference talks — contain dense information that becomes far more valuable as a searchable, segmented transcript with chapters.',
          `${label} extracts the full audio from YouTube URLs without requiring a manual download, then produces a structured transcript with timestamps, chapters, summaries, and optional subtitle files.`,
        ],
        workflowSteps: [
          {
            title: '1. Paste the YouTube URL',
            detail: 'Copy any public YouTube video URL and paste it directly. No download, no file conversion. VideoText streams the audio directly for transcription without requiring the video file.',
          },
          {
            title: '2. Generate transcript, chapters, and summary',
            detail: 'VideoText produces a full time-coded transcript, auto-generated chapter markers, and a structured summary — replacing separate note-taking, chaptering, and caption tools.',
          },
          {
            title: '3. Export and repurpose the content',
            detail: 'Copy the transcript as searchable text, download SRT/VTT subtitle files for re-upload, export chapters for description text, or share a structured summary with your team.',
          },
        ],
        outputExamples: [
          {
            title: 'Searchable YouTube transcript',
            body: "Full text with timestamps that can be searched by topic, quote, speaker moment, or chapter marker — far more useful than YouTube's native auto-caption output.",
          },
          {
            title: 'Chapter markers and summaries',
            body: 'Auto-generated chapter timestamps and a structured summary that can be added to the YouTube video description or shared as a content brief with editors and writers.',
          },
          {
            title: 'SRT subtitle file for re-upload',
            body: "A properly formatted subtitle file that can be uploaded back to YouTube as a custom caption track — replacing YouTube's auto-captions with an edited, accurate version.",
          },
        ],
        useCases: [
          {
            title: 'Podcast and video creators',
            body: 'Turn long-form YouTube content into show notes, blog articles, newsletters, and social captions without manually transcribing or summarizing the recording.',
          },
          {
            title: 'Researchers and journalists',
            body: 'Search YouTube interviews, lectures, and conference talks for exact quotes, timestamps, and supporting evidence without replaying entire videos.',
          },
          {
            title: 'Course developers',
            body: 'Extract transcripts from recorded lectures and tutorials to create searchable study materials, accurate subtitle files, and structured content outlines.',
          },
        ],
        ctaText: footerCta.text,
        ctaPath: footerCta.path,
      }

    case 'transcription':
      return {
        proofPoints: [
          'Multi-hour recordings — meetings, interviews, lectures, podcasts — contain too much structured information to manually transcribe efficiently. The cleanup and formatting overhead is where most time is lost.',
          'Transcript + subtitle + summary + chapters from a single upload eliminates the need to run separate tools for each output type, which is how most team transcription workflows are currently structured.',
          `${label} is built for long-form recordings and structured output workflows — not just short clips. Speaker labels, timestamp formatting, and export-ready files come from the same processing pass.`,
        ],
        workflowSteps: [
          {
            title: '1. Upload a recording or paste a URL',
            detail: 'Drag in a video or audio file, or paste a YouTube, Zoom cloud recording, or public media URL. Choose speaker labeling, language, and export format preferences before starting.',
          },
          {
            title: '2. Generate transcript, subtitles, summary, and chapters',
            detail: 'VideoText produces all structured outputs in one pass: time-coded transcript text, SRT/VTT subtitle files, a summary, and chapter markers. No separate tools required for each output.',
          },
          {
            title: '3. Review, edit, and export delivery-ready files',
            detail: 'Edit transcript text inline, adjust speaker labels, download DOCX/PDF/TXT, export subtitle files, or share a review link with teammates before final delivery.',
          },
        ],
        outputExamples: [
          {
            title: 'Structured transcript with speaker labels',
            body: 'Full time-coded transcript text with speaker diarization and consistent label formatting — ready for review, editing, or direct delivery to clients.',
          },
          {
            title: 'Subtitle files alongside transcript',
            body: 'SRT and VTT caption files generated from the same transcription pass, so subtitle and transcript outputs stay synchronized without a separate captioning step.',
          },
          {
            title: 'Summary and chapter structure',
            body: 'AI-generated summary and auto-detected chapter markers that make long recordings navigable — useful for meeting notes, podcast show notes, and course content outlines.',
          },
        ],
        useCases: [
          {
            title: 'Teams transcribing meetings and calls',
            body: 'Turn Zoom, Google Meet, and Teams recordings into searchable, shareable meeting notes with speaker labels and action item timestamps.',
          },
          {
            title: 'Podcast producers and creators',
            body: 'Convert long episodes into transcripts, show notes, summaries, and subtitle files for YouTube and accessibility without running multiple separate tools.',
          },
          {
            title: 'Researchers and interviewers',
            body: 'Extract clean, speaker-labeled transcripts from long interviews and focus groups for qualitative analysis, quotation, and delivery to clients.',
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
          q: `What subtitle formats does ${label} export?`,
          a: 'VideoText exports SRT and VTT subtitle files. SRT works with YouTube, Vimeo, and most video editors. VTT is used by HTML5 players and streaming platforms. Burned caption output is available for social clips that require permanently embedded text.',
        },
        {
          q: 'What is the difference between burned subtitles and soft subtitles?',
          a: 'Burned (hardcoded) subtitles are rendered directly into the video frame and cannot be turned off by the viewer. Soft subtitles are separate caption tracks that viewers can enable or disable. Most platforms recommend soft subtitles for accessibility; burned captions are used for social content that autoplays without audio.',
        },
        {
          q: 'How do I fix subtitle timing that is off by a few seconds?',
          a: 'Upload the video along with your existing subtitle file and use the subtitle timing fixer. You can shift all timestamps by a fixed offset or recalculate timing from a new sync point — faster than manually correcting each timestamp in a text editor.',
        },
      ]

    case 'formatting':
      return [
        {
          q: `What formatting guidelines does ${label} support?`,
          a: 'The formatter supports Rev-style, GoTranscript-style, TranscribeMe-style, and Scribie-style guidelines. You can also configure custom rules for speaker labels, timestamp intervals, verbatim level, and notation style for client-specific delivery requirements.',
        },
        {
          q: 'What is the difference between clean verbatim and full verbatim?',
          a: 'Clean verbatim removes distracting fillers, false starts, and repetitions for readability while keeping the meaning intact. Full verbatim preserves all spoken content including fillers, stutters, and interruptions. The correct choice depends on what the client or platform requires.',
        },
        {
          q: 'What are the most common transcript QA rejection reasons?',
          a: 'The most frequent rejection triggers include inconsistent speaker label formats, incorrect timestamp placement or style, missing inaudible or crosstalk notation, wrong verbatim level, overlong paragraphs, and punctuation inconsistency. The formatter checks for these issues before delivery.',
        },
      ]

    case 'translation':
      return [
        {
          q: `What languages does ${label} support for translation?`,
          a: 'VideoText supports translation into and from major languages including Spanish, French, German, Portuguese, Italian, Dutch, Japanese, Korean, Chinese, Arabic, and Hindi. Subtitle structure and timestamp formatting are preserved during translation.',
        },
        {
          q: 'Will translating subtitles break the timing?',
          a: 'No. VideoText preserves the original timestamp boundaries from the source subtitle file when translating. Text that expands significantly in the target language triggers automatic line-break restructuring within the existing timing window.',
        },
        {
          q: 'Can I translate a transcript instead of a subtitle file?',
          a: 'Yes. You can translate a full transcript document while preserving speaker labels and timestamp formatting. The translated output retains the same structural layout as the original, making it usable for review, delivery, or conversion back to subtitle format.',
        },
      ]

    case 'alternative':
      return [
        {
          q: 'How does VideoText handle long recordings compared to this alternative?',
          a: 'VideoText handles multi-hour recordings in a single upload without splitting files. Many alternatives cap recordings at 30–60 minutes or require manual segmentation for longer content, which adds significant friction to interview, meeting, and podcast transcription workflows.',
        },
        {
          q: 'What export formats does VideoText support that alternatives may lack?',
          a: 'VideoText generates transcript text, SRT/VTT subtitle files, AI summaries, chapter markers, DOCX, PDF, TXT, and JSON from one upload. Most alternatives offer transcript-only output or require separate tools for subtitle generation and structured summaries.',
        },
        {
          q: 'How do I test VideoText against the tool I am currently using?',
          a: 'Upload a real recording you have already transcribed with your current tool. Compare the VideoText output for accuracy, structure, and the amount of manual cleanup it requires before it is delivery-ready. Processing time for a 60-minute file is typically under 4 minutes.',
        },
      ]

    case 'benchmark':
      return [
        {
          q: 'How is transcription accuracy measured in this benchmark?',
          a: 'Accuracy is measured using Word Error Rate (WER): the percentage of words in the transcript that differ from the ground-truth text. Lower WER means fewer errors. Tests are run on diverse audio samples including clear speech, overlapping speakers, and recordings with background noise.',
        },
        {
          q: 'Does VideoText perform well on long recordings?',
          a: 'VideoText is optimized for long-form content. Processing quality for multi-hour recordings does not degrade compared to short clips, and structured outputs like chapters and summaries become more valuable as recording length increases.',
        },
        {
          q: 'How much manual cleanup do AI transcripts typically require?',
          a: 'Cleanup time depends on audio quality and content complexity. Clear speech with minimal background noise typically requires 10–15 minutes of editing per hour of audio. Challenging recordings with multiple speakers or heavy accents may require 20–30 minutes per hour even with AI transcription.',
        },
      ]

    case 'youtube':
      return [
        {
          q: 'Can I get a transcript from any YouTube video?',
          a: 'VideoText can transcribe any public YouTube video. Paste the URL and VideoText streams the audio directly — no download required. Age-restricted videos require an optional cookie configuration for access.',
        },
        {
          q: "Why is VideoText better than YouTube's auto-captions for transcription?",
          a: "YouTube auto-captions are designed for accessibility display, not reuse. They lack paragraph breaks, speaker labels, chapter markers, and structured formatting. VideoText produces a structured transcript with timestamps, summaries, and chapters that can be searched, edited, and repurposed into other content.",
        },
        {
          q: 'Can I export YouTube transcripts as subtitle files?',
          a: "Yes. VideoText generates SRT and VTT files from YouTube video transcriptions. You can upload the SRT file back to YouTube as a custom caption track, share it with editors, or use it as a source for subtitle translation into other languages.",
        },
      ]

    case 'transcription':
      return [
        {
          q: 'How accurate is AI transcription for long recordings?',
          a: 'VideoText achieves high accuracy on clear multi-speaker audio. Accuracy is best when recordings have minimal background noise, clear speech, and distinct speaker turns. For technical vocabulary or heavy accents, expect some cleanup. Speaker labels, timestamps, and paragraph structure significantly reduce total editing time compared to starting from scratch.',
        },
        {
          q: 'Can I export transcripts as DOCX, PDF, SRT, or VTT?',
          a: 'Yes. VideoText exports transcripts as DOCX, PDF, and TXT for document workflows. SRT and VTT subtitle files are generated from the same transcription pass for captioning and publishing. JSON export is available for structured data integrations.',
        },
        {
          q: 'How does speaker labeling work?',
          a: 'VideoText uses speaker diarization to detect and label distinct speakers in a recording. Each speaker turn is tagged with a consistent label (Speaker 1, Speaker 2, etc.) or a custom name you assign. Speaker labels are preserved across all export formats.',
        },
        {
          q: 'Can I transcribe YouTube videos, Zoom recordings, and podcast audio?',
          a: 'Yes. VideoText accepts video file uploads and supports URL-based ingestion for YouTube and other public media sources. Audio files (MP3, M4A, WAV) are also supported for podcast and meeting recording transcription.',
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
