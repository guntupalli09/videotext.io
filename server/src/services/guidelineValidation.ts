export type ValidationBucket = 'verified' | 'likely_compliant' | 'needs_review'

export interface ValidationCheck {
  id: string
  label: string
  bucket: ValidationBucket
  passed: boolean
  details?: string
  metrics?: Record<string, number>
}

export interface ValidationReport {
  summary: {
    verified: { passed: number; total: number }
    likelyCompliant: { passed: number; total: number }
    needsReview: { passed: number; total: number }
  }
  checks: ValidationCheck[]
}

function normalizeLines(s: string): string[] {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
}

function extractSpeakerPrefixes(lines: string[]): string[] {
  // Heuristic: lines like "SPEAKER_00:" or "John:" at the start.
  const prefixes = new Set<string>()
  for (const line of lines) {
    const m = line.match(/^([A-Z][A-Z0-9_]{2,}|[A-Za-z][A-Za-z.'-]{1,30})\s*:\s+/)
    if (m) prefixes.add(m[1])
  }
  return [...prefixes]
}

function hasAiArtifacts(text: string): boolean {
  const t = text.toLowerCase()
  if (t.includes('```')) return true
  if (t.includes('as an ai')) return true
  if (t.includes('here is') && t.includes('json')) return true
  return false
}

const STOPWORDS = new Set(
  [
    'the','a','an','and','or','but','if','then','else','when','while','to','of','in','on','for','with','at','by','from',
    'as','is','are','was','were','be','been','being','it','this','that','these','those','i','you','we','they','he','she',
    'me','my','your','our','their','him','her','them','us','do','does','did','done','not','no','yes','so','just','like',
    'uh','um','erm','hmm','mm','okay','ok','right','yeah','yep','nope',
  ]
)

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function semanticDensityMetrics(text: string): { tokenCount: number; uniqueRatio: number; nonStopwordRatio: number; repetitionRate: number } {
  const tokens = tokenizeWords(text)
  const tokenCount = tokens.length
  if (tokenCount === 0) return { tokenCount: 0, uniqueRatio: 0, nonStopwordRatio: 0, repetitionRate: 0 }

  const uniques = new Set(tokens)
  const uniqueRatio = uniques.size / tokenCount
  const nonStopwordCount = tokens.filter((t) => !STOPWORDS.has(t)).length
  const nonStopwordRatio = nonStopwordCount / tokenCount

  let repeated = 0
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1]) repeated++
  }
  const repetitionRate = repeated / tokenCount
  return { tokenCount, uniqueRatio, nonStopwordRatio, repetitionRate }
}

function detectProperNouns(text: string): string[] {
  // Warning-only heuristic: capitalized words mid-sentence, excluding first-word of line.
  const out = new Set<string>()
  const lines = normalizeLines(text)
  for (const line of lines) {
    const words = line.split(/\s+/).filter(Boolean)
    for (let i = 1; i < words.length; i++) {
      const w = words[i].replace(/[^A-Za-z'.-]/g, '')
      if (w.length >= 2 && /^[A-Z][a-z]/.test(w)) out.add(w)
    }
  }
  return [...out].slice(0, 200)
}

export function buildValidationReport(params: {
  inputText: string
  outputText: string
  flaggedCount: number
  isCaptionMode: boolean
  captionMetaPreserved?: boolean
}): ValidationReport {
  const checks: ValidationCheck[] = []

  // Verified
  const outputNonEmpty = params.outputText.trim().length > 0
  checks.push({
    id: 'output_non_empty',
    label: 'Output is present and readable',
    bucket: 'verified',
    passed: outputNonEmpty,
    details: outputNonEmpty ? undefined : 'Output text was empty.',
  })

  const noArtifacts = !hasAiArtifacts(params.outputText)
  checks.push({
    id: 'no_ai_artifacts',
    label: 'No AI artifacts (markdown/code fences/preamble)',
    bucket: 'verified',
    passed: noArtifacts,
    details: noArtifacts ? undefined : 'Output contains markdown fences or AI-style preamble.',
  })

  const inLines = normalizeLines(params.inputText)
  const outLines = normalizeLines(params.outputText)
  const speakers = extractSpeakerPrefixes(inLines)
  if (speakers.length === 0) {
    checks.push({
      id: 'speaker_labels',
      label: 'Speaker labels preserved',
      bucket: 'verified',
      passed: true,
      details: 'No speaker labels detected in input.',
    })
  } else {
    const missing = speakers.filter((s) => !params.outputText.includes(`${s}:`))
    checks.push({
      id: 'speaker_labels',
      label: 'Speaker labels preserved',
      bucket: 'verified',
      passed: missing.length === 0,
      details: missing.length === 0 ? undefined : `Missing in output: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`,
    })
  }

  if (params.isCaptionMode) {
    checks.push({
      id: 'caption_metadata_preserved',
      label: 'Caption timings preserved',
      bucket: 'verified',
      passed: params.captionMetaPreserved === true,
      details: params.captionMetaPreserved ? undefined : 'Cue count or timing metadata changed.',
    })
  }

  // Needs review (derived from model uncertainty)
  checks.push({
    id: 'flagged_sections',
    label: 'Uncertain sections identified for review',
    bucket: 'needs_review',
    passed: params.flaggedCount === 0,
    details: params.flaggedCount === 0 ? 'No uncertain sections flagged.' : `${params.flaggedCount} section(s) flagged.`,
    metrics: { flaggedCount: params.flaggedCount },
  })

  // Likely compliant: semantic-density signals (not a proof)
  const inM = semanticDensityMetrics(params.inputText)
  const outM = semanticDensityMetrics(params.outputText)
  const tokenDelta = outM.tokenCount - inM.tokenCount
  const densityImproved = outM.nonStopwordRatio >= Math.max(0, inM.nonStopwordRatio - 0.05)
  checks.push({
    id: 'semantic_density',
    label: 'Semantic density maintained (cleanup did not remove meaning-heavy text)',
    bucket: 'likely_compliant',
    passed: densityImproved,
    details: densityImproved
      ? 'Content-word ratio stayed stable after cleanup.'
      : 'Content-word ratio dropped noticeably; review for over-aggressive cleanup.',
    metrics: {
      inputTokens: inM.tokenCount,
      outputTokens: outM.tokenCount,
      tokenDelta,
      inputNonStopRatio: Math.round(inM.nonStopwordRatio * 1000) / 1000,
      outputNonStopRatio: Math.round(outM.nonStopwordRatio * 1000) / 1000,
      inputUniqueRatio: Math.round(inM.uniqueRatio * 1000) / 1000,
      outputUniqueRatio: Math.round(outM.uniqueRatio * 1000) / 1000,
      inputRepeatRate: Math.round(inM.repetitionRate * 1000) / 1000,
      outputRepeatRate: Math.round(outM.repetitionRate * 1000) / 1000,
    },
  })

  // Likely compliant: proper noun changes (warning-only)
  const inNouns = new Set(detectProperNouns(params.inputText))
  const outNouns = new Set(detectProperNouns(params.outputText))
  const missingNouns = [...inNouns].filter((w) => !outNouns.has(w)).slice(0, 20)
  checks.push({
    id: 'proper_nouns',
    label: 'Proper nouns preserved (warning only)',
    bucket: 'likely_compliant',
    passed: missingNouns.length === 0,
    details: missingNouns.length === 0 ? 'No notable proper nouns changed.' : `Some proper nouns changed/removed: ${missingNouns.join(', ')}${missingNouns.length >= 20 ? '…' : ''}`,
  })

  const summarize = (bucket: ValidationBucket) => {
    const list = checks.filter((c) => c.bucket === bucket)
    return {
      passed: list.filter((c) => c.passed).length,
      total: list.length,
    }
  }

  return {
    summary: {
      verified: summarize('verified'),
      likelyCompliant: summarize('likely_compliant'),
      needsReview: summarize('needs_review'),
    },
    checks,
  }
}

