import { Appointment } from '../../models/Appointment'

const STATUSES = ['confirmed', 'completed', 'cancelled']

// User-supplied text going into a RegExp must be escaped — an unescaped
// search string can throw on invalid regex syntax or, worse, be crafted for
// catastrophic backtracking (ReDoS). Never trust client input, even in a
// "just a search box" field.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /api/appointments — the authenticated owner's appointments, with
// optional filters (docs/API.md §6): status, scheduleId, from/to date range,
// search (customer name/email).
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const filter: Record<string, unknown> = { ownerId: user._id }

  const status = typeof query.status === 'string' ? query.status : undefined
  if (status && STATUSES.includes(status)) {
    filter.status = status
  }

  const scheduleId = typeof query.scheduleId === 'string' ? query.scheduleId : undefined
  if (scheduleId && OBJECT_ID_RE.test(scheduleId)) {
    filter.scheduleId = scheduleId
  }

  const startAtFilter: Record<string, Date> = {}
  const from = typeof query.from === 'string' ? new Date(query.from) : undefined
  const to = typeof query.to === 'string' ? new Date(query.to) : undefined
  if (from && !Number.isNaN(from.getTime())) startAtFilter.$gte = from
  if (to && !Number.isNaN(to.getTime())) startAtFilter.$lte = to
  if (Object.keys(startAtFilter).length > 0) filter.startAt = startAtFilter

  const search = typeof query.search === 'string' ? query.search.trim() : ''
  if (search) {
    const regex = new RegExp(escapeRegExp(search), 'i')
    filter.$or = [{ customerName: regex }, { customerEmail: regex }]
  }

  // Populated so the client can render a schedule name without a second
  // fetch-and-join — simpler than making every consumer of this list assemble
  // its own lookup map.
  return await Appointment.find(filter).populate('scheduleId', 'name').sort({ startAt: -1 })
})
