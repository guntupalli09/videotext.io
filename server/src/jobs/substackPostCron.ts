/**
 * Posts to Substack Notes (short-form, not full newsletter articles — the
 * API only supports Notes, see SubstackPlatform schema: "Substack doesn't
 * support threads, posts must contain a single post") 3x/day via
 * Typefully's direct REST API.
 *
 * Content angle per the founder's direction (2026-09-01): pure thought
 * leadership and competitor-landscape framing, always with link + image
 * (unlike X, this platform allows links).
 *
 * IMPORTANT — competitor content ground rule: this file may name real
 * competitors (maestra.ai, srtgen.com, subtitletools.com, podsqueeze.com —
 * all confirmed real organic-keyword competitors from the founder's own
 * Ahrefs export) but must NEVER assert unverified facts about their
 * pricing, features, or quality. We have no verified source for their
 * actual product details. Content here only makes claims about VideoText
 * (checked against this repo) and poses evaluation questions a buyer
 * should ask of ANY tool in the category — never a fabricated comparison.
 *
 * Rotation state lives in Redis, namespaced separately from the other
 * platform crons.
 */
import path from 'path'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'
import { uploadTypefullyImage, publishToTypefully } from '../utils/typefullyClient'

const log = getLogger('worker')
const redis = createRedisClient('client')

const TARGET_HOURS_UTC = [7, 16, 21] // offset from the other platform crons
const CHECK_INTERVAL_MS = 5 * 60 * 1000
const FIRE_WINDOW_MINUTES = 5

const POSTS: { text: string; image: 'thought_leadership' | 'product_stats' | 'community_value' }[] = [
  {
    image: 'thought_leadership',
    text: "There are a handful of real players in AI transcription and subtitling right now — Maestra, srtgen, SubtitleTools, Podsqueeze, alongside general tools like Descript. Before picking any of them (including us), ask three questions: (1) does it parallelize long files, or are you paying for wall-clock time on one thread? (2) does it delete your uploads after processing, or retain them? (3) what actually breaks at scale — file size caps, duration caps, concurrent job limits?\n\nWe can only speak confidently to our own answers: parallel chunking for anything over 2.5 minutes, no retention past the job, and Pro caps at 120-minute videos / 10GB files / 4 concurrent jobs for $7.99/month. Worth asking the same three questions of whatever you're using now.\n\nvideotext.io",
  },
  {
    image: 'product_stats',
    text: "Most of the AI transcription space competes on a speed multiplier — 5x, 10x, 47x realtime, pick a number. It's a marketing number more than an engineering one: it depends entirely on file length and where you draw the sequential-vs-parallel line.\n\nThe more useful question for evaluating any tool in this category: what happens to a 2-hour file? Does the tool cap duration below that, charge a premium, or just take proportionally longer? We built VideoText's architecture around chunking anything over 2.5 minutes and transcribing the pieces in parallel — worth checking whether whatever you're evaluating does the same, or whether that multiplier only holds for short clips.\n\nvideotext.io",
  },
  {
    image: 'community_value',
    text: "A pattern worth knowing if you're evaluating transcription/subtitling tools: many charge or cap by raw file duration, including silence. A screen recording with 15 seconds of dead air at the start counts the same as 15 seconds of speech.\n\nSmall thing, but it adds up if you're processing volume — trimming dead air before upload is free minutes back, on any tool, not just ours.\n\nvideotext.io",
  },
]

async function getNextPost(): Promise<{ index: number; post: (typeof POSTS)[number] }> {
  const idxRaw = await redis.get('substack_post_cron:post_idx')
  const idx = idxRaw ? parseInt(idxRaw, 10) % POSTS.length : 0
  await redis.set('substack_post_cron:post_idx', String((idx + 1) % POSTS.length))
  return { index: idx, post: POSTS[idx] }
}

async function tick(): Promise<void> {
  const now = new Date()
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()
  if (!TARGET_HOURS_UTC.includes(hour) || minute >= FIRE_WINDOW_MINUTES) return

  const apiKey = process.env.TYPEFULLY_API_KEY
  const socialSetId = process.env.TYPEFULLY_X_SOCIAL_SET_ID
  if (!apiKey || !socialSetId) {
    log.warn({ msg: 'substack-post-cron: TYPEFULLY_API_KEY or TYPEFULLY_X_SOCIAL_SET_ID not set' })
    return
  }

  const dateSlotKey = `substack_post_cron:fired:${now.toISOString().slice(0, 10)}:${hour}`
  const lock = await redis.set(dateSlotKey, '1', 'EX', 6 * 60 * 60, 'NX')
  if (lock !== 'OK') return

  const { index, post } = await getNextPost()
  const imagePath = path.join(__dirname, '../../assets/x-cards', `${post.image}.jpg`)
  const mediaId = await uploadTypefullyImage(imagePath, `${post.image}.jpg`, apiKey, socialSetId, log)

  const result = await publishToTypefully({
    platform: 'substack',
    content: { posts: [{ text: post.text, ...(mediaId ? { media_ids: [mediaId] } : {}) }] },
    apiKey,
    socialSetId,
    publishedUrlField: 'substack_published_url',
  })

  if (result.ok) {
    log.info({ msg: 'substack-post-cron: published', index, url: result.url })
  } else {
    log.error({ msg: 'substack-post-cron: publish failed', index, error: result.error })
  }
}

export function startSubstackPostCron(): void {
  const enabled = process.env.SUBSTACK_TYPEFULLY_CRON_ENABLED === 'true'
  if (!enabled) {
    log.info({ msg: 'substack-post-cron disabled (set SUBSTACK_TYPEFULLY_CRON_ENABLED=true to enable)' })
    return
  }

  tick().catch((e) => log.warn({ msg: 'substack-post-cron: initial tick failed', error: (e as Error)?.message }))
  setInterval(() => {
    tick().catch((e) => log.warn({ msg: 'substack-post-cron: tick failed', error: (e as Error)?.message }))
  }, CHECK_INTERVAL_MS)
}
