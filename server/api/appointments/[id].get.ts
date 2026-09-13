import { Appointment } from '../../models/Appointment'

// GET /api/appointments/:id — owned appointment only. Same not-found-vs-not-
// yours fail-closed 404 as the schedule routes (Task 016).
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id || !OBJECT_ID_RE.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Appointment not found.' })
  }

  const appointment = await Appointment.findOne({ _id: id, ownerId: user._id }).populate('scheduleId', 'name')
  if (!appointment) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Appointment not found.' })
  }

  return appointment
})
