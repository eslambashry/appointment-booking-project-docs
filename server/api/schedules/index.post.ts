import { Schedule } from '../../models/Schedule'

// POST /api/schedules — create a schedule owned by the authenticated user.
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const parsed = scheduleCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.issues[0]?.message ?? 'Invalid schedule data',
      data: { issues: parsed.error.issues }
    })
  }

  const slug = slugify(parsed.data.slug ?? parsed.data.name)
  const conflict = await Schedule.findOne({ ownerId: user._id, slug })
  if (conflict) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'You already have a schedule using this link. Choose a different name or link.'
    })
  }

  const schedule = await Schedule.create({ ...parsed.data, slug, ownerId: user._id })
  setResponseStatus(event, 201)
  return schedule
})
