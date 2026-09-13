import { z } from 'zod'
import type { Types } from 'mongoose'
import { Appointment } from '../../models/Appointment'

// This route only ever cancels — the frontend (Task 010) never edits customer
// details or reschedules, and neither does CLAUDE.md §6's admin capability
// list, so the contract is deliberately narrow rather than a generic PATCH.
const cancelSchema = z.object({ status: z.literal('cancelled') })

// PATCH /api/appointments/:id — cancellation contract (docs/API.md §6).
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id || !OBJECT_ID_RE.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Appointment not found.' })
  }

  const body = await readBody(event)
  const parsed = cancelSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'This endpoint only supports cancelling an appointment: { "status": "cancelled" }.'
    })
  }

  // Populated (matching the GET routes, Task 020) both so the response keeps
  // showing a real schedule name after cancelling — the client replaces its
  // whole appointment object with this response — and so the schedule's
  // `updatedAt` is available below to build the exact cache key to invalidate.
  const appointment = await Appointment.findOne({ _id: id, ownerId: user._id }).populate('scheduleId', 'name updatedAt')
  if (!appointment) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Appointment not found.' })
  }

  if (appointment.status !== 'confirmed') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'Only a confirmed appointment can be cancelled.'
    })
  }

  appointment.status = 'cancelled'
  await appointment.save()

  // populate() changes the runtime shape but not Mongoose's static type for
  // scheduleId (still typed as ObjectId per the schema) — this cast reflects
  // what .populate('scheduleId', 'name updatedAt') actually returns.
  const populatedSchedule = appointment.scheduleId as unknown as { _id: Types.ObjectId, name: string, updatedAt: Date }
  await invalidateAvailabilityCache(
    populatedSchedule._id.toString(),
    populatedSchedule.updatedAt,
    formatDateParam(appointment.startAt)
  )

  return appointment
})
