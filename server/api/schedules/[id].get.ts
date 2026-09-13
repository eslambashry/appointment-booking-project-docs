import { Schedule } from '../../models/Schedule'

// GET /api/schedules/:id — one schedule owned by the authenticated user.
// Wrong owner and nonexistent both return 404 — never confirm to a caller
// that an ID exists under a different account (same fail-closed pattern as
// the public booking page from Task 011).
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id || !OBJECT_ID_RE.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  const schedule = await Schedule.findOne({ _id: id, ownerId: user._id })
  if (!schedule) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  return schedule
})
