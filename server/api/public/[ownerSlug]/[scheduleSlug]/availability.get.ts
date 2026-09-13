// GET /api/public/:ownerSlug/:scheduleSlug/availability?date=YYYY-MM-DD
// Server calculates availability — this is the one and only source the
// frontend's booking page reads it from (CLAUDE.md §9/§12). Result is
// short-lived-cached (server/utils/availability-cache.ts); the booking route
// itself always re-checks live, uncached, before writing (Task 021 note).
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, 'availability')

  const ownerSlug = getRouterParam(event, 'ownerSlug')
  const scheduleSlug = getRouterParam(event, 'scheduleSlug')
  if (!ownerSlug || !scheduleSlug) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  const query = getQuery(event)
  const dateParam = typeof query.date === 'string' ? query.date : undefined
  const date = dateParam ? parseDateParam(dateParam) : null
  if (!date) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Provide a valid date as ?date=YYYY-MM-DD.' })
  }

  const result = await loadPublicSchedule(ownerSlug, scheduleSlug)
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  // formatDateParam(date), not the raw dateParam — guarantees the cache key
  // uses the exact same canonical form invalidateAvailabilityCache() builds
  // it with, independent of TS's narrowing here.
  const slots = await getCachedAvailabilitySlots(result.schedule, date, formatDateParam(date))

  return {
    date: dateParam,
    timezone: result.schedule.timezone,
    durationMinutes: result.schedule.durationMinutes,
    slots
  }
})
