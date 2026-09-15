// GET /api/cron/send-reminders — invoked once a day by the Vercel Cron Job
// declared in vercel.json. Not session-authenticated (a cron invocation has
// no admin logged in) — instead guarded by CRON_SECRET, which Vercel
// automatically sends as `Authorization: Bearer <CRON_SECRET>` on every real
// cron invocation once that env var is set on the project. Read directly off
// process.env (not runtimeConfig) so it matches Vercel's own env var name
// exactly, with no NUXT_ prefix translation to get wrong.
export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET

  if (secret) {
    const authHeader = getHeader(event, 'authorization')
    if (authHeader !== `Bearer ${secret}`) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
  } else if (!import.meta.dev) {
    // No secret configured outside dev means this endpoint would otherwise
    // be wide open on a public deployment — refuse rather than silently
    // allow anyone to trigger a mass email send.
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error', message: 'CRON_SECRET is not configured.' })
  }

  await connectDB()
  const result = await sendTodaysReminders()
  return result
})
