import 'dotenv/config'
import OpenAI from 'openai'

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

const SYSTEM_PROMPT =
  'You are a professional transcript editor.\n' +
  'Apply every formatting rule provided by the user\n' +
  'to the raw transcript exactly and consistently.\n' +
  'Do not change meaning. Do not add words not spoken.\n' +
  'Do not remove words unless the rules require it.\n' +
  'Preserve all speaker attribution exactly.\n' +
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
 */
export async function enforceGuideline(
  rawTranscript: string,
  rules: ParsedRule[]
): Promise<EnforceGuidelineResult> {
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
