import Redis from 'ioredis'

// Redis is never the source of truth (CLAUDE.md §10) — every function here
// degrades to "act as if there's no cache" rather than throwing, so a Redis
// outage never turns into a 500 for an unrelated feature (booking, listing
// appointments, etc). Connection is lazy: if `NUXT_REDIS_URL` is unset, the
// client stays `null` forever and nothing below ever tries to connect. If
// it's set but unreachable, a fresh client (and a real reconnect attempt) is
// built on the *next* call after each failure (see the 'error' handler
// below) — so a sustained outage means every request pays the short, bounded
// connectTimeout cost, not a permanent one-time-only attempt. Accepted as
// simpler than adding cooldown/backoff logic on top of ioredis's own retry
// knobs — the bounded per-request cost is a fine trade for "recovers on its
// own once Redis comes back" in an MVP with expected low traffic.
let client: Redis | null | undefined

function getRedisClient(): Redis | null {
  if (client !== undefined) return client

  const { redisUrl } = useRuntimeConfig()
  if (!redisUrl) {
    client = null
    return client
  }

  client = new Redis(redisUrl, {
    lazyConnect: true,
    // Fail fast rather than hang a request for several seconds if Redis is
    // unreachable — a slow fallback would be worse than no cache at all.
    connectTimeout: 300,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  })

  // Without a listener, ioredis's own connection-error events become
  // unhandled 'error' emissions that would crash the process — logging here
  // is what makes "fall back silently" actually silent for callers.
  //
  // Resetting `client` back to undefined here matters more than it looks:
  // `retryStrategy: () => null` (above) tells ioredis to stop trying to
  // reconnect after the first failure, so without this reset, one transient
  // Redis blip would leave this cached client permanently dead — caching and
  // rate limiting would silently stay disabled for the rest of the process's
  // life even after Redis recovers, not just during the outage. Resetting it
  // means the next call builds a fresh client and gets a real reconnect
  // attempt. Found during the Task 023 hardening pass (visible in earlier
  // testing as repeated "Connection is closed" errors after one ECONNREFUSED).
  client.on('error', (error) => {
    console.error('[redis] connection error:', error.message)
    client = undefined
  })

  return client
}

export async function safeRedisGet(key: string): Promise<string | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    return await redis.get(key)
  } catch (error) {
    console.error('[redis] get failed, falling back:', (error as Error).message)
    return null
  }
}

export async function safeRedisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.set(key, value, 'EX', ttlSeconds)
  } catch (error) {
    console.error('[redis] set failed, continuing without cache:', (error as Error).message)
  }
}

export async function safeRedisDel(key: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.del(key)
  } catch (error) {
    console.error('[redis] del failed:', (error as Error).message)
  }
}

export interface RateLimitResult {
  limited: boolean
  remaining: number
  retryAfterSeconds: number
}

// Fixed-window counter: INCR the bucket, set its TTL only on the first hit in
// a window (so the window is "windowSeconds from this identifier's first
// request", not aligned to a clock boundary). Not perfectly atomic — a crash
// between INCR and EXPIRE could in principle leave a key with no TTL — an
// accepted simplification for this MVP; a Lua script would close that gap.
// Fails open (never limits) if Redis is unavailable — see server/utils/rate-limit.ts
// for why that's the deliberate policy, not an oversight.
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redis = getRedisClient()
  if (!redis) return { limited: false, remaining: limit, retryAfterSeconds: 0 }

  try {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }
    if (count > limit) {
      const ttl = await redis.ttl(key)
      return { limited: true, remaining: 0, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds }
    }
    return { limited: false, remaining: Math.max(0, limit - count), retryAfterSeconds: 0 }
  } catch (error) {
    console.error('[redis] rate limit check failed, failing open:', (error as Error).message)
    return { limited: false, remaining: limit, retryAfterSeconds: 0 }
  }
}
