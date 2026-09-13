// Verifies the MongoDB connection layer introduced in this task actually works.
// Not a business endpoint — Task 016+ add the real API surface.
export default defineEventHandler(async () => {
  try {
    const mongoose = await connectDB()
    return {
      status: 'ok',
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'not connected'
    }
  } catch (error) {
    // This endpoint is intentionally public (no auth — conventional for a
    // health check an uptime monitor/load balancer can hit). The underlying
    // driver error can include internal details (hostnames, auth failure
    // specifics) — logged server-side for debugging, never returned to an
    // anonymous caller (CLAUDE.md §12: avoid leaking sensitive information
    // in errors). The one exception is the "you forgot to configure this"
    // message, which is safe and useful during local setup.
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[health] database check failed:', detail)
    throw createError({
      statusCode: 503,
      statusMessage: 'Database unavailable',
      message: detail.includes('NUXT_MONGODB_URI') ? detail : 'Could not connect to the database.'
    })
  }
})
