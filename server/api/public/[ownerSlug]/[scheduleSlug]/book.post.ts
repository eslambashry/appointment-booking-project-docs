import { Appointment } from '../../../../models/Appointment'

const SLOT_TAKEN_MESSAGE = 'The selected time is no longer available. Please choose another time.'
const MAX_CREATE_ATTEMPTS = 5

// POST /api/public/:ownerSlug/:scheduleSlug/book — the actual double-booking
// guard has two layers, per CLAUDE.md §9:
//  1. isSlotAvailable() re-runs the exact same slot-generation engine the
//     customer's page used, against the current database state — catches
//     "someone already booked this."
//  2. The try/catch around Appointment.create() below catches MongoDB
//     rejecting a duplicate {scheduleId, startAt} insert — catches the
//     narrower race where two requests both pass step 1 at the same instant.
//     Layer 1 alone has a check-then-act window; layer 2 is what makes this
//     actually safe under concurrency, not just "safe in the common case."
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, 'booking')

  const ownerSlug = getRouterParam(event, 'ownerSlug')
  const scheduleSlug = getRouterParam(event, 'scheduleSlug')
  if (!ownerSlug || !scheduleSlug) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }

  const body = await readBody(event)
  const parsed = bookingRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.issues[0]?.message ?? 'Invalid booking data',
      data: { issues: parsed.error.issues }
    })
  }

  const startAt = new Date(parsed.data.startAt)
  if (Number.isNaN(startAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid start time.' })
  }

  const result = await loadPublicSchedule(ownerSlug, scheduleSlug)
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Schedule not found.' })
  }
  const { owner, schedule } = result

  if (schedule.collectPhone && !parsed.data.customerPhone) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Phone number is required.' })
  }

  // Never trust client-calculated end times (CLAUDE.md §12) — derived here
  // from the schedule's own duration, never accepted from the request body.
  const endAt = new Date(startAt.getTime() + schedule.durationMinutes * 60_000)

  const answers = matchAnswers(
    schedule.questions.map((q) => ({ _id: q._id, label: q.label, required: q.required })),
    parsed.data.answers
  )

  const available = await isSlotAvailable(schedule, startAt)
  if (!available) {
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message: SLOT_TAKEN_MESSAGE })
  }

  let appointment = null
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    try {
      appointment = await Appointment.create({
        scheduleId: schedule._id,
        ownerId: owner._id,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        customerPhone: schedule.collectPhone ? parsed.data.customerPhone : undefined,
        startAt,
        endAt,
        timezone: schedule.timezone,
        status: 'confirmed',
        answers,
        confirmationCode: generateConfirmationCode()
      })
      break
    } catch (error) {
      const field = duplicateKeyField(error)
      if (field === 'slot') {
        throw createError({ statusCode: 409, statusMessage: 'Conflict', message: SLOT_TAKEN_MESSAGE })
      }
      if (field === 'confirmationCode') {
        continue // vanishingly rare — retry with a freshly generated code
      }
      throw error
    }
  }

  if (!appointment) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Could not create the booking. Please try again.'
    })
  }

  // The booking decision above never read the cache — only invalidating it
  // here, so a customer browsing this same date next doesn't keep seeing the
  // slot we just took for the rest of the (short) TTL window.
  await invalidateAvailabilityCache(schedule._id.toString(), schedule.updatedAt, formatDateParam(startAt))

  setResponseStatus(event, 201)
  return {
    confirmationCode: appointment.confirmationCode,
    scheduleName: schedule.name,
    ownerName: owner.name,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    timezone: appointment.timezone
  }
})
