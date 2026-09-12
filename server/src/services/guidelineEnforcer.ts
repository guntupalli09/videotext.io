import 'dotenv/config'
import OpenAI from 'openai'
import { parseHeaderedBlocks, hasAnyHeader, joinHeaderedBlocks, type TranscriptBlock } from '../utils/transcriptBlocks'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ParsedRule {
  id: string
  category: string
  label: string
  currentValue: string
}

export interface FlaggedSegment {
  originalText: string
  suggestedText: string
  ruleApplied: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface EnforceGuidelineResult {
  outputText: string
  flaggedSegments: FlaggedSegment[]
  appliedRules: string[]
  changeCount: number
}

export type CaptionFormat = 'srt' | 'vtt'

export interface CaptionCue {
  index: number
  startTime: string
  endTime: string
  text: string
}

export interface EnforceGuidelineCaptionsResult {
  cues: CaptionCue[]
  flaggedSegments: FlaggedSegment[]
  appliedRules: string[]
  changeCount: number
}

const SYSTEM_PROMPT =
  'You are a professional transcript editor.\n' +
  'Apply every formatting rule provided by the user\n' +
  'to the raw transcript exactly and consistently.\n' +
  'Do not change meaning. Do not add words not spoken.\n' +
  'Do not remove words unless the rules require it.\n' +
  'Preserve all speaker attribution exactly.\n' +
  'Preserve bracketed verbatim annotations exactly as written\n' +
  '(e.g. [laugh], [phonetic], [indiscernible], [non-interview])\n' +
  'unless a rule explicitly requires removing that category.\n' +
  'Never invent a speaker label or a timestamp that is not\n' +
  'already present in the input — if the input has none, the\n' +
  'output must have none either.\n' +
  'Where you are uncertain how to apply a rule, apply\n' +
  'your best interpretation and flag that segment.\n' +
  'You must respond with valid JSON only.\n' +
  'No preamble. No markdown. No explanation outside the JSON.\n' +
  '\n' +
  'Your response must match this exact structure:\n' +
  '{\n' +
  '  "outputText": "complete formatted transcript as a string",\n' +
  '  "flaggedSegments": [\n' +
  '    {\n' +
  '      "originalText": "exact text from input",\n' +
  '      "suggestedText": "what you output for this segment",\n' +
  '      "ruleApplied": "which rule label this relates to",\n' +
  '      "confidence": "high or medium or low",\n' +
  '      "reason": "one sentence explaining the uncertainty"\n' +
  '    }\n' +
  '  ],\n' +
  '  "appliedRules": ["list of rule labels actively applied"]\n' +
  '}\n' +
  '\n' +
  'Flag a segment only when confidence is medium or low.\n' +
  'If everything is clear, flaggedSegments must be an empty array.'

/**
 * Block-mode prompt: input is spoken-words-only text blocks with speaker
 * labels and timestamps already stripped out by the caller. The model edits
 * wording only — it never sees or produces attribution/timing, so it cannot
 * invent or drop it. Mirrors the structural guarantee enforceGuidelineCaptions
 * already gives cue timing, applied here to plain-text speaker/timestamp headers.
 */
const BLOCK_SYSTEM_PROMPT =
  'You are a professional transcript editor.\n' +
  'Apply every formatting rule provided by the user\n' +
  'to each text block exactly and consistently.\n' +
  'Do not change meaning. Do not add words not spoken.\n' +
  'Do not remove words unless the rules require it.\n' +
  'Preserve bracketed verbatim annotations exactly as written\n' +
  '(e.g. [laugh], [phonetic], [indiscernible], [non-interview])\n' +
  'unless a rule explicitly requires removing that category.\n' +
  '\n' +
  'The input is a JSON array of text blocks, spoken words only.\n' +
  'Speaker labels and timestamps are NOT included and are not\n' +
  'your concern — never add any, and never remove or merge a\n' +
  'block on the assumption one is missing.\n' +
  'Edit each block independently. Do not merge, split, reorder,\n' +
  'or drop blocks. Return exactly the same number of blocks you\n' +
  'received, in the same order.\n' +
  '\n' +
  'Where you are uncertain how to apply a rule, apply\n' +
  'your best interpretation and flag that segment.\n' +
  'You must respond with valid JSON only.\n' +
  'No preamble. No markdown. No explanation outside the JSON.\n' +
  '\n' +
  'Your response must match this exact structure:\n' +
  '{\n' +
  '  "blocks": ["edited block 0 text", "edited block 1 text", ...],\n' +
  '  "flaggedSegments": [\n' +
  '    {\n' +
  '      "originalText": "exact text from input",\n' +
  '      "suggestedText": "what you output for this segment",\n' +
  '      "ruleApplied": "which rule label this relates to",\n' +
  '      "confidence": "high or medium or low",\n' +
  '      "reason": "one sentence explaining the uncertainty"\n' +
  '    }\n' +
  '  ],\n' +
  '  "appliedRules": ["list of rule labels actively applied"]\n' +
  '}\n' +
  '\n' +
  'Flag a segment only when confidence is medium or low.\n' +
  'If everything is clear, flaggedSegments must be an empty array.'

function stripJsonFences(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '')
    s = s.replace(/\s*```\s*$/, '')
  }
  return s.trim()
}

function isFlaggedSegment(x: unknown): x is FlaggedSegment {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.originalText === 'string' &&
    typeof o.suggestedText === 'string' &&
    typeof o.ruleApplied === 'string' &&
    (o.confidence === 'high' || o.confidence === 'medium' || o.confidence === 'low') &&
    typeof o.reason === 'string'
  )
}

/**
 * Apply style-guide rules to a transcript via OpenAI (same client + model as transcriptSummary).
 *
 * When the input carries recognizable speaker/timestamp headers (the format
 * client-side buildTxt() produces — see utils/transcriptBlocks.ts), delegates
 * to enforceGuidelineBlocks so headers are preserved structurally rather than
 * trusted to the model. Falls back to a single whole-text call for headerless
 * input (arbitrary pasted transcripts, 'none' timestamp mode).
 */
export async function enforceGuideline(
  rawTranscript: string,
  rules: ParsedRule[]
): Promise<EnforceGuidelineResult> {
  const blocks = parseHeaderedBlocks(rawTranscript)
  if (hasAnyHeader(blocks)) {
    return enforceGuidelineBlocks(blocks, rules)
  }

  const rulesBlock = rules
    .map((r) => `[${r.category}] ${r.label}: ${r.currentValue}`)
    .join('\n')
  const userPrompt = `STYLE GUIDE RULES:\n${rulesBlock}\n\nRAW TRANSCRIPT:\n${rawTranscript}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const rawMsg = completion.choices[0]?.message?.content
  if (!rawMsg) {
    throw new Error('OpenAI returned empty content for guideline formatting')
  }

  const stripped = stripJsonFences(rawMsg)
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch (e) {
    throw new Error(
      `Guideline formatter response was not valid JSON: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Guideline formatter JSON must be an object')
  }
  const o = parsed as Record<string, unknown>
  if (typeof o.outputText !== 'string') {
    throw new Error('Guideline formatter JSON missing string outputText')
  }
  const flaggedRaw = o.flaggedSegments
  const flaggedSegments: FlaggedSegment[] = Array.isArray(flaggedRaw)
    ? flaggedRaw.filter(isFlaggedSegment)
    : []
  const appliedRaw = o.appliedRules
  const appliedRules: string[] = Array.isArray(appliedRaw)
    ? appliedRaw.filter((x): x is string => typeof x === 'string')
    : []

  return {
    outputText: o.outputText,
    flaggedSegments,
    appliedRules,
    changeCount: flaggedSegments.length,
  }
}

/**
 * Block-mode formatting: sends only spoken-words bodies to the model (headers
 * stripped out beforehand) and reassembles the output with the original
 * headers verbatim, by array position. The model literally cannot invent or
 * drop a speaker label or timestamp here — it never receives one.
 */
async function enforceGuidelineBlocks(
  blocks: TranscriptBlock[],
  rules: ParsedRule[]
): Promise<EnforceGuidelineResult> {
  const rulesBlock = rules
    .map((r) => `[${r.category}] ${r.label}: ${r.currentValue}`)
    .join('\n')
  const bodies = blocks.map((b) => b.body)
  const userPrompt =
    `STYLE GUIDE RULES:\n${rulesBlock}\n\n` +
    `TEXT BLOCKS JSON (spoken words only; edit each independently, keep the same count and order):\n` +
    `${JSON.stringify(bodies)}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: BLOCK_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const rawMsg = completion.choices[0]?.message?.content
  if (!rawMsg) {
    throw new Error('OpenAI returned empty content for guideline formatting')
  }

  const stripped = stripJsonFences(rawMsg)
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch (e) {
    throw new Error(
      `Guideline formatter response was not valid JSON: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Guideline formatter JSON must be an object')
  }
  const o = parsed as Record<string, unknown>
  const editedRaw = o.blocks
  if (!Array.isArray(editedRaw) || !editedRaw.every((x): x is string => typeof x === 'string')) {
    throw new Error('Guideline formatter JSON missing string[] blocks')
  }
  if (editedRaw.length !== bodies.length) {
    throw new Error(`Guideline formatter returned ${editedRaw.length} blocks; expected ${bodies.length}`)
  }

  const outputText = joinHeaderedBlocks(blocks.map((b, i) => ({ header: b.header, body: editedRaw[i] })))

  const flaggedRaw = o.flaggedSegments
  const flaggedSegments: FlaggedSegment[] = Array.isArray(flaggedRaw) ? flaggedRaw.filter(isFlaggedSegment) : []
  const appliedRaw = o.appliedRules
  const appliedRules: string[] = Array.isArray(appliedRaw) ? appliedRaw.filter((x): x is string => typeof x === 'string') : []

  return {
    outputText,
    flaggedSegments,
    appliedRules,
    changeCount: flaggedSegments.length,
  }
}

const CAPTIONS_SYSTEM_PROMPT =
  SYSTEM_PROMPT +
  '\n\n' +
  'IMPORTANT: The user input contains caption cues.\n' +
  'You must preserve cue ordering and timing exactly.\n' +
  'Do not modify startTime/endTime/index.\n' +
  'Only edit the cue text to apply the style guide.\n' +
  'Do not merge or split cues.\n' +
  'Do not add or remove cues.\n' +
  'Return the same number of cues you received.'

function isCaptionCue(x: unknown): x is CaptionCue {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.index === 'number' &&
    typeof o.startTime === 'string' &&
    typeof o.endTime === 'string' &&
    typeof o.text === 'string'
  )
}

/**
 * Caption-safe formatting: apply rules to cue text while preserving timestamps.
 */
export async function enforceGuidelineCaptions(
  format: CaptionFormat,
  cues: CaptionCue[],
  rules: ParsedRule[]
): Promise<EnforceGuidelineCaptionsResult> {
  const rulesBlock = rules.map((r) => `[${r.category}] ${r.label}: ${r.currentValue}`).join('\n')
  const userPrompt =
    `STYLE GUIDE RULES:\n${rulesBlock}\n\n` +
    `CAPTION FORMAT: ${format.toUpperCase()}\n` +
    `CUES JSON (preserve index/startTime/endTime exactly; edit text only):\n` +
    `${JSON.stringify(cues)}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CAPTIONS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const rawMsg = completion.choices[0]?.message?.content
  if (!rawMsg) throw new Error('OpenAI returned empty content for caption formatting')

  const stripped = stripJsonFences(rawMsg)
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch (e) {
    throw new Error(
      `Caption formatter response was not valid JSON: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('Caption formatter JSON must be an object')
  const o = parsed as Record<string, unknown>

  const cuesRaw = o.cues
  if (!Array.isArray(cuesRaw)) throw new Error('Caption formatter JSON missing cues array')
  const outCues = cuesRaw.filter(isCaptionCue)
  if (outCues.length !== cues.length) {
    throw new Error(`Caption formatter returned ${outCues.length} cues; expected ${cues.length}`)
  }

  // Ensure timings preserved (defensive)
  for (let i = 0; i < cues.length; i++) {
    if (
      outCues[i].index !== cues[i].index ||
      outCues[i].startTime !== cues[i].startTime ||
      outCues[i].endTime !== cues[i].endTime
    ) {
      throw new Error(`Caption formatter modified timing metadata at cue ${cues[i].index}`)
    }
  }

  const flaggedRaw = o.flaggedSegments
  const flaggedSegments: FlaggedSegment[] = Array.isArray(flaggedRaw) ? flaggedRaw.filter(isFlaggedSegment) : []
  const appliedRaw = o.appliedRules
  const appliedRules: string[] = Array.isArray(appliedRaw) ? appliedRaw.filter((x): x is string => typeof x === 'string') : []

  return {
    cues: outCues,
    flaggedSegments,
    appliedRules,
    changeCount: flaggedSegments.length,
  }
}
