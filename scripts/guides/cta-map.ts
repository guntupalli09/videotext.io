/**
 * Maps each guide to two of the eight core tools.
 *
 * The imported articles linked only to the homepage — 165 links, one
 * destination, none to a tool page. This scores each article against the core
 * tool vocabulary so the CTAs point somewhere the reader can actually act.
 *
 * Scoring: title matches weigh 3, body matches 1 (counted once per term, so a
 * term repeated 40 times cannot outvote genuine topical overlap).
 */

export interface CoreTool {
  path: string
  name: string
  /** Rendered as the CTA body copy. */
  blurb: string
  action: string
  /**
   * Tiebreak rank when two tools match the title equally. A guide titled
   * "subtitle burning software" matches both /video-to-subtitles and
   * /burn-subtitles; the narrower tool should win its own topic.
   */
  specificity: number
  /** Lowercased match terms, matched on word boundaries. */
  terms: string[]
  /**
   * Competitor names, matched against the title only. Comparison and
   * alternatives articles carry no topical vocabulary in the title, so without
   * these they fall through to whatever the body happens to mention.
   */
  brands?: string[]
}

export const CORE_TOOLS: CoreTool[] = [
  {
    path: '/video-to-transcript',
    name: 'Video to Transcript',
    blurb: 'Upload a video and get a full transcript, plus chapters and a summary, in one pass.',
    action: 'Transcribe a video free',
    specificity: 1,
    terms: [
      'transcript', 'transcribe', 'transcription', 'transcriber', 'podcast', 'meeting', 'zoom',
      'interview', 'journalist', 'newsroom', 'lecture', 'webinar', 'diarization',
      'speaker label', 'whisper', 'asr', 'loom', 'teams', 'google meet',
    ],
    brands: ['descript', 'notta', 'tactiq', 'happy scribe', 'happyscribe', 'otter', 'turboscribe', 'trint', 'sonix', 'fireflies', 'scriptme', 'temi', 'speak ai'],
  },
  {
    path: '/video-to-subtitles',
    name: 'Video to Subtitles',
    blurb: 'Generate timed SRT or VTT subtitles from any video, ready to upload or edit.',
    action: 'Generate subtitles free',
    specificity: 2,
    terms: [
      'subtitle', 'subtitles', 'caption', 'captions', 'srt', 'vtt', 'closed caption',
      'tiktok', 'instagram', 'reels', 'shorts', 'youtube caption', 'captioning', 'sdh',
    ],
    brands: ['veed', 'kapwing', 'flixier', 'subly', 'zubtitle'],
  },
  {
    path: '/translate-subtitles',
    name: 'Translate Subtitles',
    blurb: 'Translate an SRT or VTT file into another language while keeping the timings intact.',
    action: 'Translate a subtitle file',
    specificity: 7,
    terms: [
      'translate', 'translated', 'translation', 'multilingual', 'language', 'languages',
      'localization', 'localize', 'spanish', 'french', 'german', 'portuguese', 'foreign',
    ],
    brands: ['maestra', 'sonix translate'],
  },
  {
    path: '/burn-subtitles',
    name: 'Burn Subtitles',
    blurb: 'Burn captions permanently into the video so they play everywhere, no sidecar file needed.',
    action: 'Burn captions into video',
    specificity: 8,
    terms: [
      'burn', 'burned', 'burn-in', 'burned-in', 'hardcode', 'hardcoded', 'hard-coded',
      'open caption', 'open captions', 'embed subtitle', 'embedded subtitle', 'social video',
    ],
  },
  {
    path: '/fix-subtitles',
    name: 'Fix Subtitles',
    blurb: 'Clean up overlapping cues, reading-speed violations, and long lines in an existing file.',
    action: 'Fix a subtitle file',
    specificity: 4,
    terms: [
      'cps', 'cpl', 'reading speed', 'overlapping', 'out of sync', 'drift',
      'timestamp', 'timestamps', 'line break', 'line length', 'subtitle qa', 'subtitle error',
      'cue', 'cues', 'resync',
    ],
  },
  {
    path: '/guideline-format',
    name: 'Style Guide Formatter',
    blurb: 'Reformat a transcript to Rev, GoTranscript, or TranscribeMe house rules automatically.',
    action: 'Format to a style guide',
    specificity: 6,
    terms: [
      'style guide', 'guideline', 'guidelines', 'rev', 'gotranscript', 'transcribeme', 'verbatim',
      'clean verbatim', 'house rules', 'formatting rules', 'freelance', 'client-ready', 'proofread',
      'proofreading', 'capitalization', 'punctuation',
    ],
    brands: ['gotranscript', 'transcribeme', 'rev'],
  },
  {
    path: '/voice-recorder',
    name: 'Voice Recorder',
    blurb: 'Record straight from the browser and get the transcript when you stop — no file needed.',
    action: 'Record and transcribe',
    specificity: 5,
    terms: [
      'record', 'recorder', 'recording', 'voice', 'voice-to-text', 'microphone', 'live',
      'real time', 'real-time', 'dictation', 'dictate', 'screen recording', 'speech to text',
    ],
    brands: ['riverside', 'screenapp', 'panopto', 'loom'],
  },
  {
    path: '/compress-video',
    name: 'Compress Video',
    blurb: 'Shrink a large video before uploading, without a visible quality drop.',
    action: 'Compress a video',
    specificity: 7,
    terms: [
      'compress', 'compression', 'file size', 'large file', 'upload limit', 'size limit',
      'bitrate', 'encode', 'encoding', 're-encoding', 'resolution', 'gigabyte', 'storage',
    ],
    brands: ['clideo', 'handbrake'],
  },
]

export interface GuideCta {
  path: string
  name: string
  blurb: string
  action: string
}

const TITLE_WEIGHT = 10

/**
 * Word-boundary matching. Plain substring matching produced silent errors —
 * "delivery" contains "live", which handed reading-speed articles to the
 * recorder. Hyphens and punctuation normalise to spaces so "reading-speed" and
 * "reading speed" match the same term.
 */
function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

function canonical(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Terms match at a word start and may carry a suffix, so "burn" still matches
 * "burning" while "live" no longer matches "delivery".
 */
function hasTerm(haystack: string, term: string): boolean {
  return new RegExp(` ${canonical(term).replace(/ /g, ' ')}[a-z0-9]* `).test(haystack)
}

/** Brands match the whole word only — "rev" must not match "review". */
function hasBrand(haystack: string, brand: string): boolean {
  return haystack.includes(` ${canonical(brand)} `)
}

interface ToolScore {
  tool: CoreTool
  titleScore: number
  bodyScore: number
}

function scoreTool(tool: CoreTool, title: string, body: string): ToolScore {
  let titleScore = 0
  let bodyScore = 0
  for (const term of tool.terms) {
    if (hasTerm(title, term)) titleScore += TITLE_WEIGHT
    if (hasTerm(body, term)) bodyScore += 1
  }
  for (const brand of tool.brands || []) {
    if (hasBrand(title, brand)) titleScore += TITLE_WEIGHT
  }
  return { tool, titleScore, bodyScore }
}

/**
 * Title relevance decides first. Specificity only separates tools the title
 * matched equally — when nothing matched the title, body overlap leads instead,
 * otherwise the narrowest tool would win every article it never belonged to.
 */
function compareScores(a: ToolScore, b: ToolScore): number {
  if (a.titleScore !== b.titleScore) return b.titleScore - a.titleScore
  const bySpecificity = b.tool.specificity - a.tool.specificity
  const byBody = b.bodyScore - a.bodyScore
  const tiebreak = a.titleScore > 0 ? bySpecificity || byBody : byBody || bySpecificity
  return tiebreak || a.tool.path.localeCompare(b.tool.path)
}

/**
 * Two distinct tools per guide, strongest match first. Ties and no-match
 * articles fall back to the two broadest tools so every guide gets both CTAs.
 */
export function pickCtas(title: string, markdown: string): [GuideCta, GuideCta] {
  const lowerTitle = normalize(title)
  const lowerBody = normalize(markdown)

  const ranked = CORE_TOOLS.map((tool) => scoreTool(tool, lowerTitle, lowerBody)).sort(compareScores)

  const chosen = ranked.filter((r) => r.titleScore > 0 || r.bodyScore > 0).map((r) => r.tool)
  const fallback = CORE_TOOLS.filter((t) => t.path === '/video-to-transcript' || t.path === '/video-to-subtitles')
  for (const tool of fallback) {
    if (chosen.length >= 2) break
    if (!chosen.includes(tool)) chosen.push(tool)
  }

  const toCta = (t: CoreTool): GuideCta => ({ path: t.path, name: t.name, blurb: t.blurb, action: t.action })
  return [toCta(chosen[0]), toCta(chosen[1])]
}
