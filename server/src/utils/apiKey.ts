import { Request, Response, NextFunction } from 'express'
import type { PlanType } from '../models/User'
import { resolveApiKey, type ApiKeyClientType } from '../models/ApiKey'
import { getLogger } from '../lib/logger'

const log = getLogger('api').child({ module: 'api-key-auth' })

/**
 * Trusted identity set by apiKeyAuth when a valid API key is present.
 * Routes must use this (or JWT) for userId/plan; do not trust x-user-id/x-plan headers from client.
 *
 * `plan` here is a placeholder only ('free') and MUST NOT be trusted for
 * entitlement decisions — every gated route re-resolves the plan from the
 * database (see utils/subscriptionGuard.ts resolveRequestPlan /
 * getEffectivePlan). API keys identify a user; they never encode a plan.
 */
export interface ApiKeyUser {
  userId: string
  plan: PlanType
}

/** Present only when the request was authenticated by a database-backed ApiKey row. */
export interface ApiKeyRecordContext {
  id: string
  clientType: ApiKeyClientType
}

declare global {
  namespace Express {
    interface Request {
      apiKeyUser?: ApiKeyUser
      /** Set only for DB-backed keys (Phase 2); absent for legacy env-var keys. */
      apiKeyRecord?: ApiKeyRecordContext
    }
  }
}

/**
 * Legacy in-memory API key store (operator-provisioned via env vars).
 * Kept for backward compatibility with existing internal/ops usage — do not
 * remove without confirming nothing still depends on it.
 * Formats:
 *   API_KEY=secret                               → userId "api-user", plan "free"
 *   API_KEYS=key1:userId1,key2:userId2           → plan "free" for all
 *   API_KEYS=key1:userId1:pro,key2:userId2:basic → optional third segment sets plan
 */
const legacyKeyToUser = new Map<string, string>()
const legacyKeyToPlan = new Map<string, PlanType>()

const VALID_PLANS: PlanType[] = ['free', 'basic', 'pro', 'agency', 'founding_workflow']

function loadLegacyApiKeys() {
  if (legacyKeyToUser.size > 0) return
  if (process.env.API_KEY) {
    legacyKeyToUser.set(process.env.API_KEY.trim(), 'api-user')
  }
  const keysEnv = process.env.API_KEYS
  if (keysEnv) {
    keysEnv.split(',').forEach((entry) => {
      const parts = entry.trim().split(':')
      const key = parts[0]?.trim()
      const userId = parts[1]?.trim()
      const plan = parts[2]?.trim() as PlanType | undefined
      if (key && userId) {
        legacyKeyToUser.set(key, userId)
        if (plan && (VALID_PLANS as string[]).includes(plan)) {
          legacyKeyToPlan.set(key, plan)
        }
      }
    })
  }
}

function extractKey(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined
  return (
    apiKeyHeader?.trim() ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined)
  )
}

/**
 * Middleware: if Authorization: Bearer <key> or X-Api-Key: <key> is present and valid,
 * set req.apiKeyUser (and, for DB-backed keys, req.apiKeyRecord). Identity must not be
 * read from headers directly by downstream code.
 *
 * Resolution order: database-backed ApiKey (Phase 2) first, then the legacy
 * env-var store, so a revoked/rotated legacy key never accidentally matches a
 * DB row and vice versa. Never logs the raw key value.
 */
export async function apiKeyAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const key = extractKey(req)
  if (!key) return next()

  try {
    const dbKey = await resolveApiKey(key)
    if (dbKey) {
      req.apiKeyUser = { userId: dbKey.userId, plan: 'free' }
      req.apiKeyRecord = { id: dbKey.id, clientType: dbKey.clientType }
      return next()
    }
  } catch (err) {
    log.warn({ msg: 'api_key_db_lookup_failed', error: err instanceof Error ? err.message : String(err) })
    // Fall through to legacy lookup rather than failing the request.
  }

  loadLegacyApiKeys()
  if (legacyKeyToUser.has(key)) {
    const userId = legacyKeyToUser.get(key)!
    const plan = legacyKeyToPlan.get(key) ?? 'free'
    req.apiKeyUser = { userId, plan }
  }
  next()
}
