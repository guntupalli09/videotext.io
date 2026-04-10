/**
 * POST /api/jobs/:jobId/repurpose
 *
 * Beat strategy: one-click content repurposing — turn a transcript into
 * Twitter/X thread, LinkedIn post, and newsletter excerpt.
 * Pro and Business plans only.
 */
import express, { Request, Response } from 'express'
import OpenAI from 'openai'
import { getJobById, type JobData } from '../workers/videoProcessor'
import { getAuthFromRequest } from '../utils/auth'
import { getUser } from '../models/User'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000 })

/** Max transcript characters we send to the LLM (avoid huge token bills). */
const MAX_TRANSCRIPT_CHARS = 12_000

function trimTranscript(text: string): string {
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text
  // Take the first 8 000 chars (intro) + last 4 000 (conclusion) for best coverage.
  return text.slice(0, 8_000) + '\n\n[...middle trimmed...]\n\n' + text.slice(-4_000)
}

router.post('/:jobId/repurpose', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params

    // Auth required for repurpose (Pro/Business feature)
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ message: 'Sign in required. Repurpose is a Pro feature.' })
    }

    const user = await getUser(auth.userId)
    if (!user) {
      return res.status(401).json({ message: 'User not found.' })
    }
    if (user.plan === 'free' || user.plan === 'basic') {
      return res.status(403).json({
        message: 'Upgrade to Pro to unlock social content repurposing.',
        upgrade: true,
      })
    }

    const job = await getJobById(jobId)
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' })
    }

    const jobData = job.data as JobData
    const jobUserId = jobData?.userId
    if (jobUserId && jobUserId !== auth.userId) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    const state = await job.getState()
    if (state !== 'completed') {
      return res.status(400).json({ message: 'Job is not completed yet.' })
    }

    const result = job.returnvalue as Record<string, unknown> | null
    const transcript: string =
      (result?.transcript as string) ||
      (result?.text as string) ||
      ''

    if (!transcript || transcript.length < 50) {
      return res.status(400).json({ message: 'Transcript is too short or empty to repurpose.' })
    }

    const trimmed = trimTranscript(transcript)
    const videoTitle: string = (jobData?.fileName as string) || 'this video'

    log.info({ msg: 'repurpose: generating social content', jobId, userId: auth.userId, transcriptLen: trimmed.length })

    const systemPrompt = `You are an expert content strategist who repurposes video transcripts into high-performing social content.
Output ONLY valid JSON — no markdown code fences, no prose outside the JSON.`

    const userPrompt = `Repurpose the following video transcript ("${videoTitle}") into three distinct formats.

Return a single JSON object with these exact keys:
- "twitterThread": array of strings, each string is one tweet (max 280 chars). Aim for 5-8 tweets. Start with a hook, end with a CTA like "Full transcript: [videotext.io]".
- "linkedinPost": a single string, professional tone, 150-250 words, uses line breaks for readability, ends with 3-5 relevant hashtags.
- "newsletterExcerpt": a single string, 120-180 words, conversational but authoritative, suitable for an email newsletter section. Include a bolded key insight.

Transcript:
"""
${trimmed}
"""

Return ONLY the JSON object. No extra text.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let parsed: {
      twitterThread?: string[]
      linkedinPost?: string
      newsletterExcerpt?: string
    }
    try {
      parsed = JSON.parse(raw)
    } catch {
      log.warn({ msg: 'repurpose: failed to parse LLM JSON', raw: raw.slice(0, 200) })
      return res.status(500).json({ message: 'Failed to parse generated content. Please try again.' })
    }

    return res.json({
      twitterThread: Array.isArray(parsed.twitterThread) ? parsed.twitterThread : [],
      linkedinPost: typeof parsed.linkedinPost === 'string' ? parsed.linkedinPost : '',
      newsletterExcerpt: typeof parsed.newsletterExcerpt === 'string' ? parsed.newsletterExcerpt : '',
    })
  } catch (error: unknown) {
    log.error({ msg: 'repurpose error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: 'Failed to generate content. Please try again.' })
  }
})

export default router
