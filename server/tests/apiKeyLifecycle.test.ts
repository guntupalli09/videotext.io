/**
 * Behavioral tests for the API-key lifecycle (create/list/revoke/resolve)
 * using an in-memory fake for `prisma.apiKey` — this sandbox has no live
 * Postgres (see apiKeyModel.test.ts's header and docs/API_PRIVATE_BETA.md
 * "Testing notes"), so these swap the shared `prisma` singleton's `.apiKey`
 * property for a small fake with the same method surface the model code
 * calls (`create`, `findMany`, `updateMany`, `findUnique`, `update`), rather
 * than hitting a real database. This exercises the exact same
 * models/ApiKey.ts logic (`createApiKey`, `listApiKeys`, `revokeApiKey`,
 * `resolveApiKeyDetailed`) that the live routes call — only the storage
 * layer underneath prisma is faked.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../src/db'
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  resolveApiKeyDetailed,
  hashApiKey,
} from '../src/models/ApiKey'

interface FakeRow {
  id: string
  userId: string
  keyHash: string
  keyPrefix: string
  name: string
  clientType: string
  scopes: unknown
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

function installFakeApiKeyStore() {
  const rows: FakeRow[] = []
  let nextId = 1

  ;(prisma as unknown as { apiKey: unknown }).apiKey = {
    async create({ data }: { data: Omit<FakeRow, 'id' | 'createdAt' | 'lastUsedAt' | 'revokedAt' | 'scopes'> }) {
      const row: FakeRow = {
        id: `key_${nextId++}`,
        userId: data.userId,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        name: data.name,
        clientType: data.clientType,
        scopes: [],
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
      }
      rows.push(row)
      return row
    },
    async findMany({ where }: { where: { userId: string } }) {
      return rows
        .filter((r) => r.userId === where.userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    async updateMany({ where, data }: { where: { id: string; userId: string; revokedAt: null }; data: { revokedAt: Date } }) {
      let count = 0
      for (const r of rows) {
        if (r.id === where.id && r.userId === where.userId && r.revokedAt === null) {
          r.revokedAt = data.revokedAt
          count++
        }
      }
      return { count }
    },
    async findUnique({ where }: { where: { keyHash: string } }) {
      return rows.find((r) => r.keyHash === where.keyHash) ?? null
    },
    async update({ where, data }: { where: { id: string }; data: { lastUsedAt: Date } }) {
      const row = rows.find((r) => r.id === where.id)
      if (row) row.lastUsedAt = data.lastUsedAt
      return row
    },
  }

  return rows
}

test('createApiKey: returns the raw key once; the stored record never carries it or a plaintext hash field a caller could echo', async () => {
  installFakeApiKeyStore()
  const { record, rawKey } = await createApiKey({ userId: 'user_a', name: 'Zapier Production', clientType: 'zapier' })
  assert.ok(rawKey.startsWith('vt_live_'))
  assert.ok(!('keyHash' in record))
  assert.ok(!('key' in record))
  assert.equal(record.userId, 'user_a')
  assert.equal(record.clientType, 'zapier')
  assert.ok(rawKey.startsWith(record.keyPrefix))
})

test('listApiKeys: never returns the raw key or hash for any key, only prefix/name/timestamps', async () => {
  installFakeApiKeyStore()
  await createApiKey({ userId: 'user_a', name: 'Key 1', clientType: 'generic' })
  await createApiKey({ userId: 'user_a', name: 'Key 2', clientType: 'zapier' })
  const keys = await listApiKeys('user_a')
  assert.equal(keys.length, 2)
  for (const k of keys) {
    assert.ok(!('keyHash' in k))
    assert.ok(!('key' in k))
    assert.ok(k.keyPrefix.startsWith('vt_live_'))
  }
})

test('listApiKeys: a user never sees another user\'s keys (owner isolation)', async () => {
  installFakeApiKeyStore()
  await createApiKey({ userId: 'user_a', name: 'A key', clientType: 'generic' })
  await createApiKey({ userId: 'user_b', name: 'B key', clientType: 'generic' })
  const aKeys = await listApiKeys('user_a')
  const bKeys = await listApiKeys('user_b')
  assert.equal(aKeys.length, 1)
  assert.equal(bKeys.length, 1)
  assert.equal(aKeys[0].name, 'A key')
  assert.equal(bKeys[0].name, 'B key')
})

test('revokeApiKey: revokes only when the caller owns the key; cross-user revoke fails', async () => {
  installFakeApiKeyStore()
  const { record } = await createApiKey({ userId: 'user_a', name: 'A key', clientType: 'generic' })
  const revokedByWrongUser = await revokeApiKey('user_b', record.id)
  assert.equal(revokedByWrongUser, false)
  const revokedByOwner = await revokeApiKey('user_a', record.id)
  assert.equal(revokedByOwner, true)
})

test('revokeApiKey: revoking an already-revoked key is a no-op (returns false), not a double-revoke', async () => {
  installFakeApiKeyStore()
  const { record } = await createApiKey({ userId: 'user_a', name: 'A key', clientType: 'generic' })
  assert.equal(await revokeApiKey('user_a', record.id), true)
  assert.equal(await revokeApiKey('user_a', record.id), false)
})

test('resolveApiKeyDetailed: a valid, active key resolves to its owning user', async () => {
  installFakeApiKeyStore()
  const { rawKey, record } = await createApiKey({ userId: 'user_a', name: 'A key', clientType: 'zapier' })
  const resolved = await resolveApiKeyDetailed(rawKey)
  assert.equal(resolved.status, 'ok')
  if (resolved.status === 'ok') {
    assert.equal(resolved.key.userId, 'user_a')
    assert.equal(resolved.key.id, record.id)
    assert.equal(resolved.key.clientType, 'zapier')
  }
})

test('resolveApiKeyDetailed: an unknown key is "not_found", never treated as valid', async () => {
  installFakeApiKeyStore()
  const resolved = await resolveApiKeyDetailed('vt_live_totally-made-up-key')
  assert.equal(resolved.status, 'not_found')
})

test('resolveApiKeyDetailed: a revoked key authenticates as "revoked", not "ok" — matches API_KEY_REVOKED, not silent success', async () => {
  installFakeApiKeyStore()
  const { rawKey, record } = await createApiKey({ userId: 'user_a', name: 'A key', clientType: 'generic' })
  await revokeApiKey('user_a', record.id)
  const resolved = await resolveApiKeyDetailed(rawKey)
  assert.equal(resolved.status, 'revoked')
})

test('createApiKey: only a SHA-256 hash of the raw key is ever persisted (never the raw key itself)', async () => {
  const rows = installFakeApiKeyStore()
  const { rawKey } = await createApiKey({ userId: 'user_a', name: 'A key', clientType: 'generic' })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].keyHash, hashApiKey(rawKey))
  assert.notEqual(rows[0].keyHash, rawKey)
})
