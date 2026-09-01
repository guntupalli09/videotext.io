#!/usr/bin/env node
/**
 * Posts directly to X (and optionally other platforms Typefully supports)
 * via Typefully's own REST API — no Zapier, no MCP plan requirement.
 * Docs: https://typefully.com/docs/api
 *
 * Auth: TYPEFULLY_API_KEY env var (Settings -> API in Typefully). Never
 * hardcode it, never print it, never commit it.
 *
 * Usage:
 *   TYPEFULLY_API_KEY=xxx node scripts/social/post-typefully.mjs \
 *     --text "Post text" \
 *     --image /path/to/local/image.jpg \
 *     --social-set-id 67890 \
 *     --publish-at now
 *
 * If --social-set-id is omitted, lists available social sets and exits —
 * use this once to find the right id, then pass it explicitly every time.
 */
import { readFileSync } from 'fs'
import path from 'path'

const API = 'https://api.typefully.com/v2'
const apiKey = process.env.TYPEFULLY_API_KEY
if (!apiKey) {
  console.error('TYPEFULLY_API_KEY is not set.')
  process.exit(1)
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, '')] = argv[i + 1]
  }
  return out
}

const args = parseArgs(process.argv.slice(2))

async function api(pathname, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${pathname} -> ${res.status}: ${body}`)
  }
  return res.status === 204 ? null : res.json()
}

async function listSocialSets() {
  const data = await api('/social-sets')
  console.log(JSON.stringify(data, null, 2))
}

async function uploadMedia(socialSetId, imagePath) {
  // Step 1: ask Typefully for a presigned upload target. Per their docs,
  // content_type is not a request field — only file_name.
  const presign = await api(`/social-sets/${socialSetId}/media/upload`, {
    method: 'POST',
    body: JSON.stringify({ file_name: path.basename(imagePath) }),
  })
  const mediaId = presign.media_id
  const uploadUrl = presign.upload_url
  if (!uploadUrl || !mediaId) {
    throw new Error(`Unexpected presign response: ${JSON.stringify(presign)}`)
  }

  // Step 2: PUT raw file bytes with NO extra headers. Per Typefully's docs:
  // "Send a plain PUT with only raw file bytes as the body — no extra
  // headers (Content-Type, Authorization, etc.). The presigned URL
  // signature was calculated without them, so adding headers causes a
  // 403 SignatureDoesNotMatch." (Confirmed: adding Content-Type or
  // x-amz-meta-* headers, even matching what S3's own error message
  // claimed was required, broke the signature. Zero headers works.)
  const buf = readFileSync(imagePath)
  const putRes = await fetch(uploadUrl, { method: 'PUT', body: buf })
  if (!putRes.ok) {
    const body = await putRes.text().catch(() => '')
    throw new Error(`Media upload failed: ${putRes.status} ${body.slice(0, 500)}`)
  }

  // Step 3: poll until the media is processed.
  for (let i = 0; i < 20; i++) {
    const status = await api(`/social-sets/${socialSetId}/media/${mediaId}`)
    if (status.status === 'ready') return mediaId
    if (status.status === 'failed') throw new Error(`Media processing failed: ${JSON.stringify(status)}`)
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error('Media did not become ready in time')
}

async function createAndPublishDraft({ socialSetId, text, mediaId, publishAt }) {
  const body = {
    platforms: {
      x: {
        enabled: true,
        posts: [{ text, ...(mediaId ? { media_ids: [mediaId] } : {}) }],
      },
    },
    publish_at: publishAt || 'now',
  }
  if (process.env.DEBUG) console.error('draft request body:', JSON.stringify(body, null, 2))
  const draft = await api(`/social-sets/${socialSetId}/drafts`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  // Poll until the publish attempt resolves.
  let final = draft
  for (let i = 0; i < 20; i++) {
    if (final.publish_state !== 'in_progress') break
    await new Promise((r) => setTimeout(r, 1500))
    final = await api(`/social-sets/${socialSetId}/drafts/${draft.id}`)
  }
  return final
}

async function main() {
  if (!args['social-set-id']) {
    console.log('No --social-set-id given. Available social sets:')
    await listSocialSets()
    return
  }
  if (!args.text) {
    console.error('--text is required')
    process.exit(1)
  }

  const socialSetId = args['social-set-id']
  let mediaId = null
  if (args.image) {
    mediaId = await uploadMedia(socialSetId, args.image)
  }

  const result = await createAndPublishDraft({
    socialSetId,
    text: args.text,
    mediaId,
    publishAt: args['publish-at'] || 'now',
  })

  console.log(JSON.stringify(result, null, 2))
  if (result.status === 'failed') {
    console.error('Publish failed.')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
