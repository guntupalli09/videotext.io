/**
 * Database-backed external API keys (Phase 2 of the Zapier-readiness work).
 *
 * Key format: vt_live_<43 base64url chars of a 32-byte random secret>
 * Only a SHA-256 hash of the full key is ever persisted; the raw key is
 * returned to the caller exactly once, at creation time, and never again.
 */
import crypto from 'crypto'
import { prisma } from '../db'

export const API_KEY_PREFIX = 'vt_live_'
/** Chars of the raw key kept alongside the hash for display (e.g. "vt_live_ab12cd34"). */
const DISPLAY_PREFIX_LEN = API_KEY_PREFIX.length + 8

export type ApiKeyClientType = 'generic' | 'zapier'

export interface ApiKeyRecord {
  id: string
  userId: string
  keyPrefix: string
  name: string
  clientType: ApiKeyClientType
  scopes: string[]
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

function toRecord(row: {
  id: string
  userId: string
  keyPrefix: string
  name: string
  clientType: string
  scopes: unknown
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}): ApiKeyRecord {
  return {
    id: row.id,
    userId: row.userId,
    keyPrefix: row.keyPrefix,
    name: row.name,
    clientType: row.clientType === 'zapier' ? 'zapier' : 'generic',
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
  }
}

/** SHA-256 hex digest — deterministic, fast, and sufficient here because the
 * input (a 256-bit cryptographically random secret) already has full entropy;
 * unlike a user password, there is nothing to slow-hash against. */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex')
}

/** Generates a new raw API key. Never persisted or logged in this form. */
export function generateRawApiKey(): string {
  const secret = crypto.randomBytes(32).toString('base64url')
  return `${API_KEY_PREFIX}${secret}`
}

export interface CreateApiKeyParams {
  userId: string
  name: string
  clientType?: ApiKeyClientType
}

export interface CreateApiKeyResult {
  record: ApiKeyRecord
  rawKey: string
}

/** Creates a new key, returning the raw secret (show once) plus the stored record. */
export async function createApiKey(params: CreateApiKeyParams): Promise<CreateApiKeyResult> {
  const rawKey = generateRawApiKey()
  const keyHash = hashApiKey(rawKey)
  const keyPrefix = rawKey.slice(0, DISPLAY_PREFIX_LEN)
  const name = params.name.trim().slice(0, 100) || 'API key'
  const clientType: ApiKeyClientType = params.clientType === 'zapier' ? 'zapier' : 'generic'

  const row = await prisma.apiKey.create({
    data: {
      userId: params.userId,
      keyHash,
      keyPrefix,
      name,
      clientType,
    },
  })

  return { record: toRecord(row), rawKey }
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const rows = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toRecord)
}

/** Revokes a key. Returns false if the key does not exist or is not owned by userId. */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await prisma.apiKey.updateMany({
    where: { id: keyId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return result.count > 0
}

export interface ResolvedApiKey {
  id: string
  userId: string
  clientType: ApiKeyClientType
}

/** Fire-and-forget lastUsedAt bump — must never block or fail the calling request. */
function touchLastUsed(keyId: string): void {
  prisma.apiKey
    .update({ where: { id: keyId }, data: { lastUsedAt: new Date() } })
    .catch(() => {})
}

/**
 * Looks up an API key by its raw (unhashed) value. Returns null for an
 * unknown or revoked key. Never logs the raw key.
 */
export async function resolveApiKey(rawKey: string): Promise<ResolvedApiKey | null> {
  const keyHash = hashApiKey(rawKey)
  const row = await prisma.apiKey.findUnique({ where: { keyHash } })
  if (!row || row.revokedAt) return null
  touchLastUsed(row.id)
  return {
    id: row.id,
    userId: row.userId,
    clientType: row.clientType === 'zapier' ? 'zapier' : 'generic',
  }
}

export type ResolveApiKeyDetailed =
  | { status: 'not_found' }
  | { status: 'revoked' }
  | { status: 'ok'; key: ResolvedApiKey }

/**
 * Same lookup as resolveApiKey, but distinguishes "unknown key" from
 * "revoked key" so callers (the /api/v1 facade) can return the correct
 * external error code (INVALID_API_KEY vs API_KEY_REVOKED).
 */
export async function resolveApiKeyDetailed(rawKey: string): Promise<ResolveApiKeyDetailed> {
  const keyHash = hashApiKey(rawKey)
  const row = await prisma.apiKey.findUnique({ where: { keyHash } })
  if (!row) return { status: 'not_found' }
  if (row.revokedAt) return { status: 'revoked' }
  touchLastUsed(row.id)
  return {
    status: 'ok',
    key: { id: row.id, userId: row.userId, clientType: row.clientType === 'zapier' ? 'zapier' : 'generic' },
  }
}
