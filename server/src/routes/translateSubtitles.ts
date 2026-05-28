import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { translateSubtitles } from '../services/translation'
import { toSRT } from '../utils/srtParser'
import type { SubtitleEntry } from '../utils/srtParser'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many translation requests. Please wait a minute.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getEffectiveUserId(req) || (req.ip ?? 'anonymous'),
})

function parseSRTText(text: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  const blocks = text.replace(/\r/g, '').trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter((l) => l.trim().length > 0)
    const timeLineIdx = lines.findIndex((l) => l.includes('-->'))
    if (timeLineIdx === -1) continue

    const timeLine = lines[timeLineIdx]
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    )
    if (!timeMatch) continue

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000

    const textLines = lines.slice(timeLineIdx + 1)
    const rawIndex = timeLineIdx > 0 ? parseInt(lines[0], 10) : NaN

    entries.push({
      index: isNaN(rawIndex) ? entries.length + 1 : rawIndex,
      startTime,
      endTime,
      text: textLines.join('\n').trim(),
    })
  }

  return entries
}

router.post('/', translateLimiter, async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    const apiKeyUser = req.apiKeyUser
    if (!auth?.userId && !apiKeyUser?.userId) {
      return res.status(401).json({ message: 'Authentication required. Use Authorization: Bearer <token> or a valid API key.' })
    }

    const { text, targetLanguage } = req.body as { text?: string; targetLanguage?: string }
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Missing or invalid text' })
    }
    const lang = (typeof targetLanguage === 'string' ? targetLanguage : '').trim()
    if (!lang) {
      return res.status(400).json({ message: 'Missing or invalid targetLanguage' })
    }

    const entries = parseSRTText(text)
    if (entries.length === 0) {
      return res.status(400).json({ message: 'Could not parse subtitle text' })
    }

    const translated = await translateSubtitles(entries, lang)
    const translatedText = toSRT(translated)
    return res.json({ translatedText })
  } catch (err) {
    log.error({ msg: 'translate-subtitles error', error: (err as Error)?.message ?? String(err) })
    return res.status(500).json({ message: 'Translation failed. Please try again.' })
  }
})

export default router
