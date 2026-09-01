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
  const ext = path.extname(imagePath).toLowerCase()
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'

  // Step 1: ask Typefully for a presigned upload target.
  const presign = await api(`/social-sets/${socialSetId}/media/upload`, {
    method: 'POST',
    body: JSON.stringify({ content_type: contentType, file_name: path.basename(imagePath) }),
  })
  const mediaId = presign.media_id || presign.id
  const uploadUrl = presign.upload_url || presign.presigned_url || presign.url
  if (!uploadUrl || !mediaId) {
    throw new Error(`Unexpected presign response: ${JSON.stringify(presign)}`)
  }
  if (process.env.DEBUG) console.error('presign response:', JSON.stringify(presign, null, 2))

  // Step 2: upload the raw file bytes to the presigned S3 URL. This is a
  // v2-signed URL whose StringToSign embeds the x-amz-meta-* query params —
  // the PUT request must echo those exact values back as real headers, or
  // S3 returns SignatureDoesNotMatch. Extract them from the URL itself.
  const buf = readFileSync(imagePath)
  const parsedUrl = new URL(uploadUrl)
  const putHeaders = { 'Content-Type': contentType }
  for (const [key, value] of parsedUrl.searchParams.entries()) {
    if (key.toLowerCase().startsWith('x-amz-meta-')) putHeaders[key] = value
  }
  if (process.env.DEBUG) console.error('putHeaders:', JSON.stringify(putHeaders, null, 2))
  const putRes = await fetch(uploadUrl, { method: 'PUT', headers: putHeaders, body: buf })
  if (!putRes.ok) {
    const body = await putRes.text().catch(() => '')
    throw new Error(`Media upload failed: ${putRes.status} ${body.slice(0, 500)}`)
  }

  // Step 3: poll until the media is processed.
  for (let i = 0; i < 20; i++) {
    const status = await api(`/media/${mediaId}`)
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
