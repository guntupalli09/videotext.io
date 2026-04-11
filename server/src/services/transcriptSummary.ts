import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface SummaryResult {
  summary: string
  bullets: string[]
  actionItems?: string[]
}

export interface ChapterResult {
  title: string
  startTime: number
  endTime?: number
}

/**
 * Generate AI summary (paragraph + bullets, optional action items) from transcript text.
 */
export async function generateSummary(
  transcriptText: string,
  options?: { includeActionItems?: boolean }
): Promise<SummaryResult> {
  if (!transcriptText?.trim()) {
    return { summary: '', bullets: [], actionItems: options?.includeActionItems ? [] : undefined }
  }
  const chunks = chunkTranscriptForSummary(transcriptText, { targetTokens: 1900, overlapRatio: 0.15 })
  if (chunks.length === 0) {
    return { summary: '', bullets: [], actionItems: options?.includeActionItems ? [] : undefined }
  }

  const totalWords = chunks.reduce((acc, c) => acc + c.wordCount, 0) || 1
  const chunkSummaries = await Promise.all(
    chunks.map(async (chunk, i) => {
      const bullets = await summarizeChunkToBullets(chunk.text)
      return {
        index: i,
        wordCount: chunk.wordCount,
        dominanceWeight: Number((chunk.wordCount / totalWords).toFixed(4)),
        bullets,
      }
    })
  )

  const reducePayload = chunkSummaries.map((c) => ({
    chunk_index: c.index,
    dominance_weight: c.dominanceWeight,
    chunk_word_count: c.wordCount,
    bullets: c.bullets,
  }))

  const reduceSystemPrompt = [
    'You are a senior editorial summarizer.',
    'Combine chunk-level notes into one complete transcript summary.',
    'This is the FINAL REDUCE stage.',
    'Prioritize dominant content over intro material and promotional chatter.',
    'Capture ALL major themes across the full transcript.',
    'Output 5-8 bullets, no repetition, no fluff, no generic filler.',
    'Bullets must reflect the entire transcript, not just the beginning.',
    'Output valid JSON only with keys: "summary", "bullets", "actionItems".',
    '"summary" should be a concise 3-5 sentence paragraph.',
    '"actionItems" should include only explicit actions/decisions if present, else [].',
  ].join(' ')

  const reduceUserPrompt = `Chunk summaries with dominance weights:\n${JSON.stringify(reducePayload)}`
  const reduced = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: reduceSystemPrompt },
      { role: 'user', content: reduceUserPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })

  const raw = reduced.choices[0]?.message?.content
  if (!raw) return { summary: '', bullets: [], actionItems: options?.includeActionItems ? [] : undefined }
  try {
    const parsed = JSON.parse(raw) as { summary?: string; bullets?: string[]; actionItems?: string[] }
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 8) : [],
      actionItems: options?.includeActionItems && Array.isArray(parsed.actionItems) ? parsed.actionItems : undefined,
    }
  } catch {
    return { summary: '', bullets: [], actionItems: options?.includeActionItems ? [] : undefined }
  }
}

type SummaryChunk = { text: string; wordCount: number }

function chunkTranscriptForSummary(
  transcriptText: string,
  options?: { targetTokens?: number; overlapRatio?: number }
): SummaryChunk[] {
  const targetTokens = Math.max(1500, Math.min(2500, options?.targetTokens ?? 1900))
  const overlapRatio = Math.max(0.1, Math.min(0.2, options?.overlapRatio ?? 0.15))
  const words = transcriptText.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  // Rough conversion: 1 token ~= 0.75 words
  const targetWords = Math.floor(targetTokens * 0.75)
  const overlapWords = Math.max(1, Math.floor(targetWords * overlapRatio))
  const step = Math.max(1, targetWords - overlapWords)

  const chunks: SummaryChunk[] = []
  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(words.length, start + targetWords)
    const slice = words.slice(start, end)
    if (!slice.length) continue
    chunks.push({ text: slice.join(' '), wordCount: slice.length })
    if (end >= words.length) break
  }
  return chunks
}

async function summarizeChunkToBullets(chunkText: string): Promise<string[]> {
  if (!chunkText.trim()) return []
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Summarize this transcript chunk into 3-5 concise factual bullets. Focus on substantive content. Output JSON only: {"bullets": string[]}.',
      },
      { role: 'user', content: chunkText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })
  const raw = completion.choices[0]?.message?.content
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { bullets?: string[] }
    return Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : []
  } catch {
    return []
  }
}

/**
 * Generate chapters (title + startTime) from segments. Uses segment boundaries.
 */
export async function generateChapters(segments: TranscriptSegment[]): Promise<ChapterResult[]> {
  if (!segments?.length) return []
  const truncated = segments.slice(0, 200).map((s, i) => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n')
  if (truncated.length > 24000) {
    const fewer = segments.filter((_, i) => i % 2 === 0).slice(0, 100)
    const str = fewer.map((s) => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n')
    return generateChaptersFromText(str)
  }
  return generateChaptersFromText(truncated)
}

async function generateChaptersFromText(segmentText: string): Promise<ChapterResult[]> {
  const sys = `You are an assistant. Given lines like "[12.5s] Some text", suggest 3-10 chapter markers. Output valid JSON only with a single key "chapters": an array of objects, each with "title" (string) and "startTime" (number, seconds). Use only start times that appear in the input (round to 1 decimal).`
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: segmentText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })
  const raw = completion.choices[0]?.message?.content
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { chapters?: unknown[] }
    const arr = Array.isArray(parsed.chapters) ? parsed.chapters : []
    return arr
      .filter((c: any) => c && typeof c.title === 'string' && typeof c.startTime === 'number')
      .map((c: any) => ({ title: c.title, startTime: Number(c.startTime), endTime: undefined }))
  } catch {
    return []
  }
}
