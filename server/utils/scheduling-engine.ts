import type { HydratedDocument } from 'mongoose'
import type { ScheduleDocument } from '../models/Schedule'
import { Appointment } from '../models/Appointment'

const JS_DAY_TO_WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hoursPart, minutesPart] = time.split(':')
  const combined = new Date(date)
  combined.setHours(Number(hoursPart ?? 0), Number(minutesPart ?? 0), 0, 0)
  return combined
}

// Parses a "YYYY-MM-DD" query param into a real calendar date, rejecting
// malformed input and dates that don't exist (e.g. 2026-02-30, which the
// JS Date constructor would otherwise silently roll over to March 2).
export function parseDateParam(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

// The inverse of parseDateParam — used to build the exact same cache key a
// GET .../availability request for this date would have used, so a booking
// or cancellation can invalidate it (server/utils/availability-cache.ts).
export function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

export interface SlotResult {
  start: Date
  end: Date
}

// The real implementation of docs/ARCHITECTURE.md §6 — ports the frontend's
// illustrative app/utils/mock-slots.ts (Task 011) into the authoritative
// backend engine, now reading real appointments from MongoDB instead of an
// in-memory mock array. Timezone remains display-only (wall-clock arithmetic
// in the server's local time, not full IANA conversion) — CLAUDE.md §15
// explicitly cuts "advanced timezone management" from MVP scope; this
// continues that same documented simplification consistently, not a new cut.
export async function generateSlotsForDate(
  schedule: HydratedDocument<ScheduleDocument>,
  date: Date,
  now: Date = new Date()
): Promise<SlotResult[]> {
  const today = startOfDay(now)
  const target = startOfDay(date)

  if (target < today) return []

  const bookingWindowEnd = new Date(today)
  bookingWindowEnd.setDate(bookingWindowEnd.getDate() + schedule.bookingWindowDays)
  if (target > bookingWindowEnd) return []

  const weekday = JS_DAY_TO_WEEKDAY[target.getDay()]!
  const dayAvailability = schedule.availability.find((d) => d.day === weekday)
  if (!dayAvailability?.enabled) return []

  const durationMs = schedule.durationMinutes * 60_000
  const bufferBeforeMs = (schedule.bufferBeforeMinutes ?? 0) * 60_000
  const bufferAfterMs = (schedule.bufferAfterMinutes ?? 0) * 60_000
  const minNoticeMs = schedule.minimumNoticeHours * 60 * 60_000
  const earliestBookableAt = now.getTime() + minNoticeMs

  // Widened by a day on each side so a buffer-adjusted busy window spilling
  // just past midnight is still caught by the query; filtered precisely
  // in-memory below. $in (not $ne) matches the partial unique index's own
  // predicate (server/models/Appointment.ts) so this query can use it.
  const queryStart = new Date(target)
  queryStart.setDate(queryStart.getDate() - 1)
  const queryEnd = new Date(target)
  queryEnd.setDate(queryEnd.getDate() + 2)

  const existing = await Appointment.find({
    scheduleId: schedule._id,
    status: { $in: ['confirmed', 'completed'] },
    startAt: { $gte: queryStart, $lt: queryEnd }
  }).select('startAt endAt')

  const busyRanges = existing.map((appointment) => ({
    start: appointment.startAt.getTime() - bufferBeforeMs,
    end: appointment.endAt.getTime() + bufferAfterMs
  }))

  const slots: SlotResult[] = []

  for (const range of dayAvailability.ranges) {
    let cursor = combineDateAndTime(target, range.start).getTime()
    const rangeEnd = combineDateAndTime(target, range.end).getTime()

    while (cursor + durationMs <= rangeEnd) {
      const slotEnd = cursor + durationMs
      const meetsNotice = cursor >= earliestBookableAt
      const conflicts = busyRanges.some((busy) => cursor < busy.end && slotEnd > busy.start)

      if (meetsNotice && !conflicts) {
        slots.push({ start: new Date(cursor), end: new Date(slotEnd) })
      }
      cursor += durationMs
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime())
}

// Reusable "is this exact requested time still valid?" check — Task 019
// (Booking API) calls this as its server-side re-validation before writing,
// on top of (not instead of) the database's own atomic uniqueness guard.
export async function isSlotAvailable(
  schedule: HydratedDocument<ScheduleDocument>,
  startAt: Date,
  now: Date = new Date()
): Promise<boolean> {
  const slots = await generateSlotsForDate(schedule, startAt, now)
  return slots.some((slot) => slot.start.getTime() === startAt.getTime())
}
