// GET /api/public/:ownerSlug/:scheduleSlug — public-safe schedule info for
// the booking page. No authentication — this is the whole point of the route.
export default defineEventHandler(async (event) => {
  const ownerSlug = getRouterParam(event, 'ownerSlug')
  const scheduleSlug = getRouterParam(event, 'scheduleSlug')
  if (!ownerSlug || !scheduleSlug) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  const result = await loadPublicSchedule(ownerSlug, scheduleSlug)
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  return toPublicSchedule(result)
})
