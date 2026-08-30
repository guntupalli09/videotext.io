/**
 * Client for /api/api-keys (session-authenticated, Pro-gated). Backed by
 * server/src/routes/apiKeys.ts + server/src/models/ApiKey.ts — see those for
 * the authoritative contract. This file never stores a raw key anywhere
 * (no localStorage/sessionStorage) — the raw secret only ever lives in
 * component state, for the single screen that shows it once.
 */
import { api } from './api'

export type ApiKeyClientType = 'generic' | 'zapier'

export interface ApiKeySummary {
  id: string
  name: string
  clientType: ApiKeyClientType
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export interface CreatedApiKey extends Omit<ApiKeySummary, 'lastUsedAt' | 'revokedAt'> {
  key: string
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null)
  return body?.error?.message || body?.message || fallback
}

export async function listApiKeys(): Promise<ApiKeySummary[]> {
  const response = await api('/api/api-keys')
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to load API keys'))
  }
  const data = await response.json()
  return Array.isArray(data?.data) ? data.data : []
}

export async function createApiKey(name: string, clientType: ApiKeyClientType): Promise<CreatedApiKey> {
  const response = await api('/api/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, clientType }),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to create API key'))
  }
  return response.json()
}

export async function revokeApiKey(id: string): Promise<void> {
  const response = await api(`/api/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to revoke API key'))
  }
}
