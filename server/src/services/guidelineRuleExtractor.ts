import 'dotenv/config'
import crypto from 'crypto'
import OpenAI from 'openai'
import type { ParsedRule } from './guidelineEnforcer'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT =
  'You are a transcription style guide analyst.\n' +
  'Extract a concise, actionable set of formatting rules from the provided style guide text.\n' +
  'Rules must be phrased as instructions that can be applied to a transcript.\n' +
  'Do not invent rules not present in the guide.\n' +
  'If the guide is vague, create fewer rules and mark them clearly.\n' +
  'Detect contradictions between rules. Many real guides conflict; warn explicitly.\n' +
  'You must respond with valid JSON only.\n' +
  'No preamble. No markdown.\n' +
  '\n' +
  'Return this JSON structure:\n' +
  '{\n' +
  '  "rules": [\n' +
  '    {\n' +
  '      "id": "stable_id",\n' +
  '      "category": "Category",\n' +
  '      "label": "Short rule label",\n' +
  '      "currentValue": "Rule details/instruction",\n' +
  '      "extractionConfidence": "high|medium|needs_review",\n' +
  '      "extractionReason": "one sentence on why",\n' +
  '      "sourceQuote": "short quote from guide supporting this rule"\n' +
  '    }\n' +
  '  ],\n' +
  '  "conflicts": [\n' +
  '    {\n' +
  '      "ruleIdA": "id",\n' +
  '      "ruleIdB": "id",\n' +
  '      "summary": "why these conflict",\n' +
  '      "confidence": "high|medium"\n' +
  '    }\n' +
  '  ]\n' +
  '}\n'

function stripJsonFences(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '')
    s = s.replace(/\s*```\s*$/, '')
  }
  return s.trim()
}

function stableId(seed: string): string {
  return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 12)
}

export type ExtractionConfidence = 'high' | 'medium' | 'needs_review'

export interface ExtractedRule extends ParsedRule {
  extractionConfidence: ExtractionConfidence
  extractionReason: string
  sourceQuote: string
}

export interface RuleConflict {
  ruleIdA: string
  ruleIdB: string
  summary: string
  confidence: 'high' | 'medium'
}

export interface GuideExtractionResult {
  rules: ExtractedRule[]
  conflicts: RuleConflict[]
}

function isExtractedRule(x: unknown): x is ExtractedRule {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.category === 'string' &&
    typeof o.label === 'string' &&
    typeof o.currentValue === 'string' &&
    (o.extractionConfidence === 'high' || o.extractionConfidence === 'medium' || o.extractionConfidence === 'needs_review') &&
    typeof o.extractionReason === 'string' &&
    typeof o.sourceQuote === 'string'
  )
}

function isRuleConflict(x: unknown): x is RuleConflict {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.ruleIdA === 'string' &&
    typeof o.ruleIdB === 'string' &&
    typeof o.summary === 'string' &&
    (o.confidence === 'high' || o.confidence === 'medium')
  )
}

export async function extractRulesFromGuideText(guideText: string): Promise<GuideExtractionResult> {
  const trimmed = guideText.trim()
  if (!trimmed) return { rules: [], conflicts: [] }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          'STYLE GUIDE TEXT:\n' +
          trimmed.slice(0, 40_000) +
          '\n\nExtract rules. Prefer 8–25 rules. Keep categories consistent.',
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned empty content for style guide parsing')

  let parsed: unknown
  try {
    parsed = JSON.parse(stripJsonFences(raw))
  } catch (e) {
    throw new Error(`Style guide parser returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }

  const o = parsed as Record<string, unknown>
  const rulesRaw = o.rules
  if (!Array.isArray(rulesRaw)) throw new Error('Style guide parser JSON missing rules array')
  const conflictsRaw = o.conflicts
  const conflicts: RuleConflict[] = Array.isArray(conflictsRaw) ? conflictsRaw.filter(isRuleConflict) : []

  const rules: ExtractedRule[] = rulesRaw.filter(isExtractedRule).map((r) => ({
    ...r,
    id: r.id?.trim() ? r.id : stableId(`${r.category}|${r.label}|${r.currentValue}`),
    category: r.category.trim(),
    label: r.label.trim(),
    currentValue: r.currentValue.trim(),
    extractionReason: r.extractionReason.trim(),
    sourceQuote: r.sourceQuote.trim(),
  }))

  // Ensure IDs are stable + unique
  const seen = new Set<string>()
  const out: ExtractedRule[] = []
  for (const r of rules) {
    const id = r.id.trim() || stableId(`${r.category}|${r.label}|${r.currentValue}`)
    const finalId = seen.has(id) ? `${id}_${out.length + 1}` : id
    seen.add(finalId)
    out.push({ ...r, id: finalId })
  }
  return { rules: out, conflicts }
}

