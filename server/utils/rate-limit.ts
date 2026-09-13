import type { H3Event } from 'h3'

// Only the endpoints CLAUDE.md §10 names: unauthenticated, publicly reachable,
// and abuse actually costs something (brute force, spam signups/bookings).
// Authenticated admin CRUD isn't rate-limited here — it's already gated by a
// real session, a much smaller abuse surface, and "don't add Redis everywhere
// just to demonstrate Redis."
export const RATE_LIMIT_POLICIES = {
  login: { limit: 5, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  booking: { limit: 10, windowSeconds: 60 * 60 },
  // Generous — the booking page's calendar fires one of these per date click,
  // and this is also cache-backed (Task 021), so the ceiling here is mainly
  // about abusive flooding, not normal browsing.
  availability: { limit: 60, windowSeconds: 60 }
} as const

const RATE_LIMIT_MESSAGE = 'Too many requests. Please wait a moment and try again.'

// xForwardedFor: true trusts an X-Forwarded-For header if present — correct
// once this sits behind a real reverse proxy/load balancer, but note that
// without one actually stripping/overwriting client-supplied headers, a
// client could spoof this to dodge the per-IP bucket. Acceptable simplification
// for this MVP; a production deployment needs its proxy layer configured to
// only forward its own trusted header.
export async function enforceRateLimit(event: H3Event, scope: keyof typeof RATE_LIMIT_POLICIES): Promise<void> {
  const { limit, windowSeconds } = RATE_LIMIT_POLICIES[scope]
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const result = await checkRateLimit(`ratelimit:${scope}:${ip}`, limit, windowSeconds)

  if (result.limited) {
    setResponseHeader(event, 'Retry-After', result.retryAfterSeconds)
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests', message: RATE_LIMIT_MESSAGE })
  }
}
