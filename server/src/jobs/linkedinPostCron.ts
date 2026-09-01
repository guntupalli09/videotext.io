/**
 * Posts to the VideoText LinkedIn company page 3x/day via Typefully's
 * direct REST API — replaces the earlier Zapier-based approach, which
 * depended on a chat connector toggle that proved unreliable (see commit
 * history / conversation 2026-09-01: it silently disabled itself between
 * scheduled firings with no way to detect or fix it from code).
 *
 * Unlike X, LinkedIn allows links in post text, so the CTA link is
 * included. Reuses the same branded cards as xPostCron.ts
 * (server/assets/x-cards/<category>.jpg) — same brand, same facts, no
 * reason to render separate images per platform.
 *
 * Content is fixed and pre-verified, not LLM-generated at runtime — see
 * the standing rule in xPostCron.ts's file header. Same facts sheet.
 *
 * Rotation state lives in Redis, namespaced separately from xPostCron so
 * the two platforms' rotations don't interfere with each other.
 */
import path from 'path'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'
import { uploadTypefullyImage, publishToTypefully } from '../utils/typefullyClient'

const log = getLogger('worker')
const redis = createRedisClient('client')

const TARGET_HOURS_UTC = [6, 15, 22] // offset from the X cron's [5,13,23] so the two don't fire in the same tick
const CHECK_INTERVAL_MS = 5 * 60 * 1000
const FIRE_WINDOW_MINUTES = 5

type Category = 'product_marketing' | 'thought_leadership' | 'product_stats' | 'community_value'
const CATEGORY_ORDER: Category[] = ['product_marketing', 'thought_leadership', 'product_stats', 'community_value']

const POSTS: Record<Category, string[]> = {
  product_marketing: [
    "If your team is producing more than one video at a time, Batch Processing on VideoText handles the whole queue in one run: drop in up to 20 videos, get transcripts back as one ZIP when it's done. No re-uploading, no babysitting a queue.\n\nvideotext.io",
    "Already have SRT or VTT files with timing or grammar issues? Fix Subtitles cleans up timing, line breaks, and filler words in the file you already have — no need to re-transcribe from scratch.\n\nvideotext.io",
    "Shipping the same video across multiple markets? Translate Subtitles keeps your original timestamps and swaps the language — same edit points, no re-syncing.\n\nvideotext.io",
  ],
  thought_leadership: [
    "Most transcription tools quote a speed multiplier (2x, 5x, 10x realtime) as if it's the whole story. It isn't — it just tells you how long a single sequential job takes.\n\nThe real question for anything over 20-30 minutes: is the tool parallelizing the file into chunks, or are you paying for wall-clock time on one thread? That architectural choice matters more than the model underneath it.\n\nvideotext.io",
    "Auto-caption accuracy complaints are usually blamed on the AI model. In practice, background noise and overlapping speakers hurt accuracy far more than accent does. Clean audio in, clean transcript out — worth fixing before you fix the tool.\n\nvideotext.io",
    "A tip for anyone editing AI-generated transcripts: fix errors in the transcript view, not by re-uploading the source file. Most tools let you edit and re-export without burning another processing run — re-uploading is almost always unnecessary.\n\nvideotext.io",
  ],
  product_stats: [
    "VideoText Pro, plainly: $7.99/month. Up to 120-minute videos, 10GB file uploads, 4 concurrent jobs, 5 languages, batch processing up to 20 videos at once. No complicated tiers.\n\nvideotext.io",
    "What's actually free on VideoText: 30-minute videos, 2GB files, 3 imports a month. Enough to run a real file through before deciding whether it's worth paying for.\n\nvideotext.io",
    "The architecture behind VideoText's speed isn't a bigger model — it's parallel processing. Anything over 2.5 minutes gets split into ~3-minute chunks and transcribed in parallel via Whisper, instead of one long sequential job.\n\nvideotext.io",
  ],
  community_value: [
    "Quick tip for anyone producing captions: awkward line breaks almost always happen because the tool broke on time instead of clause. Manually adjusting breaks to land on natural pauses reads far more professional, and it takes seconds per file.\n\nvideotext.io",
    "If you're deciding between SRT and burned-in captions: SRT if the platform supports separate caption tracks (most do — it stays editable and translatable). Burned-in only when you need guaranteed visibility with no viewer toggle.\n\nvideotext.io",
    "For multilingual content, translate the subtitle file instead of re-recording the video. Same timestamps, same edit points, a fraction of the production time re-shooting would take.\n\nvideotext.io",
  ],
}

async function getNextPost(): Promise<{ category: Category; text: string }> {
  const catIdxRaw = await redis.get('linkedin_post_cron:category_idx')
  const catIdx = catIdxRaw ? parseInt(catIdxRaw, 10) % CATEGORY_ORDER.length : 0
  const category = CATEGORY_ORDER[catIdx]

  const postIdxKey = `linkedin_post_cron:post_idx:${category}`
  const postIdxRaw = await redis.get(postIdxKey)
  const postIdx = postIdxRaw ? parseInt(postIdxRaw, 10) % POSTS[category].length : 0

  await redis.set('linkedin_post_cron:category_idx', String((catIdx + 1) % CATEGORY_ORDER.length))
  await redis.set(postIdxKey, String((postIdx + 1) % POSTS[category].length))

  return { category, text: POSTS[category][postIdx] }
}

async function tick(): Promise<void> {
  const now = new Date()
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()
  if (!TARGET_HOURS_UTC.includes(hour) || minute >= FIRE_WINDOW_MINUTES) return

  const apiKey = process.env.TYPEFULLY_API_KEY
  const socialSetId = process.env.TYPEFULLY_X_SOCIAL_SET_ID // same social set covers all platforms
  if (!apiKey || !socialSetId) {
    log.warn({ msg: 'linkedin-post-cron: TYPEFULLY_API_KEY or TYPEFULLY_X_SOCIAL_SET_ID not set' })
    return
  }

  const dateSlotKey = `linkedin_post_cron:fired:${now.toISOString().slice(0, 10)}:${hour}`
  const lock = await redis.set(dateSlotKey, '1', 'EX', 6 * 60 * 60, 'NX')
  if (lock !== 'OK') return

  const { category, text } = await getNextPost()
  const imagePath = path.join(__dirname, '../../assets/x-cards', `${category}.jpg`)
  const mediaId = await uploadTypefullyImage(imagePath, `${category}.jpg`, apiKey, socialSetId, log)

  const result = await publishToTypefully({
    platform: 'linkedin',
    content: { posts: [{ text, ...(mediaId ? { media_ids: [mediaId] } : {}) }] },
    apiKey,
    socialSetId,
    publishedUrlField: 'linkedin_published_url',
  })

  if (result.ok) {
    log.info({ msg: 'linkedin-post-cron: published', category, url: result.url })
  } else {
    log.error({ msg: 'linkedin-post-cron: publish failed', category, error: result.error })
  }
}

export function startLinkedInPostCron(): void {
  const enabled = process.env.LINKEDIN_TYPEFULLY_CRON_ENABLED === 'true'
  if (!enabled) {
    log.info({ msg: 'linkedin-post-cron disabled (set LINKEDIN_TYPEFULLY_CRON_ENABLED=true to enable)' })
    return
  }

  tick().catch((e) => log.warn({ msg: 'linkedin-post-cron: initial tick failed', error: (e as Error)?.message }))
  setInterval(() => {
    tick().catch((e) => log.warn({ msg: 'linkedin-post-cron: tick failed', error: (e as Error)?.message }))
  }, CHECK_INTERVAL_MS)
}
