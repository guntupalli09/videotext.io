/**
 * Shared Typefully REST API client for all social-posting crons
 * (xPostCron.ts, linkedinPostCron.ts, substackPostCron.ts). One place for
 * the upload logic so the zero-headers fix (see below) can't get
 * accidentally reintroduced in a copy-paste.
 *
 * CRITICAL, confirmed by testing 2026-09-01: the presigned-S3 upload PUT
 * must carry NO extra headers at all — no Content-Type, no x-amz-meta-*.
 * S3's own SignatureDoesNotMatch error message appears to list those
 * headers as required (it echoes back what you sent), which is a red
 * herring — adding them is what breaks the signature. Zero headers works.
 */
import { readFileSync } from 'fs'

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

/** Uploads a local file to Typefully; returns the ready media_id, or null on any failure (never throws). */
export async function uploadTypefullyImage(
  imagePath: string,
  fileName: string,
  apiKey: string,
  socialSetId: string,
  log: { warn: (o: object) => void }
): Promise<string | null> {
  try {
    const buf = readFileSync(imagePath)

    const presign = await typefullyApi(`/social-sets/${socialSetId}/media/upload`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ file_name: fileName }),
    })
    const mediaId = presign.media_id
    if (!mediaId || !presign.upload_url) throw new Error(`Unexpected presign response: ${JSON.stringify(presign)}`)

    const putRes = await fetch(presign.upload_url, { method: 'PUT', body: buf }) // no headers — see file header comment
    if (!putRes.ok) throw new Error(`Media upload PUT failed: ${putRes.status}`)

    for (let i = 0; i < 15; i++) {
      const status = await typefullyApi(`/social-sets/${socialSetId}/media/${mediaId}`, apiKey)
      if (status.status === 'ready') return mediaId
      if (status.status === 'failed') throw new Error(`Media processing failed: ${JSON.stringify(status)}`)
      await new Promise((r) => setTimeout(r, 1500))
    }
    throw new Error('Media did not become ready in time')
  } catch (e) {
    log.warn({ msg: 'typefully: image upload failed, continuing without image', error: (e as Error)?.message })
    return null
  }
}

export interface TypefullyPublishResult {
  ok: boolean
  url?: string
  error?: string
}

/** Creates a draft on one platform and publishes it immediately. */
export async function publishToTypefully(opts: {
  platform: 'x' | 'linkedin' | 'substack'
  content: Record<string, unknown>
  apiKey: string
  socialSetId: string
  publishedUrlField: string // e.g. 'x_published_url', 'linkedin_published_url', 'substack_published_url'
}): Promise<TypefullyPublishResult> {
  try {
    let data = await typefullyApi(`/social-sets/${opts.socialSetId}/drafts`, opts.apiKey, {
      method: 'POST',
      body: JSON.stringify({
        platforms: { [opts.platform]: { enabled: true, ...opts.content } },
        publish_at: 'now',
      }),
    })

    // The initial POST response can come back with publish_state
    // "in_progress" (confirmed on LinkedIn drafts, 2026-09-01) even though
    // X drafts often finish synchronously. Poll the draft until it settles.
    for (let i = 0; i < 15 && data.publish_state === 'in_progress'; i++) {
      await new Promise((r) => setTimeout(r, 1500))
      data = await typefullyApi(`/social-sets/${opts.socialSetId}/drafts/${data.id}`, opts.apiKey)
    }

    const url = data[opts.publishedUrlField]
    if (data.status !== 'published' || !url) {
      return { ok: false, error: `Unexpected response: ${JSON.stringify(data).slice(0, 500)}` }
    }
    return { ok: true, url }
  } catch (e) {
    return { ok: false, error: (e as Error)?.message }
  }
}
