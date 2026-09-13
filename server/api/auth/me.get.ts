// GET /api/auth/me — the currently authenticated user, or 401 (via
// requireAuth) if the session cookie is missing/invalid/expired.
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return { user: toPublicUser(user) }
})
