import type { HydratedDocument } from 'mongoose'
import type { ScheduleDocument } from '../models/Schedule'
import { generateSlotsForDate } from './scheduling-engine'

// Short — availability changes whenever someone books or cancels, and this
// cache only ever serves the read-only browsing endpoint (never the booking
// decision itself, see book.post.ts), so staleness only ever costs a customer
// a few seconds of seeing an already-taken slot before their own booking
// attempt gets a real, fresh re-check.
const AVAILABILITY_CACHE_TTL_SECONDS = 30

// Key encodes every input that changes the result (ARCHITECTURE.md §8):
// schedule + date + a "configuration version". Using the schedule's own
// `updatedAt` as that version means editing a schedule (hours, duration,
// buffers, booking window) automatically invalidates every cached date for
// it — old entries under the previous updatedAt are simply never read again
// and expire naturally, no explicit multi-key cleanup needed. Bookings and
// cancellations don't change `updatedAt`, so those are invalidated
// explicitly instead (see book.post.ts / appointments/[id].patch.ts).
function availabilityCacheKey(scheduleId: string, updatedAt: Date, dateParam: string): string {
  return `avail:${scheduleId}:${dateParam}:${updatedAt.getTime()}`
}

export async function getCachedAvailabilitySlots(
  schedule: HydratedDocument<ScheduleDocument>,
  date: Date,
  dateParam: string,
  now: Date = new Date()
): Promise<string[]> {
  const key = availabilityCacheKey(schedule._id.toString(), schedule.updatedAt, dateParam)

  const cached = await safeRedisGet(key)
  if (cached !== null) {
    try {
      return JSON.parse(cached) as string[]
    } catch {
      // Corrupt/unexpected cache value — fall through and recompute.
    }
  }

  const slots = await generateSlotsForDate(schedule, date, now)
  const isoSlots = slots.map((slot) => slot.start.toISOString())
  await safeRedisSet(key, JSON.stringify(isoSlots), AVAILABILITY_CACHE_TTL_SECONDS)
  return isoSlots
}

// Called after a booking or cancellation changes what's actually available
// for one specific date, so a customer doesn't keep seeing a stale result
// for the rest of the (short) TTL window.
export async function invalidateAvailabilityCache(
  scheduleId: string,
  updatedAt: Date,
  dateParam: string
): Promise<void> {
  await safeRedisDel(availabilityCacheKey(scheduleId, updatedAt, dateParam))
}
