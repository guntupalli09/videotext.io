import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

const redisOptions: {
  tls?: object
  enableReadyCheck: boolean
  maxRetriesPerRequest: number | null
} = {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
}

/**
 * Create a Redis client for Bull. Required when using Upstash (rediss://):
 * - tls: {} for TLS
 * - enableReadyCheck: false (Upstash blocks INFO)
 * - maxRetriesPerRequest: null (Bull crashes otherwise)
 */
export function createRedisClient(
  _type: 'client' | 'subscriber' | 'bclient'
): Redis {
  return new Redis(redisUrl, redisOptions)
}
