/**
 * Posts to X (Twitter) 3x/day via Typefully's direct REST API — no Zapier.
 * X's API rejects automated posts containing URLs, so post text is always
 * link-free by design here — never add one.
 *
 * Images: one fixed, pre-rendered branded card per category, bundled at
 * server/assets/x-cards/<category>.jpg (copied into the Docker image since
 * the build only COPYs server/, not client/ or scripts/ — see Dockerfile).
 * No headless browser runs in production; images are rendered once at
 * commit time via scripts/social/render-card.mjs and checked in as static
 * files, not generated at runtime.
 *
 * Media upload uses Typefully's presigned-S3 flow. CRITICAL per their docs
 * (confirmed by testing 2026-09-01 — do not "fix" this by adding headers
 * back, that's what broke it originally): the PUT to the presigned URL
 * must carry NO extra headers at all (no Content-Type, no x-amz-meta-*),
 * even though S3's own SignatureDoesNotMatch error message appears to list
 * those headers as required — it doesn't, that's a red herring from how
 * S3 echoes back what it received. Zero headers is correct.
 *
 * Content is a fixed, pre-verified set of posts, NOT LLM-generated at
 * runtime. Every number/claim below was checked against this repo
 * (client/src/pages/Pricing.tsx, server/src/utils/limits.ts,
 * server/src/services/transcription.ts) at the time this file was written.
 * If pricing or limits change, update POSTS below — do not let anything
 * else generate new claims for this cron.
 *
 * Rotation state (category index + post-within-category index) lives in
 * Redis so restarts don't reset the cycle or repeat the same post.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'

const log = getLogger('worker')
const redis = createRedisClient('client')

const TARGET_HOURS_UTC = [5, 13, 23] // matches the LinkedIn routine's cadence
const CHECK_INTERVAL_MS = 5 * 60 * 1000
const FIRE_WINDOW_MINUTES = 5

type Category = 'product_marketing' | 'thought_leadership' | 'product_stats' | 'community_value'
const CATEGORY_ORDER: Category[] = ['product_marketing', 'thought_leadership', 'product_stats', 'community_value']

const POSTS: Record<Category, string[]> = {
  product_marketing: [
    'Batch Processing on VideoText: drop in up to 20 videos, get one ZIP with every transcript when it\'s done. Built for anyone processing more than one file at a time.',
    'Fix Subtitles cleans up timing, line breaks, and filler words in an existing SRT/VTT file — no re-transcribing needed.',
    'Translate Subtitles keeps your original timestamps and just swaps the language. Built for teams shipping the same video across multiple markets.',
    'Burn Subtitles hardcodes your SRT/VTT directly into the video file — for platforms that don\'t support separate caption tracks.',
  ],
  thought_leadership: [
    'SRT vs VTT: SRT is the format nearly every video platform accepts. VTT adds styling/positioning and is the web standard. If you\'re unsure which to use, SRT is the safer default.',
    'Auto-caption accuracy complaints are rarely about the model. Background noise and overlapping speakers hurt accuracy far more than accent does — clean audio in, clean transcript out.',
    'If a transcription tool processes long videos sequentially, doubling the video length doubles your wait. Parallelized tools split the file into chunks first. Worth asking which kind you\'re using.',
    'Editing tip: fix transcript errors in the transcript view, not by re-uploading. Most tools let you edit and re-export without burning another processing run.',
  ],
  product_stats: [
    'VideoText Pro: $7.99/month. Up to 120-minute videos, 10GB files, 4 concurrent jobs, 5 languages, batch up to 20 videos at once.',
    'VideoText free tier: 30-minute videos, 2GB files, 3 imports/month. Enough to actually test it on a real file before deciding.',
    'Videos over 2.5 minutes get split into ~3-minute chunks and transcribed in parallel, not one after another. That\'s the speed lever, not a bigger model.',
    'We process files and delete them. No training on uploads, no retention past the job itself.',
  ],
  community_value: [
    'Quick tip: awkward caption line breaks usually happen because the tool broke on time, not clause. Splitting manually at natural pauses reads far more professional.',
    'For multilingual audiences, translate subtitles instead of re-recording. Same timestamps, same edit points, a fraction of the production time.',
    'Uploading a screen recording? Trim the intro dead air first — most transcription tools charge/limit by duration, and 10 seconds of silence still counts.',
    'SRT vs burned-in captions: SRT if the platform supports separate caption tracks (most do). Burned-in only if you need guaranteed visibility with no toggle.',
  ],
}

async function getNextPost(): Promise<{ category: Category; text: string }> {
  const catIdxRaw = await redis.get('x_post_cron:category_idx')
  const catIdx = catIdxRaw ? parseInt(catIdxRaw, 10) % CATEGORY_ORDER.length : 0
  const category = CATEGORY_ORDER[catIdx]

  const postIdxKey = `x_post_cron:post_idx:${category}`
  const postIdxRaw = await redis.get(postIdxKey)
  const postIdx = postIdxRaw ? parseInt(postIdxRaw, 10) % POSTS[category].length : 0

  await redis.set('x_post_cron:category_idx', String((catIdx + 1) % CATEGORY_ORDER.length))
  await redis.set(postIdxKey, String((postIdx + 1) % POSTS[category].length))

  return { category, text: POSTS[category][postIdx] }
}

async function typefullyApi(pathname: string, apiKey: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://api.typefully.com/v2${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${pathname} -> ${res.status}: ${body.slice(0, 500)}`)
  }
  return res.status === 204 ? null : res.json()
}

async function uploadCategoryImage(category: Category, apiKey: string, socialSetId: string): Promise<string | null> {
  try {
    const imagePath = path.join(__dirname, '../../assets/x-cards', `${category}.jpg`)
    const buf = readFileSync(imagePath)

    const presign = await typefullyApi(`/social-sets/${socialSetId}/media/upload`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ file_name: `${category}.jpg` }),
    })
    const mediaId = presign.media_id
    if (!mediaId || !presign.upload_url) throw new Error(`Unexpected presign response: ${JSON.stringify(presign)}`)

    // No headers on this PUT — see file header comment for why.
    const putRes = await fetch(presign.upload_url, { method: 'PUT', body: buf })
    if (!putRes.ok) throw new Error(`Media upload PUT failed: ${putRes.status}`)

    for (let i = 0; i < 15; i++) {
      const status = await typefullyApi(`/social-sets/${socialSetId}/media/${mediaId}`, apiKey)
      if (status.status === 'ready') return mediaId
      if (status.status === 'failed') throw new Error(`Media processing failed: ${JSON.stringify(status)}`)
      await new Promise((r) => setTimeout(r, 1500))
    }
    throw new Error('Media did not become ready in time')
  } catch (e) {
    log.warn({ msg: 'x-post-cron: image upload failed, posting text-only', category, error: (e as Error)?.message })
    return null
  }
}

async function publishToX(category: Category, text: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const apiKey = process.env.TYPEFULLY_API_KEY
  const socialSetId = process.env.TYPEFULLY_X_SOCIAL_SET_ID
  if (!apiKey || !socialSetId) {
    return { ok: false, error: 'TYPEFULLY_API_KEY or TYPEFULLY_X_SOCIAL_SET_ID not set' }
  }

  try {
    const mediaId = await uploadCategoryImage(category, apiKey, socialSetId)
    const data = await typefullyApi(`/social-sets/${socialSetId}/drafts`, apiKey, {
      method: 'POST',
      body: JSON.stringify({
        platforms: {
          x: { enabled: true, posts: [{ text, ...(mediaId ? { media_ids: [mediaId] } : {}) }] },
        },
        publish_at: 'now',
      }),
    })
    if (data.status !== 'published' || !data.x_published_url) {
      return { ok: false, error: `Unexpected response: ${JSON.stringify(data).slice(0, 500)}` }
    }
    return { ok: true, url: data.x_published_url }
  } catch (e) {
    return { ok: false, error: (e as Error)?.message }
  }
}

async function tick(): Promise<void> {
  const now = new Date()
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()
  if (!TARGET_HOURS_UTC.includes(hour) || minute >= FIRE_WINDOW_MINUTES) return

  const dateSlotKey = `x_post_cron:fired:${now.toISOString().slice(0, 10)}:${hour}`
  const lock = await redis.set(dateSlotKey, '1', 'EX', 6 * 60 * 60, 'NX')
  if (lock !== 'OK') return // already fired this slot

  const { category, text } = await getNextPost()
  const result = await publishToX(category, text)

  if (result.ok) {
    log.info({ msg: 'x-post-cron: published', category, url: result.url })
  } else {
    log.error({ msg: 'x-post-cron: publish failed', category, error: result.error })
  }
}

export function startXPostCron(): void {
  const enabled = process.env.X_POST_CRON_ENABLED === 'true'
  if (!enabled) {
    log.info({ msg: 'x-post-cron disabled (set X_POST_CRON_ENABLED=true and TYPEFULLY_API_KEY / TYPEFULLY_X_SOCIAL_SET_ID to enable)' })
    return
  }

  tick().catch((e) => log.warn({ msg: 'x-post-cron: initial tick failed', error: (e as Error)?.message }))
  setInterval(() => {
    tick().catch((e) => log.warn({ msg: 'x-post-cron: tick failed', error: (e as Error)?.message }))
  }, CHECK_INTERVAL_MS)
}
