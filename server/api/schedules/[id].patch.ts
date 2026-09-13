import { Schedule } from '../../models/Schedule'

// PATCH /api/schedules/:id — update an owned schedule. Same not-found-vs-not-yours
// fail-closed behavior as the GET route.
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id || !OBJECT_ID_RE.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  const body = await readBody(event)
  const parsed = scheduleUpdateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.issues[0]?.message ?? 'Invalid schedule data',
      data: { issues: parsed.error.issues }
    })
  }

  const schedule = await Schedule.findOne({ _id: id, ownerId: user._id })
  if (!schedule) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  const { slug: rawSlug, ...rest } = parsed.data
  Object.assign(schedule, rest)

  if (rawSlug !== undefined || rest.name !== undefined) {
    const nextSlug = slugify(rawSlug ?? schedule.name)
    if (nextSlug !== schedule.slug) {
      const conflict = await Schedule.findOne({ ownerId: user._id, slug: nextSlug, _id: { $ne: schedule._id } })
      if (conflict) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Conflict',
          message: 'You already have a schedule using this link. Choose a different name or link.'
        })
      }
      schedule.slug = nextSlug
    }
  }

  await schedule.save()
  return schedule
})
