import type { HydratedDocument } from 'mongoose'
import { User, type UserDocument } from '../models/User'
import { Schedule, type ScheduleDocument } from '../models/Schedule'

export interface PublicScheduleResult {
  owner: HydratedDocument<UserDocument>
  schedule: HydratedDocument<ScheduleDocument>
}

// Only ever returns an *active* schedule under the owner it actually belongs
// to — a disabled schedule and a nonexistent one both resolve to `null` here,
// so both public routes below fail closed identically (same pattern as the
// Task 011 frontend mock and the Task 016 admin routes: never confirm to a
// caller that a schedule exists but is unpublished).
export async function loadPublicSchedule(ownerSlug: string, scheduleSlug: string): Promise<PublicScheduleResult | null> {
  await connectDB()

  const owner = await User.findOne({ slug: ownerSlug })
  if (!owner) return null

  const schedule = await Schedule.findOne({ ownerId: owner._id, slug: scheduleSlug, status: 'active' })
  if (!schedule) return null

  return { owner, schedule }
}

// A deliberately shaped public DTO, not the raw document — excludes ownerId
// (an internal reference) and anything not meant for a customer, per
// docs/API.md §4's "do NOT return private admin information."
export function toPublicSchedule({ owner, schedule }: PublicScheduleResult) {
  return {
    id: schedule._id.toString(),
    name: schedule.name,
    description: schedule.description,
    locationType: schedule.locationType,
    locationValue: schedule.locationValue,
    durationMinutes: schedule.durationMinutes,
    timezone: schedule.timezone,
    // Day-of-week open/closed rules, not the underlying data model — lets the
    // booking calendar grey out days the schedule isn't open at all, without a
    // round trip per visible day. Not private/admin info: it's the same
    // "when can I book" information the public page already communicates via
    // available time slots, just at week granularity. The authoritative
    // per-date answer (conflicts, minimum notice) still only ever comes from
    // GET .../availability — this is a display hint, never trusted for booking.
    availability: schedule.availability.map((day) => ({ day: day.day, enabled: day.enabled })),
    bookingWindowDays: schedule.bookingWindowDays,
    minimumNoticeHours: schedule.minimumNoticeHours,
    collectPhone: schedule.collectPhone,
    questions: schedule.questions.map((question) => ({
      id: question._id.toString(),
      label: question.label,
      type: question.type,
      required: question.required
    })),
    slug: schedule.slug,
    owner: {
      name: owner.name,
      slug: owner.slug,
      bio: owner.bio
    }
  }
}
