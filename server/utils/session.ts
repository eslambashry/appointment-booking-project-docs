import type { H3Event } from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE_NAME = 'session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

// A signed, self-contained cookie value — "<userId>.<issuedAtMs>.<hmac>" — rather
// than a JWT library or a server-side session store. It can't be forged without
// the server's secret (HMAC-SHA256), and verifying it needs no database round
// trip. Trade-off: unlike a DB-backed session, one specific cookie can't be
// revoked early (e.g. "log out this device") without rotating the secret for
// every user — acceptable for this MVP; a real product would add a sessions
// table once that mattered.
function getSecret(): string {
  const { sessionSecret } = useRuntimeConfig()
  if (!sessionSecret) {
    // createError, not a raw throw — this is called from login/register (not
    // just requireAuth), and a raw Error here would surface as an opaque,
    // unhelpful 500 rather than the same clean, actionable pattern used for
    // the equally-required NUXT_MONGODB_URI (server/utils/db.ts). Found
    // during the Task 023 hardening pass.
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Session secret is missing. Set NUXT_SESSION_SECRET in your .env file.'
    })
  }
  return sessionSecret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function createSessionToken(userId: string): string {
  const payload = `${userId}.${Date.now()}`
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, issuedAtRaw, signature] = parts as [string, string, string]

  const issuedAt = Number(issuedAtRaw)
  if (!Number.isFinite(issuedAt)) return null
  if (Date.now() - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return null

  const expectedSignature = sign(`${userId}.${issuedAtRaw}`)
  const expected = Buffer.from(expectedSignature, 'hex')
  const actual = Buffer.from(signature, 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  return userId
}

// HttpOnly so client-side JavaScript can never read it (CLAUDE.md §11); Secure
// outside dev since local development is plain http://localhost; SameSite=lax
// is sent on normal top-level navigation (e.g. following a link into the app)
// but withheld on cross-site form posts/subrequests, which covers the common
// CSRF case for a cookie-based session without extra CSRF-token machinery.
export function setSessionCookie(event: H3Event, userId: string): void {
  setCookie(event, SESSION_COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  })
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
}
