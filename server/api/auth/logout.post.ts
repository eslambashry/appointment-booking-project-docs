// POST /api/auth/logout — clears the session cookie. No server-side session
// state to invalidate (see server/utils/session.ts) — the cookie is all there
// is, so removing it is the entire operation.
export default defineEventHandler((event) => {
  clearSessionCookie(event)
  return { success: true }
})
