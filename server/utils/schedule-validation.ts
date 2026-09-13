import { z } from 'zod'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const timeRangeSchema = z.object({
  start: z.string().regex(TIME_RE, 'Invalid start time'),
  end: z.string().regex(TIME_RE, 'Invalid end time')
}).refine((range) => range.start < range.end, { message: 'End time must be after start time' })

const dayAvailabilitySchema = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  enabled: z.boolean(),
  ranges: z.array(timeRangeSchema)
}).refine((day) => {
  if (!day.enabled || day.ranges.length < 2) return true
  const sorted = [...day.ranges].sort((a, b) => a.start.localeCompare(b.start))
  return sorted.every((range, i) => i === 0 || range.start >= sorted[i - 1]!.end)
}, { message: 'Time ranges cannot overlap' })

const questionSchema = z.object({
  label: z.string().trim().min(1, 'Question label is required').max(200),
  type: z.enum(['short', 'long']),
  required: z.boolean()
})

// Shared by create (all fields required) and update (all fields optional).
// Mirrors app/utils/mock-schedules.ts's Schedule type and the wizard's own
// bounds (app/components/schedules/ScheduleForm.vue) — the server enforces
// the exact same limits the UI already offers, never a superset the UI can't
// produce and never a subset that would silently reject a valid UI submission.
const scheduleFields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(1000).default(''),
  locationType: z.enum(['in_person', 'phone', 'video', 'custom']),
  locationValue: z.string().trim().min(1, 'Location is required').max(300),
  durationMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  timezone: z.string().trim().min(1, 'Timezone is required'),
  // .length(7) alone only checks the count — a payload with, say, "mon"
  // seven times would pass that check while leaving six real weekdays
  // undefined in the scheduling engine's lookup. The .refine() below closes
  // that gap (found during the Task 023 hardening pass, not exploitable via
  // the UI, which always sends exactly seven unique days — but the server
  // shouldn't rely on that).
  availability: z.array(dayAvailabilitySchema).length(7, 'Availability must include all 7 days').refine(
    (days) => new Set(days.map((d) => d.day)).size === 7,
    { message: 'Availability must include each day of the week exactly once' }
  ),
  bookingWindowDays: z.number().int().min(1).max(365),
  minimumNoticeHours: z.number().int().min(0).max(168),
  bufferBeforeMinutes: z.number().int().min(0).max(120).default(0),
  bufferAfterMinutes: z.number().int().min(0).max(120).default(0),
  collectPhone: z.boolean().default(false),
  questions: z.array(questionSchema).max(10).default([]),
  status: z.enum(['active', 'disabled']).default('active'),
  // Optional: auto-derived from `name` when omitted (see slugify()). Always
  // re-normalized and re-checked for per-owner uniqueness server-side even
  // when the client provides one — never trusted as-is.
  slug: z.string().trim().min(1).max(120).optional()
}

export const scheduleCreateSchema = z.object(scheduleFields)
export const scheduleUpdateSchema = z.object(scheduleFields).partial()

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-schedule'
}
