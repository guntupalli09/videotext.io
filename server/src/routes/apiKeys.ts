/**
 * API key management (Settings → Integrations → API Keys).
 *
 * Session-authenticated (JWT or an existing API key) — not gated behind
 * apiKeyAuth's env-var fallback. Creating/using external API keys is a Pro
 * feature; this reuses the same DB-authoritative subscriptionGuard logic as
 * every other plan-gated route rather than a separate entitlement check.
 */
import express, { Request, Response } from 'express'
import { getUser } from '../models/User'
import { getEffectiveUserId } from '../utils/auth'
import { enforceSubscriptionState, hasPaidAccess } from '../utils/subscriptionGuard'
import { createApiKey, listApiKeys, revokeApiKey, type ApiKeyClientType } from '../models/ApiKey'
import { sendApiError } from '../utils/apiErrors'
import { getLogger } from '../lib/logger'

const log = getLogger('api').child({ module: 'api-keys' })
const router = express.Router()

const MAX_ACTIVE_KEYS_PER_USER = 10

async function requireProUser(req: Request, res: Response): Promise<{ userId: string } | null> {
  const userId = getEffectiveUserId(req)
  if (!userId || userId.startsWith('guest_')) {
    sendApiError(res, 'FORBIDDEN', 'Please log in to manage API keys.', { req, httpStatus: 401 })
    return null
  }
  const user = await getUser(userId)
  if (!user) {
    sendApiError(res, 'FORBIDDEN', 'Please log in to manage API keys.', { req, httpStatus: 401 })
    return null
  }
  await enforceSubscriptionState(user)
  if (!hasPaidAccess(user) && user.plan !== 'business') {
    sendApiError(res, 'UPGRADE_REQUIRED', 'API keys are a Pro feature. Upgrade your plan to create one.', { req })
    return null
  }
  return { userId }
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const ctx = await requireProUser(req, res)
    if (!ctx) return

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name) {
      sendApiError(res, 'VALIDATION_ERROR', 'name is required.', { req })
      return
    }
    const clientTypeRaw = req.body?.clientType
    const clientType: ApiKeyClientType = clientTypeRaw === 'zapier' ? 'zapier' : 'generic'

    const existing = await listApiKeys(ctx.userId)
    const activeCount = existing.filter((k) => !k.revokedAt).length
    if (activeCount >= MAX_ACTIVE_KEYS_PER_USER) {
      sendApiError(res, 'VALIDATION_ERROR', `You can have at most ${MAX_ACTIVE_KEYS_PER_USER} active API keys. Revoke one first.`, { req })
      return
    }

    const { record, rawKey } = await createApiKey({ userId: ctx.userId, name, clientType })

    // The raw key is returned exactly once, here, and never again.
    res.status(201).json({
      id: record.id,
      name: record.name,
      clientType: record.clientType,
      keyPrefix: record.keyPrefix,
      createdAt: record.createdAt.toISOString(),
      key: rawKey,
    })
  } catch (err) {
    log.error({ msg: 'api_key_create_failed', error: err instanceof Error ? err.message : String(err) })
    sendApiError(res, 'INTERNAL_ERROR', 'Failed to create API key.', { req })
  }
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = await requireProUser(req, res)
    if (!ctx) return

    const keys = await listApiKeys(ctx.userId)
    res.json({
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        clientType: k.clientType,
        keyPrefix: k.keyPrefix,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
        revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
      })),
    })
  } catch (err) {
    log.error({ msg: 'api_key_list_failed', error: err instanceof Error ? err.message : String(err) })
    sendApiError(res, 'INTERNAL_ERROR', 'Failed to list API keys.', { req })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const ctx = await requireProUser(req, res)
    if (!ctx) return

    const revoked = await revokeApiKey(ctx.userId, req.params.id)
    if (!revoked) {
      sendApiError(res, 'TRANSCRIPTION_NOT_FOUND', 'API key not found.', { req, httpStatus: 404 })
      return
    }
    res.status(200).json({ ok: true })
  } catch (err) {
    log.error({ msg: 'api_key_revoke_failed', error: err instanceof Error ? err.message : String(err) })
    sendApiError(res, 'INTERNAL_ERROR', 'Failed to revoke API key.', { req })
  }
})

export default router
